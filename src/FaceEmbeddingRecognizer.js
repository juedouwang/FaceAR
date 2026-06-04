const DEFAULT_MATCH_THRESHOLD = 0.28;
const DEFAULT_CLOSE_GAP = 0.035;
const DEFAULT_EXACT_MATCH_DISTANCE = 0.0025;

const LANDMARK_INDICES = [
  10, 21, 33, 46, 54, 58, 67, 93, 103, 109, 127, 132, 133, 136, 148, 152,
  162, 172, 234, 251, 263, 284, 288, 297, 323, 332, 338, 356, 361, 362, 365,
  377, 389, 397, 454
];

const ANCHOR_NAMES = [
  "leftEye",
  "rightEye",
  "noseTip",
  "forehead",
  "chin",
  "leftCheek",
  "rightCheek",
  "mouthCenter",
  "leftTemple",
  "rightTemple"
];

export class FaceEmbeddingRecognizer {
  constructor({
    faceSource,
    matchThreshold = DEFAULT_MATCH_THRESHOLD,
    closeMatchGap = DEFAULT_CLOSE_GAP,
    exactMatchDistance = DEFAULT_EXACT_MATCH_DISTANCE
  } = {}) {
    this.faceSource = faceSource;
    this.matchThreshold = matchThreshold;
    this.closeMatchGap = closeMatchGap;
    this.exactMatchDistance = exactMatchDistance;
  }

  async createReferenceDescriptorFromFile(file) {
    const image = await readImageFile(file);
    const descriptor = await this.createReferenceDescriptorFromImage(image);
    return {
      descriptor,
      imageDataUrl: await fileToDataUrl(file)
    };
  }

  async createReferenceDescriptorFromImage(image) {
    const state = await this.detectSingleFaceState(image);
    if (!state) {
      throw new Error("No face was detected in the reference image");
    }
    return this.createDescriptorFromState(state, {
      source: "reference-image"
    });
  }

  createReferenceDescriptorFromTrack(track, imageDataUrl = "") {
    const descriptor = this.createDescriptorFromTrack(track, {
      source: "track-reference"
    });
    return {
      descriptor,
      imageDataUrl
    };
  }

  createDescriptorFromTrack(track, metadata = {}) {
    if (!track) {
      return null;
    }
    return this.createDescriptor({
      landmarks: track.landmarks,
      anchors: track.anchors,
      bounds: track.bounds
    }, {
      source: "track",
      trackId: track.id,
      ...metadata
    });
  }

  createDescriptorFromState(state, metadata = {}) {
    return this.createDescriptor({
      landmarks: state.landmarks,
      anchors: state.anchors,
      bounds: state.bounds
    }, metadata);
  }

  createDescriptor(faceGeometry, metadata = {}) {
    const anchors = faceGeometry?.anchors;
    const landmarks = faceGeometry?.landmarks;
    const bounds = faceGeometry?.bounds ?? getBoundsFromLandmarks(landmarks);
    const frame = createNormalizationFrame(anchors, bounds);
    if (!frame) {
      return null;
    }

    const vector = [];
    LANDMARK_INDICES.forEach((index) => {
      const point = landmarks?.[index];
      appendNormalizedPoint(vector, point, frame);
    });
    ANCHOR_NAMES.forEach((name) => {
      appendNormalizedPoint(vector, anchors?.[name], frame);
    });
    appendShapeFeatures(vector, anchors, bounds, frame);

    const normalizedVector = l2Normalize(vector.map((value) => (
      Number.isFinite(value) ? clamp(value, -3, 3) : 0
    )));
    if (!normalizedVector.length) {
      return null;
    }

    return {
      provider: "mediapipe-landmark-geometry",
      vector: normalizedVector,
      frame,
      metadata
    };
  }

  matchTrack(track, referencePeople) {
    const descriptor = this.createDescriptorFromTrack(track);
    return this.matchDescriptor(descriptor, referencePeople);
  }

  matchDescriptor(descriptor, referencePeople) {
    if (!descriptor?.vector?.length || !referencePeople?.length) {
      return {
        matched: false,
        status: "no-descriptor",
        descriptor,
        best: null,
        secondBest: null
      };
    }

    const candidates = this.rankDescriptor(descriptor, referencePeople);

    const best = candidates[0] ?? null;
    const secondBest = candidates[1] ?? null;
    if (!best) {
      return {
        matched: false,
        status: "no-reference",
        descriptor,
        best: null,
        secondBest: null
      };
    }

    const gap = secondBest ? secondBest.distance - best.distance : Infinity;
    const exactButNotDuplicate = best.distance <= this.exactMatchDistance
      && (!secondBest || secondBest.distance > this.exactMatchDistance);
    const matched = best.distance <= this.matchThreshold && (gap >= this.closeMatchGap || exactButNotDuplicate);
    return {
      matched,
      status: matched ? "matched" : best.distance <= this.matchThreshold ? "ambiguous" : "below-threshold",
      descriptor,
      personId: matched ? best.person.personId : null,
      personName: matched ? best.person.name : null,
      effectId: matched ? best.person.effectId : null,
      distance: best.distance,
      confidence: distanceToConfidence(best.distance, this.matchThreshold),
      gap,
      best: {
        personId: best.person.personId,
        name: best.person.name,
        effectId: best.person.effectId,
        distance: best.distance
      },
      secondBest: secondBest ? {
        personId: secondBest.person.personId,
        name: secondBest.person.name,
        effectId: secondBest.person.effectId,
        distance: secondBest.distance
      } : null
    };
  }

