import * as faceapi from "../vendor/face-api/dist/face-api.esm.js";

const DEFAULT_MODEL_URL = "./vendor/face-api/model";
const DEFAULT_MATCH_THRESHOLD = 0.5;
const DEFAULT_CLOSE_GAP = 0.08;
const DEFAULT_INPUT_SIZE = 224;
const DEFAULT_SCORE_THRESHOLD = 0.18;
const DEFAULT_CROP_SIZE = 288;
const DEFAULT_CROP_PADDING = [0.46, 0.72];

export class FaceApiIdentityRecognizer {
  constructor({
    modelUrl = DEFAULT_MODEL_URL,
    matchThreshold = DEFAULT_MATCH_THRESHOLD,
    closeMatchGap = DEFAULT_CLOSE_GAP,
    inputSize = DEFAULT_INPUT_SIZE,
    scoreThreshold = DEFAULT_SCORE_THRESHOLD,
    cropSize = DEFAULT_CROP_SIZE,
    cropPadding = DEFAULT_CROP_PADDING
  } = {}) {
    this.modelUrl = modelUrl;
    this.matchThreshold = matchThreshold;
    this.closeMatchGap = closeMatchGap;
    this.inputSize = inputSize;
    this.scoreThreshold = scoreThreshold;
    this.cropSize = cropSize;
    this.cropPadding = cropPadding;
    this.initialized = false;
    this.initPromise = null;
    this.queue = Promise.resolve();
    this.detectorOptions = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }
    if (!this.initPromise) {
      this.initPromise = this.loadModels();
    }
    await this.initPromise;
  }

  async loadModels() {
    faceapi.tf.setWasmPaths("./vendor/tfjs-backend-wasm/");
    await faceapi.tf.setBackend("webgl");
    await faceapi.tf.ready();
    await faceapi.tf.enableProdMode();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.load(this.modelUrl),
      faceapi.nets.faceLandmark68TinyNet.load(this.modelUrl),
      faceapi.nets.faceRecognitionNet.load(this.modelUrl)
    ]);
    this.detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: this.inputSize,
      scoreThreshold: this.scoreThreshold
    });
    this.initialized = true;
  }

  enqueue(task) {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => {});
    return run;
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
    return this.enqueue(async () => {
      const result = await this.detectSingleDescriptor(image, {
        source: "reference-image"
      });
      if (!result) {
        throw new Error("No recognizable face was detected in the reference image");
      }
      return result.descriptor;
    });
  }

  async createReferenceDescriptorFromTrack(track, imageDataUrl = "", sourceElement = null) {
    const descriptor = await this.createDescriptorFromTrack(track, {
      source: "track-reference"
    }, sourceElement);
    if (!descriptor) {
      throw new Error("No recognizable face was detected in the selected track");
    }
    return {
      descriptor,
      imageDataUrl
    };
  }

  async createDescriptorFromTrack(track, metadata = {}, sourceElement = null) {
    if (!track || !sourceElement) {
      return null;
    }
    return this.enqueue(async () => {
      for (const padding of this.cropPadding) {
        const crop = cropTrackFace(sourceElement, track, {
          paddingFactor: padding,
          maxSize: this.cropSize
        });
        if (!crop) {
          continue;
        }
        const result = await this.detectSingleDescriptor(crop.canvas, {
          source: "track-crop",
          trackId: track.id,
          padding,
          crop: crop.rect,
          ...metadata
        });
        if (result) {
          return result.descriptor;
        }
      }
      return null;
    });
  }

  async matchTrack(track, referencePeople, sourceElement = null) {
    const descriptor = await this.createDescriptorFromTrack(track, {
      source: "live-track",
      trackId: track?.id
    }, sourceElement);
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
    const matched = best.distance <= this.matchThreshold
      && (!secondBest || gap >= this.closeMatchGap);

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
        distance: faceDescriptorDistance(descriptor, person.descriptor)
      }))
      .filter((candidate) => Number.isFinite(candidate.distance))
      .sort((a, b) => a.distance - b.distance);
  }

  async detectSingleDescriptor(input, metadata = {}) {
    await this.init();
    const detections = await faceapi
      .detectAllFaces(input, this.detectorOptions)
      .withFaceLandmarks(true)
      .withFaceDescriptors();
    const best = detections
      .slice()
      .sort((a, b) => faceArea(b.detection?.box) - faceArea(a.detection?.box))[0];
    if (!best?.descriptor?.length) {
      return null;
    }
    const detection = best.detection;
    return {
      descriptor: {
        provider: "face-api-face-recognition-net",
        vector: Array.from(best.descriptor),
        metadata: {
          ...metadata,
          detectionScore: detection?.score ?? null,
          box: detection?.box ? {
            x: detection.box.x,
            y: detection.box.y,
            width: detection.box.width,
            height: detection.box.height
          } : null
        }
      },
      detection
    };
  }

  getDebugInfo() {
    return {
      provider: "face-api-face-recognition-net",
      modelUrl: this.modelUrl,
      matchThreshold: this.matchThreshold,
      closeMatchGap: this.closeMatchGap,
      inputSize: this.inputSize,
      scoreThreshold: this.scoreThreshold,
      initialized: this.initialized
    };
  }
}

export function faceDescriptorDistance(a, b) {
  const vectorA = a?.vector;
  const vectorB = b?.vector;
  if (!vectorA?.length || !vectorB?.length || vectorA.length !== vectorB.length) {
    return Infinity;
  }
  let sum = 0;
  for (let index = 0; index < vectorA.length; index += 1) {
    const delta = Number(vectorA[index]) - Number(vectorB[index]);
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export function cropTrackFace(sourceElement, track, { paddingFactor = 0.46, maxSize = DEFAULT_CROP_SIZE } = {}) {
  const sourceWidth = getSourceWidth(sourceElement);
  const sourceHeight = getSourceHeight(sourceElement);
  if (!sourceWidth || !sourceHeight) {
    return null;
  }
  const bounds = track.bounds ?? getBoundsFromAnchors(track.anchors);
  if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
    return null;
  }

  const padding = Math.max(bounds.width, bounds.height) * paddingFactor;
  const sx = clamp((bounds.minX - padding) * sourceWidth, 0, sourceWidth - 1);
  const sy = clamp((bounds.minY - padding) * sourceHeight, 0, sourceHeight - 1);
  const ex = clamp((bounds.maxX + padding) * sourceWidth, sx + 1, sourceWidth);
  const ey = clamp((bounds.maxY + padding) * sourceHeight, sy + 1, sourceHeight);
  const cropWidth = Math.max(1, ex - sx);
  const cropHeight = Math.max(1, ey - sy);
  const scale = Math.min(1, maxSize / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth * scale));
  canvas.height = Math.max(1, Math.round(cropHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(sourceElement, sx, sy, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  return {
    canvas,
    rect: {
      sx,
      sy,
      width: cropWidth,
      height: cropHeight,
      scale
    }
  };
}

function getBoundsFromAnchors(anchors) {
  const points = anchors ? Object.values(anchors).filter(Boolean) : [];
  if (!points.length) {
    return null;
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
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

function getSourceWidth(sourceElement) {
  return sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width || 0;
}

function getSourceHeight(sourceElement) {
  return sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height || 0;
}

function faceArea(box) {
  return Math.max(0, box?.width ?? 0) * Math.max(0, box?.height ?? 0);
}

function distanceToConfidence(distance, threshold) {
  if (!Number.isFinite(distance)) {
    return 0;
  }
  return clamp(1 - distance / Math.max(0.001, threshold * 1.35), 0, 1);
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
