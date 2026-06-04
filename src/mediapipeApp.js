import { AnchorMotionTracker } from "./AnchorMotionTracker.js";
import { EffectManager } from "./EffectManager.js";
import { FaceApiIdentityRecognizer } from "./FaceApiIdentityRecognizer.js";
import { FaceTrackManager } from "./FaceTrackManager.js";
import { IdentityTrackBinder } from "./IdentityTrackBinder.js";
import { LandmarkFaceOverlay } from "./LandmarkFaceOverlay.js";
import { MediaPipeEffectRenderer } from "./MediaPipeEffectRenderer.js";
import { MediaPipeFaceSource } from "./MediaPipeFaceSource.js";
import { PerformanceMeter } from "./PerformanceMeter.js";
import { ReferenceFaceManager } from "./ReferenceFaceManager.js";
import { UIController } from "./UIController.js";

const SETTINGS = {
  maxFaces: 4,
  detectionThreshold: 0.5,
  detectionIntervalMs: 180,
  syncDetectionIntervalMs: 280,
  detectionMaxWidth: 224,
  enableWorkerDetector: true,
  enableAnchorMotionTracker: true,
  workerInitTimeoutMs: 18000,
  uiIntervalMs: 250,
  defaultVideo: "./samples/party-hats-crop-wide_faces.webm",
  videoPresets: {
    partyHats4: "./samples/party-hats-crop-wide_faces.webm",
    partyHats3: "./samples/birthday-party-hats-mixkit-4608.mp4",
    party: "./samples/friends-selfie-pool-mixkit-43089.mp4"
  }
};

const appState = {
  currentInputMode: "video",
  effectsVisible: true,
  inputObjectUrl: null,
  animationId: 0,
  isRunning: false,
  freezeFrame: false,
  nextDetectionAt: 0,
  lastUiAt: 0,
  lastFps: 0,
  lastDetectionAt: 0,
  latestTracks: [],
  latestPredictedTracks: [],
  latestRawDetected: [],
  latestProfile: null,
  latestMotionProfile: null,
  detectionBackend: "sync",
  detectorWorker: null,
  detectorWorkerReady: false,
  detectorWorkerFailed: false,
  detectorWorkerBusy: false,
  detectorRequestId: 0,
  latestAppliedDetectionId: 0,
  pendingDetections: new Map()
};

const video = document.getElementById("inputVideo");
const canvas = document.getElementById("arCanvas");
const beautyCanvas = document.getElementById("beautyCanvas");
const faceSource = new MediaPipeFaceSource({ maxFaces: SETTINGS.maxFaces, detectionMaxWidth: SETTINGS.detectionMaxWidth });
const anchorMotionTracker = new AnchorMotionTracker({ trackWidth: SETTINGS.detectionMaxWidth });
const faceTrackManager = new FaceTrackManager({
  maxFaces: SETTINGS.maxFaces,
  detectionThreshold: SETTINGS.detectionThreshold,
  maxMatchDistance: 0.55,
  maxSameSlotDistance: 1.45
});
const performanceMeter = new PerformanceMeter();
const renderer = new MediaPipeEffectRenderer({
  THREE: window.THREE,
  canvas,
  maxFaces: SETTINGS.maxFaces
});
const faceOverlay = new LandmarkFaceOverlay({
  canvas: beautyCanvas,
  maxFaces: SETTINGS.maxFaces
});
const effectManager = new EffectManager({ THREE: window.THREE, maxFaces: SETTINGS.maxFaces });
const referenceFaceManager = new ReferenceFaceManager({ effectDefinitions: effectManager.definitions });
const recognizer = new FaceApiIdentityRecognizer({
  matchThreshold: 0.5,
  closeMatchGap: 0.08
});
const identityTrackBinder = new IdentityTrackBinder({
  referenceFaceManager,
  recognizer
});
const ui = new UIController({
  effectDefinitions: effectManager.definitions,
  maxFaces: SETTINGS.maxFaces
});

