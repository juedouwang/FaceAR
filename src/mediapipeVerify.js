import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const ui = {
  video: document.getElementById("verifyVideo"),
  canvas: document.getElementById("verifyCanvas"),
  status: document.getElementById("verifyStatus"),
  urlInput: document.getElementById("videoUrlInput"),
  secondsInput: document.getElementById("sampleSecondsInput"),
  fpsInput: document.getElementById("sampleFpsInput"),
  runButton: document.getElementById("runVerifyButton"),
  maxFaces: document.getElementById("mpMaxFaces"),
  threeFaceRatio: document.getElementById("mpThreeFaceRatio"),
  frames: document.getElementById("mpFrames"),
  stats: document.getElementById("mpStats")
};

let faceLandmarker = null;
let drawingUtils = null;
let isRunning = false;

window.__MEDIAPIPE_VERIFY__ = {
  ready: false,
  running: false,
  result: null,
  runVerification
};

ui.runButton.addEventListener("click", () => {
  runVerification({
    url: ui.urlInput.value,
    seconds: Number(ui.secondsInput.value),
    sampleFps: Number(ui.fpsInput.value)
  });
});

window.addEventListener("load", async () => {
  const params = new URLSearchParams(window.location.search);
  const video = params.get("video");
  const seconds = params.get("seconds");
  const sampleFps = params.get("sampleFps");

  if (video) {
    ui.urlInput.value = video;
  }
  if (seconds) {
    ui.secondsInput.value = seconds;
  }
  if (sampleFps) {
    ui.fpsInput.value = sampleFps;
  }

  await initFaceLandmarker();

  if (params.get("autorun") === "1") {
    await runVerification({
      url: ui.urlInput.value,
      seconds: Number(ui.secondsInput.value),
      sampleFps: Number(ui.fpsInput.value)
    });
  }
});

async function initFaceLandmarker() {
  setStatus("Loading MediaPipe Face Landmarker...");
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numFaces: 4,
    minFaceDetectionConfidence: 0.35,
    minFacePresenceConfidence: 0.35,
    minTrackingConfidence: 0.35,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true
  });
  drawingUtils = new DrawingUtils(ui.canvas.getContext("2d"));
  window.__MEDIAPIPE_VERIFY__.ready = true;
  setStatus("MediaPipe ready.");
}

async function runVerification(options = {}) {
  if (isRunning) {
    return window.__MEDIAPIPE_VERIFY__.result;
  }
  if (!faceLandmarker) {
    await initFaceLandmarker();
  }

  const url = options.url || ui.urlInput.value;
  const seconds = clamp(Number(options.seconds) || 8, 1, 30);
  const sampleFps = clamp(Number(options.sampleFps) || 4, 1, 12);

  isRunning = true;
  window.__MEDIAPIPE_VERIFY__.running = true;
  window.__MEDIAPIPE_VERIFY__.result = null;
  resetStats();
  setStatus(`Loading video: ${url}`);

  try {
    await loadVideo(url);
    prepareCanvas();
    const result = await sampleVideo({ url, seconds, sampleFps });
    window.__MEDIAPIPE_VERIFY__.result = result;
    renderStats(result);
    setStatus(`Done. Max faces: ${result.maxFaces}, 3+ ratio: ${formatPercent(result.threePlusRatio)}.`);
    return result;
  } catch (error) {
    const result = {
      url,
      error: error instanceof Error ? error.message : String(error)
    };
    window.__MEDIAPIPE_VERIFY__.result = result;
    renderStats(result);
    setStatus(`Failed: ${result.error}`);
    return result;
  } finally {
    isRunning = false;
    window.__MEDIAPIPE_VERIFY__.running = false;
  }
}

async function loadVideo(url) {
  ui.video.pause();
  ui.video.removeAttribute("src");
  ui.video.load();
  ui.video.src = url;
  ui.video.crossOrigin = "anonymous";
  ui.video.muted = true;
  ui.video.playsInline = true;
  ui.video.preload = "auto";
  await waitForEvent(ui.video, "loadedmetadata", 15000);
}

function prepareCanvas() {
  const width = ui.video.videoWidth || 960;
  const height = ui.video.videoHeight || 720;
  ui.canvas.width = width;
  ui.canvas.height = height;
}

