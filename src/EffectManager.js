import { EFFECT_DEFINITIONS, createEffect } from "./EffectFactory.js";

export class EffectManager {
  constructor({ THREE, maxFaces = 4 } = {}) {
    this.THREE = THREE;
    this.maxFaces = maxFaces;
    this.definitions = EFFECT_DEFINITIONS;
    this.assignmentMode = "auto";
    this.effectProfile = "privacy";
    this.effectsVisible = true;
    this.manualBindings = new Map();
    this.manualTrackBindings = new Map();
    this.identityTrackBindings = new Map();
    this.trackBindings = new Map();
    this.slotEffects = new Map();
  }

  attachToFaceObjects(faceObjects) {
    this.faceObjects = faceObjects;
    faceObjects.forEach((faceObject, slotIndex) => {
      const effectId = this.getEffectForSlot(slotIndex);
      this.setSlotEffect(slotIndex, effectId);
      faceObject.visible = false;
    });
  }

  setAssignmentMode(mode) {
    this.assignmentMode = mode === "manual" ? "manual" : "auto";
  }

  setEffectProfile(profile) {
    this.effectProfile = ["privacy", "stable", "showcase", "cinematic"].includes(profile) ? profile : "privacy";
    this.trackBindings.clear();
    this.refreshAll();
  }

  setEffectsVisible(isVisible) {
    this.effectsVisible = Boolean(isVisible);
    this.refreshVisibility();
  }

  bindManualEffect(target, effectId) {
    if (!this.definitions.some((definition) => definition.id === effectId)) {
      return;
    }
    const slotIndex = typeof target === "object" ? target.slotIndex : target;
    const trackId = typeof target === "object" ? target.trackId : null;
    if (Number.isFinite(trackId)) {
      this.manualTrackBindings.set(Number(trackId), effectId);
      this.trackBindings.set(Number(trackId), effectId);
      return;
    }
    this.manualBindings.set(Number(slotIndex), effectId);
  }

  setIdentityBindings(identityBindings) {
    this.identityTrackBindings.clear();
    identityBindings?.forEach?.((binding, trackId) => {
      if (!this.definitions.some((definition) => definition.id === binding.effectId)) {
        return;
      }
      this.identityTrackBindings.set(Number(trackId), {
        ...binding,
        trackId: Number(trackId)
      });
      this.trackBindings.set(Number(trackId), binding.effectId);
    });
  }

  bindIdentityEffect({ trackId, personId, personName, effectId, distance = null, confidence = null } = {}) {
    if (!Number.isFinite(trackId) || !this.definitions.some((definition) => definition.id === effectId)) {
      return;
    }
    this.identityTrackBindings.set(Number(trackId), {
      trackId: Number(trackId),
      personId,
      personName,
      effectId,
      distance,
      confidence
    });
    this.trackBindings.set(Number(trackId), effectId);
  }

  clearIdentityBindings() {
    this.identityTrackBindings.clear();
  }

  resetBindings() {
    this.manualBindings.clear();
    this.manualTrackBindings.clear();
    this.identityTrackBindings.clear();
    this.trackBindings.clear();
    this.refreshAll();
  }

  updateTrackEffects(tracks) {
    const effectPlan = this.getEffectPlan(tracks);
    tracks.filter((track) => track.active).forEach((track) => {
      const effectId = effectPlan.get(track.id) ?? this.getEffectForTrack(track);
      this.setSlotEffect(track.slotIndex, effectId);
    });
  }

  getEffectForTrack(track, plannedEffectId = null) {
    if (this.identityTrackBindings.has(track.id)) {
      const binding = this.identityTrackBindings.get(track.id);
      this.trackBindings.set(track.id, binding.effectId);
      return binding.effectId;
    }

    if (this.manualTrackBindings.has(track.id)) {
      const effectId = this.manualTrackBindings.get(track.id);
      this.trackBindings.set(track.id, effectId);
      return effectId;
    }

    if (this.assignmentMode === "manual" && this.manualBindings.has(track.slotIndex)) {
      const effectId = this.manualBindings.get(track.slotIndex);
      this.trackBindings.set(track.id, effectId);
      return effectId;
    }

    if (plannedEffectId) {
      this.trackBindings.set(track.id, plannedEffectId);
      return plannedEffectId;
    }

    if (!this.trackBindings.has(track.id)) {
      const effectId = getSafeFallbackEffect(track);
      this.trackBindings.set(track.id, effectId);
    }

    return this.trackBindings.get(track.id);
  }

