import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const DEFAULT_CONFIDENCE = 0.95;

export class MediaPipeFaceSource {
  constructor({ maxFaces = 4, detectionMaxWidth = 640 } = {}) {
    this.maxFaces = maxFaces;
    this.detectionMaxWidth = detectionMaxWidth;
    this.faceLandmarker = null;
    this.detectionCanvas = document.createElement("canvas");
    this.detectionContext = this.detectionCanvas.getContext("2d", {
      alpha: false,
      desynchronized: true
    });
    this.vision = null;
    this.imageFaceLandmarker = null;
    this.profile = {
      lastDetectionMs: 0,
      lastInputWidth: 0,
      lastInputHeight: 0,
      lastFaceCount: 0
    };
  }

  async init() {
    if (this.faceLandmarker) {
      return;
    }
    const vision = await this.getVision();
    this.faceLandmarker = await this.createFaceLandmarker(vision, "VIDEO");
  }

  async initImageDetector() {
    if (this.imageFaceLandmarker) {
      return;
    }
    const vision = await this.getVision();
    this.imageFaceLandmarker = await this.createFaceLandmarker(vision, "IMAGE");
  }

  async getVision() {
    if (!this.vision) {
      this.vision = await FilesetResolver.forVisionTasks(WASM_URL);
    }
    return this.vision;
  }

  createFaceLandmarker(vision, runningMode) {
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU"
      },
      runningMode,
      numFaces: this.maxFaces,
      minFaceDetectionConfidence: 0.35,
      minFacePresenceConfidence: 0.35,
      minTrackingConfidence: 0.35,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true
    });
  }

  detect(video, timestampMs = performance.now()) {
    const input = this.getDetectionInput(video);
    const startedAt = performance.now();
    const result = this.faceLandmarker.detectForVideo(input, timestampMs);
    const detectionMs = performance.now() - startedAt;
    this.profile = {
      lastDetectionMs: detectionMs,
      lastInputWidth: input.width || input.videoWidth || 0,
      lastInputHeight: input.height || input.videoHeight || 0,
      lastFaceCount: result.faceLandmarks?.length ?? 0
    };
    return {
      raw: result,
      profile: this.profile,
      detectStates: this.toDetectStates(result)
    };
  }

  async detectImage(image) {
    await this.initImageDetector();
    const startedAt = performance.now();
    const result = this.imageFaceLandmarker.detect(image);
    const detectionMs = performance.now() - startedAt;
    return {
      raw: result,
      profile: {
        lastDetectionMs: detectionMs,
        lastInputWidth: image.naturalWidth || image.width || 0,
        lastInputHeight: image.naturalHeight || image.height || 0,
        lastFaceCount: result.faceLandmarks?.length ?? 0
      },
      detectStates: this.toDetectStates(result)
    };
  }

  getDetectionInput(video) {
    const width = video.videoWidth || video.width;
    const height = video.videoHeight || video.height;
    if (!width || !height || width <= this.detectionMaxWidth) {
      return video;
    }

    const scale = this.detectionMaxWidth / width;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);
    if (this.detectionCanvas.width !== targetWidth || this.detectionCanvas.height !== targetHeight) {
      this.detectionCanvas.width = targetWidth;
      this.detectionCanvas.height = targetHeight;
    }
    this.detectionContext.drawImage(video, 0, 0, targetWidth, targetHeight);
    return this.detectionCanvas;
  }

  toDetectStates(result) {
    return (result.faceLandmarks ?? [])
      .slice(0, this.maxFaces)
      .map((landmarks, index) => {
        const bounds = getLandmarkBounds(landmarks);
        const anchors = getFaceAnchors(landmarks, bounds);
        const matrixPose = estimatePoseFromMatrix(result.facialTransformationMatrixes?.[index]);
        const pose = matrixPose ?? estimatePoseFromLandmarks(anchors);
        const landmarkRoll = getLandmarkRoll(anchors.leftEye, anchors.rightEye);
        const expressions = getExpressions(result.faceBlendshapes?.[index]);
        return {
          detected: DEFAULT_CONFIDENCE,
          x: anchors.eyeCenter.x * 2 - 1,
          y: -(anchors.eyeCenter.y * 2 - 1),
          s: Math.max(bounds.width, bounds.height) * 2.2,
          rx: pose.rx,
          ry: pose.ry,
          rz: Number.isFinite(landmarkRoll) ? landmarkRoll : pose.rz,
          landmarks,
          anchors,
          bounds,
          transformMatrix: result.facialTransformationMatrixes?.[index]?.data ?? null,
          expressions
        };
      });
  }
}

