import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "docs");
const baseUrl = process.env.PARTY_FACE_AR_URL || "http://127.0.0.1:8000";
const screenshotPath = process.env.MP_AR_IDENTITY_SCREENSHOT
  ? path.resolve(rootDir, process.env.MP_AR_IDENTITY_SCREENSHOT)
  : path.join(outputDir, "verification-personashield-identity-binding.png");
const protectedFramePath = process.env.MP_AR_PROTECTED_FRAME
  ? path.resolve(rootDir, process.env.MP_AR_PROTECTED_FRAME)
  : path.join(outputDir, "verification-personashield-protected-frame.png");
const minFps = Number(process.env.MP_AR_IDENTITY_MIN_FPS || 24);
const shouldCheckFps = process.env.MP_AR_IDENTITY_CHECK_FPS === "1";
const url = process.env.MP_AR_IDENTITY_URL
  || `${baseUrl}/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25`;

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
  await page.waitForTimeout(1500);

  const references = await page.evaluate(() => {
    const video = document.getElementById("inputVideo");
    const tracks = window.__PARTY_FACE_AR_MEDIAPIPE__.tracks
      .filter((track) => track.active && track.landmarks?.length && track.anchors)
      .sort((a, b) => b.s - a.s)
      .slice(0, 2);
    const cropTrack = (track, name, effectId) => {
      const bounds = track.bounds;
      const padding = Math.max(bounds.width, bounds.height) * 0.32;
      const sx = Math.max(0, (bounds.minX - padding) * video.videoWidth);
      const sy = Math.max(0, (bounds.minY - padding) * video.videoHeight);
      const ex = Math.min(video.videoWidth, (bounds.maxX + padding) * video.videoWidth);
      const ey = Math.min(video.videoHeight, (bounds.maxY + padding) * video.videoHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(ex - sx));
      canvas.height = Math.max(1, Math.round(ey - sy));
      canvas.getContext("2d").drawImage(video, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      return {
        trackId: track.id,
        slotIndex: track.slotIndex,
        x: track.x,
        s: track.s,
        name,
        effectId,
        dataUrl: canvas.toDataURL("image/png")
      };
    };
    return [
      tracks[0] ? cropTrack(tracks[0], "Person A", "avatarMale") : null,
      tracks[1] ? cropTrack(tracks[1], "Person B", "avatarFemale") : null
    ].filter(Boolean);
  });

  if (references.length < 2) {
    throw new Error(`Expected at least 2 active tracks for identity references, got ${references.length}`);
  }

  const referenceFiles = [];
  for (const reference of references) {
    const fileName = `verification-reference-${reference.name.toLowerCase().replaceAll(" ", "-")}.png`;
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, Buffer.from(reference.dataUrl.split(",")[1], "base64"));
    referenceFiles.push({ ...reference, filePath });
  }

  for (let index = 0; index < referenceFiles.length; index += 1) {
    const reference = referenceFiles[index];
    await page.fill("#referenceNameInput", reference.name);
    await page.selectOption("#referenceEffect", reference.effectId);
    await page.setInputFiles("#referenceFaceInput", reference.filePath);
    await page.click("#registerReferenceButton", { noWaitAfter: true, timeout: 90000 });
    await page.waitForFunction((expectedCount) => (
      (window.__PARTY_FACE_AR_MEDIAPIPE__?.identity?.registeredPeople ?? []).length >= expectedCount
    ), index + 1, { timeout: 120000 });
  }

  await page.waitForFunction(() => {
    const identity = window.__PARTY_FACE_AR_MEDIAPIPE__?.identity;
    const activeBindings = (identity?.bindings ?? []).filter((binding) => binding.active);
    const effectIds = new Set(activeBindings.map((binding) => binding.effectId));
    return activeBindings.length >= 2 && effectIds.size >= 2;
  }, null, { timeout: 15000 });

  await page.waitForFunction(() => {
    const effects = window.__PARTY_FACE_AR_MEDIAPIPE__?.effects ?? [];
    return effects.some((effect) => (
      effect.effectId === "avatarMale"
      && effect.avatarRenderer === "threejs-full-cover-head"
      && effect.avatarSource === "Procedural 3D male head"
      && effect.avatarCoverage === "face-anchor-full-cover-head"
      && effect.childNames?.includes("full-cover-digital-head-male")
    ))
      && effects.some((effect) => (
        effect.effectId === "avatarFemale"
        && effect.avatarRenderer === "threejs-full-cover-head"
        && effect.avatarSource === "Procedural 3D female head"
        && effect.avatarCoverage === "face-anchor-full-cover-head"
        && effect.childNames?.includes("full-cover-digital-head-female")
      ));
  }, null, { timeout: 15000 });

  await page.waitForTimeout(900);
  const state = await page.evaluate(() => {
    const app = window.__PARTY_FACE_AR_MEDIAPIPE__;
    return {
      activeTrackCount: app.activeTrackCount,
      fps: Math.round(app.fps),
      identity: app.identity,
      effects: app.effects,
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
  const protectedFrameDataUrl = await page.evaluate(() => window.__PERSONA_SHIELD_API__?.captureProtectedFrame?.() ?? "");
  if (!protectedFrameDataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("Expected protected frame capture to return a PNG data URL");
  }
  await fs.writeFile(protectedFramePath, Buffer.from(protectedFrameDataUrl.split(",")[1], "base64"));

  const activeBindings = (state.identity?.bindings ?? []).filter((binding) => binding.active);
  const effectIds = new Set(activeBindings.map((binding) => binding.effectId));
  const personIds = new Set(activeBindings.map((binding) => binding.personId));

  const registrations = state.identity?.registeredPeople ?? [];
  if (registrations.length < 2) {
    throw new Error(`Expected 2 registered people, got ${registrations.length}`);
  }
  if (activeBindings.length < 2) {
    throw new Error(`Expected at least 2 active identity bindings, got ${activeBindings.length}`);
  }
  if (effectIds.size < 2 || personIds.size < 2) {
    throw new Error("Expected two different people with two different privacy actions");
  }
  if (shouldCheckFps && state.fps < minFps) {
    throw new Error(`Expected FPS >= ${minFps}, got ${state.fps}`);
  }

  console.log(JSON.stringify({
    registeredPeople: registrations.map((person) => ({
      personId: person.personId,
      name: person.name,
      effectId: person.effectId,
      descriptorProvider: person.descriptorProvider,
      descriptorLength: person.descriptorLength
    })),
    referenceFiles: referenceFiles.map((reference) => path.relative(rootDir, reference.filePath)),
    activeTrackCount: state.activeTrackCount,
    fps: state.fps,
    boundTrackCount: activeBindings.length,
    activeBindings: activeBindings.map((binding) => ({
      trackId: binding.trackId,
      personId: binding.personId,
      personName: binding.personName,
      effectId: binding.effectId,
      distance: Number(binding.distance.toFixed(4)),
      confidence: Number(binding.confidence.toFixed(3))
    })),
    effects: state.effects,
    screenshot: path.relative(rootDir, screenshotPath),
    protectedFrame: path.relative(rootDir, protectedFramePath)
  }, null, 2));
} finally {
  await browser.close();
}
