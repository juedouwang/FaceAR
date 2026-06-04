import { EffectManager } from "./EffectManager.js";
import { FaceTrackManager } from "./FaceTrackManager.js";
import { PerformanceMeter } from "./PerformanceMeter.js";
import { UIController } from "./UIController.js";

const SETTINGS = {
  maxFaces: 4,
  detectionThreshold: 0.78,
  canvasId: "jeeFaceFilterCanvas",
  neuralNetPath: "./vendor/jeeliz/neuralNets/",
  cameraVideoSettings: {
    facingMode: "user",
    idealWidth: 960,
    idealHeight: 720,
    minWidth: 640,
    minHeight: 480,
    flipX: true
  }
};

function setDetectionThreshold(value) {
  const threshold = Number(value);
  if (!Number.isFinite(threshold)) {
    return;
  }
  SETTINGS.detectionThreshold = Math.min(0.99, Math.max(0.5, threshold));
  faceTrackManager.detectionThreshold = SETTINGS.detectionThreshold;
}

const VIDEO_PRESETS = {
  sample: {
    label: "single-face smoke-test sample",
    url: "./samples/single-face-demo.mp4"
  },
  party: {
    label: "verified pool party group-selfie sample",
    url: "./samples/friends-selfie-pool-mixkit-43089.mp4"
  },
  partyWide: {
    label: "real multi-person party sample",
    url: "./samples/party-friends-mixkit-46873.mp4"
  },
  party2: {
    label: "two friends talking at a party",
    url: "./samples/party-two-friends-mixkit-46880.mp4"
  },
  friends: {
    label: "friends drinking wine outdoors",
    url: "./samples/friends-wine-mixkit-42732.mp4"
  },
  poolSelfie: {
    label: "friends taking a selfie by a pool",
    url: "./samples/friends-selfie-pool-mixkit-43089.mp4"
  },
  windowSelfie: {
    label: "friends smiling for a group selfie",
    url: "./samples/friends-window-selfie-mixkit-8780.mp4"
  },
  groupSelfie: {
    label: "group of friends taking a selfie",
    url: "./samples/friends-group-selfie-mixkit-45657.mp4"
  },
  nightclub: {
    label: "two girls having fun in a nightclub",
    url: "./samples/nightclub-two-girls-mixkit-42292.mp4"
  },
  partyHats: {
    label: "birthday party hats with friends",
    url: "./samples/birthday-party-hats-mixkit-4608.mp4"
  },
  partyHatsCrop: {
    label: "cropped real birthday party hats clip",
    url: "./samples/party-hats-crop-wide_faces.webm"
  },
  wineToast: {
    label: "friends making a wine toast",
    url: "./samples/friends-toast-wine-mixkit-42718.mp4"
  },
  smilingCamera: {
    label: "friends smiling at the camera",
    url: "./samples/friends-smiling-camera-mixkit-5891.mp4"
  },
  threeFriends: {
    label: "three friends taking a selfie together",
    url: "./samples/pexels-three-friends-selfie-35050402.mp4"
  },
  pexelsGroup: {
    label: "group of friends from Pexels",
    url: "./samples/pexels-group-friends-5708805.mp4"
  },
  pexelsSelfie: {
    label: "group of friends taking a selfie from Pexels",
    url: "./samples/pexels-group-selfie-6214756.mp4"
  },
  pexelsSelfieCrop: {
    label: "cropped real Pexels group selfie",
    url: "./samples/pexels-group-selfie-crop-6214756.mp4"
  },
  pexelsSelfieCropWebm: {
    label: "cropped real Pexels group selfie WebM",
    url: "./samples/pexels-group-selfie-crop-6214756.webm"
  },
  pexelsThreeFriends2: {
    label: "three friends taking a selfie from Pexels",
    url: "./samples/pexels-three-friends-selfie-5935545.mp4"
  },
  pexelsParty: {
    label: "friends party clip from Pexels",
    url: "./samples/pexels-friends-party-5529160.mp4"
  }
};

const appState = {
  initialized: false,
  currentInputMode: "camera",
  effectsVisible: true,
  mockMode: false,
  mockAnimationId: 0,
  threeCamera: null,
  threeStuffs: null,
  inputObjectUrl: null
};

const faceTrackManager = new FaceTrackManager({
  maxFaces: SETTINGS.maxFaces,
  detectionThreshold: SETTINGS.detectionThreshold
});
const effectManager = new EffectManager({ THREE: window.THREE, maxFaces: SETTINGS.maxFaces });
const performanceMeter = new PerformanceMeter();
const ui = new UIController({
  effectDefinitions: effectManager.definitions,
  maxFaces: SETTINGS.maxFaces
});

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
    ui.setEffectsButton(appState.effectsVisible);
  },
  onResetBindings: () => {
    faceTrackManager.reset();
    effectManager.resetBindings();
    ui.setStatus("Bindings reset. Tracks will be rebuilt from the next detected faces.");
  }
});

