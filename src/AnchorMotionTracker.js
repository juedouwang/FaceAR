const DEFAULT_ANCHORS = ["leftEye", "rightEye", "noseTip", "mouthCenter", "forehead", "chin"];

export class AnchorMotionTracker {
  constructor({
    trackWidth = 224,
    patchRadius = 3,
    searchRadius = 8,
    blend = 0.72,
    maxMeanAbsDiff = 34
  } = {}) {
    this.trackWidth = trackWidth;
    this.patchRadius = patchRadius;
    this.searchRadius = searchRadius;
    this.blend = blend;
    this.maxMeanAbsDiff = maxMeanAbsDiff;
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
      willReadFrequently: true
    });
    this.previousFrame = null;
    this.previousAnchorsByTrack = new Map();
    this.profile = {
      lastTrackMs: 0,
      trackedPoints: 0,
      refinedTracks: 0
    };
  }

  reset() {
    this.previousFrame = null;
    this.previousAnchorsByTrack.clear();
    this.profile = {
      lastTrackMs: 0,
      trackedPoints: 0,
      refinedTracks: 0
    };
  }

  seed(video, tracks) {
    const frame = this.captureFrame(video);
    if (!frame) {
      return;
    }
    this.previousFrame = frame;
    this.previousAnchorsByTrack = this.cloneTrackAnchors(tracks);
  }

  refine(video, tracks) {
    const startedAt = performance.now();
    const frame = this.captureFrame(video);
    if (!frame) {
      return tracks;
    }

    if (!this.previousFrame || !this.previousAnchorsByTrack.size) {
      this.previousFrame = frame;
      this.previousAnchorsByTrack = this.cloneTrackAnchors(tracks);
      return tracks;
    }

    let trackedPoints = 0;
    let refinedTracks = 0;
    const nextAnchorsByTrack = new Map();
    const refined = tracks.map((track) => {
      if (!track.active || !track.anchors) {
        return track;
      }
      const previousAnchors = this.previousAnchorsByTrack.get(track.id);
      if (!previousAnchors) {
        nextAnchorsByTrack.set(track.id, cloneAnchors(track.anchors));
        return track;
      }

      const trackedAnchors = this.trackAnchors(previousAnchors, track.anchors, frame);
      trackedPoints += trackedAnchors.size;
      if (trackedAnchors.size < 2) {
        nextAnchorsByTrack.set(track.id, cloneAnchors(track.anchors));
        return track;
      }

      const transform = estimateTransform(previousAnchors, trackedAnchors);
      if (!transform) {
        nextAnchorsByTrack.set(track.id, cloneAnchors(track.anchors));
        return track;
      }

      const anchors = applyTransformToAnchors(previousAnchors, track.anchors, transform, this.blend);
      const eyeCenter = anchors.eyeCenter ?? midpoint(anchors.leftEye, anchors.rightEye);
      if (eyeCenter) {
        anchors.eyeCenter = eyeCenter;
      }
      refinedTracks += 1;

      const nextTrack = {
        ...track,
        anchors,
        x: eyeCenter ? eyeCenter.x * 2 - 1 : track.x,
        y: eyeCenter ? -(eyeCenter.y * 2 - 1) : track.y,
        s: Math.max(0.08, track.s * transform.scale),
        rz: track.rz + transform.rotation
      };
      nextAnchorsByTrack.set(track.id, cloneAnchors(anchors));
      return nextTrack;
    });

    this.previousFrame = frame;
    this.previousAnchorsByTrack = nextAnchorsByTrack;
    this.profile = {
      lastTrackMs: performance.now() - startedAt,
      trackedPoints,
      refinedTracks
    };
    return refined;
  }

  captureFrame(video) {
    const sourceWidth = video.videoWidth || video.width;
    const sourceHeight = video.videoHeight || video.height;
    if (!sourceWidth || !sourceHeight || video.readyState < 2) {
      return null;
    }

    const scale = Math.min(1, this.trackWidth / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.previousFrame = null;
      this.previousAnchorsByTrack.clear();
    }

    this.context.drawImage(video, 0, 0, width, height);
    const rgba = this.context.getImageData(0, 0, width, height).data;
    const gray = new Uint8Array(width * height);
    for (let index = 0, pixel = 0; index < rgba.length; index += 4, pixel += 1) {
      gray[pixel] = (rgba[index] * 0.299 + rgba[index + 1] * 0.587 + rgba[index + 2] * 0.114) | 0;
    }
    return { gray, width, height };
  }

  cloneTrackAnchors(tracks) {
    const next = new Map();
    tracks.filter((track) => track.active && track.anchors).forEach((track) => {
      next.set(track.id, cloneAnchors(track.anchors));
    });
    return next;
  }

  trackAnchors(previousAnchors, predictedAnchors, frame) {
    const tracked = new Map();
    DEFAULT_ANCHORS.forEach((name) => {
      const previousPoint = previousAnchors[name];
      const predictedPoint = predictedAnchors[name] ?? previousPoint;
      if (!previousPoint || !predictedPoint) {
        return;
      }
      const match = trackPoint(
        this.previousFrame,
        frame,
        previousPoint,
        predictedPoint,
        this.patchRadius,
        this.searchRadius,
        this.maxMeanAbsDiff
      );
      if (match) {
        tracked.set(name, match);
      }
    });
    return tracked;
  }
}

