export class IdentityTrackBinder {
  constructor({
    referenceFaceManager,
    recognizer,
    checkIntervalMs = 900,
    confirmedRecheckMs = 5000,
    bindingLostGraceMs = 1800,
    minDetectedConfidence = 0.5
  } = {}) {
    this.referenceFaceManager = referenceFaceManager;
    this.recognizer = recognizer;
    this.checkIntervalMs = checkIntervalMs;
    this.confirmedRecheckMs = confirmedRecheckMs;
    this.bindingLostGraceMs = bindingLostGraceMs;
    this.minDetectedConfidence = minDetectedConfidence;
    this.trackBindings = new Map();
    this.trackStatuses = new Map();
    this.pendingChecks = new Map();
  }

  reset() {
    this.trackBindings.clear();
    this.trackStatuses.clear();
    this.pendingChecks.clear();
  }

  update(tracks, now = performance.now(), { sourceElement = null } = {}) {
    const activeTracks = tracks.filter((track) => track.active);
    const activeTrackIds = new Set(activeTracks.map((track) => track.id));
    const registeredPeople = this.referenceFaceManager?.getPeopleWithDescriptors?.() ?? [];
    const recognitionResults = [];

    this.cleanupInactiveBindings(activeTrackIds, now);

    if (!registeredPeople.length) {
      activeTracks.forEach((track) => {
        this.trackStatuses.set(track.id, {
          trackId: track.id,
          status: "no-reference",
          updatedAt: now
        });
      });
      return this.getDebugState(tracks);
    }

    activeTracks.forEach((track) => {
      const binding = this.trackBindings.get(track.id);
      const pending = this.pendingChecks.get(track.id);
      const retryDelay = binding ? this.confirmedRecheckMs : this.checkIntervalMs;
      const lastStatus = this.trackStatuses.get(track.id);
      const shouldCheck = track.detectedNow
        && (track.detected ?? 0) >= this.minDetectedConfidence
        && !pending
        && (!lastStatus?.lastCheckedAt || now - lastStatus.lastCheckedAt >= retryDelay);

      if (pending) {
        if (binding) {
          binding.updatedAt = now;
          binding.status = "tracking";
        } else {
          this.trackStatuses.set(track.id, {
            trackId: track.id,
            slotIndex: track.slotIndex,
            status: "recognizing",
            matched: false,
            lastCheckedAt: pending.lastCheckedAt,
            updatedAt: now
          });
        }
        return;
      }

      if (!shouldCheck) {
        if (binding) {
          binding.updatedAt = now;
          binding.status = "tracking";
        }
        return;
      }

      this.runRecognitionCheck(track, registeredPeople, sourceElement, now, recognitionResults);
    });

    this.applyGlobalAssignment(recognitionResults, registeredPeople, now);
    this.resolveDuplicatePeople(activeTracks);
    return this.getDebugState(tracks);
  }

  runRecognitionCheck(track, registeredPeople, sourceElement, now, recognitionResults) {
    const snapshot = {
      id: track.id,
      slotIndex: track.slotIndex,
      active: track.active,
      detectedNow: track.detectedNow,
      detected: track.detected
    };
    let resultOrPromise = null;
    try {
      resultOrPromise = this.recognizer.matchTrack(track, registeredPeople, sourceElement);
    } catch (error) {
      this.trackStatuses.set(track.id, this.toErrorStatus(snapshot, error, now));
      if (!this.trackBindings.has(track.id)) {
        this.trackBindings.delete(track.id);
      }
      return;
    }

    if (!isPromiseLike(resultOrPromise)) {
      this.applyRecognitionResult(track, resultOrPromise, now);
      recognitionResults.push({ track, result: resultOrPromise });
      return;
    }

    const token = Symbol(`identity-check-${track.id}`);
    this.pendingChecks.set(track.id, {
      token,
      trackId: track.id,
      slotIndex: track.slotIndex,
      lastCheckedAt: now,
      startedAt: now
    });
    this.trackStatuses.set(track.id, {
      trackId: track.id,
      slotIndex: track.slotIndex,
      status: "recognizing",
      matched: false,
      lastCheckedAt: now,
      updatedAt: now
    });

    resultOrPromise
      .then((result) => {
        this.finishAsyncRecognition(snapshot, token, result, performance.now());
      })
      .catch((error) => {
        this.finishAsyncRecognition(snapshot, token, null, performance.now(), error);
      });
  }

