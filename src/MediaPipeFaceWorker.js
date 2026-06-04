const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const TASKS_VISION_CLASSIC_BUNDLE =
  "../vendor/mediapipe/tasks-vision-0.10.35/vision_bundle.js";
const DEFAULT_CONFIDENCE = 0.95;

let faceLandmarker = null;
let FaceLandmarker = null;
let FilesetResolver = null;
let maxFaces = 4;
let detectionMaxWidth = 288;
let detectionCanvas = null;
let detectionContext = null;

self.addEventListener("message", async (event) => {
  const message = event.data;
  try {
    if (message.type === "init") {
      maxFaces = message.maxFaces ?? maxFaces;
      detectionMaxWidth = message.detectionMaxWidth ?? detectionMaxWidth;
      await initLandmarker();
      self.postMessage({ type: "ready" });
      return;
    }

    if (message.type === "detect") {
      const result = detectImageBitmap(message);
      self.postMessage({ type: "result", id: message.id, ...result });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      id: message?.id,
      message: error?.message || String(error)
    });
  } finally {
    message?.imageBitmap?.close?.();
  }
});

async function initLandmarker() {
  if (faceLandmarker) {
    return;
  }
  loadTasksVisionBundle();
  detectionCanvas = new OffscreenCanvas(detectionMaxWidth, detectionMaxWidth);
  detectionContext = detectionCanvas.getContext("2d", {
    alpha: false,
    desynchronized: true
  });
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  faceLandmarker = await createFaceLandmarker(vision, "CPU");
  self.postMessage({ type: "log", message: "MediaPipe classic worker detector initialized with CPU delegate." });
}

function loadTasksVisionBundle() {
  if (FaceLandmarker && FilesetResolver) {
    return;
  }
  self.exports = {};
  self.module = { exports: self.exports };
  importScripts(TASKS_VISION_CLASSIC_BUNDLE);
  const bundleExports = Object.keys(self.module.exports || {}).length ? self.module.exports : self.exports;
  FaceLandmarker = bundleExports.FaceLandmarker;
  FilesetResolver = bundleExports.FilesetResolver;
  if (!FaceLandmarker || !FilesetResolver) {
    throw new Error("Failed to load MediaPipe Tasks Vision classic worker bundle");
  }
}

function createFaceLandmarker(vision, delegate) {
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate
    },
    runningMode: "VIDEO",
    numFaces: maxFaces,
    minFaceDetectionConfidence: 0.35,
    minFacePresenceConfidence: 0.35,
    minTrackingConfidence: 0.35,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true
  });
}

function detectImageBitmap({ imageBitmap, timestampMs, sourceWidth, sourceHeight }) {
  const input = getDetectionInput(imageBitmap, sourceWidth, sourceHeight);
  const startedAt = performance.now();
  const raw = faceLandmarker.detectForVideo(input, timestampMs);
  const detectionMs = performance.now() - startedAt;
  const profile = {
    lastDetectionMs: detectionMs,
    lastInputWidth: input.width || 0,
    lastInputHeight: input.height || 0,
    lastFaceCount: raw.faceLandmarks?.length ?? 0,
    worker: true
  };
  return {
    profile,
    detectStates: toDetectStates(raw)
  };
}

function getDetectionInput(imageBitmap, sourceWidth, sourceHeight) {
  const width = sourceWidth || imageBitmap.width;
  const height = sourceHeight || imageBitmap.height;
  const scale = width > detectionMaxWidth ? detectionMaxWidth / width : 1;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  if (detectionCanvas.width !== targetWidth || detectionCanvas.height !== targetHeight) {
    detectionCanvas.width = targetWidth;
    detectionCanvas.height = targetHeight;
  }
  detectionContext.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  return detectionCanvas;
}

function toDetectStates(result) {
  return (result.faceLandmarks ?? [])
    .slice(0, maxFaces)
    .map((landmarks, index) => {
      const bounds = getLandmarkBounds(landmarks);
      const anchors = getFaceAnchors(landmarks, bounds);
      const landmarkRoll = getLandmarkRoll(anchors.leftEye, anchors.rightEye);
      const matrixPose = estimatePoseFromMatrix(result.facialTransformationMatrixes?.[index]);
      const pose = matrixPose ?? estimatePoseFromLandmarks(anchors);
      return {
        detected: DEFAULT_CONFIDENCE,
        x: anchors.eyeCenter.x * 2 - 1,
        y: -(anchors.eyeCenter.y * 2 - 1),
        s: Math.max(bounds.width, bounds.height) * 2.2,
        rx: pose.rx,
        ry: pose.ry,
        rz: matrixPose?.rz ?? (Number.isFinite(landmarkRoll) ? landmarkRoll : 0),
        landmarks,
        anchors,
        bounds,
        transformMatrix: result.facialTransformationMatrixes?.[index]?.data ?? null,
        expressions: {}
      };
    });
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

function estimatePoseFromLandmarks(anchors) {
  const eyeDistance = Math.max(0.001, distance2D(anchors.leftEye, anchors.rightEye));
  const noseOffsetX = ((anchors.noseTip?.x ?? anchors.eyeCenter.x) - anchors.eyeCenter.x) / eyeDistance;
  const mouthOffsetY = ((anchors.mouthCenter?.y ?? anchors.noseTip?.y ?? anchors.eyeCenter.y) - anchors.eyeCenter.y) / eyeDistance;
  return {
    rx: clamp((mouthOffsetY - 1.22) * 0.2, -0.18, 0.18),
    ry: clamp(noseOffsetX * 0.36, -0.24, 0.24)
  };
}

function estimatePoseFromMatrix(matrix) {
  const data = matrix?.data;
  if (!Array.isArray(data) && !(data instanceof Float32Array)) {
    return null;
  }
  const m00 = data[0];
  const m10 = data[4];
  const m20 = data[8];
  const m21 = data[9];
  const m22 = data[10];
  if (![m00, m10, m20, m21, m22].every(Number.isFinite)) {
    return null;
  }
  const sy = Math.hypot(m00, m10);
  const singular = sy < 1e-6;
  const rx = singular ? 0 : Math.atan2(m21, m22);
  const ry = Math.atan2(-m20, sy);
  const rz = singular ? 0 : Math.atan2(m10, m00);
  return {
    rx: clamp(-rx * 0.72, -0.4, 0.4),
    ry: clamp(ry * 0.78, -0.48, 0.48),
    rz: clamp(rz, -0.62, 0.62)
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

function distance2D(a, b) {
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