window.__PARTY_FACE_AR_MEDIAPIPE__ = {
  ready: false,
  tracks: [],
  rawDetected: [],
  fps: 0,
  profile: null,
  identity: null
};
window.__PARTY_FACE_AR_MEDIAPIPE_API__ = {
  registerReferenceFromTrack: registerReferenceFromTrackForVerification
};

effectManager.attachToFaceObjects(renderer.faceObjects);

ui.bindHandlers({
  onInputModeChange: handleInputModeChange,
  onAssignmentModeChange: (mode) => {
    effectManager.setAssignmentMode(mode);
    ui.setStatus(`Assignment mode: ${mode}`);
  },
  onFaceSelect: (track) => {
    effectManager.setAssignmentMode("manual");
    ui.setAssignmentMode?.("manual");
    ui.setStatus(`Selected Track ${track.id} / Face ${track.slotIndex + 1}. Choose an effect to bind.`);
  },
  onManualBindingChange: (target, effectId) => {
    effectManager.setAssignmentMode("manual");
    ui.setAssignmentMode?.("manual");
    effectManager.bindManualEffect(target, effectId);
    const effect = effectManager.getEffectDefinition(effectId);
    const trackLabel = Number.isFinite(target?.trackId) ? `track ${target.trackId}` : `face ${Number(target?.slotIndex ?? target) + 1}`;
    ui.setStatus(`Manual binding: ${trackLabel} -> ${effect.label}`);
  },
  onVideoFileChange: handleVideoFileChange,
  onToggleEffects: () => {
    appState.effectsVisible = !appState.effectsVisible;
    effectManager.setEffectsVisible(appState.effectsVisible);
    faceOverlay.setVisible(appState.effectsVisible);
    ui.setEffectsButton(appState.effectsVisible);
  },
  onResetBindings: () => {
    faceTrackManager.reset();
    effectManager.resetBindings();
    identityTrackBinder.reset();
    ui.renderIdentityState(identityTrackBinder.getDebugState([]));
    ui.setStatus("Bindings reset. Tracks will be rebuilt from the next detected faces.");
  },
  onReferenceFaceRegister: handleReferenceFaceRegister,
  onReferenceEffectChange: (personId, effectId) => {
    const person = referenceFaceManager.updatePersonEffect(personId, effectId);
    identityTrackBinder.clearBindingsForMissingPeople();
    identityTrackBinder.reset();
    effectManager.clearIdentityBindings();
    ui.renderIdentityState(identityTrackBinder.getDebugState(appState.latestPredictedTracks));
    if (person) {
      ui.setStatus(`Updated ${person.name}: ${person.effectLabel}`);
    }
  },
  onReferenceRemove: (personId) => {
    referenceFaceManager.removePerson(personId);
    identityTrackBinder.clearBindingsForMissingPeople();
    identityTrackBinder.reset();
    effectManager.clearIdentityBindings();
    ui.renderIdentityState(identityTrackBinder.getDebugState(appState.latestPredictedTracks));
    ui.setStatus("Reference face removed. Identity tracks will be rebuilt.");
  }
});

window.addEventListener("resize", resizeCanvas);

window.addEventListener("load", async () => {
  try {
    ui.setStatus("Loading MediaPipe Face Landmarker...");
    const params = new URLSearchParams(window.location.search);
    applyRuntimeParams(params);
    await initDetectionBackend();
    window.__PARTY_FACE_AR_MEDIAPIPE__.ready = true;
    const preset = params.get("video");
    const pauseAtParam = params.get("pauseAt");
    const pauseAt = pauseAtParam === null ? null : Number(pauseAtParam);
    const videoUrl = SETTINGS.videoPresets[preset] ?? preset ?? SETTINGS.defaultVideo;
    await startWithVideoUrl(videoUrl, Number.isFinite(pauseAt) ? pauseAt : null);
  } catch (error) {
    ui.setStatus(`MediaPipe AR failed: ${error.message}`);
    throw error;
  }
});