async function sampleVideo({ url, seconds, sampleFps }) {
  const duration = Number.isFinite(ui.video.duration) ? ui.video.duration : seconds;
  const usableDuration = Math.min(duration, seconds);
  const frameStep = 1 / sampleFps;
  const samples = [];
  const startTimeMs = performance.now();

  for (let t = 0; t <= usableDuration; t += frameStep) {
    setStatus(`Sampling ${url} at ${t.toFixed(2)}s / ${usableDuration.toFixed(2)}s`);
    await seekVideo(t);
    const timestampMs = Math.round(t * 1000);
    const detection = faceLandmarker.detectForVideo(ui.video, timestampMs);
    const faceCount = detection.faceLandmarks?.length ?? 0;
    samples.push({
      time: Number(t.toFixed(3)),
      faceCount,
      blendshapeCount: detection.faceBlendshapes?.length ?? 0,
      matrixCount: detection.facialTransformationMatrixes?.length ?? 0
    });
    drawDetection(detection);
    await nextFrame();
  }

  const counts = samples.map((sample) => sample.faceCount);
  const maxFaces = Math.max(0, ...counts);
  const frames = samples.length;
  const threePlusFrames = samples.filter((sample) => sample.faceCount >= 3).length;
  const twoPlusFrames = samples.filter((sample) => sample.faceCount >= 2).length;
  const averageFaces = frames
    ? counts.reduce((sum, count) => sum + count, 0) / frames
    : 0;
  const countHistogram = counts.reduce((histogram, count) => {
    histogram[count] = (histogram[count] ?? 0) + 1;
    return histogram;
  }, {});

  return {
    url,
    duration: Number(usableDuration.toFixed(3)),
    sampleFps,
    frames,
    maxFaces,
    averageFaces: Number(averageFaces.toFixed(3)),
    twoPlusFrames,
    threePlusFrames,
    twoPlusRatio: frames ? twoPlusFrames / frames : 0,
    threePlusRatio: frames ? threePlusFrames / frames : 0,
    countHistogram,
    samples,
    elapsedMs: Math.round(performance.now() - startTimeMs)
  };
}

function drawDetection(detection) {
  const context = ui.canvas.getContext("2d");
  context.clearRect(0, 0, ui.canvas.width, ui.canvas.height);

  for (const landmarks of detection.faceLandmarks ?? []) {
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
      color: "rgba(69, 224, 163, 0.24)",
      lineWidth: 1
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
      color: "#45e0a3",
      lineWidth: 2
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
      color: "#72a8ff",
      lineWidth: 2
    });
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
      color: "#ff6f91",
      lineWidth: 2
    });
  }
}

function renderStats(result) {
  if (result.error) {
    ui.maxFaces.textContent = "0";
    ui.threeFaceRatio.textContent = "0%";
    ui.frames.textContent = "0";
    ui.stats.innerHTML = `<div class="track-item"><div class="track-title">Error</div><div class="track-meta">${escapeHtml(result.error)}</div></div>`;
    return;
  }

  ui.maxFaces.textContent = String(result.maxFaces);
  ui.threeFaceRatio.textContent = formatPercent(result.threePlusRatio);
  ui.frames.textContent = String(result.frames);
  const histogram = Object.entries(result.countHistogram)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([count, frames]) => `${count} faces: ${frames}`)
    .join(" | ");

  ui.stats.innerHTML = `
    <div class="track-item">
      <div>
        <div class="track-title">${escapeHtml(result.url)}</div>
        <div class="track-meta">
          avg ${result.averageFaces} faces | 2+ ${formatPercent(result.twoPlusRatio)} | 3+ ${formatPercent(result.threePlusRatio)}
        </div>
      </div>
      <span class="track-badge">${histogram}</span>
    </div>
  `;
}

function resetStats() {
  ui.maxFaces.textContent = "0";
  ui.threeFaceRatio.textContent = "0%";
  ui.frames.textContent = "0";
  ui.stats.textContent = "";
}

function seekVideo(time) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out seeking to ${time.toFixed(2)}s`));
    }, 10000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      ui.video.removeEventListener("seeked", onSeeked);
      ui.video.removeEventListener("error", onError);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(ui.video.error?.message || "Video seek failed"));
    };
    ui.video.addEventListener("seeked", onSeeked, { once: true });
    ui.video.addEventListener("error", onError, { once: true });
    ui.video.currentTime = Math.min(time, Math.max(0, ui.video.duration - 0.05));
  });
}

function waitForEvent(element, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeout);
      element.removeEventListener(eventName, onEvent);
      element.removeEventListener("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(element.error?.message || `Failed before ${eventName}`));
    };
    element.addEventListener(eventName, onEvent, { once: true });
    element.addEventListener("error", onError, { once: true });
  });
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function setStatus(message) {
  ui.status.textContent = message;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}