  getEffectPlan(tracks) {
    const plan = new Map();
    const activeTracks = tracks
      .filter((track) => track.active)
      .slice()
      .sort((a, b) => facePriority(b) - facePriority(a));

    if (this.assignmentMode === "manual") {
      activeTracks.forEach((track) => {
        plan.set(track.id, this.getEffectForTrack(track));
      });
      return plan;
    }

    const remainingEffects = getAutoEffectPool(this.effectProfile);
    const reserveEffect = (effectId) => {
      const index = remainingEffects.indexOf(effectId);
      if (index >= 0) {
        remainingEffects.splice(index, 1);
      }
      return effectId;
    };

    activeTracks.forEach((track) => {
      if (this.identityTrackBindings.has(track.id)) {
        plan.set(track.id, reserveEffect(this.identityTrackBindings.get(track.id).effectId));
        return;
      }
      if (this.manualTrackBindings.has(track.id)) {
        plan.set(track.id, reserveEffect(this.manualTrackBindings.get(track.id)));
      }
    });

    activeTracks.forEach((track, index) => {
      if (plan.has(track.id)) {
        return;
      }
      const preferred = getPreferredEffects(track, index, this.effectProfile);
      const effectId = preferred.find((candidate) => (
        remainingEffects.includes(candidate)
        && isEffectSafeForTrack(candidate, track, index)
      ))
        ?? remainingEffects.find((candidate) => isEffectSafeForTrack(candidate, track, index))
        ?? getSafeFallbackEffect(track);
      reserveEffect(effectId);
      this.trackBindings.set(track.id, effectId);
      plan.set(track.id, effectId);
    });

    return plan;
  }

  getEffectForSlot(slotIndex) {
    if (this.assignmentMode === "manual" && this.manualBindings.has(slotIndex)) {
      return this.manualBindings.get(slotIndex);
    }
    return this.definitions[slotIndex % this.definitions.length].id;
  }

  getEffectDefinition(effectId) {
    return this.definitions.find((definition) => definition.id === effectId) ?? this.definitions[0];
  }

  updateTrackVisibility(tracks) {
    if (!this.faceObjects) {
      return;
    }
    const activeSlots = new Set(tracks.filter((track) => track.active).map((track) => track.slotIndex));
    this.faceObjects.forEach((faceObject, slotIndex) => {
      faceObject.visible = activeSlots.has(slotIndex);
    });
    this.refreshVisibility();
  }

  getSlotSummary(slotIndex) {
    const effectId = this.getEffectForSlot(slotIndex);
    return this.getEffectDefinition(effectId);
  }

  getTrackSummary(track) {
    const effectId = this.trackBindings.get(track.id) ?? this.getEffectForTrack(track);
    const effect = this.getEffectDefinition(effectId);
    const identity = this.identityTrackBindings.get(track.id);
    return identity ? {
      ...effect,
      identity
    } : effect;
  }

  refreshAll() {
    if (!this.faceObjects) {
      return;
    }
    this.faceObjects.forEach((_, slotIndex) => {
      this.setSlotEffect(slotIndex, this.getEffectForSlot(slotIndex));
    });
    this.refreshVisibility();
  }

  setSlotEffect(slotIndex, effectId) {
    const faceObject = this.faceObjects?.[slotIndex];
    if (!faceObject) {
      return;
    }

    const previous = this.slotEffects.get(slotIndex);
    if (previous?.effectId === effectId) {
      previous.object.visible = this.effectsVisible;
      return;
    }
    if (previous?.object) {
      faceObject.remove(previous.object);
    }

    const object = createEffect(effectId, this.THREE);
    object.frustumCulled = false;
    object.visible = this.effectsVisible;
    faceObject.add(object);
    this.slotEffects.set(slotIndex, { effectId, object });
  }

  refreshVisibility() {
    this.slotEffects.forEach(({ object }) => {
      object.visible = this.effectsVisible;
    });
  }