window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  setDetectionThreshold(params.get("threshold"));
  const mockFaces = Number(params.get("mock") ?? 0);
  if (mockFaces > 0) {
    ui.setStatus(`Mock verification mode: ${Math.min(mockFaces, SETTINGS.maxFaces)} synthetic face tracks.`);
    startMockMode(Math.min(mockFaces, SETTINGS.maxFaces));
    return;
  }
  const sampleVideo = params.get("video");
  if (sampleVideo) {
    const preset = VIDEO_PRESETS[sampleVideo];
    ui.setStatus(`Loading ${preset?.label ?? "video input"}...`);
    startWithVideoUrl(preset?.url ?? sampleVideo, preset?.label ?? sampleVideo);
    return;
  }
  ui.setStatus("Requesting camera. Use HTTPS or localhost if the browser blocks access.");
  startWithCamera();
});

window.addEventListener("resize", () => {
  resizeCanvas();
  if (appState.initialized && appState.threeCamera) {
    JeelizThreeHelper.resize(getCanvas().width, getCanvas().height, appState.threeCamera);
  }
});

async function handleInputModeChange(mode) {
  appState.currentInputMode = mode;
  if (mode === "camera") {
    await startWithCamera();
  } else {
    ui.setStatus("Choose a local video file with 2-4 visible faces.");
    document.getElementById("videoFileInput").click();
  }
}

async function handleVideoFileChange(file) {
  if (!file) {
    return;
  }
  const video = document.getElementById("inputVideo");
  appState.currentInputMode = "video";
  ui.setInputMode("video");
  if (appState.inputObjectUrl) {
    URL.revokeObjectURL(appState.inputObjectUrl);
  }
  appState.inputObjectUrl = URL.createObjectURL(file);
  video.srcObject = null;
  video.src = appState.inputObjectUrl;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  await waitForVideo(video);
  await video.play();
  await restartJeeliz({
    videoSettings: { videoElement: video },
    status: `Video loaded: ${file.name}`
  });
}

async function startWithVideoUrl(url, label = url) {
  try {
    const video = document.getElementById("inputVideo");
    appState.currentInputMode = "video";
    ui.setInputMode("video");
    if (appState.inputObjectUrl) {
      URL.revokeObjectURL(appState.inputObjectUrl);
      appState.inputObjectUrl = null;
    }
    video.srcObject = null;
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    await waitForVideo(video);
    await video.play();
    await restartJeeliz({
      videoSettings: { videoElement: video },
      status: `Video mode ready: ${label}`
    });
  } catch (error) {
    ui.setStatus(`Video mode failed: ${error.message}`);
    console.error(error);
  }
}

async function startWithCamera() {
  const video = document.getElementById("inputVideo");
  if (video?.srcObject) {
    video.srcObject = null;
  }
  await restartJeeliz({
    videoSettings: SETTINGS.cameraVideoSettings,
    status: "Camera mode ready. Bring 2-4 faces into the frame."
  });
}

async function restartJeeliz({ videoSettings, status }) {
  stopMockMode();
  ui.setStatus("Starting face tracker...");
  faceTrackManager.reset();
  await destroyJeelizIfNeeded();
  resetCanvasElement();
  resizeCanvas();
  await initJeeliz(videoSettings, status);
}

function startMockMode(faceCount) {
  stopMockMode();
  appState.mockMode = true;
  faceTrackManager.reset();
  setupMockScene();
  const startTime = performance.now();

  const animate = (now) => {
    const elapsed = (now - startTime) / 1000;
    const detectStates = Array.from({ length: SETTINGS.maxFaces }, (_, slotIndex) => {
      if (slotIndex >= faceCount) {
        return { detected: 0, x: 0, y: 0, s: 1, rx: 0, ry: 0, rz: 0, expressions: [] };
      }
      const baseX = [-0.52, 0, 0.52, 0.2][slotIndex] ?? 0;
      return {
        detected: 0.96,
        x: baseX + Math.sin(elapsed * 1.2 + slotIndex) * 0.04,
        y: -0.02 + Math.cos(elapsed * 1.1 + slotIndex) * 0.04,
        s: 0.28 + Math.sin(elapsed + slotIndex) * 0.015,
        rx: Math.sin(elapsed * 0.7 + slotIndex) * 0.08,
        ry: Math.cos(elapsed * 0.8 + slotIndex) * 0.1,
        rz: Math.sin(elapsed * 0.6 + slotIndex) * 0.08,
        expressions: []
      };
    });

    const fps = performanceMeter.tick(now);
    const tracks = faceTrackManager.update(detectStates, now);
    updateMockFaceObjects(detectStates);
    effectManager.updateTrackEffects(tracks);
    effectManager.updateTrackVisibility(tracks);
    ui.renderDebug({
      tracks,
      fps,
      mode: effectManager.assignmentMode,
      effectManager,
      rawDetected: detectStates.map((state) => state.detected)
    });
    appState.threeStuffs.renderer.render(appState.threeStuffs.scene, appState.threeCamera);
    appState.mockAnimationId = window.requestAnimationFrame(animate);
  };

  appState.mockAnimationId = window.requestAnimationFrame(animate);
}