function applyRuntimeParams(params) {
  if (params.has("detectWidth")) {
    const detectionWidth = Number(params.get("detectWidth"));
    SETTINGS.detectionMaxWidth = Math.max(128, Math.min(384, Math.round(detectionWidth)));
    faceSource.detectionMaxWidth = SETTINGS.detectionMaxWidth;
    anchorMotionTracker.trackWidth = SETTINGS.detectionMaxWidth;
  }
  if (params.has("worker")) {
    SETTINGS.enableWorkerDetector = params.get("worker") !== "0";
  }
  if (params.has("profile")) {
    effectManager.setEffectProfile(params.get("profile"));
  }
  SETTINGS.enableAnchorMotionTracker = params.get("motionTracker") !== "0";
}

async function handleInputModeChange(mode) {
  appState.currentInputMode = mode;
  if (mode === "camera") {
    await startWithCamera();
  } else {
    ui.setStatus("Choose a local video file with 3-4 visible faces.");
    document.getElementById("videoFileInput").click();
  }
}

async function handleVideoFileChange(file) {
  if (!file) {
    return;
  }
  appState.currentInputMode = "video";
  ui.setInputMode("video");
  if (appState.inputObjectUrl) {
    URL.revokeObjectURL(appState.inputObjectUrl);
  }
  appState.inputObjectUrl = URL.createObjectURL(file);
  await startVideoSource(appState.inputObjectUrl, `Video loaded: ${file.name}`);
}

async function handleReferenceFaceRegister({ name, effectId, file }) {
  if (!file) {
    ui.setStatus("Choose a reference face image first.");
    return;
  }
  try {
    ui.setStatus("Detecting the reference face...");
    const { descriptor, imageDataUrl } = await recognizer.createReferenceDescriptorFromFile(file);
    const person = referenceFaceManager.addPerson({
      name,
      effectId,
      descriptor,
      imageDataUrl,
      status: "registered"
    });
    identityTrackBinder.reset();
    effectManager.clearIdentityBindings();
    ui.renderIdentityState(identityTrackBinder.getDebugState(appState.latestPredictedTracks));
    ui.setStatus(`Registered ${person.name}: ${person.effectLabel}`);
  } catch (error) {
    ui.setStatus(`Reference registration failed: ${error.message}`);
  }
}

async function startWithVideoUrl(url, pauseAt = null) {
  appState.currentInputMode = "video";
  ui.setInputMode("video");
  await startVideoSource(url, `MediaPipe video mode: ${url}`, pauseAt);
}

async function initDetectionBackend() {
  if (canUseWorkerDetector()) {
    try {
      await initDetectorWorker();
      appState.detectionBackend = "worker";
      ui.setStatus("MediaPipe detector running in a worker.");
      return;
    } catch (error) {
      console.warn("MediaPipe worker detector failed; falling back to main thread:", error);
      cleanupDetectorWorker();
    }
  }

  appState.detectionBackend = "sync";
  await faceSource.init();
}

function canUseWorkerDetector() {
  return SETTINGS.enableWorkerDetector
    && typeof Worker !== "undefined"
    && typeof createImageBitmap === "function"
    && typeof OffscreenCanvas !== "undefined";
}

function initDetectorWorker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./src/MediaPipeFaceWorker.js");
    let settled = false;
    const timeout = window.setTimeout(() => {
      settled = true;
      reject(new Error("Timed out initializing MediaPipe worker"));
    }, SETTINGS.workerInitTimeoutMs);

    worker.addEventListener("message", (event) => {
      const message = event.data;
      if (message.type === "log") {
        console.info(message.message);
        return;
      }
      if (message.type === "ready") {
        window.clearTimeout(timeout);
        settled = true;
        appState.detectorWorkerReady = true;
        resolve();
        return;
      }
      if (!settled && message.type === "error") {
        window.clearTimeout(timeout);
        settled = true;
        reject(new Error(message.message || "MediaPipe worker initialization failed"));
        return;
      }
      handleDetectorWorkerMessage(message);
    });

    worker.addEventListener("error", (event) => {
      window.clearTimeout(timeout);
      settled = true;
      reject(new Error(event.message || "MediaPipe worker failed to load"));
    }, { once: true });

    appState.detectorWorker = worker;
    worker.postMessage({
      type: "init",
      maxFaces: SETTINGS.maxFaces,
      detectionMaxWidth: SETTINGS.detectionMaxWidth
    });
  });
}

