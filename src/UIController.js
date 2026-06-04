export class UIController {
  constructor({ effectDefinitions, maxFaces }) {
    this.effectDefinitions = effectDefinitions;
    this.maxFaces = maxFaces;
    this.elements = {
      statusBar: document.getElementById("statusBar"),
      faceCount: document.getElementById("faceCount"),
      fpsValue: document.getElementById("fpsValue"),
      modeValue: document.getElementById("modeValue"),
      slotMeter: document.getElementById("slotMeter"),
      trackList: document.getElementById("trackList"),
      manualSlot: document.getElementById("manualSlot"),
      manualEffect: document.getElementById("manualEffect"),
      selectedFaceLabel: document.getElementById("selectedFaceLabel"),
      facePickerOverlay: document.getElementById("facePickerOverlay"),
      videoFileInput: document.getElementById("videoFileInput"),
      toggleEffectsButton: document.getElementById("toggleEffectsButton"),
      resetBindingsButton: document.getElementById("resetBindingsButton"),
      referenceNameInput: document.getElementById("referenceNameInput"),
      referenceEffect: document.getElementById("referenceEffect"),
      referenceFaceInput: document.getElementById("referenceFaceInput"),
      registerReferenceButton: document.getElementById("registerReferenceButton"),
      referencePeopleList: document.getElementById("referencePeopleList")
    };
    this.selectedTrackId = null;
    this.lastTracks = [];
    this.identityState = {
      registeredPeople: [],
      bindings: [],
      statuses: [],
      boundTrackCount: 0
    };
    this.populateSelectors();
  }

  bindHandlers(handlers) {
    document.querySelectorAll("[data-input-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        this.activateSegment("[data-input-mode]", button);
        handlers.onInputModeChange?.(button.dataset.inputMode);
      });
    });

    document.querySelectorAll("[data-assignment-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        this.activateSegment("[data-assignment-mode]", button);
        handlers.onAssignmentModeChange?.(button.dataset.assignmentMode);
      });
    });

    this.elements.manualSlot.addEventListener("change", () => {
      const track = this.selectTrackBySlot(this.getManualSlot());
      if (track) {
        handlers.onFaceSelect?.(track);
      }
    });
    this.elements.manualEffect.addEventListener("change", () => {
      handlers.onManualBindingChange?.(this.getManualBindingTarget(), this.getManualEffect());
    });
    this.elements.videoFileInput.addEventListener("change", (event) => {
      handlers.onVideoFileChange?.(event.target.files?.[0] ?? null);
    });
    this.elements.toggleEffectsButton.addEventListener("click", () => {
      handlers.onToggleEffects?.();
    });
    this.elements.resetBindingsButton.addEventListener("click", () => {
      this.clearSelectedFace();
      handlers.onResetBindings?.();
    });
    this.elements.registerReferenceButton?.addEventListener("click", () => {
      handlers.onReferenceFaceRegister?.({
        name: this.elements.referenceNameInput?.value ?? "",
        effectId: this.elements.referenceEffect?.value ?? "",
        file: this.elements.referenceFaceInput?.files?.[0] ?? null
      });
    });
    this.elements.referencePeopleList?.addEventListener("change", (event) => {
      const select = event.target.closest?.("[data-reference-effect]");
      if (!select) {
        return;
      }
      handlers.onReferenceEffectChange?.(select.dataset.personId, select.value);
    });
    this.elements.referencePeopleList?.addEventListener("click", (event) => {
      const removeButton = event.target.closest?.("[data-remove-person]");
      if (!removeButton) {
        return;
      }
      handlers.onReferenceRemove?.(removeButton.dataset.personId);
    });
    this.elements.facePickerOverlay?.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-track-id]");
      if (!button) {
        return;
      }
      const trackId = Number(button.dataset.trackId);
      const track = this.lastTracks.find((candidate) => candidate.id === trackId && candidate.active);
      if (!track) {
        return;
      }
      this.selectTrack(track);
      if (button.dataset.effectId) {
        this.elements.manualEffect.value = button.dataset.effectId;
      }
      handlers.onFaceSelect?.(track);
    });
    this.elements.trackList?.addEventListener("click", (event) => {
      const item = event.target.closest?.("[data-track-id]");
      if (!item) {
        return;
      }
      const trackId = Number(item.dataset.trackId);
      const track = this.lastTracks.find((candidate) => candidate.id === trackId && candidate.active);
      if (!track) {
        return;
      }
      this.selectTrack(track);
      handlers.onFaceSelect?.(track);
    });
  }

  setStatus(message) {
    this.elements.statusBar.textContent = message;
  }

  setEffectsButton(isVisible) {
    this.elements.toggleEffectsButton.textContent = isVisible ? "Hide effects" : "Show effects";
  }

  setInputMode(mode) {
    const button = document.querySelector(`[data-input-mode="${mode}"]`);
    if (button) {
      this.activateSegment("[data-input-mode]", button);
    }
  }

  setAssignmentMode(mode) {
    const button = document.querySelector(`[data-assignment-mode="${mode}"]`);
    if (button) {
      this.activateSegment("[data-assignment-mode]", button);
    }
  }

  renderDebug({ tracks, fps, mode, effectManager, rawDetected = [] }) {
    const activeTracks = tracks.filter((track) => track.active);
    this.lastTracks = tracks;
    if (this.selectedTrackId !== null && !activeTracks.some((track) => track.id === this.selectedTrackId)) {
      this.selectedTrackId = null;
    }
    this.elements.faceCount.textContent = String(activeTracks.length);
    this.elements.fpsValue.textContent = String(Math.round(fps));
    this.elements.modeValue.textContent = mode;
    this.elements.slotMeter.innerHTML = Array.from({ length: this.maxFaces }, (_, index) => {
      const confidence = Math.round(Number(rawDetected[index] ?? 0) * 100);
      return `<span class="${confidence >= 78 ? "is-active" : ""}">S${index + 1} ${confidence}%</span>`;
    }).join("");

    this.renderFacePicker(activeTracks, effectManager);
    this.syncSelectedFaceLabel(effectManager);

    this.elements.trackList.innerHTML = tracks.slice(0, this.maxFaces).map((track) => {
      const effect = effectManager.getTrackSummary(track);
      const identity = this.getIdentityForTrack(track.id);
      const confidence = Math.round((track.detected ?? 0) * 100);
      const lost = track.active ? "tracking" : `lost ${Math.round(track.lostMs)}ms`;
      const selectedClass = track.id === this.selectedTrackId ? " is-selected" : "";
      const identityText = identity?.personName
        ? `${identity.personName} / d ${formatDistance(identity.distance)}`
        : statusLabel(identity?.status ?? identity?.lastStatus);
      return `
        <article class="track-item${selectedClass}" data-track-id="${track.id}">
          <span class="track-swatch" style="background:${effect.color}"></span>
          <div>
            <div class="track-title">Track ${track.id} / Slot ${track.slotIndex + 1}</div>
            <div class="track-meta">${effect.label} / ${confidence}% / x ${track.x.toFixed(2)} / y ${track.y.toFixed(2)}</div>
            <div class="track-identity">${identityText}</div>
          </div>
          <span class="track-badge">${lost}</span>
        </article>
      `;
    }).join("");
  }

  populateSelectors() {
    this.elements.manualSlot.innerHTML = Array.from({ length: this.maxFaces }, (_, index) => (
      `<option value="${index}">Face ${index + 1}</option>`
    )).join("");

    this.elements.manualEffect.innerHTML = this.effectDefinitions.map((effect) => (
      `<option value="${effect.id}">${effect.label}</option>`
    )).join("");

    if (this.elements.referenceEffect) {
      this.elements.referenceEffect.innerHTML = this.effectDefinitions.map((effect) => (
        `<option value="${effect.id}">${effect.label}</option>`
      )).join("");
    }
  }

  getManualSlot() {
    return Number(this.elements.manualSlot.value);
  }

  getManualEffect() {
    return this.elements.manualEffect.value;
  }

  getManualBindingTarget() {
    const selectedTrack = this.getSelectedTrack();
    return {
      slotIndex: selectedTrack?.slotIndex ?? this.getManualSlot(),
      trackId: selectedTrack?.id ?? null
    };
  }

  selectTrackBySlot(slotIndex) {
    const track = this.lastTracks.find((candidate) => candidate.active && candidate.slotIndex === slotIndex);
    if (track) {
      this.selectTrack(track);
      return track;
    }
    this.selectedTrackId = null;
    this.syncSelectedFaceLabel();
    return null;
  }

  selectTrack(track) {
    this.selectedTrackId = track.id;
    this.elements.manualSlot.value = String(track.slotIndex);
    this.syncSelectedFaceLabel();
  }

  clearSelectedFace() {
    this.selectedTrackId = null;
    this.syncSelectedFaceLabel();
  }

  getSelectedTrack() {
    return this.lastTracks.find((track) => track.active && track.id === this.selectedTrackId) ?? null;
  }

  renderFacePicker(tracks, effectManager) {
    const overlay = this.elements.facePickerOverlay;
    if (!overlay) {
      return;
    }

    this.syncFacePickerOverlayBounds();
    overlay.innerHTML = tracks
      .slice(0, this.maxFaces)
      .map((track) => {
        const box = getTrackBox(track);
        if (!box) {
          return "";
        }
        const effect = effectManager.getTrackSummary(track);
        const identity = this.getIdentityForTrack(track.id);
        const selectedClass = track.id === this.selectedTrackId ? " is-selected" : "";
        const confidence = Math.round((track.detected ?? 0) * 100);
        const identityLabel = identity?.personName ? `${identity.personName} / ${effect.label}` : `${effect.label} / ${confidence}%`;
        return `
          <button
            type="button"
            class="face-picker-box${selectedClass}"
            data-track-id="${track.id}"
            data-effect-id="${effect.id}"
            style="left:${box.left}%; top:${box.top}%; width:${box.width}%; height:${box.height}%; --face-color:${effect.color};"
            aria-label="Select Track ${track.id} Slot ${track.slotIndex + 1}">
            <span class="face-picker-tag">Track ${track.id} / Face ${track.slotIndex + 1}</span>
            <span class="face-picker-effect">${identityLabel}</span>
          </button>
        `;
      })
      .join("");
  }

  syncFacePickerOverlayBounds() {
    const overlay = this.elements.facePickerOverlay;
    const stage = overlay?.parentElement;
    const reference = document.getElementById("beautyCanvas")
      ?? document.getElementById("arCanvas")
      ?? document.getElementById("jeeFaceFilterCanvas")
      ?? document.getElementById("inputVideo");
    if (!overlay || !stage || !reference) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const referenceRect = reference.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !referenceRect.width || !referenceRect.height) {
      return;
    }

    overlay.style.left = `${referenceRect.left - stageRect.left}px`;
    overlay.style.top = `${referenceRect.top - stageRect.top}px`;
    overlay.style.width = `${referenceRect.width}px`;
    overlay.style.height = `${referenceRect.height}px`;
    overlay.style.transform = "none";
  }

  syncSelectedFaceLabel(effectManager = null) {
    const label = this.elements.selectedFaceLabel;
    if (!label) {
      return;
    }
    const track = this.getSelectedTrack();
    if (!track) {
      label.textContent = "Selected face: none";
      return;
    }
    const effect = effectManager?.getTrackSummary(track);
    label.textContent = effect
      ? `Selected face: Track ${track.id} / Face ${track.slotIndex + 1} / ${effect.label}`
      : `Selected face: Track ${track.id} / Face ${track.slotIndex + 1}`;
  }

  activateSegment(selector, activeButton) {
    document.querySelectorAll(selector).forEach((button) => {
      button.classList.toggle("is-active", button === activeButton);
    });
  }

  renderIdentityState(identityState) {
    this.identityState = identityState ?? this.identityState;
    const list = this.elements.referencePeopleList;
    if (!list) {
      return;
    }
    const people = this.identityState.registeredPeople ?? [];
    if (!people.length) {
      list.innerHTML = `<div class="reference-empty">No reference faces registered</div>`;
      return;
    }
    list.innerHTML = people.map((person) => {
      const binding = (this.identityState.bindings ?? []).find((candidate) => candidate.personId === person.personId && candidate.active);
      const status = binding
        ? `Track ${binding.trackId} / d ${formatDistance(binding.distance)}`
        : person.status;
      return `
        <article class="reference-item" data-person-id="${person.personId}">
          <img src="${person.imageDataUrl}" alt="${escapeHtml(person.name)} reference face">
          <div>
            <div class="reference-name">${escapeHtml(person.name)}</div>
            <select data-reference-effect data-person-id="${person.personId}" aria-label="${escapeHtml(person.name)} effect">
              ${this.effectDefinitions.map((effect) => (
                `<option value="${effect.id}" ${effect.id === person.effectId ? "selected" : ""}>${effect.label}</option>`
              )).join("")}
            </select>
            <div class="reference-status">${status}</div>
          </div>
          <button type="button" class="icon-button" data-remove-person data-person-id="${person.personId}" aria-label="Remove ${escapeHtml(person.name)}">&times;</button>
        </article>
      `;
    }).join("");
  }

  getIdentityForTrack(trackId) {
    return (this.identityState.bindings ?? []).find((binding) => binding.trackId === trackId && binding.active)
      ?? (this.identityState.statuses ?? []).find((status) => status.trackId === trackId)
      ?? null;
  }
}

