import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs");
const baseUrl = process.env.PARTY_FACE_AR_URL || "http://127.0.0.1:8000";
const screenshotPath = process.env.MP_AR_AGNI_SCREENSHOT
  ? path.resolve(rootDir, process.env.MP_AR_AGNI_SCREENSHOT)
  : path.join(outputDir, "verification-agni-pain-face.png");

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
  const url = `${baseUrl}/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__PARTY_FACE_AR_MEDIAPIPE__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => document.querySelectorAll(".face-picker-box").length >= 3, null, { timeout: 90000 });
  await page.waitForTimeout(1500);

  const targetTrackId = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll(".face-picker-box")];
    return Number(boxes[0]?.dataset.trackId ?? 0);
  });
  if (!targetTrackId) {
    throw new Error("Expected a clickable target face");
  }

  await page.locator(`.face-picker-box[data-track-id="${targetTrackId}"]`).click();
  await page.selectOption("#manualEffect", "agniPainFace");
  await page.waitForFunction(() => {
    const effects = window.__PARTY_FACE_AR_MEDIAPIPE__?.effects ?? [];
    return effects.some((effect) => (
      effect.effectId === "agniPainFace"
      && effect.avatarRenderer === "local-private-face-asset"
      && effect.avatarCoverage === "face-mask-private-asset"
      && effect.maskMode === "face-contour-warp-mask"
      && effect.contourVisible === true
      && effect.maskPointCount === 36
      && effect.sourceUvMode === "canonical-face-oval-uv"
      && effect.warpVertexCount === 109
      && effect.childNames?.includes("local-private-face-asset-agniPainFace")
    ));
  }, null, { timeout: 15000 });
  await page.waitForTimeout(900);

  const state = await page.evaluate(() => {
    const app = window.__PARTY_FACE_AR_MEDIAPIPE__;
    const selectedBox = document.querySelector(".face-picker-box.is-selected");
    return {
      activeTrackCount: app.activeTrackCount,
      fps: Math.round(app.fps),
      selectedTrackId: Number(selectedBox?.dataset.trackId ?? 0),
      selectedEffectId: selectedBox?.dataset.effectId ?? null,
      selectedLabel: document.getElementById("selectedFaceLabel")?.textContent ?? "",
      effects: app.effects
    };
  });

  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (state.selectedEffectId !== "agniPainFace") {
    throw new Error(`Expected selected Agni-style effect, got ${state.selectedEffectId}`);
  }

  const agniEffect = state.effects.find((effect) => effect.effectId === "agniPainFace");
  if (!agniEffect?.contourVisible || agniEffect.maskPointCount !== 36) {
    throw new Error("Expected visible 36-point face contour overlay");
  }
  if (agniEffect.sourceUvMode !== "canonical-face-oval-uv" || agniEffect.warpVertexCount !== 109) {
    throw new Error("Expected canonical face-oval UV warp mesh with 109 vertices");
  }

  console.log(JSON.stringify({
    activeTrackCount: state.activeTrackCount,
    fps: state.fps,
    selectedTrackId: state.selectedTrackId,
    selectedEffectId: state.selectedEffectId,
    selectedLabel: state.selectedLabel,
    effects: state.effects.filter((effect) => effect.effectId === "agniPainFace"),
    screenshot: path.relative(rootDir, screenshotPath)
  }, null, 2));
} finally {
  await browser.close();
}
