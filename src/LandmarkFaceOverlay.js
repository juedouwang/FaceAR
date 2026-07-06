export class LandmarkFaceOverlay {
  constructor({ canvas, maxFaces = 4 } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: true });
    this.maxFaces = maxFaces;
    this.visible = true;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.width = width;
    this.height = height;
  }

  setVisible(isVisible) {
    this.visible = Boolean(isVisible);
    if (!this.visible) {
      this.clear();
    }
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height);
  }

  update(tracks, now = performance.now()) {
    this.clear();
    if (!this.visible) {
      return;
    }

    const activeTracks = tracks
      .filter((track) => track.active)
      .slice(0, this.maxFaces)
      .sort((a, b) => (b.s ?? 0) - (a.s ?? 0));

    activeTracks.forEach((track, index) => {
      this.drawTrack(track, index, now / 1000);
    });
  }

  drawTrack(track, index, timeSeconds) {
    const anchors = track.anchors;
    if (!anchors?.leftEye || !anchors?.rightEye || !anchors?.noseTip) {
      return;
    }

    const ctx = this.context;
    const leftEye = toCanvasPoint(anchors.leftEye, this.width, this.height);
    const rightEye = toCanvasPoint(anchors.rightEye, this.width, this.height);
    const nose = toCanvasPoint(anchors.noseTip, this.width, this.height);
    const mouth = toCanvasPoint(anchors.mouthCenter ?? anchors.noseTip, this.width, this.height);
    const leftCheek = toCanvasPoint(anchors.leftCheek ?? anchors.leftEye, this.width, this.height);
    const rightCheek = toCanvasPoint(anchors.rightCheek ?? anchors.rightEye, this.width, this.height);
    const forehead = toCanvasPoint(anchors.forehead ?? anchors.eyeCenter, this.width, this.height);
    const chin = toCanvasPoint(anchors.chin ?? anchors.mouthCenter, this.width, this.height);
    const eyeDistance = Math.max(4, distance(leftEye, rightEye));
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const alpha = Math.max(0.38, Math.min(0.86, 0.92 - index * 0.13));
    const pulse = 0.5 + Math.sin(timeSeconds * 2.4 + track.id * 0.7) * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    drawSkinGlow(ctx, leftCheek, rightCheek, forehead, chin, eyeDistance, alpha * 0.22);
    drawCheekGlow(ctx, leftCheek, eyeDistance, roll - 0.18, alpha * 0.52);
    drawCheekGlow(ctx, rightCheek, eyeDistance, roll + 0.18, alpha * 0.52);
    drawEyeShimmer(ctx, leftEye, eyeDistance, roll, -1, alpha * 0.66);
    drawEyeShimmer(ctx, rightEye, eyeDistance, roll, 1, alpha * 0.66);
    drawNoseHighlight(ctx, forehead, nose, eyeDistance, roll, alpha * 0.46);
    drawSparkles(ctx, leftEye, rightEye, eyeDistance, roll, alpha, pulse);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    drawLipTint(ctx, track.landmarks, mouth, eyeDistance, this.width, this.height, alpha * 0.58);
    ctx.restore();
  }
}

function drawSkinGlow(ctx, leftCheek, rightCheek, forehead, chin, eyeDistance, alpha) {
  const center = midpoint(midpoint(leftCheek, rightCheek), midpoint(forehead, chin));
  const radiusX = Math.max(eyeDistance * 2.15, distance(leftCheek, rightCheek) * 0.76);
  const radiusY = Math.max(eyeDistance * 2.55, distance(forehead, chin) * 0.62);
  const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, Math.max(radiusX, radiusY));
  gradient.addColorStop(0, `rgba(255, 218, 196, ${alpha})`);
  gradient.addColorStop(0.46, `rgba(255, 176, 188, ${alpha * 0.32})`);
  gradient.addColorStop(1, "rgba(255, 176, 188, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCheekGlow(ctx, cheek, eyeDistance, rotation, alpha) {
  const gradient = ctx.createRadialGradient(cheek.x, cheek.y, 0, cheek.x, cheek.y, eyeDistance * 0.72);
  gradient.addColorStop(0, `rgba(255, 102, 150, ${alpha})`);
  gradient.addColorStop(0.36, `rgba(255, 151, 177, ${alpha * 0.42})`);
  gradient.addColorStop(1, "rgba(255, 151, 177, 0)");
  ctx.save();
  ctx.translate(cheek.x, cheek.y);
  ctx.rotate(rotation);
  ctx.scale(1.25, 0.62);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, eyeDistance * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEyeShimmer(ctx, eye, eyeDistance, roll, side, alpha) {
  ctx.save();
  ctx.translate(eye.x, eye.y);
  ctx.rotate(roll);
  ctx.strokeStyle = `rgba(255, 246, 198, ${alpha})`;
  ctx.lineWidth = Math.max(1.6, eyeDistance * 0.055);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-side * eyeDistance * 0.26, eyeDistance * 0.18);
  ctx.quadraticCurveTo(0, eyeDistance * 0.31, side * eyeDistance * 0.28, eyeDistance * 0.16);
  ctx.stroke();
  ctx.restore();
}

