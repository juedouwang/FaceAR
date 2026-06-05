import { chromium } from "playwright";

const baseUrl = process.env.PARTY_FACE_AR_URL || "http://127.0.0.1:8000";
const durationMs = Number(process.env.MP_AR_PROFILE_MS || 12000);
const sampleEveryMs = Number(process.env.MP_AR_PROFILE_STEP_MS || 250);
const profile = process.env.MP_AR_PROFILE || "privacy";
const url = process.env.MP_AR_VERIFY_URL || `${baseUrl}/mediapipe-ar.html?video=partyHats4&profile=${profile}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => window.__PARTY_FACE_AR_MEDIAPIPE__?.ready === true, null, { timeout: 90000 });
  await page.waitForFunction(() => (window.__PARTY_FACE_AR_MEDIAPIPE__?.activeTrackCount ?? 0) >= 3, null, { timeout: 90000 });
  await page.waitForTimeout(1000);

  const deadline = Date.now() + durationMs;
  const samples = [];
  while (Date.now() < deadline) {
    samples.push(await page.evaluate(() => window.__PARTY_FACE_AR_MEDIAPIPE__));
    await page.waitForTimeout(sampleEveryMs);
  }

  const valid = samples.filter((sample) => sample?.ready);
  const fpsValues = valid.map((sample) => Number(sample.fps || 0)).filter(Number.isFinite);
  const detectionValues = valid.map((sample) => Number(sample.profile?.lastDetectionMs || 0)).filter(Boolean);
  const roundTripValues = valid.map((sample) => Number(sample.profile?.roundTripMs || 0)).filter(Boolean);
  const sourceAgeValues = valid.map((sample) => Number(sample.profile?.sourceAgeMs || 0)).filter(Boolean);
  const activeFaceValues = valid.map((sample) => Number(sample.activeTrackCount || 0));
  const jitter = computeJitter(valid);
  const backends = summarizeCounts(valid.map((sample) => sample.detectionBackend || sample.profile?.worker && "worker" || "sync"));
  const summary = {
    samples: valid.length,
    backends,
    fps: summarize(fpsValues),
    detectionMs: summarize(detectionValues),
    roundTripMs: summarize(roundTripValues),
    sourceAgeMs: summarize(sourceAgeValues),
    activeFaces: summarize(activeFaceValues),
    jitter
  };
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}

function summarize(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    min: round(sorted[0]),
    p50: round(sorted[Math.floor(sorted.length * 0.5)]),
    p90: round(sorted[Math.floor(sorted.length * 0.9)]),
    max: round(sorted[sorted.length - 1]),
    avg: round(avg)
  };
}

function computeJitter(samples) {
  const byTrack = new Map();
  samples.forEach((sample) => {
    (sample.tracks || []).filter((track) => track.active).forEach((track) => {
      if (!byTrack.has(track.id)) {
        byTrack.set(track.id, []);
      }
      byTrack.get(track.id).push({
        x: Number(track.anchors?.eyeCenter?.x ?? track.x),
        y: Number(track.anchors?.eyeCenter?.y ?? track.y)
      });
    });
  });

  const deltas = [];
  byTrack.forEach((points) => {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const next = points[index];
      deltas.push(Math.hypot(next.x - previous.x, next.y - previous.y));
    }
  });
  return summarize(deltas);
}

function round(value) {
  return Number(value.toFixed(3));
}

function summarizeCounts(values) {
  return values.reduce((counts, value) => {
    const key = value || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}