function cleanupDetectorWorker() {
  appState.detectorWorker?.terminate?.();
  appState.detectorWorker = null;
  appState.detectorWorkerReady = false;
  appState.detectorWorkerFailed = true;
  appState.detectorWorkerBusy = false;
  appState.pendingDetections.clear();
}

async function startWithCamera() {
  appState.currentInputMode = "camera";
  ui.setInputMode("camera");
  stopLoop();
  ui.setStatus("Requesting camera. Use HTTPS or localhost if the browser blocks access.");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 960 },
      height: { ideal: 720 }
    },
    audio: false
  });
  video.srcObject = stream;
  video.removeAttribute("src");
  video.loop = false;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  resizeCanvas();
  startLoop("MediaPipe camera mode running.");
}

async function startVideoSource(src, status, pauseAt = null) {
  stopLoop();
  video.pause();
  video.srcObject = null;
  video.src = src;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await waitForVideo(video);
  appState.freezeFrame = Number.isFinite(pauseAt);
  if (appState.freezeFrame) {
    await seekVideo(video, pauseAt);
    video.pause();
  } else {
    await video.play();
  }
  resizeCanvas();
  startLoop(status);
}

function startLoop(status) {
  faceTrackManager.reset();
  effectManager.resetBindings();
  identityTrackBinder.reset();
  performanceMeter.reset?.();
  anchorMotionTracker.reset();
  appState.isRunning = true;
  appState.nextDetectionAt = 0;
  appState.lastUiAt = 0;
  appState.lastFps = 0;
  appState.lastDetectionAt = 0;
  appState.latestTracks = [];
  appState.latestPredictedTracks = [];
  appState.latestRawDetected = [];
  appState.latestProfile = null;
  appState.latestMotionProfile = null;
  appState.detectorWorkerBusy = false;
  appState.latestAppliedDetectionId = 0;
  appState.pendingDetections.clear();
  ui.setStatus(status);
  ui.renderIdentityState(identityTrackBinder.getDebugState([]));
  renderFrame();
}

function stopLoop() {
  appState.isRunning = false;
  if (appState.animationId) {
    cancelAnimationFrame(appState.animationId);
    appState.animationId = 0;
  }
}

