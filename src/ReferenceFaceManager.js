export class ReferenceFaceManager {
  constructor({ effectDefinitions = [] } = {}) {
    this.effectDefinitions = effectDefinitions;
    this.people = new Map();
    this.nextPersonNumber = 1;
  }

  addPerson({ name, effectId, privacyMode = null, avatarType = null, descriptor, imageDataUrl = "", status = "ready" }) {
    const normalizedDescriptor = normalizeDescriptor(descriptor);
    if (!normalizedDescriptor) {
      throw new Error("Reference face descriptor is missing or invalid");
    }

    const safeEffectId = this.hasEffect(effectId) ? effectId : this.getDefaultPrivacyActionId();
    if (!safeEffectId) {
      throw new Error("No privacy actions are available for identity binding");
    }
    const action = this.getEffectDefinition(safeEffectId);

    const personId = `person-${this.nextPersonNumber++}`;
    const displayName = String(name || `Person ${this.nextPersonNumber - 1}`).trim();
    const person = {
      personId,
      name: displayName || `Person ${this.nextPersonNumber - 1}`,
      effectId: safeEffectId,
      privacyMode: privacyMode ?? action?.privacyMode ?? "replace",
      avatarType: avatarType ?? action?.avatarType ?? null,
      descriptor: normalizedDescriptor,
      imageDataUrl,
      status,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.people.set(personId, person);
    return this.toPublicPerson(person);
  }

  removePerson(personId) {
    return this.people.delete(personId);
  }

  updatePersonEffect(personId, effectId) {
    const person = this.people.get(personId);
    if (!person || !this.hasEffect(effectId)) {
      return null;
    }
    const action = this.getEffectDefinition(effectId);
    person.effectId = effectId;
    person.privacyMode = action?.privacyMode ?? person.privacyMode ?? "replace";
    person.avatarType = action?.avatarType ?? null;
    person.updatedAt = Date.now();
    return this.toPublicPerson(person);
  }

  updatePersonStatus(personId, status) {
    const person = this.people.get(personId);
    if (!person) {
      return null;
    }
    person.status = status;
    person.updatedAt = Date.now();
    return this.toPublicPerson(person);
  }

  getPerson(personId) {
    const person = this.people.get(personId);
    return person ? this.toPublicPerson(person) : null;
  }

  getPersonWithDescriptor(personId) {
    return this.people.get(personId) ?? null;
  }

  getPeople() {
    return [...this.people.values()].map((person) => this.toPublicPerson(person));
  }

  getPeopleWithDescriptors() {
    return [...this.people.values()];
  }

  getEffectForPerson(personId) {
    return this.people.get(personId)?.effectId ?? null;
  }

  getEffectDefinition(effectId) {
    return this.effectDefinitions.find((effect) => effect.id === effectId) ?? this.effectDefinitions[0] ?? null;
  }

  hasEffect(effectId) {
    return this.effectDefinitions.some((effect) => effect.id === effectId);
  }

  getDefaultPrivacyActionId() {
    return this.effectDefinitions.find((effect) => effect.category === "privacy" && effect.privacyMode === "replace")?.id
      ?? this.effectDefinitions.find((effect) => effect.category === "privacy")?.id
      ?? this.effectDefinitions[0]?.id;
  }

  clear() {
    this.people.clear();
  }

  toPublicPerson(person) {
    const effect = this.getEffectDefinition(person.effectId);
    return {
      personId: person.personId,
      name: person.name,
      effectId: person.effectId,
      effectLabel: effect?.label ?? person.effectId,
      effectColor: effect?.color ?? "#94a3b8",
      privacyMode: person.privacyMode ?? effect?.privacyMode ?? "replace",
      avatarType: person.avatarType ?? effect?.avatarType ?? null,
      actionLabel: effect?.label ?? person.effectId,
      imageDataUrl: person.imageDataUrl,
      status: person.status,
      descriptorProvider: person.descriptor?.provider ?? "unknown",
      descriptorLength: person.descriptor?.vector?.length ?? 0,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt
    };
  }
}

function normalizeDescriptor(descriptor) {
  if (!descriptor) {
    return null;
  }
  if (Array.isArray(descriptor)) {
    return {
      provider: "raw-vector",
      vector: descriptor.map(Number).filter(Number.isFinite)
    };
  }
  const vector = descriptor.vector;
  if (!Array.isArray(vector) && !(vector instanceof Float32Array)) {
    return null;
  }
  const normalizedVector = [...vector].map(Number).filter(Number.isFinite);
  if (!normalizedVector.length) {
    return null;
  }
  return {
    ...descriptor,
    vector: normalizedVector
  };
}