function drawNoseHighlight(ctx, forehead, nose, eyeDistance, roll, alpha) {
  const bridge = {
    x: nose.x * 0.68 + forehead.x * 0.32,
    y: nose.y * 0.68 + forehead.y * 0.32
  };
  ctx.save();
  ctx.translate(bridge.x, bridge.y);
  ctx.rotate(roll - 0.08);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeDistance * 0.38);
  gradient.addColorStop(0, `rgba(255, 246, 215, ${alpha})`);
  gradient.addColorStop(0.42, `rgba(255, 246, 215, ${alpha * 0.24})`);
  gradient.addColorStop(1, "rgba(255, 246, 215, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, eyeDistance * 0.13, eyeDistance * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkles(ctx, leftEye, rightEye, eyeDistance, roll, alpha, pulse) {
  const placements = [
    { base: leftEye, x: -0.45, y: -0.52, s: 0.09 },
    { base: rightEye, x: 0.46, y: -0.48, s: 0.075 },
    { base: rightEye, x: 0.84, y: -0.15, s: 0.045 }
  ];
  placements.forEach((placement, index) => {
    const point = offsetPoint(placement.base, placement.x * eyeDistance, placement.y * eyeDistance, roll);
    const size = eyeDistance * placement.s * (0.8 + pulse * 0.36 + index * 0.06);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(roll + Math.PI / 4);
    ctx.fillStyle = `rgba(255, 238, 174, ${alpha * (0.5 + pulse * 0.36)})`;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.28, -size * 0.28);
    ctx.lineTo(size, 0);
    ctx.lineTo(size * 0.28, size * 0.28);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.28, size * 0.28);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.28, -size * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawLipTint(ctx, landmarks, fallbackMouth, eyeDistance, width, height, alpha) {
  const lipIndices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
  const lipPoints = Array.isArray(landmarks)
    ? lipIndices.map((index) => landmarks[index]).filter(Boolean).map((point) => toCanvasPoint(point, width, height))
    : [];

  ctx.fillStyle = `rgba(231, 63, 103, ${alpha})`;
  ctx.strokeStyle = `rgba(255, 197, 202, ${alpha * 0.42})`;
  ctx.lineWidth = Math.max(1, eyeDistance * 0.025);

  if (lipPoints.length >= 8) {
    const center = centroid(lipPoints);
    ctx.beginPath();
    lipPoints.forEach((point, index) => {
      const eased = {
        x: center.x + (point.x - center.x) * 1.06,
        y: center.y + (point.y - center.y) * 1.14
      };
      if (index === 0) {
        ctx.moveTo(eased.x, eased.y);
      } else {
        ctx.lineTo(eased.x, eased.y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  ctx.save();
  ctx.translate(fallbackMouth.x, fallbackMouth.y);
  ctx.fillStyle = `rgba(231, 63, 103, ${alpha * 0.82})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, eyeDistance * 0.34, eyeDistance * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function toCanvasPoint(point, width, height) {
  return {
    x: point.x * width,
    y: point.y * height,
    z: point.z ?? 0
  };
}

function offsetPoint(point, x, y, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: point.x + x * cos - y * sin,
    y: point.y + x * sin + y * cos
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function centroid(points) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