function getLandmarkBounds(landmarks) {
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function getFaceAnchors(landmarks, bounds) {
  const leftEye = averageLandmarks(landmarks, [33, 133, 159, 145]) ?? fallbackPoint(bounds, 0.35, 0.38);
  const rightEye = averageLandmarks(landmarks, [263, 362, 386, 374]) ?? fallbackPoint(bounds, 0.65, 0.38);
  const eyeCenter = midpoint(leftEye, rightEye);
  return {
    leftEye,
    rightEye,
    eyeCenter,
    noseTip: landmarks[1] ?? fallbackPoint(bounds, 0.5, 0.56),
    forehead: averageLandmarks(landmarks, [10, 67, 297, 109, 338]) ?? fallbackPoint(bounds, 0.5, 0.08),
    chin: landmarks[152] ?? fallbackPoint(bounds, 0.5, 0.96),
    leftCheek: landmarks[234] ?? fallbackPoint(bounds, 0.12, 0.58),
    rightCheek: landmarks[454] ?? fallbackPoint(bounds, 0.88, 0.58),
    mouthCenter: averageLandmarks(landmarks, [13, 14]) ?? fallbackPoint(bounds, 0.5, 0.78),
    leftTemple: averageLandmarks(landmarks, [127, 162, 234]) ?? fallbackPoint(bounds, 0.08, 0.4),
    rightTemple: averageLandmarks(landmarks, [356, 389, 454]) ?? fallbackPoint(bounds, 0.92, 0.4)
  };
}

function averageLandmarks(landmarks, indices) {
  const points = indices.map((index) => landmarks[index]).filter(Boolean);
  if (!points.length) {
    return null;
  }
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    z: points.reduce((sum, point) => sum + (point.z ?? 0), 0) / points.length
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2
  };
}

function fallbackPoint(bounds, xFactor, yFactor) {
  return {
    x: bounds.minX + bounds.width * xFactor,
    y: bounds.minY + bounds.height * yFactor,
    z: 0
  };
}

function getLandmarkRoll(leftEye, rightEye) {
  if (!leftEye || !rightEye) {
    return 0;
  }
  const dx = rightEye.x - leftEye.x;
  const dy = -(rightEye.y - leftEye.y);
  return Math.atan2(dy, dx);
}

function getExpressions(faceBlendshapes) {
  const categories = faceBlendshapes?.categories ?? [];
  return Object.fromEntries(categories.map((category) => [category.categoryName, category.score]));
}

function estimatePoseFromLandmarks(anchors) {
  const eyeDistance = Math.max(0.001, distance2D(anchors.leftEye, anchors.rightEye));
  const noseOffsetX = ((anchors.noseTip?.x ?? anchors.eyeCenter.x) - anchors.eyeCenter.x) / eyeDistance;
  const mouthOffsetY = ((anchors.mouthCenter?.y ?? anchors.noseTip?.y ?? anchors.eyeCenter.y) - anchors.eyeCenter.y) / eyeDistance;
  return {
    rx: clamp((mouthOffsetY - 1.22) * 0.2, -0.18, 0.18),
    ry: clamp(noseOffsetX * 0.36, -0.24, 0.24),
    rz: 0
  };
}

function estimatePoseFromMatrix(matrix) {
  const data = matrix?.data;
  if (!Array.isArray(data) && !(data instanceof Float32Array)) {
    return null;
  }
  const m00 = data[0];
  const m01 = data[1];
  const m02 = data[2];
  const m10 = data[4];
  const m11 = data[5];
  const m12 = data[6];
  const m20 = data[8];
  const m21 = data[9];
  const m22 = data[10];
  if (![m00, m01, m02, m10, m11, m12, m20, m21, m22].every(Number.isFinite)) {
    return null;
  }
  const sy = Math.hypot(m00, m10);
  const singular = sy < 1e-6;
  const rx = singular ? Math.atan2(-m12, m11) : Math.atan2(m21, m22);
  const ry = singular ? Math.atan2(-m20, sy) : Math.atan2(-m20, sy);
  const rz = singular ? 0 : Math.atan2(m10, m00);
  return {
    rx: clamp(-rx * 0.72, -0.4, 0.4),
    ry: clamp(ry * 0.78, -0.48, 0.48),
    rz: clamp(rz, -0.62, 0.62)
  };
}

function distance2D(a, b) {
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
