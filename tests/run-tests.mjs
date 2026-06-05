import assert from "node:assert/strict";
import { FaceTrackManager } from "../src/FaceTrackManager.js";
import { __effectManagerTestHooks } from "../src/EffectManager.js";
import { FaceEmbeddingRecognizer, descriptorDistance } from "../src/FaceEmbeddingRecognizer.js";
import { IdentityTrackBinder } from "../src/IdentityTrackBinder.js";
import { ReferenceFaceManager } from "../src/ReferenceFaceManager.js";

function makeState(x, y, detected = 0.95) {
  return { detected, x, y, s: 0.35, rx: 0, ry: 0, rz: 0 };
}

const manager = new FaceTrackManager({
  maxFaces: 4,
  detectionThreshold: 0.78,
  lostGraceMs: 100
});

let tracks = manager.update([
  makeState(-0.4, 0.1),
  makeState(0.1, 0.1),
  makeState(0.5, 0.1)
], 1000);

assert.equal(tracks.filter((track) => track.active).length, 3);
assert.deepEqual(tracks.map((track) => track.id), [1, 2, 3]);
assert.deepEqual(tracks.map((track) => track.slotIndex), [0, 1, 2]);

tracks = manager.update([
  makeState(-0.36, 0.1),
  makeState(0.13, 0.1),
  makeState(0.52, 0.1)
], 1030);

assert.deepEqual(tracks.filter((track) => track.active).map((track) => track.id), [1, 2, 3]);

tracks = manager.update([
  makeState(-0.36, 0.1, 0.1),
  makeState(0.13, 0.1),
  makeState(0.52, 0.1)
], 1080);

const lostTrack = tracks.find((track) => track.id === 1);
assert.equal(lostTrack.active, true);
assert.equal(lostTrack.detectedNow, false);
assert.equal(lostTrack.predicted, true);
assert.ok(lostTrack.lostMs > 0);

tracks = manager.update([
  makeState(-0.34, 0.08),
  makeState(0.15, 0.12),
  makeState(0.5, 0.1)
], 1120);

assert.equal(tracks.find((track) => track.id === 1).active, true);
assert.deepEqual(tracks.filter((track) => track.active).map((track) => track.id), [1, 2, 3]);

manager.reset();
tracks = manager.update([makeState(0, 0)], 2000);
assert.equal(tracks[0].id, 1);

manager.reset();
tracks = manager.update([
  makeState(-0.5, 0.0),
  makeState(0.5, 0.0)
], 3000);
assert.deepEqual(tracks.filter((track) => track.active).map((track) => track.id), [1, 2]);

tracks = manager.update([
  makeState(0.48, 0.0),
  makeState(-0.48, 0.0)
], 3030);
const leftTrack = tracks.find((track) => track.x < 0);
const rightTrack = tracks.find((track) => track.x > 0);
assert.equal(leftTrack.id, 1);
assert.equal(rightTrack.id, 2);
assert.equal(leftTrack.slotIndex, 1);
assert.equal(rightTrack.slotIndex, 0);

console.log("FaceTrackManager tests passed");

const fullFaceTrack = {
  x: 0,
  y: 0,
  s: 0.42,
  anchors: {
    leftEye: { x: 0.42, y: 0.38 },
    rightEye: { x: 0.58, y: 0.38 },
    noseTip: { x: 0.5, y: 0.5 },
    chin: { x: 0.5, y: 0.7 }
  }
};
const edgeFaceTrack = {
  ...fullFaceTrack,
  x: -0.9,
  anchors: {
    ...fullFaceTrack.anchors,
    leftEye: { x: 0.0, y: 0.38 }
  }
};

assert.equal(__effectManagerTestHooks.isPartialOrEdgeFace(fullFaceTrack), false);
assert.equal(__effectManagerTestHooks.isPartialOrEdgeFace(edgeFaceTrack), true);
assert.equal(__effectManagerTestHooks.isEffectSafeForTrack("mask", edgeFaceTrack, 0), false);
assert.equal(__effectManagerTestHooks.isEffectSafeForTrack("crown", edgeFaceTrack, 1), false);
assert.equal(__effectManagerTestHooks.getSafeFallbackEffect(edgeFaceTrack), "privacyAllow");
assert.deepEqual(__effectManagerTestHooks.getPreferredEffects(edgeFaceTrack, 0), ["privacyAllow"]);

