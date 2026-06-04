export class FaceTrackManager {
  constructor(options = {}) {
    this.maxFaces = options.maxFaces ?? 4;
    this.detectionThreshold = options.detectionThreshold ?? 0.78;
    this.lostGraceMs = options.lostGraceMs ?? 1300;
    this.maxMatchDistance = options.maxMatchDistance ?? 0.42;
    this.maxSameSlotDistance = options.maxSameSlotDistance ?? 1.35;
    this.smoothing = options.smoothing ?? 0.8;
    this.anchorSmoothing = options.anchorSmoothing ?? 0.82;
    this.velocitySmoothing = options.velocitySmoothing ?? 0.56;
    this.maxPredictionMs = options.maxPredictionMs ?? 360;
    this.maxVelocity = options.maxVelocity ?? 2.4;
    this.maxScaleVelocity = options.maxScaleVelocity ?? 1.8;
    this.maxRotationVelocity = options.maxRotationVelocity ?? 4;
    this.slotReuseGraceMs = options.slotReuseGraceMs ?? 1600;
    this.tracks = new Map();
    this.nextTrackId = 1;
  }

  reset() {
    this.tracks.clear();
    this.nextTrackId = 1;
  }

  update(detectStates, now = performance.now()) {
    const states = Array.isArray(detectStates) ? detectStates : [detectStates];
    const detections = states
      .slice(0, this.maxFaces)
      .map((state, slotIndex) => ({
        slotIndex,
        state,
        detected: Number(state?.detected ?? 0)
      }))
      .filter((detection) => detection.detected >= this.detectionThreshold);

    const reusableTracks = [...this.tracks.values()]
      .filter((track) => now - track.lastSeenAt <= this.lostGraceMs)
      .sort((a, b) => a.lostMs - b.lostMs);

    const matches = this.matchDetectionsToTracks(detections, now);
    const matchedDetectionSlots = new Set();
    const assignedTrackIds = new Set();

    matches.forEach(({ detection, track }) => {
      matchedDetectionSlots.add(detection.slotIndex);
      assignedTrackIds.add(track.id);
      this.applyState(track, detection.state, detection.slotIndex, detection.detected, now);
    });

    detections.forEach((detection) => {
      if (!matchedDetectionSlots.has(detection.slotIndex)) {
        const track = reusableTracks.find((candidate) => (
          !assignedTrackIds.has(candidate.id)
          && candidate.slotIndex === detection.slotIndex
          && now - candidate.lastSeenAt <= this.slotReuseGraceMs
        )) ?? this.createTrack(detection.slotIndex, now);
        assignedTrackIds.add(track.id);
        this.applyState(track, detection.state, detection.slotIndex, detection.detected, now);
      }
    });

    this.tracks.forEach((track) => {
      if (!assignedTrackIds.has(track.id)) {
        track.active = now - track.lastSeenAt <= this.lostGraceMs;
        track.detectedNow = false;
        track.predicted = track.active;
        track.lostMs = Math.max(0, now - track.lastSeenAt);
      }
    });

    this.pruneOldTracks(now);

    return this.getTracks(now);
  }

  getTracks(now = performance.now()) {
    return this.dedupeSlots([...this.tracks.values()], now)
      .map((track) => ({
        ...track,
        stale: now - track.lastSeenAt > this.lostGraceMs
      }))
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }

  dedupeSlots(tracks, now) {
    const bySlot = new Map();
    tracks.forEach((track) => {
      const existing = bySlot.get(track.slotIndex);
      if (!existing || rankTrack(track, now) > rankTrack(existing, now)) {
        bySlot.set(track.slotIndex, track);
      }
    });

    const keepIds = new Set([...bySlot.values()].map((track) => track.id));
    tracks.forEach((track) => {
      if (!keepIds.has(track.id) && track.active) {
        track.active = false;
        track.predicted = false;
      }
    });
    return [...bySlot.values()];
  }

  createTrack(slotIndex, now) {
    const track = {
      id: this.nextTrackId++,
      slotIndex,
      active: true,
      detectedNow: false,
      predicted: false,
      createdAt: now,
      detected: 0,
      x: 0,
      y: 0,
      s: 1,
      rx: 0,
      ry: 0,
      rz: 0,
      vx: 0,
      vy: 0,
      vs: 0,
      vrx: 0,
      vry: 0,
      vrz: 0,
      anchors: null,
      landmarks: null,
      bounds: null,
      expressions: {},
      lastSeenAt: now,
      lostMs: 0
    };
    this.tracks.set(track.id, track);
    return track;
  }

  matchDetectionsToTracks(detections, now) {
    const candidateTracks = [...this.tracks.values()]
      .filter((track) => now - track.lastSeenAt <= this.lostGraceMs);
    const pairs = [];

    detections.forEach((detection) => {
      candidateTracks.forEach((track) => {
        const distance = this.distance(detection, track);
        const maxDistance = detection.slotIndex === track.slotIndex
          ? this.maxSameSlotDistance
          : this.maxMatchDistance;
        if (distance <= maxDistance) {
          pairs.push({ detection, track, distance });
        }
      });
    });

    pairs.sort((a, b) => a.distance - b.distance);

    const usedSlots = new Set();
    const usedTracks = new Set();
    const matches = [];

    pairs.forEach((pair) => {
      if (usedSlots.has(pair.detection.slotIndex) || usedTracks.has(pair.track.id)) {
        return;
      }
      usedSlots.add(pair.detection.slotIndex);
      usedTracks.add(pair.track.id);
      matches.push(pair);
    });

    return matches;
  }

  distance(detection, track) {
    const state = detection.state;
    const dx = (state.x ?? 0) - track.x;
    const dy = (state.y ?? 0) - track.y;
    const ds = (state.s ?? track.s) - track.s;
    const eyeDistancePenalty = getEyeDistancePenalty(state.anchors, track.anchors);
    const slotPenalty = detection.slotIndex === track.slotIndex ? -0.04 : 0;
    return Math.max(0, Math.sqrt(dx * dx * 2.25 + dy * dy * 2.25 + ds * ds * 0.5) + eyeDistancePenalty + slotPenalty);
  }

  pruneOldTracks(now) {
    this.tracks.forEach((track, id) => {
      if (!track.active && now - track.lastSeenAt > this.lostGraceMs * 1.5) {
        this.tracks.delete(id);
      }
    });
  }

  applyState(track, state, slotIndex, detected, now) {
    const wasActive = track.active;
    const dtMs = Math.max(1, now - track.lastSeenAt);
    const alpha = wasActive ? this.smoothing : 1;
    const previous = {
      x: track.x,
      y: track.y,
      s: track.s,
      rx: track.rx,
      ry: track.ry,
      rz: track.rz
    };
    track.slotIndex = slotIndex;
    track.active = true;
    track.detectedNow = true;
    track.predicted = false;
    track.detected = detected;
    track.x = lerp(track.x, state.x ?? track.x, alpha);
    track.y = lerp(track.y, state.y ?? track.y, alpha);
    track.s = lerp(track.s, state.s ?? track.s, alpha);
    track.rx = lerp(track.rx, state.rx ?? track.rx, alpha);
    track.ry = lerp(track.ry, state.ry ?? track.ry, alpha);
    track.rz = lerp(track.rz, state.rz ?? track.rz, alpha);
    track.vx = smoothVelocity(track.vx, previous.x, track.x, dtMs, this.velocitySmoothing);
    track.vy = smoothVelocity(track.vy, previous.y, track.y, dtMs, this.velocitySmoothing);
    track.vs = smoothVelocity(track.vs, previous.s, track.s, dtMs, this.velocitySmoothing);
    track.vrx = smoothVelocity(track.vrx, previous.rx, track.rx, dtMs, this.velocitySmoothing);
    track.vry = smoothVelocity(track.vry, previous.ry, track.ry, dtMs, this.velocitySmoothing);
    track.vrz = smoothVelocity(track.vrz, previous.rz, track.rz, dtMs, this.velocitySmoothing);
    track.vx = clamp(track.vx, -this.maxVelocity, this.maxVelocity);
    track.vy = clamp(track.vy, -this.maxVelocity, this.maxVelocity);
    track.vs = clamp(track.vs, -this.maxScaleVelocity, this.maxScaleVelocity);
    track.vrx = clamp(track.vrx, -this.maxRotationVelocity, this.maxRotationVelocity);
    track.vry = clamp(track.vry, -this.maxRotationVelocity, this.maxRotationVelocity);
    track.vrz = clamp(track.vrz, -this.maxRotationVelocity, this.maxRotationVelocity);
    track.anchors = smoothAnchors(track.anchors, state.anchors, wasActive ? this.anchorSmoothing : 1);
    track.landmarks = smoothLandmarks(track.landmarks, state.landmarks, wasActive ? this.anchorSmoothing : 1);
    track.bounds = state.bounds ?? track.bounds;
    track.expressions = state.expressions ?? track.expressions;
    track.lastSeenAt = now;
    track.lostMs = 0;
  }

  predictTracks(now = performance.now()) {
    return this.getTracks(now).map((track) => {
      if (!track.active && now - track.lastSeenAt > this.lostGraceMs) {
        return track;
      }
      const dtSeconds = Math.min(this.maxPredictionMs, Math.max(0, now - track.lastSeenAt)) / 1000;
      if (!dtSeconds) {
        return track;
      }
      const predicted = {
        ...track,
        x: clamp(track.x + track.vx * dtSeconds, -1.25, 1.25),
        y: clamp(track.y + track.vy * dtSeconds, -1.25, 1.25),
        s: Math.max(0.08, track.s + track.vs * dtSeconds),
        rx: track.rx + track.vrx * dtSeconds,
        ry: track.ry + track.vry * dtSeconds,
        rz: track.rz + track.vrz * dtSeconds
      };
      predicted.anchors = predictAnchors(track.anchors, track, predicted, dtSeconds);
      predicted.landmarks = predictLandmarks(track.landmarks, track, predicted);
      predicted.bounds = predictBounds(track.bounds, track, predicted, dtSeconds);
      return predicted;
    });
  }
}