function renderFrame() {
  if (!appState.isRunning) {
    return;
  }

  const now = performance.now();
  if (appState.detectionBackend === "worker") {
    requestWorkerDetectionIfNeeded(now);
  } else if ((!appState.freezeFrame && now >= appState.nextDetectionAt) || appState.latestTracks.length === 0) {
    const { detectStates, profile } = faceSource.detect(video, Math.round(now));
    appState.latestRawDetected = detectStates.map((state) => state.detected);
    appState.latestTracks = faceTrackManager.update(detectStates, now);
    anchorMotionTracker.seed(video, appState.latestTracks);
    appState.latestProfile = profile;
    appState.lastDetectionAt = now;
    appState.nextDetectionAt = now + getNextDetectionInterval(profile);
  }

  const rawDetected = appState.latestRawDetected;
  const predictionTime = appState.freezeFrame ? appState.lastDetectionAt : now;
  let tracks = faceTrackManager.predictTracks(predictionTime);
  if (SETTINGS.enableAnchorMotionTracker && !appState.freezeFrame && appState.latestTracks.length > 0) {
    tracks = anchorMotionTracker.refine(video, tracks);
    appState.latestMotionProfile = anchorMotionTracker.profile;
  }
  appState.latestPredictedTracks = tracks;
  const fps = performanceMeter.tick(now);
  appState.lastFps = fps;

  const identityState = identityTrackBinder.update(tracks, now, { sourceElement: video });
  effectManager.setIdentityBindings(identityTrackBinder.getEffectBindings());
  effectManager.updateTrackEffects(tracks);
  renderer.update(tracks, now);
  effectManager.updateTrackVisibility(tracks);
  renderer.render();
  faceOverlay.update(tracks, now);

  if (now - appState.lastUiAt >= SETTINGS.uiIntervalMs) {
    ui.renderDebug({
      tracks,
      fps,
      mode: effectManager.assignmentMode,
      effectManager,
      rawDetected
    });
    ui.renderIdentityState(identityState);
    appState.lastUiAt = now;
  }

  window.__PARTY_FACE_AR_MEDIAPIPE__ = {
    ready: true,
    tracks,
    detectedTracks: appState.latestTracks,
    rawDetected,
    fps,
    activeTrackCount: tracks.filter((track) => track.active).length,
    profile: {
      ...appState.latestProfile,
      motion: appState.latestMotionProfile
    },
    detectionBackend: appState.detectionBackend,
    identity: identityState
  };

  appState.animationId = requestAnimationFrame(renderFrame);
}

async function registerReferenceFromTrackForVerification({ trackId, name, effectId } = {}) {
  const track = appState.latestPredictedTracks.find((candidate) => candidate.id === Number(trackId))
    ?? appState.latestTracks.find((candidate) => candidate.id === Number(trackId));
  if (!track) {
    throw new Error(`Track ${trackId} is not available for reference registration`);
  }
  const imageDataUrl = cropTrackImage(track);
  const { descriptor } = await recognizer.createReferenceDescriptorFromTrack(track, imageDataUrl, video);
  const person = referenceFaceManager.addPerson({
    name,
    effectId,
    descriptor,
    imageDataUrl,
    status: "registered-from-track"
  });
  identityTrackBinder.reset();
  effectManager.clearIdentityBindings();
  const identityState = identityTrackBinder.update(appState.latestPredictedTracks, performance.now(), { sourceElement: video });
  ui.renderIdentityState(identityState);
  return person;
}

function cropTrackImage(track) {
  const bounds = track.bounds ?? getBoundsFromAnchors(track.anchors);
  if (!bounds || !video.videoWidth || !video.videoHeight) {
    return "";
  }
  const padding = Math.max(bounds.width, bounds.height) * 0.32;
  const sx = clamp((bounds.minX - padding) * video.videoWidth, 0, video.videoWidth - 1);
  const sy = clamp((bounds.minY - padding) * video.videoHeight, 0, video.videoHeight - 1);
  const ex = clamp((bounds.maxX + padding) * video.videoWidth, sx + 1, video.videoWidth);
  const ey = clamp((bounds.maxY + padding) * video.videoHeight, sy + 1, video.videoHeight);
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, Math.round(ex - sx));
  cropCanvas.height = Math.max(1, Math.round(ey - sy));
  cropCanvas.getContext("2d").drawImage(video, sx, sy, cropCanvas.width, cropCanvas.height, 0, 0, cropCanvas.width, cropCanvas.height);
  return cropCanvas.toDataURL("image/png");
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getNextDetectionInterval(profile) {
  const detectionMs = Number(profile?.lastDetectionMs ?? 0);
  const baseInterval = appState.detectionBackend === "worker"
    ? SETTINGS.detectionIntervalMs
    : SETTINGS.syncDetectionIntervalMs;
  const detectionPace = appState.detectionBackend === "worker"
    ? detectionMs * 1.35
    : detectionMs * 1.35;
  return Math.max(baseInterval, Math.min(900, detectionPace));
}