const testEffectManager = new __effectManagerTestHooks.EffectManager({ maxFaces: 4 });
testEffectManager.setAssignmentMode("manual");
testEffectManager.bindManualEffect({ trackId: 7, slotIndex: 0 }, "privacyBlur");
assert.equal(testEffectManager.getEffectForTrack({ id: 7, slotIndex: 0, ...fullFaceTrack }), "privacyBlur");
assert.notEqual(testEffectManager.getEffectForTrack({ id: 8, slotIndex: 0, ...fullFaceTrack }), "privacyBlur");
testEffectManager.bindIdentityEffect({
  trackId: 7,
  personId: "person-a",
  personName: "A",
  effectId: "avatarMale",
  distance: 0.05
});
assert.equal(testEffectManager.getEffectForTrack({ id: 7, slotIndex: 0, ...fullFaceTrack }), "avatarMale");
assert.equal(testEffectManager.getTrackSummary({ id: 7, slotIndex: 0, ...fullFaceTrack }).identity.personName, "A");

console.log("EffectManager assignment tests passed");

const referenceManager = new ReferenceFaceManager({
  effectDefinitions: testEffectManager.definitions
});
const personA = referenceManager.addPerson({
  name: "A",
  effectId: "avatarMale",
  descriptor: { provider: "test", vector: [1, 0, 0] },
  imageDataUrl: "data:image/png;base64,a"
});
const personB = referenceManager.addPerson({
  name: "B",
  effectId: "avatarFemale",
  descriptor: { provider: "test", vector: [0, 1, 0] },
  imageDataUrl: "data:image/png;base64,b"
});
assert.equal(referenceManager.getPeople().length, 2);
assert.equal(referenceManager.getEffectForPerson(personB.personId), "avatarFemale");
assert.equal(referenceManager.updatePersonEffect(personA.personId, "privacyBlur").effectId, "privacyBlur");
assert.equal(referenceManager.removePerson(personB.personId), true);

console.log("ReferenceFaceManager tests passed");

const recognizer = new FaceEmbeddingRecognizer({
  matchThreshold: 0.2,
  closeMatchGap: 0.02
});
const geometryA = makeFaceGeometry(0.5, 0.5, 0.1, 0.12);
const geometryB = makeFaceGeometry(0.5, 0.5, 0.1, 0.24);
const descriptorA = recognizer.createDescriptor(geometryA, { source: "unit-a" });
const descriptorA2 = recognizer.createDescriptor(makeFaceGeometry(0.55, 0.48, 0.13, 0.156), { source: "unit-a-scaled" });
const descriptorB = recognizer.createDescriptor(geometryB, { source: "unit-b" });
assert.ok(descriptorA.vector.length > 100);
assert.ok(descriptorDistance(descriptorA, descriptorA2) < descriptorDistance(descriptorA, descriptorB));
const match = recognizer.matchDescriptor(descriptorA2, [
  { personId: "a", name: "A", effectId: "avatarMale", descriptor: descriptorA },
  { personId: "b", name: "B", effectId: "avatarFemale", descriptor: descriptorB }
]);
assert.equal(match.matched, true);
assert.equal(match.personId, "a");

console.log("FaceEmbeddingRecognizer tests passed");

const binderReferenceManager = new ReferenceFaceManager({
  effectDefinitions: [
    { id: "avatarMale", label: "Male digital substitute", color: "#4cc9f0", category: "privacy", privacyMode: "replace", avatarType: "male" },
    { id: "avatarFemale", label: "Female digital substitute", color: "#f72585", category: "privacy", privacyMode: "replace", avatarType: "female" }
  ]
});
const binderPersonA = binderReferenceManager.addPerson({
  name: "A",
  effectId: "avatarMale",
  descriptor: descriptorA,
  imageDataUrl: "data:image/png;base64,a"
});
binderReferenceManager.addPerson({
  name: "B",
  effectId: "avatarFemale",
  descriptor: descriptorB,
  imageDataUrl: "data:image/png;base64,b"
});
const binder = new IdentityTrackBinder({
  referenceFaceManager: binderReferenceManager,
  recognizer,
  checkIntervalMs: 0,
  confirmedRecheckMs: 1000,
  bindingLostGraceMs: 100
});
const trackA = {
  id: 42,
  slotIndex: 0,
  active: true,
  detectedNow: true,
  detected: 0.95,
  ...geometryA
};
let identityState = binder.update([trackA], 5000);
assert.equal(identityState.boundTrackCount, 1);
assert.equal(binder.getBindingForTrack(42).personId, binderPersonA.personId);
assert.equal(binder.getEffectBindings().get(42).effectId, "avatarMale");
identityState = binder.update([{ ...trackA, active: false, detectedNow: false }], 5200);
assert.equal(identityState.boundTrackCount, 0);