function trackPoint(previousFrame, currentFrame, previousPoint, predictedPoint, patchRadius, searchRadius, maxMeanAbsDiff) {
  const previousX = Math.round(previousPoint.x * previousFrame.width);
  const previousY = Math.round(previousPoint.y * previousFrame.height);
  const predictedX = Math.round(predictedPoint.x * currentFrame.width);
  const predictedY = Math.round(predictedPoint.y * currentFrame.height);
  if (!isPatchInside(previousFrame, previousX, previousY, patchRadius)) {
    return null;
  }

  let bestScore = Infinity;
  let bestX = predictedX;
  let bestY = predictedY;
  for (let y = predictedY - searchRadius; y <= predictedY + searchRadius; y += 1) {
    for (let x = predictedX - searchRadius; x <= predictedX + searchRadius; x += 1) {
      if (!isPatchInside(currentFrame, x, y, patchRadius)) {
        continue;
      }
      const score = patchMeanAbsDiff(previousFrame, currentFrame, previousX, previousY, x, y, patchRadius);
      if (score < bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  if (bestScore > maxMeanAbsDiff) {
    return null;
  }
  return {
    x: bestX / currentFrame.width,
    y: bestY / currentFrame.height,
    score: bestScore
  };
}

function isPatchInside(frame, x, y, radius) {
  return x - radius >= 0
    && y - radius >= 0
    && x + radius < frame.width
    && y + radius < frame.height;
}

function patchMeanAbsDiff(previousFrame, currentFrame, previousX, previousY, currentX, currentY, radius) {
  let diff = 0;
  let count = 0;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const previousOffset = (previousY + dy) * previousFrame.width;
    const currentOffset = (currentY + dy) * currentFrame.width;
    for (let dx = -radius; dx <= radius; dx += 1) {
      diff += Math.abs(
        previousFrame.gray[previousOffset + previousX + dx]
        - currentFrame.gray[currentOffset + currentX + dx]
      );
      count += 1;
    }
  }
  return diff / count;
}

function estimateTransform(previousAnchors, trackedAnchors) {
  const previousLeft = previousAnchors.leftEye;
  const previousRight = previousAnchors.rightEye;
  const trackedLeft = trackedAnchors.get("leftEye");
  const trackedRight = trackedAnchors.get("rightEye");
  if (previousLeft && previousRight && trackedLeft && trackedRight) {
    const previousCenter = midpoint(previousLeft, previousRight);
    const currentCenter = midpoint(trackedLeft, trackedRight);
    const previousVector = {
      x: previousRight.x - previousLeft.x,
      y: previousRight.y - previousLeft.y
    };
    const currentVector = {
      x: trackedRight.x - trackedLeft.x,
      y: trackedRight.y - trackedLeft.y
    };
    const previousDistance = Math.max(0.001, Math.hypot(previousVector.x, previousVector.y));
    const currentDistance = Math.max(0.001, Math.hypot(currentVector.x, currentVector.y));
    return {
      dx: currentCenter.x - previousCenter.x,
      dy: currentCenter.y - previousCenter.y,
      scale: clamp(currentDistance / previousDistance, 0.94, 1.06),
      rotation: clamp(Math.atan2(currentVector.y, currentVector.x) - Math.atan2(previousVector.y, previousVector.x), -0.12, 0.12),
      center: previousCenter
    };
  }

  const deltas = [...trackedAnchors.entries()]
    .map(([name, point]) => {
      const previous = previousAnchors[name];
      return previous ? { dx: point.x - previous.x, dy: point.y - previous.y } : null;
    })
    .filter(Boolean);
  if (!deltas.length) {
    return null;
  }
  return {
    dx: median(deltas.map((delta) => delta.dx)),
    dy: median(deltas.map((delta) => delta.dy)),
    scale: 1,
    rotation: 0,
    center: previousAnchors.eyeCenter ?? getCentroid(previousAnchors)
  };
}

function applyTransformToAnchors(previousAnchors, predictedAnchors, transform, blend) {
  const center = transform.center ?? getCentroid(previousAnchors);
  if (!center) {
    return predictedAnchors;
  }
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  const anchors = {};
  Object.entries(predictedAnchors).forEach(([name, predicted]) => {
    const previous = previousAnchors[name] ?? predicted;
    const localX = (previous.x - center.x) * transform.scale;
    const localY = (previous.y - center.y) * transform.scale;
    const transformed = {
      x: center.x + transform.dx + localX * cos - localY * sin,
      y: center.y + transform.dy + localX * sin + localY * cos,
      z: predicted.z ?? previous.z ?? 0
    };
    anchors[name] = {
      x: clamp(lerp(predicted.x, transformed.x, blend), -0.08, 1.08),
      y: clamp(lerp(predicted.y, transformed.y, blend), -0.08, 1.08),
      z: transformed.z
    };
  });
  return anchors;
}

function cloneAnchors(anchors) {
  return Object.fromEntries(Object.entries(anchors).map(([name, point]) => [name, { ...point }]));
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

function getCentroid(anchors) {
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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function lerp(previous, next, alpha) {
  return previous + (next - previous) * alpha;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