  rankDescriptor(descriptor, referencePeople) {
    if (!descriptor?.vector?.length || !referencePeople?.length) {
      return [];
    }
    return referencePeople
      .map((person) => ({
        person,
        distance: descriptorDistance(descriptor, person.descriptor)
      }))
      .filter((candidate) => Number.isFinite(candidate.distance))
      .sort((a, b) => a.distance - b.distance);
  }

  async detectSingleFaceState(image) {
    if (!this.faceSource?.detectImage) {
      throw new Error("MediaPipe image detector is not available");
    }
    const { detectStates: states } = await this.faceSource.detectImage(image);
    if (!states.length) {
      return null;
    }
    return states
      .slice()
      .sort((a, b) => getFaceArea(b.bounds) - getFaceArea(a.bounds))[0];
  }
}

export function descriptorDistance(a, b) {
  const vectorA = a?.vector;
  const vectorB = b?.vector;
  if (!vectorA?.length || !vectorB?.length) {
    return Infinity;
  }
  const length = Math.min(vectorA.length, vectorB.length);
  if (!length) {
    return Infinity;
  }
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    const delta = Number(vectorA[index]) - Number(vectorB[index]);
    sum += delta * delta;
  }
  return Math.sqrt(sum / length);
}

export function __faceEmbeddingTestHooks() {
  return {
    createNormalizationFrame,
    descriptorDistance,
    l2Normalize,
    LANDMARK_INDICES,
    ANCHOR_NAMES
  };
}

function createNormalizationFrame(anchors, bounds) {
  const leftEye = anchors?.leftEye;
  const rightEye = anchors?.rightEye;
  const eyeCenter = anchors?.eyeCenter ?? midpoint(leftEye, rightEye);
  if (!leftEye || !rightEye || !eyeCenter) {
    return null;
  }
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const eyeDistance = Math.hypot(dx, dy);
  const boundsScale = Math.max(bounds?.width ?? 0, bounds?.height ?? 0, 0.001);
  const scale = Math.max(eyeDistance, boundsScale * 0.32, 0.001);
  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  return {
    center: eyeCenter,
    scale,
    angle,
    cos,
    sin
  };
}

function appendNormalizedPoint(vector, point, frame) {
  if (!point) {
    vector.push(0, 0, 0);
    return;
  }
  const localX = (point.x - frame.center.x) / frame.scale;
  const localY = (point.y - frame.center.y) / frame.scale;
  const rotatedX = localX * frame.cos - localY * frame.sin;
  const rotatedY = localX * frame.sin + localY * frame.cos;
  vector.push(rotatedX, rotatedY, (point.z ?? 0) / frame.scale);
}

function appendShapeFeatures(vector, anchors, bounds, frame) {
  const leftEye = anchors?.leftEye;
  const rightEye = anchors?.rightEye;
  const noseTip = anchors?.noseTip;
  const mouthCenter = anchors?.mouthCenter;
  const chin = anchors?.chin;
  const forehead = anchors?.forehead;
  const leftCheek = anchors?.leftCheek;
  const rightCheek = anchors?.rightCheek;
  vector.push(
    safeRatio(distance2D(leftEye, rightEye), frame.scale),
    safeRatio(distance2D(leftCheek, rightCheek), frame.scale),
    safeRatio(distance2D(forehead, chin), frame.scale),
    safeRatio(distance2D(noseTip, mouthCenter), frame.scale),
    safeRatio(distance2D(mouthCenter, chin), frame.scale),
    safeRatio(bounds?.width, bounds?.height),
    safeRatio(bounds?.height, frame.scale)
  );
}

function l2Normalize(vector) {
  const finiteVector = vector.map((value) => Number(value)).filter(Number.isFinite);
  const norm = Math.hypot(...finiteVector);
  if (!norm) {
    return finiteVector;
  }
  return finiteVector.map((value) => value / norm);
}

function getBoundsFromLandmarks(landmarks) {
  if (!Array.isArray(landmarks) || !landmarks.length) {
    return null;
  }
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

function midpoint(a, b) {
  if (!a || !b) {
    return null;
  }
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2
  };
}

function distance2D(a, b) {
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function safeRatio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < 0.00001) {
    return 0;
  }
  return numerator / denominator;
}

function distanceToConfidence(distance, threshold) {
  if (!Number.isFinite(distance)) {
    return 0;
  }
  return clamp(1 - distance / Math.max(0.001, threshold * 1.35), 0, 1);
}

function getFaceArea(bounds) {
  return Math.max(0, bounds?.width ?? 0) * Math.max(0, bounds?.height ?? 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Reference image failed to load"));
    };
    image.src = url;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Reference image failed to read"));
    reader.readAsDataURL(file);
  });
}