console.log("IdentityTrackBinder tests passed");

const ambiguousRecognizer = new FaceEmbeddingRecognizer({
  matchThreshold: 0.05,
  closeMatchGap: 0.02
});
const globalReferenceManager = new ReferenceFaceManager({
  effectDefinitions: [
    { id: "avatarMale", label: "Male digital substitute", color: "#4cc9f0", category: "privacy", privacyMode: "replace", avatarType: "male" },
    { id: "avatarFemale", label: "Female digital substitute", color: "#f72585", category: "privacy", privacyMode: "replace", avatarType: "female" }
  ]
});
globalReferenceManager.addPerson({
  name: "A",
  effectId: "avatarMale",
  descriptor: descriptorA,
  imageDataUrl: "data:image/png;base64,a"
});
globalReferenceManager.addPerson({
  name: "B",
  effectId: "avatarFemale",
  descriptor: descriptorB,
  imageDataUrl: "data:image/png;base64,b"
});
const globalBinder = new IdentityTrackBinder({
  referenceFaceManager: globalReferenceManager,
  recognizer: ambiguousRecognizer,
  checkIntervalMs: 0
});
const globalState = globalBinder.update([
  {
    id: 51,
    slotIndex: 0,
    active: true,
    detectedNow: true,
    detected: 0.95,
    ...makeFaceGeometry(0.55, 0.48, 0.13, 0.156)
  },
  {
    id: 52,
    slotIndex: 1,
    active: true,
    detectedNow: true,
    detected: 0.95,
    ...makeFaceGeometry(0.52, 0.52, 0.13, 0.312)
  }
], 7000);
assert.equal(globalState.boundTrackCount, 2);
assert.equal(new Set(globalState.bindings.map((binding) => binding.personId)).size, 2);
assert.equal(new Set(globalState.bindings.map((binding) => binding.effectId)).size, 2);

console.log("IdentityTrackBinder global assignment tests passed");

const asyncReferenceManager = new ReferenceFaceManager({
  effectDefinitions: [
    { id: "avatarMale", label: "Male digital substitute", color: "#4cc9f0", category: "privacy", privacyMode: "replace", avatarType: "male" },
    { id: "privacyBlur", label: "Privacy blur shield", color: "#ffd166", category: "privacy", privacyMode: "blur" }
  ]
});
const asyncPerson = asyncReferenceManager.addPerson({
  name: "A",
  effectId: "avatarMale",
  descriptor: { provider: "face-api-face-recognition-net", vector: [0, 0, 0] },
  imageDataUrl: "data:image/png;base64,a"
});
let resolveAsyncMatch;
const asyncBinder = new IdentityTrackBinder({
  referenceFaceManager: asyncReferenceManager,
  recognizer: {
    matchTrack() {
      return new Promise((resolve) => {
        resolveAsyncMatch = resolve;
      });
    },
    matchThreshold: 0.5
  },
  checkIntervalMs: 0
});
const asyncTrack = {
  id: 77,
  slotIndex: 0,
  active: true,
  detectedNow: true,
  detected: 0.95
};
let asyncState = asyncBinder.update([asyncTrack], 9000, { sourceElement: {} });
assert.equal(asyncState.boundTrackCount, 0);
assert.equal(asyncState.statuses[0].status, "recognizing");
resolveAsyncMatch({
  matched: true,
  status: "matched",
  personId: asyncPerson.personId,
  personName: asyncPerson.name,
  effectId: asyncPerson.effectId,
  distance: 0.1,
  confidence: 0.85,
  best: {
    personId: asyncPerson.personId,
    name: asyncPerson.name,
    effectId: asyncPerson.effectId,
    distance: 0.1
  }
});
await new Promise((resolve) => setTimeout(resolve, 0));
asyncState = asyncBinder.update([asyncTrack], 9050, { sourceElement: {} });
assert.equal(asyncState.boundTrackCount, 1);
assert.equal(asyncBinder.getBindingForTrack(77).personId, asyncPerson.personId);