  getRuntimeEffectDebug() {
    return Array.from(this.slotEffects.entries()).map(([slotIndex, { effectId, object }]) => ({
      slotIndex,
      effectId,
      name: object?.name ?? "",
      avatarSource: object?.userData?.avatarSource ?? null,
      avatarRenderer: object?.userData?.avatarRenderer ?? null,
      avatarCoverage: object?.userData?.avatarCoverage ?? null,
      avatarLoadState: object?.userData?.avatarLoadState ?? getNestedUserDataValue(object, "avatarLoadState"),
      maskMode: object?.userData?.maskMode ?? getNestedUserDataValue(object, "maskMode"),
      contourVisible: object?.userData?.contourVisible ?? getNestedUserDataValue(object, "contourVisible"),
      maskPointCount: object?.userData?.maskPointCount ?? getNestedUserDataValue(object, "maskPointCount"),
      sourceUvMode: object?.userData?.sourceUvMode ?? getNestedUserDataValue(object, "sourceUvMode"),
      warpVertexCount: object?.userData?.warpVertexCount ?? getNestedUserDataValue(object, "warpVertexCount"),
      childNames: object?.children?.map((child) => child.name).filter(Boolean) ?? []
    }));
  }

}

function getNestedUserDataValue(object, key) {
  if (!object?.children?.length) {
    return null;
  }
  const stack = [...object.children];
  while (stack.length) {
    const child = stack.shift();
    if (child?.userData?.[key] != null) {
      return child.userData[key];
    }
    stack.push(...(child?.children ?? []));
  }
  return null;
}

function facePriority(track) {
  const x = Math.abs(track.x ?? 0);
  const y = Math.abs(track.y ?? 0);
  const size = track.s ?? 0;
  const visualSize = getTrackVisualSize(track);
  return visualSize * 6 + size * 0.3 - x * 0.35 - y * 0.15 + (track.detectedNow ? 0.2 : 0);
}

function getAutoEffectPool(effectProfile) {
  if (effectProfile === "privacy" || effectProfile === "stable" || effectProfile === "showcase") {
    return ["privacyAllow"];
  }
  if (effectProfile === "stable") {
    return ["glasses", "partyGlasses", "makeup"];
  }
  if (effectProfile === "cinematic") {
    return ["werewolf", "casaMask", "tiger", "partyGlasses", "stormCloud", "mask", "glasses", "makeup", "crown", "helmet"];
  }
  return ["glasses", "partyGlasses", "makeup", "stormCloud", "mask", "tiger", "crown"];
}

function getPreferredEffects(track, index, effectProfile = "stable") {
  if (effectProfile === "privacy" || effectProfile === "stable" || effectProfile === "showcase") {
    return ["privacyAllow"];
  }
  if (effectProfile === "cinematic") {
    return getCinematicPreferredEffects(track, index);
  }
  if (effectProfile === "showcase") {
    return getShowcasePreferredEffects(track, index);
  }
  return getStablePreferredEffects(track, index);
}

function getStablePreferredEffects(track, index) {
  const x = track.x ?? 0;
  const size = track.s ?? 0;
  const edgeFace = isPartialOrEdgeFace(track);
  const largeCenterFace = Math.abs(x) < 0.38 && size >= 0.32;

  if (edgeFace) {
    return ["makeup", "partyGlasses", "glasses"];
  }
  if (largeCenterFace && index === 0) {
    return ["glasses", "partyGlasses", "makeup"];
  }
  if (largeCenterFace && index === 1) {
    return ["partyGlasses", "makeup", "glasses"];
  }
  if (x > 0.35) {
    return ["partyGlasses", "makeup", "glasses"];
  }
  if (x < -0.35) {
    return ["makeup", "partyGlasses", "glasses"];
  }
  return ["partyGlasses", "glasses", "makeup"];
}

function getShowcasePreferredEffects(track, index) {
  const x = track.x ?? 0;
  const size = track.s ?? 0;
  const edgeFace = isPartialOrEdgeFace(track);
  const foregroundFace = isForegroundShowcaseFace(track);
  const largeCenterFace = Math.abs(x) < 0.42 && size >= 0.28;

  if (edgeFace || !foregroundFace) {
    return ["partyGlasses", "glasses", "makeup"];
  }
  if (largeCenterFace && index === 0) {
    return ["glasses", "partyGlasses", "makeup", "mask", "tiger"];
  }
  if (index === 1) {
    return ["partyGlasses", "glasses", "makeup", "mask", "tiger"];
  }
  if (index === 2) {
    return ["stormCloud", "partyGlasses", "glasses", "makeup"];
  }
  if (x > 0.35) {
    return ["stormCloud", "partyGlasses", "glasses", "makeup", "tiger"];
  }
  if (x < -0.35) {
    return ["partyGlasses", "stormCloud", "glasses", "makeup", "tiger"];
  }
  return ["glasses", "partyGlasses", "makeup", "mask", "tiger"];
}