  finishAsyncRecognition(track, token, result, now, error = null) {
    const pending = this.pendingChecks.get(track.id);
    if (!pending || pending.token !== token) {
      return;
    }
    this.pendingChecks.delete(track.id);
    if (error) {
      this.trackStatuses.set(track.id, this.toErrorStatus(track, error, now));
      if (!this.trackBindings.has(track.id)) {
        this.trackBindings.delete(track.id);
      }
      return;
    }
    this.applyRecognitionResult(track, result, now);
  }

  applyRecognitionResult(track, result, now) {
    this.trackStatuses.set(track.id, this.toStatus(track, result, now));
    if (result?.matched) {
      this.applyMatch(track, result, now);
      return;
    }
    this.trackBindings.delete(track.id);
  }

  applyGlobalAssignment(recognitionResults, registeredPeople, now) {
    const boundTrackIds = new Set([...this.trackBindings.keys()]);
    const boundPersonIds = new Set([...this.trackBindings.values()].map((binding) => binding.personId));
    const personCount = registeredPeople.length;
    if (boundPersonIds.size >= personCount || !recognitionResults.length) {
      return;
    }

    const candidates = [];
    recognitionResults.forEach(({ track, result }) => {
      if (boundTrackIds.has(track.id) || !result?.descriptor?.vector?.length) {
        return;
      }
      const ranked = this.recognizer.rankDescriptor(result.descriptor, registeredPeople);
      ranked.forEach((candidate, rank) => {
        if (boundPersonIds.has(candidate.person.personId)) {
          return;
        }
        if (candidate.distance > this.recognizer.matchThreshold) {
          return;
        }
        candidates.push({
          track,
          person: candidate.person,
          distance: candidate.distance,
          rank
        });
      });
    });

    candidates.sort((a, b) => a.rank - b.rank || a.distance - b.distance);
    candidates.forEach((candidate) => {
      if (boundTrackIds.has(candidate.track.id) || boundPersonIds.has(candidate.person.personId)) {
        return;
      }
      const confidence = distanceToConfidence(candidate.distance, this.recognizer.matchThreshold);
      this.trackBindings.set(candidate.track.id, {
        trackId: candidate.track.id,
        slotIndex: candidate.track.slotIndex,
        personId: candidate.person.personId,
        personName: candidate.person.name,
        effectId: candidate.person.effectId,
        distance: candidate.distance,
        confidence,
        status: "global-matched",
        matchedAt: now,
        updatedAt: now,
        lastCheckedAt: now
      });
      this.trackStatuses.set(candidate.track.id, {
        trackId: candidate.track.id,
        slotIndex: candidate.track.slotIndex,
        status: "global-matched",
        matched: true,
        personId: candidate.person.personId,
        personName: candidate.person.name,
        effectId: candidate.person.effectId,
        distance: candidate.distance,
        confidence,
        gap: null,
        secondBestPersonId: null,
        lastCheckedAt: now,
        updatedAt: now
      });
      boundTrackIds.add(candidate.track.id);
      boundPersonIds.add(candidate.person.personId);
    });
  }

  applyMatch(track, result, now) {
    const existingSamePerson = [...this.trackBindings.values()]
      .find((binding) => binding.personId === result.personId && binding.trackId !== track.id);
    if (existingSamePerson && existingSamePerson.distance <= result.distance) {
      this.trackStatuses.set(track.id, {
        ...this.trackStatuses.get(track.id),
        status: "duplicate-rejected",
        duplicateOfTrackId: existingSamePerson.trackId
      });
      return;
    }
    if (existingSamePerson) {
      this.trackBindings.delete(existingSamePerson.trackId);
    }

    this.trackBindings.set(track.id, {
      trackId: track.id,
      slotIndex: track.slotIndex,
      personId: result.personId,
      personName: result.personName,
      effectId: result.effectId,
      distance: result.distance,
      confidence: result.confidence,
      status: "matched",
      matchedAt: now,
      updatedAt: now,
      lastCheckedAt: now
    });
  }

