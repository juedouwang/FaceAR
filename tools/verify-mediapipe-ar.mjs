import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs");
const baseUrl = process.env.PARTY_FACE_AR_URL || "http://127.0.0.1:8000";
const minFaces = Number(process.env.MP_AR_MIN_FACES || 3);
const profile = process.env.MP_AR_PROFILE || "privacy";
const screenshotPath = process.env.MP_AR_SCREENSHOT
  ? path.resolve(rootDir, process.env.MP_AR_SCREENSHOT)
  : path.join(outputDir, `verification-mediapipe-ar-${profile}.png`);
const sampleWindowMs = Number(process.env.MP_AR_SAMPLE_WINDOW_MS || 7000);
const pauseAtEnv = process.env.MP_AR_PAUSE_AT;
const realtime = process.env.MP_AR_REALTIME === "1";
const pauseAt = realtime ? null : Number(pauseAtEnv ?? 0.25);
const assetSettleMs = Number(process.env.MP_AR_ASSET_SETTLE_MS || (pauseAt === null ? 1200 : 5000));
const defaultUrl = pauseAt === null
  ? `${baseUrl}/mediapipe-ar.html?video=partyHats4&profile=${profile}`
  : `${baseUrl}/mediapipe-ar.html?video=partyHats4&profile=${profile}&pauseAt=${pauseAt}`;

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on("console", (message) => {
  if (message.type() === "error" && !message.text().startsWith("INFO:")) {
    console.error(`[browser:${message.type()}] ${message.text()}`);
  }
});
page.on("pageerror", (error) => {
  console.error(`[browser:pageerror] ${error.message}`);
});

try {
  await page.goto(process.env.MP_AR_VERIFY_URL || defaultUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__PARTY_FACE_AR_MEDIAPIPE__?.ready === true, null, { timeout: 90000 });
  let state = await captureBestState(page, sampleWindowMs, pauseAt === null);
  if (assetSettleMs > 0) {
    await page.waitForTimeout(assetSettleMs);
    state = await page.evaluate(() => window.__PARTY_FACE_AR_MEDIAPIPE__);
  }
  const videoBackground = await sampleCanvasPixels(page, "videoCanvas");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const activeTracks = state.tracks.filter((track) => track.active);
  const summary = {
    activeTrackCount: state.activeTrackCount,
    fps: Math.round(state.fps),
    mode: pauseAt === null ? "realtime-verification" : "paused-frame-verification",
    pauseAt,
    rawDetected: state.rawDetected,
    profile: state.profile,
    videoBackground,
    activeTracks: activeTracks.map((track) => ({
      id: track.id,
      slotIndex: track.slotIndex,
      x: Number(track.x.toFixed(3)),
      y: Number(track.y.toFixed(3)),
      s: Number(track.s.toFixed(3)),
      anchors: compactAnchors(track.anchors)
    })),
    screenshot: path.relative(rootDir, screenshotPath)
  };

  if (summary.activeTrackCount < minFaces) {
    throw new Error(`Expected at least ${minFaces} active tracks, got ${summary.activeTrackCount}`);
  }
  if (pauseAt === null && summary.fps < Number(process.env.MP_AR_MIN_FPS || 24)) {
    throw new Error(`Expected realtime FPS >= ${process.env.MP_AR_MIN_FPS || 24}, got ${summary.fps}`);
  }
  if (!videoBackground || videoBackground.nonBlackRatio < 0.08) {
    throw new Error(`Expected visible video background, got non-black ratio ${videoBackground?.nonBlackRatio ?? "n/a"}`);
  }

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}

async function sampleCanvasPixels(page, canvasId) {
  return await page.evaluate((id) => {
    const canvas = document.getElementById(id);
    if (!canvas) {
      return null;
    }
    const sample = document.createElement("canvas");
    sample.width = 64;
    sample.height = 64;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let nonBlack = 0;
    let alpha = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] || pixels[index + 1] || pixels[index + 2]) {
        nonBlack += 1;
      }
      if (pixels[index + 3]) {
        alpha += 1;
      }
    }
    const total = sample.width * sample.height;
    return {
      width: canvas.width,
      height: canvas.height,
      nonBlackRatio: Number((nonBlack / total).toFixed(3)),
      alphaRatio: Number((alpha / total).toFixed(3))
    };
  }, canvasId);
}

function compactAnchors(anchors) {
  if (!anchors) {
    return null;
  }
  return Object.fromEntries(["leftEye", "rightEye", "eyeCenter", "noseTip", "forehead", "chin"].map((name) => [
    name,
    anchors[name] ? {
      x: Number(anchors[name].x.toFixed(3)),
      y: Number(anchors[name].y.toFixed(3)),
      z: Number((anchors[name].z ?? 0).toFixed(3))
    } : null
  ]));
}

async function captureBestState(page, windowMs, preferStableFps = false) {
  const deadline = Date.now() + windowMs;
  let bestState = null;

  while (Date.now() < deadline) {
    const state = await page.evaluate(() => window.__PARTY_FACE_AR_MEDIAPIPE__);
    const stateScore = scoreState(state, preferStableFps);
    const bestScore = scoreState(bestState, preferStableFps);
    if (!bestState || stateScore > bestScore) {
      bestState = state;
    }
    if (!preferStableFps && (state.activeTrackCount ?? 0) >= minFaces) {
      return state;
    }
    await page.waitForTimeout(250);
  }

  return bestState ?? await page.evaluate(() => window.__PARTY_FACE_AR_MEDIAPIPE__);
}

function scoreState(state, preferStableFps) {
  if (!state) {
    return -Infinity;
  }
  const faceScore = (state.activeTrackCount ?? 0) * 1000;
  if (!preferStableFps) {
    return faceScore;
  }
  return faceScore + Math.min(240, Number(state.fps ?? 0) * 4) - Math.min(200, Number(state.profile?.lastDetectionMs ?? 0) / 20);
}