function getCinematicPreferredEffects(track, index) {
  const x = track.x ?? 0;
  const size = track.s ?? 0;
  const edgeFace = isPartialOrEdgeFace(track);
  const foregroundFace = isForegroundShowcaseFace(track);
  const largeCenterFace = Math.abs(x) < 0.42 && size >= 0.28;

  if (edgeFace || !foregroundFace) {
    return ["partyGlasses", "glasses", "makeup"];
  }
  if (largeCenterFace && index === 0) {
    return ["werewolf", "casaMask", "tiger", "mask", "partyGlasses", "glasses", "makeup"];
  }
  if (index === 1) {
    return ["casaMask", "tiger", "werewolf", "partyGlasses", "mask", "glasses", "makeup"];
  }
  if (index === 2) {
    return ["stormCloud", "partyGlasses", "glasses", "makeup"];
  }
  if (x > 0.35) {
    return ["stormCloud", "partyGlasses", "glasses", "makeup", "tiger"];
  }
  if (x < -0.35) {
    return ["tiger", "partyGlasses", "stormCloud", "glasses", "makeup"];
  }
  return ["casaMask", "mask", "partyGlasses", "tiger", "glasses", "makeup"];
}

function isEffectSafeForTrack(effectId, track, index) {
  if (["privacyAllow", "avatarMale", "avatarFemale", "agniPainFace", "privacyBlur"].includes(effectId)) {
    return true;
  }
  const x = Math.abs(track.x ?? 0);
  const size = track.s ?? 0;
  const partialOrEdgeFace = isPartialOrEdgeFace(track);
  if (partialOrEdgeFace && (effectId === "mask" || effectId === "tiger" || effectId === "werewolf" || effectId === "casaMask" || effectId === "crown" || effectId === "helmet" || effectId === "anonymous")) {
    return false;
  }
  if (effectId === "crown") {
    return index > 0 && x < 0.74 && size >= 0.2 && size <= 0.68;
  }
  if (effectId === "helmet" || effectId === "anonymous") {
    return x < 0.58 && size >= 0.28 && size <= 0.56 && isForegroundShowcaseFace(track);
  }
  if (effectId === "casaMask") {
    return x < 0.58 && size >= 0.28 && size <= 0.92 && isForegroundShowcaseFace(track);
  }
  if (effectId === "werewolf") {
    return x < 0.52 && size >= 0.3 && size <= 0.92 && isForegroundShowcaseFace(track);
  }
  if (effectId === "stormCloud") {
    return x < 0.76 && size >= 0.2 && size <= 0.7;
  }
  if (effectId === "mask") {
    return x < 0.68 && size >= 0.24 && isForegroundShowcaseFace(track);
  }
  if (effectId === "tiger") {
    return x < 0.7 && size >= 0.3 && size <= 0.92 && isForegroundShowcaseFace(track);
  }
  if (effectId === "glasses" || effectId === "partyGlasses") {
    return size >= 0.18;
  }
  return true;
}

function isPartialOrEdgeFace(track) {
  const anchors = track.anchors ?? {};
  const anchorPoints = Object.values(anchors).filter(Boolean);
  const offscreenAnchor = anchorPoints.some((point) => point.x < 0.03 || point.x > 0.97 || point.y < 0.03 || point.y > 0.97);
  const missingCoreAnchors = !anchors.leftEye || !anchors.rightEye || !anchors.noseTip || !anchors.chin;
  return Math.abs(track.x ?? 0) > 0.68 || (track.s ?? 1) < 0.24 || offscreenAnchor || missingCoreAnchors;
}

function isForegroundShowcaseFace(track) {
  return getTrackVisualSize(track) >= 0.235;
}

function getTrackVisualSize(track) {
  const anchors = track.anchors ?? {};
  const eyeDistance = distance2D(anchors.leftEye, anchors.rightEye);
  const headHeight = distance2D(anchors.forehead, anchors.chin);
  const cheekWidth = distance2D(anchors.leftCheek, anchors.rightCheek);
  return Math.max(eyeDistance * 3.3, headHeight * 0.95, cheekWidth * 0.9, (track.s ?? 0) * 0.32);
}

function distance2D(a, b) {
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getSafeFallbackEffect(track) {
  return "privacyAllow";
}

export const __effectManagerTestHooks = {
  getPreferredEffects,
  isEffectSafeForTrack,
  getSafeFallbackEffect,
  isPartialOrEdgeFace,
  EffectManager
};