function stopMockMode() {
  if (appState.mockAnimationId) {
    window.cancelAnimationFrame(appState.mockAnimationId);
    appState.mockAnimationId = 0;
  }
  appState.mockMode = false;
}

function setupMockScene() {
  resetCanvasElement();
  resizeCanvas();
  const canvas = getCanvas();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.width, canvas.height, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, canvas.width / canvas.height, 0.1, 100);
  camera.position.z = 5.2;
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const background = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 5),
    new THREE.MeshBasicMaterial({ color: 0x111827 })
  );
  background.position.z = -1.2;
  scene.add(background);

  const faceObjects = Array.from({ length: SETTINGS.maxFaces }, () => {
    const group = new THREE.Group();
    group.visible = false;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xd9a177 })
    );
    head.scale.set(0.82, 1.05, 0.42);
    head.position.z = 0.08;
    const eyes = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.035, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x1f2937 })
    );
    eyes.position.set(0, 0.08, 0.45);
    group.add(head, eyes);
    scene.add(group);
    return group;
  });

  appState.threeStuffs = { renderer, scene, faceObjects };
  appState.threeCamera = camera;
  appState.initialized = false;
  effectManager.attachToFaceObjects(faceObjects);
}

function updateMockFaceObjects(detectStates) {
  const faceObjects = appState.threeStuffs.faceObjects;
  faceObjects.forEach((faceObject, slotIndex) => {
    const state = detectStates[slotIndex];
    if (!state || state.detected < SETTINGS.detectionThreshold) {
      faceObject.visible = false;
      return;
    }
    faceObject.position.set(state.x * 1.85, -state.y * 1.65, 0);
    const scale = state.s * 2.8;
    faceObject.scale.set(scale, scale, scale);
    faceObject.rotation.set(state.rx, state.ry, state.rz);
    faceObject.visible = true;
  });
}

function initJeeliz(videoSettings, readyStatus) {
  return new Promise((resolve) => {
    window.JEELIZFACEFILTER.init({
      canvasId: SETTINGS.canvasId,
      NNCPath: SETTINGS.neuralNetPath,
      maxFacesDetected: SETTINGS.maxFaces,
      followZRot: true,
      videoSettings,
      callbackReady: (errCode, spec) => {
        if (errCode) {
          ui.setStatus(`Jeeliz init failed: ${errCode}`);
          console.error("Jeeliz init failed", errCode);
          resolve(false);
          return;
        }

        appState.threeStuffs = JeelizThreeHelper.init(spec, handleDetectionEvent);
        appState.threeCamera = JeelizThreeHelper.create_camera();
        effectManager.attachToFaceObjects(appState.threeStuffs.faceObjects);
        appState.initialized = true;
        ui.setStatus(readyStatus);
        resolve(true);
      },
      callbackTrack: (detectStates) => {
        const now = performance.now();
        const fps = performanceMeter.tick(now);
        const states = Array.isArray(detectStates) ? detectStates : [detectStates];
        const rawDetected = states.map((state) => Number(state?.detected ?? 0));
        window.__PARTY_FACE_AR_DEBUG__ = {
          rawDetected,
          rawDetectedSlots: rawDetected.filter((value) => value >= SETTINGS.detectionThreshold).length,
          detectionThreshold: SETTINGS.detectionThreshold,
          updatedAt: now
        };
        const tracks = faceTrackManager.update(detectStates, now);
        effectManager.updateTrackEffects(tracks);
        effectManager.updateTrackVisibility(tracks);
        ui.renderDebug({
          tracks,
          fps,
          mode: effectManager.assignmentMode,
          effectManager,
          rawDetected
        });
        JeelizThreeHelper.render(detectStates, appState.threeCamera);
      }
    });
  });
}

function handleDetectionEvent(faceIndex, isDetected) {
  console.info(`Face slot ${faceIndex + 1} ${isDetected ? "detected" : "lost"}`);
}

async function destroyJeelizIfNeeded() {
  if (!appState.initialized || !window.JEELIZFACEFILTER?.destroy) {
    return;
  }
  try {
    await window.JEELIZFACEFILTER.destroy();
  } catch (error) {
    console.warn("Jeeliz destroy warning", error);
  } finally {
    appState.initialized = false;
    appState.threeCamera = null;
    appState.threeStuffs = null;
  }
}

function resizeCanvas() {
  const canvas = getCanvas();
  const stage = canvas.parentElement;
  const rect = stage.getBoundingClientRect();
  const width = Math.max(640, Math.round(rect.width));
  const height = Math.max(480, Math.round(rect.height));
  canvas.width = width;
  canvas.height = height;
}

function resetCanvasElement() {
  const canvas = getCanvas();
  const clone = canvas.cloneNode(false);
  canvas.replaceWith(clone);
}

function getCanvas() {
  return document.getElementById(SETTINGS.canvasId);
}

function waitForVideo(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth && video.videoHeight) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Video load timeout")), 8000);
    video.addEventListener("loadeddata", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}