function lerp(previous, next, alpha) {
  return previous + (next - previous) * alpha;
}

function rankTrack(track, now) {
  const detectedBonus = track.detectedNow ? 100000 : 0;
  const predictedBonus = track.predicted ? 1000 : 0;
  return detectedBonus + predictedBonus - Math.max(0, now - track.lastSeenAt);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothVelocity(previousVelocity, previousValue, nextValue, dtMs, alpha) {
  const velocity = ((nextValue - previousValue) / dtMs) * 1000;
  if (!Number.isFinite(velocity)) {
    return previousVelocity;
  }
  return lerp(previousVelocity, velocity, alpha);
}

function getEyeDistancePenalty(nextAnchors, previousAnchors) {
  const nextEyeDistance = getEyeDistance(nextAnchors);
  const previousEyeDistance = getEyeDistance(previousAnchors);
  if (!nextEyeDistance || !previousEyeDistance) {
    return 0;
  }
  return Math.min(0.45, Math.abs(nextEyeDistance - previousEyeDistance) * 4);
}

function getEyeDistance(anchors) {
  const leftEye = anchors?.leftEye;
  const rightEye = anchors?.rightEye;
  if (!leftEye || !rightEye) {
    return 0;
  }
  return Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
}

function smoothAnchors(previousAnchors, nextAnchors, alpha) {
  if (!nextAnchors) {
    return previousAnchors;
  }
  if (!previousAnchors) {
    return cloneAnchors(nextAnchors);
  }
  const smoothed = {};
  Object.entries(nextAnchors).forEach(([name, point]) => {
    const previous = previousAnchors[name];
    smoothed[name] = previous ? {
      x: lerp(previous.x, point.x, alpha),
      y: lerp(previous.y, point.y, alpha),
      z: lerp(previous.z ?? 0, point.z ?? 0, alpha)
    } : { ...point };
  });
  return smoothed;
}

function cloneAnchors(anchors) {
  return Object.fromEntries(Object.entries(anchors).map(([name, point]) => [name, { ...point }]));
}

function smoothLandmarks(previousLandmarks, nextLandmarks, alpha) {
  if (!Array.isArray(nextLandmarks)) {
    return previousLandmarks;
  }
  if (!Array.isArray(previousLandmarks) || previousLandmarks.length !== nextLandmarks.length) {
    return nextLandmarks.map((point) => ({ ...point }));
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

function predictAnchors(anchors, track, predicted, dtSeconds) {
  if (!anchors) {
    return anchors;
  }
  const center = anchors.eyeCenter ?? getAnchorCentroid(anchors);
  if (!center) {
    return anchors;
  }
  const dx = ((predicted.x ?? track.x) - track.x) / 2;
  const dy = -(((predicted.y ?? track.y) - track.y) / 2);
  const scale = clamp((predicted.s ?? track.s) / Math.max(0.001, track.s), 0.82, 1.18);
  const rotationDelta = clamp((predicted.rz ?? track.rz) - track.rz, -0.3, 0.3);
  const cos = Math.cos(rotationDelta);
  const sin = Math.sin(rotationDelta);

  return Object.fromEntries(Object.entries(anchors).map(([name, point]) => {
    const localX = (point.x - center.x) * scale;
    const localY = (point.y - center.y) * scale;
    return [
      name,
      {
        ...point,
        x: clamp(center.x + dx + localX * cos - localY * sin, -0.12, 1.12),
        y: clamp(center.y + dy + localX * sin + localY * cos, -0.12, 1.12),
        z: point.z ?? 0
      }
    ];
  }));
}

function predictLandmarks(landmarks, track, predicted) {
  if (!Array.isArray(landmarks)) {
    return landmarks;
  }
  const dx = ((predicted.x ?? track.x) - track.x) / 2;
  const dy = -(((predicted.y ?? track.y) - track.y) / 2);
  const scale = clamp((predicted.s ?? track.s) / Math.max(0.001, track.s), 0.82, 1.18);
  const rotationDelta = clamp((predicted.rz ?? track.rz) - track.rz, -0.3, 0.3);
  const center = getLandmarkCentroid(landmarks);
  if (!center) {
    return landmarks;
  }
  const cos = Math.cos(rotationDelta);
  const sin = Math.sin(rotationDelta);
  return landmarks.map((point) => {
    const localX = (point.x - center.x) * scale;
    const localY = (point.y - center.y) * scale;
    return {
      ...point,
      x: clamp(center.x + dx + localX * cos - localY * sin, -0.12, 1.12),
      y: clamp(center.y + dy + localX * sin + localY * cos, -0.12, 1.12),
      z: point.z ?? 0
    };
  });
}

function predictBounds(bounds, track, predicted) {
  if (!bounds) {
    return bounds;
  }
  const dx = ((predicted.x ?? track.x) - track.x) / 2;
  const dy = -(((predicted.y ?? track.y) - track.y) / 2);
  const scale = clamp((predicted.s ?? track.s) / Math.max(0.001, track.s), 0.82, 1.18);
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  return {
    minX: centerX + dx - width / 2,
    maxX: centerX + dx + width / 2,
    minY: centerY + dy - height / 2,
    maxY: centerY + dy + height / 2,
    width,
    height
  };
}

function getLandmarkCentroid(landmarks) {
  if (!Array.isArray(landmarks) || !landmarks.length) {
    return null;
  }
  return {
    x: landmarks.reduce((sum, point) => sum + point.x, 0) / landmarks.length,
    y: landmarks.reduce((sum, point) => sum + point.y, 0) / landmarks.length,
    z: landmarks.reduce((sum, point) => sum + (point.z ?? 0), 0) / landmarks.length
  };
}

function getAnchorCentroid(anchors) {
  const points = Object.values(anchors).filter(Boolean);
  if (!points.length) {
    return null;
  }
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    z: points.reduce((sum, point) => sum + (point.z ?? 0), 0) / points.length
  };
}
