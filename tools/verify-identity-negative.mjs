import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs");
const baseUrl = process.env.PARTY_FACE_AR_URL || "http://127.0.0.1:8000";
const screenshotPath = process.env.MP_AR_IDENTITY_NEGATIVE_SCREENSHOT
  ? path.resolve(rootDir, process.env.MP_AR_IDENTITY_NEGATIVE_SCREENSHOT)
  : path.join(outputDir, "verification-personashield-negative.png");
const referencePath = path.join(outputDir, "verification-stranger-reference.png");
const url = process.env.MP_AR_IDENTITY_NEGATIVE_URL
  || `${baseUrl}/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25`;
const sourceReferenceUrl = `${baseUrl}/docs/candidate-frames/pool.jpg`;

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
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__PARTY_FACE_AR_MEDIAPIPE__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => (window.__PARTY_FACE_AR_MEDIAPIPE__?.activeTrackCount ?? 0) >= 2, null, { timeout: 90000 });
  await page.waitForTimeout(1200);

  const strangerDataUrl = await makeStrangerReference(page, sourceReferenceUrl);
  await fs.writeFile(referencePath, Buffer.from(strangerDataUrl.split(",")[1], "base64"));

  await page.fill("#referenceNameInput", "Stranger");
  await page.selectOption("#referenceEffect", "privacyBlur");
  await page.setInputFiles("#referenceFaceInput", referencePath);
  await page.click("#registerReferenceButton", { noWaitAfter: true, timeout: 90000 });
  await page.waitForFunction(() => (
    (window.__PARTY_FACE_AR_MEDIAPIPE__?.identity?.registeredPeople ?? []).length === 1
  ), null, { timeout: 120000 });

  await page.waitForFunction(() => {
    const identity = window.__PARTY_FACE_AR_MEDIAPIPE__?.identity;
    const statuses = identity?.statuses ?? [];
    return statuses.some((status) => ["below-threshold", "ambiguous", "no-descriptor"].includes(status.status));
  }, null, { timeout: 120000 });
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => {
    const app = window.__PARTY_FACE_AR_MEDIAPIPE__;
    return {
      activeTrackCount: app.activeTrackCount,
      fps: Math.round(app.fps),
      identity: app.identity,
      tracks: app.tracks.map((track) => ({
        id: track.id,
        slotIndex: track.slotIndex,
        active: track.active,
        x: Number(track.x.toFixed(3)),
        y: Number(track.y.toFixed(3)),
        s: Number(track.s.toFixed(3))
      }))
    };
  });

  await page.screenshot({ path: screenshotPath, fullPage: true });

  const activeBindings = (state.identity?.bindings ?? []).filter((binding) => binding.active);
  if (activeBindings.length !== 0) {
    throw new Error(`Expected zero active identity bindings for a stranger reference, got ${activeBindings.length}`);
  }
  if ((state.identity?.registeredPeople ?? []).length !== 1) {
    throw new Error("Expected exactly one registered stranger reference");
  }

  console.log(JSON.stringify({
    registeredPeople: state.identity.registeredPeople.map((person) => ({
      personId: person.personId,
      name: person.name,
      effectId: person.effectId,
      descriptorProvider: person.descriptorProvider,
      descriptorLength: person.descriptorLength
    })),
    activeTrackCount: state.activeTrackCount,
    fps: state.fps,
    boundTrackCount: activeBindings.length,
    statuses: state.identity.statuses.map((status) => ({
      trackId: status.trackId,
      status: status.status,
      bestPersonId: status.personId,
      distance: Number.isFinite(status.distance) ? Number(status.distance.toFixed(4)) : null
    })),
    referenceFile: path.relative(rootDir, referencePath),
    screenshot: path.relative(rootDir, screenshotPath)
  }, null, 2));
} finally {
  await browser.close();
}

async function makeStrangerReference(page, sourceUrl) {
  return page.evaluate(async (url) => {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load stranger source image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    const sx = 248;
    const sy = 50;
    const sw = 150;
    const sh = 160;
    const padding = 44;
    canvas.width = sw + padding * 2;
    canvas.height = sh + padding * 2;
    canvas.getContext("2d").drawImage(
      image,
      sx - padding,
      sy - padding,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return canvas.toDataURL("image/png");
  }, sourceUrl);
}