const negativeAsyncBinder = new IdentityTrackBinder({
  referenceFaceManager: asyncReferenceManager,
  recognizer: {
    async matchTrack() {
      return {
        matched: false,
        status: "below-threshold",
        personId: null,
        personName: null,
        effectId: null,
        distance: 0.91,
        confidence: 0,
        best: {
          personId: asyncPerson.personId,
          name: asyncPerson.name,
          effectId: asyncPerson.effectId,
          distance: 0.91
        }
      };
    },
    matchThreshold: 0.5
  },
  checkIntervalMs: 0
});
let negativeAsyncState = negativeAsyncBinder.update([asyncTrack], 10000, { sourceElement: {} });
assert.equal(negativeAsyncState.boundTrackCount, 0);
await new Promise((resolve) => setTimeout(resolve, 0));
negativeAsyncState = negativeAsyncBinder.getDebugState([asyncTrack]);
assert.equal(negativeAsyncState.boundTrackCount, 0);
assert.equal(negativeAsyncBinder.getBindingForTrack(77), null);
assert.equal(negativeAsyncState.statuses[0].status, "below-threshold");

console.log("IdentityTrackBinder async recognition tests passed");

function makeFaceGeometry(centerX, centerY, eyeDistance, faceHeight) {
  const leftEye = { x: centerX - eyeDistance / 2, y: centerY - faceHeight * 0.18, z: 0 };
  const rightEye = { x: centerX + eyeDistance / 2, y: centerY - faceHeight * 0.18, z: 0 };
  const anchors = {
    leftEye,
    rightEye,
    eyeCenter: { x: centerX, y: centerY - faceHeight * 0.18, z: 0 },
    noseTip: { x: centerX, y: centerY + faceHeight * 0.02, z: -0.01 },
    forehead: { x: centerX, y: centerY - faceHeight * 0.5, z: 0.01 },
    chin: { x: centerX, y: centerY + faceHeight * 0.5, z: 0.01 },
    leftCheek: { x: centerX - eyeDistance * 0.86, y: centerY + faceHeight * 0.08, z: 0 },
    rightCheek: { x: centerX + eyeDistance * 0.86, y: centerY + faceHeight * 0.08, z: 0 },
    mouthCenter: { x: centerX, y: centerY + faceHeight * 0.3, z: 0 },
    leftTemple: { x: centerX - eyeDistance * 0.78, y: centerY - faceHeight * 0.18, z: 0 },
    rightTemple: { x: centerX + eyeDistance * 0.78, y: centerY - faceHeight * 0.18, z: 0 }
  };
  const landmarks = Array.from({ length: 468 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = 0.18 + (index % 17) * 0.002;
    return {
      x: centerX + Math.cos(angle) * eyeDistance * radius * (1 + (index % 5) * 0.04),
      y: centerY + Math.sin(angle) * faceHeight * radius * (1 + (index % 7) * 0.025),
      z: Math.sin(angle * 0.7) * 0.005
    };
  });
  landmarks[10] = anchors.forehead;
  landmarks[33] = anchors.leftEye;
  landmarks[133] = anchors.leftEye;
  landmarks[263] = anchors.rightEye;
  landmarks[362] = anchors.rightEye;
  landmarks[1] = anchors.noseTip;
  landmarks[152] = anchors.chin;
  landmarks[234] = anchors.leftCheek;
  landmarks[454] = anchors.rightCheek;
  landmarks[13] = anchors.mouthCenter;
  landmarks[14] = anchors.mouthCenter;
  return {
    landmarks,
    anchors,
    bounds: {
      minX: centerX - eyeDistance,
      maxX: centerX + eyeDistance,
      minY: centerY - faceHeight * 0.58,
      maxY: centerY + faceHeight * 0.58,
      width: eyeDistance * 2,
      height: faceHeight * 1.16
    }
  };
}