function getTrackBox(track) {
  const bounds = track.bounds;
  if (bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.width) && Number.isFinite(bounds.height)) {
    return padBox({
      left: bounds.minX * 100,
      top: bounds.minY * 100,
      width: bounds.width * 100,
      height: bounds.height * 100
    }, 4);
  }

  const anchors = track.anchors;
  const points = anchors ? Object.values(anchors).filter(Boolean) : [];
  if (points.length >= 2) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return padBox({
      left: Math.min(...xs) * 100,
      top: Math.min(...ys) * 100,
      width: (Math.max(...xs) - Math.min(...xs)) * 100,
      height: (Math.max(...ys) - Math.min(...ys)) * 100
    }, 6);
  }

  if (!Number.isFinite(track.x) || !Number.isFinite(track.y)) {
    return null;
  }

  const size = Math.max(14, Math.min(34, Number(track.s ?? 0.3) * 42));
  return clampBox({
    left: ((track.x + 1) / 2) * 100 - size / 2,
    top: ((1 - track.y) / 2) * 100 - size / 2,
    width: size,
    height: size
  });
}

function padBox(box, padding) {
  return clampBox({
    left: box.left - padding,
    top: box.top - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2
  });
}

function clampBox(box) {
  const left = clamp(box.left, 0, 96);
  const top = clamp(box.top, 0, 96);
  const width = clamp(box.width, 8, 100 - left);
  const height = clamp(box.height, 8, 100 - top);
  return { left, top, width, height };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDistance(value) {
  return Number.isFinite(value) ? Number(value).toFixed(3) : "--";
}

function statusLabel(status) {
  if (!status) {
    return "identity pending";
  }
  const labels = {
    "no-reference": "no reference",
    "no-descriptor": "no descriptor",
    "below-threshold": "unmatched",
    ambiguous: "ambiguous",
    matched: "matched",
    "global-matched": "identity matched",
    tracking: "identity tracking",
    recognizing: "recognizing",
    "recognition-error": "recognition error",
    "duplicate-rejected": "duplicate rejected",
    "duplicate-removed": "duplicate removed"
  };
  return labels[status] ?? status;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
