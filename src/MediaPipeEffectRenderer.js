export class MediaPipeEffectRenderer {
  constructor({ THREE, canvas, maxFaces = 4 }) {
    this.THREE = THREE;
    this.canvas = canvas;
    this.maxFaces = maxFaces;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(1);
    if (this.THREE.ACESFilmicToneMapping) {
      this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
    }
    if (this.THREE.sRGBEncoding) {
      this.renderer.outputEncoding = this.THREE.sRGBEncoding;
    }
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.65);
    keyLight.position.set(0.2, 0.8, 1);
    this.scene.add(keyLight);
    this.faceObjects = Array.from({ length: maxFaces }, () => {
      const group = new THREE.Group();
      group.visible = false;
      group.frustumCulled = false;
      group.userData.renderState = {
        initialized: false,
        position: new THREE.Vector3(),
        scale: 1,
        rotation: new THREE.Euler(),
        anchors: null,
        landmarks: null
      };
      this.scene.add(group);
      return group;
    });
  }

  resize(width, height) {
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
    this.aspect = aspect;
  }

  update(tracks, now = performance.now()) {
    const activeSlots = new Set();
    const timeSeconds = now / 1000;
    tracks.filter((track) => track.active).forEach((track) => {
      const faceObject = this.faceObjects[track.slotIndex];
      if (!faceObject) {
        return;
      }
      activeSlots.add(track.slotIndex);
      faceObject.visible = true;
      const anchors = toSceneAnchors(track, this.aspect);
      const landmarks = toSceneLandmarks(track, this.aspect);
      const eyeCenter = anchors?.eyeCenter ?? { x: track.x * this.aspect, y: track.y };
      const renderState = faceObject.userData.renderState;
      const targetPosition = new this.THREE.Vector3(eyeCenter.x, eyeCenter.y, 0);
      const scale = Math.max(0.12, getFaceScale(anchors, track));
      const targetRotation = new this.THREE.Euler(
        clamp(track.rx ?? 0, -0.34, 0.34),
        clamp(track.ry ?? 0, -0.42, 0.42),
        clamp(track.rz ?? 0, -0.62, 0.62),
        "ZYX"
      );

      if (!renderState.initialized) {
        renderState.position.copy(targetPosition);
        renderState.scale = scale;
        renderState.rotation.copy(targetRotation);
        renderState.anchors = anchors;
        renderState.landmarks = landmarks;
        renderState.initialized = true;
      } else {
        const anchorAlpha = track.predicted ? 0.96 : 0.88;
        renderState.position.lerp(targetPosition, track.predicted ? 0.96 : 0.88);
        renderState.scale = lerp(renderState.scale, scale, track.predicted ? 0.9 : 0.8);
        renderState.rotation.x = lerpAngle(renderState.rotation.x, targetRotation.x, track.predicted ? 0.94 : 0.9);
        renderState.rotation.y = lerpAngle(renderState.rotation.y, targetRotation.y, track.predicted ? 0.94 : 0.9);
        renderState.rotation.z = lerpAngle(renderState.rotation.z, targetRotation.z, track.predicted ? 0.94 : 0.9);
        renderState.anchors = smoothSceneAnchors(renderState.anchors, anchors, anchorAlpha);
        renderState.landmarks = smoothSceneLandmarks(renderState.landmarks, landmarks, anchorAlpha);
      }

      faceObject.userData.anchors = renderState.anchors;
      faceObject.userData.landmarks = renderState.landmarks;
      faceObject.position.copy(renderState.position);
      faceObject.scale.setScalar(1);
      faceObject.rotation.copy(renderState.rotation);
      faceObject.children.forEach((child) => {
        child.userData.animate?.(timeSeconds);
        child.userData.update?.({
          anchors: renderState.anchors,
          landmarks: renderState.landmarks,
          faceObject,
          track
        });
      });
    });

    this.faceObjects.forEach((faceObject, slotIndex) => {
      if (!activeSlots.has(slotIndex)) {
        faceObject.visible = false;
        faceObject.userData.renderState.initialized = false;
      }
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

function toSceneAnchors(track, aspect) {
  if (!track.anchors) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(track.anchors).map(([name, point]) => [name, toScenePoint(point, aspect)])
  );
}

function toSceneLandmarks(track, aspect) {
  if (!Array.isArray(track.landmarks) || !track.landmarks.length) {
    return null;
  }
  return track.landmarks.map((point) => toScenePoint(point, aspect));
}

function toScenePoint(point, aspect) {
  return {
    x: (point.x * 2 - 1) * aspect,
    y: -(point.y * 2 - 1),
    z: point.z ?? 0
  };
}

function getFaceScale(anchors, track) {
  if (!anchors) {
    return track.s;
  }
  const eyeWidth = distance(anchors.leftEye, anchors.rightEye) * 3.15;
  const faceWidth = distance(anchors.leftCheek, anchors.rightCheek) * 1.05;
  const faceHeight = distance(anchors.forehead, anchors.chin) * 0.78;
  return clamp(Math.max(0.12, eyeWidth, faceWidth, faceHeight, track.s * 0.78), 0.16, 0.72);
}

function distance(a, b) {
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(previous, next, alpha) {
  return previous + (next - previous) * alpha;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerpAngle(previous, next, alpha) {
  const delta = Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
  return previous + delta * alpha;
}

function smoothSceneAnchors(previousAnchors, nextAnchors, alpha) {
  if (!nextAnchors) {
    return previousAnchors;
  }
  if (!previousAnchors) {
    return cloneAnchors(nextAnchors);
  }
  return Object.fromEntries(Object.entries(nextAnchors).map(([name, point]) => {
    const previous = previousAnchors[name];
    return [
      name,
      previous ? {
        x: lerp(previous.x, point.x, alpha),
        y: lerp(previous.y, point.y, alpha),
        z: lerp(previous.z ?? 0, point.z ?? 0, alpha)
      } : { ...point }
    ];
  }));
}

function smoothSceneLandmarks(previousLandmarks, nextLandmarks, alpha) {
  if (!nextLandmarks) {
    return previousLandmarks;
  }
  if (!previousLandmarks || previousLandmarks.length !== nextLandmarks.length) {
    return cloneLandmarks(nextLandmarks);
  }
  return nextLandmarks.map((point, index) => {
    const previous = previousLandmarks[index];
    return previous ? {
      x: lerp(previous.x, point.x, alpha),
      y: lerp(previous.y, point.y, alpha),
      z: lerp(previous.z ?? 0, point.z ?? 0, alpha)
    } : { ...point };
  });
}

function cloneAnchors(anchors) {
  return Object.fromEntries(Object.entries(anchors).map(([name, point]) => [name, { ...point }]));
}

function cloneLandmarks(landmarks) {
  return landmarks.map((point) => ({ ...point }));
}