  resolveDuplicatePeople(activeTracks) {
    const activeTrackIds = new Set(activeTracks.map((track) => track.id));
    const byPerson = new Map();
    this.trackBindings.forEach((binding) => {
      if (!activeTrackIds.has(binding.trackId)) {
        return;
      }
      const current = byPerson.get(binding.personId);
      if (!current || binding.distance < current.distance) {
        byPerson.set(binding.personId, binding);
      }
    });

    this.trackBindings.forEach((binding, trackId) => {
      const keeper = byPerson.get(binding.personId);
      if (keeper && keeper.trackId !== trackId) {
        this.trackBindings.delete(trackId);
        this.trackStatuses.set(trackId, {
          trackId,
          status: "duplicate-removed",
          personId: binding.personId,
          personName: binding.personName,
          distance: binding.distance,
          updatedAt: binding.updatedAt
        });
      }
    });
  }

  cleanupInactiveBindings(activeTrackIds, now) {
    this.trackBindings.forEach((binding, trackId) => {
      if (!activeTrackIds.has(trackId) && now - binding.updatedAt > this.bindingLostGraceMs) {
        this.trackBindings.delete(trackId);
      }
    });
    this.trackStatuses.forEach((status, trackId) => {
      if (!activeTrackIds.has(trackId) && now - (status.updatedAt ?? 0) > this.bindingLostGraceMs) {
        this.trackStatuses.delete(trackId);
      }
    });
    this.pendingChecks.forEach((pending, trackId) => {
      if (!activeTrackIds.has(trackId) && now - pending.startedAt > this.bindingLostGraceMs) {
        this.pendingChecks.delete(trackId);
      }
    });
  }

  clearBindingsForMissingPeople() {
    const peopleIds = new Set((this.referenceFaceManager?.getPeople?.() ?? []).map((person) => person.personId));
    this.trackBindings.forEach((binding, trackId) => {
      if (!peopleIds.has(binding.personId)) {
        this.trackBindings.delete(trackId);
      }
    });
  }

  getBindingForTrack(trackId) {
    return this.trackBindings.get(Number(trackId)) ?? null;
  }

  getTrackIdentity(trackId) {
    const binding = this.getBindingForTrack(trackId);
    const status = this.trackStatuses.get(Number(trackId));
    return binding ? {
      ...binding,
      status: binding.status,
      lastStatus: status?.status ?? binding.status
    } : status ?? null;
  }

  getEffectBindings() {
    return new Map([...this.trackBindings.entries()].map(([trackId, binding]) => [trackId, {
      personId: binding.personId,
      personName: binding.personName,
      effectId: binding.effectId,
      distance: binding.distance,
      confidence: binding.confidence,
      status: binding.status
    }]));
  }

  getDebugState(tracks = []) {
    const activeTrackIds = new Set(tracks.filter((track) => track.active).map((track) => track.id));
    const bindings = [...this.trackBindings.values()].map((binding) => ({
      ...binding,
      active: activeTrackIds.has(binding.trackId)
    }));
    const statuses = [...this.trackStatuses.values()];
    return {
      registeredPeople: this.referenceFaceManager?.getPeople?.() ?? [],
      bindings,
      statuses,
      boundTrackCount: bindings.filter((binding) => binding.active).length
    };
  }

  toStatus(track, result, now) {
    return {
      trackId: track.id,
      slotIndex: track.slotIndex,
      status: result.status,
      matched: result.matched,
      personId: result.personId ?? result.best?.personId ?? null,
      personName: result.personName ?? result.best?.name ?? null,
      effectId: result.effectId ?? result.best?.effectId ?? null,
      distance: result.distance ?? result.best?.distance ?? null,
      confidence: result.confidence ?? 0,
      gap: result.gap ?? null,
      secondBestPersonId: result.secondBest?.personId ?? null,
      lastCheckedAt: now,
      updatedAt: now
    };
  }

  toErrorStatus(track, error, now) {
    return {
      trackId: track.id,
      slotIndex: track.slotIndex,
      status: "recognition-error",
      matched: false,
      error: error?.message ?? String(error),
      lastCheckedAt: now,
      updatedAt: now
    };
  }
}

function isPromiseLike(value) {
  return value && typeof value.then === "function";
}

function distanceToConfidence(distance, threshold) {
  if (!Number.isFinite(distance)) {
    return 0;
  }
  return clamp(1 - distance / Math.max(0.001, threshold * 1.35), 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
