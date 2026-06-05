import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs");
const baseUrl = process.env.PARTY_FACE_AR_URL || "http://127.0.0.1:8000";
const screenshotPath = process.env.MP_AR_MANUAL_SCREENSHOT
  ? path.resolve(rootDir, process.env.MP_AR_MANUAL_SCREENSHOT)
  : path.join(outputDir, "verification-manual-privacy-action.png");
const targetEffectId = process.env.MP_AR_MANUAL_EFFECT || "privacyBlur";

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

  const before = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll(".face-picker-box")].map((box) => ({
      trackId: Number(box.dataset.trackId),
      effectId: box.dataset.effectId,
      label: box.textContent.trim()
    }));
    const tracks = window.__PARTY_FACE_AR_MEDIAPIPE__?.tracks ?? [];
    return {
      boxes,
      activeTrackCount: tracks.filter((track) => track.active).length
    };
  });

  if (before.boxes.length < 3 || before.activeTrackCount < 3) {
    throw new Error(`Expected at least 3 clickable face boxes, got ${before.boxes.length}`);
  }

  const targetTrackId = before.boxes[0].trackId;
  await page.locator(`.face-picker-box[data-track-id="${targetTrackId}"]`).click();
  await page.selectOption("#manualEffect", targetEffectId);
  await page.waitForTimeout(900);

  const after = await page.evaluate((expectedEffectId) => {
    const selectedBox = document.querySelector(".face-picker-box.is-selected");
    const selectedLabel = document.getElementById("selectedFaceLabel")?.textContent ?? "";
    const mode = document.getElementById("modeValue")?.textContent ?? "";
    const selectedTrackId = Number(selectedBox?.dataset.trackId ?? 0);
    const tracks = window.__PARTY_FACE_AR_MEDIAPIPE__?.tracks ?? [];
    const selectedTrack = tracks.find((track) => track.id === selectedTrackId);
    return {
      selectedTrackId,
      selectedBoxEffectId: selectedBox?.dataset.effectId ?? null,
      selectedLabel,
      mode,
      activeTrackCount: tracks.filter((track) => track.active).length,
      selectedTrackSlot: selectedTrack?.slotIndex ?? null,
      expectedEffectId
    };
  }, targetEffectId);

  await page.screenshot({ path: screenshotPath, fullPage: true });

  if (!after.selectedTrackId) {
    throw new Error("Expected a selected clickable face box after clicking a face");
  }
  if (after.selectedTrackId !== targetTrackId) {
    throw new Error(`Expected selected track ${targetTrackId}, got ${after.selectedTrackId}`);
  }
  if (after.selectedBoxEffectId !== targetEffectId) {
    throw new Error(`Expected selected privacy action ${targetEffectId}, got ${after.selectedBoxEffectId}`);
  }
  if (after.mode !== "manual") {
    throw new Error(`Expected manual assignment mode, got ${after.mode}`);
  }

  console.log(JSON.stringify({
    activeTrackCount: after.activeTrackCount,
    selectedTrackId: after.selectedTrackId,
    selectedTrackSlot: after.selectedTrackSlot,
    selectedEffectId: after.selectedBoxEffectId,
    selectedLabel: after.selectedLabel,
    mode: after.mode,
    screenshot: path.relative(rootDir, screenshotPath)
  }, null, 2));
} finally {
  await browser.close();
}