function requestWorkerDetectionIfNeeded(now) {
  if (!appState.detectorWorkerReady || appState.detectorWorkerFailed || appState.detectorWorkerBusy) {
    return;
  }
  if (appState.freezeFrame && appState.latestTracks.length > 0) {
    return;
  }
  if (!appState.freezeFrame && now < appState.nextDetectionAt && appState.latestTracks.length > 0) {
    return;
  }
  if (!video.videoWidth || !video.videoHeight) {
    return;
  }

  const requestId = ++appState.detectorRequestId;
  const timestampMs = Math.round(now);
  appState.detectorWorkerBusy = true;
  appState.pendingDetections.set(requestId, {
    timestampMs,
    sentAt: now
  });

  createImageBitmap(video)
    .then((imageBitmap) => {
      appState.detectorWorker?.postMessage({
        type: "detect",
        id: requestId,
        imageBitmap,
        timestampMs,
        sourceWidth: video.videoWidth,
        sourceHeight: video.videoHeight
      }, [imageBitmap]);
    })
    .catch((error) => {
      console.warn("Failed to create worker detection frame:", error);
      appState.pendingDetections.delete(requestId);
      appState.detectorWorkerBusy = false;
      fallbackToSyncDetector(error);
    });
}

function handleDetectorWorkerMessage(message) {
  if (message.type === "error") {
    console.warn("MediaPipe worker detector error:", message.message);
    appState.pendingDetections.delete(message.id);
    appState.detectorWorkerBusy = false;
    fallbackToSyncDetector(new Error(message.message || "Worker detector error"));
    return;
  }

  if (message.type !== "result") {
    return;
  }

  const request = appState.pendingDetections.get(message.id);
  appState.pendingDetections.delete(message.id);
  appState.detectorWorkerBusy = false;
  if (!request || message.id <= appState.latestAppliedDetectionId) {
    return;
  }

  appState.latestAppliedDetectionId = message.id;
  const now = performance.now();
  const detectStates = message.detectStates ?? [];
  appState.latestRawDetected = detectStates.map((state) => state.detected);
  appState.latestTracks = faceTrackManager.update(detectStates, request.timestampMs);
  anchorMotionTracker.seed(video, appState.latestTracks);
  appState.latestProfile = {
    ...message.profile,
    roundTripMs: now - request.sentAt,
    sourceAgeMs: now - request.timestampMs
  };
  appState.lastDetectionAt = request.timestampMs;
  appState.nextDetectionAt = now + getNextDetectionInterval(message.profile);
}

async function fallbackToSyncDetector(error) {
  if (appState.detectionBackend === "sync") {
    return;
  }
  ui.setStatus(`Worker detector fallback: ${error.message}`);
  cleanupDetectorWorker();
  appState.detectionBackend = "sync";
  appState.detectorWorkerFailed = false;
  await faceSource.init();
}

function resizeCanvas() {
  const width = video.videoWidth || 960;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;
  renderer.resize(width, height);
  faceOverlay.resize(width, height);
}

function waitForVideo(element) {
  return new Promise((resolve, reject) => {
    if (element.readyState >= 2 && element.videoWidth) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timed out loading video"));
    }, 15000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener("loadeddata", onLoaded);
      element.removeEventListener("error", onError);
    };
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(element.error?.message || "Video failed to load"));
    };
    element.addEventListener("loadeddata", onLoaded, { once: true });
    element.addEventListener("error", onError, { once: true });
  });
}

function seekVideo(element, time) {
  return new Promise((resolve, reject) => {
    const targetTime = Math.min(Math.max(0, time), Math.max(0, element.duration - 0.05));
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out seeking to ${targetTime.toFixed(2)}s`));
    }, 10000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener("seeked", onSeeked);
      element.removeEventListener("error", onError);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(element.error?.message || "Video seek failed"));
    };
    element.addEventListener("seeked", onSeeked, { once: true });
    element.addEventListener("error", onError, { once: true });
    element.currentTime = targetTime;
  });
}
