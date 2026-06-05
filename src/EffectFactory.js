const PRIVACY_ACTION_DEFINITIONS = [
  {
    id: "privacyAllow",
    label: "Allow real appearance",
    color: "#45e0a3",
    category: "privacy",
    privacyMode: "allow"
  },
  {
    id: "avatarMale",
    label: "Male digital substitute",
    color: "#4cc9f0",
    category: "privacy",
    privacyMode: "replace",
    avatarType: "male"
  },
  {
    id: "avatarFemale",
    label: "Female digital substitute",
    color: "#f72585",
    category: "privacy",
    privacyMode: "replace",
    avatarType: "female"
  },
  {
    id: "privacyBlur",
    label: "Privacy blur shield",
    color: "#ffd166",
    category: "privacy",
    privacyMode: "blur"
  }
];

const LEGACY_EFFECT_DEFINITIONS = [
  { id: "glasses", label: "Jeeliz mirrored sunglasses", color: "#4cc9f0" },
  { id: "partyGlasses", label: "Jeeliz party glasses", color: "#ffd166" },
  { id: "makeup", label: "Jeeliz face paint", color: "#f72585" },
  { id: "mask", label: "Jeeliz puppy face", color: "#80ed99" },
  { id: "tiger", label: "Jeeliz tiger mask", color: "#ff8c42" },
  { id: "werewolf", label: "Jeeliz werewolf", color: "#7a4a2a" },
  { id: "casaMask", label: "Jeeliz cinematic mask", color: "#f8e7c5" },
  { id: "stormCloud", label: "Jeeliz storm cloud", color: "#8ecae6" },
  { id: "helmet", label: "Jeeliz AR helmet", color: "#adb5bd" },
  { id: "anonymous", label: "Jeeliz full mask", color: "#f8f9fa" },
  { id: "crown", label: "Textured party hat", color: "#f8961e" }
].map((definition) => ({
  ...definition,
  category: "legacy",
  selectable: false
}));

export const EFFECT_DEFINITIONS = [
  ...PRIVACY_ACTION_DEFINITIONS,
  ...LEGACY_EFFECT_DEFINITIONS
];

const ASSET_ROOT = "./assets/jeeliz";
const textureCache = new Map();
const geometryCache = new Map();

export function createEffect(effectId, THREE) {
  switch (effectId) {
    case "privacyAllow":
      return createPrivacyPassThrough(THREE);
    case "avatarMale":
      return createPrivacyAvatar(THREE, "male");
    case "avatarFemale":
      return createPrivacyAvatar(THREE, "female");
    case "privacyBlur":
      return createPrivacyBlurShield(THREE);
    case "glasses":
      return createJeelizGlasses(THREE);
    case "partyGlasses":
      return createJeelizPartyGlasses(THREE);
    case "makeup":
    case "halo":
      return createJeelizFacePaint(THREE);
    case "crown":
      return createTexturedHat(THREE);
    case "mask":
      return createJeelizPuppy(THREE);
    case "tiger":
      return createJeelizTigerMask(THREE);
    case "werewolf":
      return createJeelizWerewolf(THREE);
    case "casaMask":
      return createJeelizCasaMask(THREE);
    case "stormCloud":
      return createJeelizStormCloud(THREE);
    case "helmet":
      return createJeelizHelmet(THREE);
    case "anonymous":
      return createJeelizAnonymousMask(THREE);
    default:
      return createJeelizFacePaint(THREE);
  }
}

function createPrivacyPassThrough(THREE) {
  const group = createEffectGroup(THREE, "effect-privacy-allow");
  group.userData.update = () => {};
  return group;
}

function createPrivacyAvatar(THREE, avatarType) {
  const isFemale = avatarType === "female";
  const group = createEffectGroup(THREE, `effect-digital-substitute-${avatarType}`);
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.035,
      z: 0.34,
      scale: 1.62
    });
  };

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 48, 24),
    new THREE.MeshPhongMaterial({
      color: isFemale ? 0xf7c8d8 : 0xb9d7f4,
      shininess: 46,
      specular: 0xffffff,
      transparent: false,
      depthWrite: false
    })
  );
  shield.scale.set(1.02, 1.32, 0.14);
  shield.position.set(0, -0.06, 0.26);
  shield.renderOrder = 40;

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.018, 12, 72),
    new THREE.MeshBasicMaterial({
      color: isFemale ? 0xff7aa8 : 0x45a3ff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false
    })
  );
  rim.scale.set(1.02, 1.32, 0.1);
  rim.position.set(0, -0.06, 0.285);
  rim.renderOrder = 42;

  const hairMaterial = new THREE.MeshPhongMaterial({
    color: isFemale ? 0x2a1628 : 0x15243b,
    shininess: 22,
    specular: 0x111111,
    depthWrite: false
  });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.43, 42, 18), hairMaterial);
  hair.scale.set(isFemale ? 1.08 : 1.0, isFemale ? 0.68 : 0.42, 0.12);
  hair.position.set(0, isFemale ? 0.31 : 0.39, 0.31);
  hair.renderOrder = 43;

  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0x111827,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 8), eyeMaterial);
    eye.scale.set(1.35, 0.58, 0.08);
    eye.position.set(side * 0.14, 0.04, 0.43);
    eye.renderOrder = 45;
    group.add(eye);
  });

  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 18, 8),
    new THREE.MeshBasicMaterial({
      color: isFemale ? 0xd9467c : 0x2563eb,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    })
  );
  mouth.scale.set(1.8, 0.34, 0.08);
  mouth.position.set(0, -0.2, 0.44);
  mouth.renderOrder = 45;

  const badge = createAvatarPrivacyBadge(THREE, isFemale);
  badge.position.set(0, -0.48, 0.48);
  badge.scale.setScalar(0.54);
  badge.renderOrder = 46;

  group.add(shield, rim, hair, mouth, badge);
  group.userData.privacyMode = "replace";
  group.userData.avatarType = avatarType;
  return group;
}

function createPrivacyBlurShield(THREE) {
  const group = createEffectGroup(THREE, "effect-privacy-blur-shield");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.04,
      z: 0.36,
      scale: 1.76
    });
  };

  const backing = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 16),
    new THREE.MeshBasicMaterial({
      color: 0x111827,
      transparent: false,
      depthWrite: false
    })
  );
  backing.scale.set(1.12, 1.38, 0.1);
  backing.position.set(0, -0.06, 0.28);
  backing.renderOrder = 40;

  const cellMaterialA = new THREE.MeshBasicMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });
  const cellMaterialB = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });
  const cellSize = 0.112;
  for (let row = -4; row <= 4; row += 1) {
    for (let col = -4; col <= 4; col += 1) {
      const nx = col / 4;
      const ny = row / 4;
      if ((nx * nx) / 0.98 + (ny * ny) / 1.28 > 1) {
        continue;
      }
      const cell = new THREE.Mesh(
        new THREE.PlaneGeometry(cellSize, cellSize),
        (row + col) % 2 === 0 ? cellMaterialA : cellMaterialB
      );
      cell.position.set(col * cellSize * 0.9, row * cellSize * 0.96 - 0.04, 0.45);
      cell.renderOrder = 45;
      group.add(cell);
    }
  }

  const badge = createAvatarPrivacyBadge(THREE, false);
  badge.position.set(0, -0.5, 0.5);
  badge.scale.setScalar(0.5);
  badge.renderOrder = 46;
  group.add(backing, badge);
  group.userData.privacyMode = "blur";
  return group;
}

function createAvatarPrivacyBadge(THREE, isFemale) {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.18),
    new THREE.MeshBasicMaterial({
      color: isFemale ? 0x831843 : 0x0f3a5f,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.04, 18),
    new THREE.MeshBasicMaterial({
      color: 0x45e0a3,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  dot.position.set(-0.2, 0, 0.01);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.034, 0.01),
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    })
  );
  bar.position.set(0.08, 0, 0.02);
  group.add(plate, dot, bar);
  return group;
}

function createJeelizGlasses(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-vto-glasses");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToPair(group, anchors?.leftEye, anchors?.rightEye, faceObject, {
      x: 0,
      y: 0.02,
      z: 0.42,
      scale: 2.34
    });
  };

  const fallback = createFallbackGlasses(THREE);
  fallback.name = "fallback-glasses";
  group.add(fallback);

  const occluder = createFaceOccluder(THREE);
  occluder.name = "glasses-face-occluder";
  group.add(occluder);

  const envMap = getTexture(THREE, `${ASSET_ROOT}/glassesVTO/envMap.jpg`);
  envMap.mapping = THREE.EquirectangularReflectionMapping;

  const frameMaterial = createGlassesFrameMaterial(THREE, envMap);
  const lensMaterial = new THREE.MeshBasicMaterial({
    color: 0x2233aa,
    envMap,
    opacity: 0.68,
    transparent: true,
    depthWrite: false
  });

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/glassesVTO/models3D/glassesFramesBranchesBent.json`,
    material: frameMaterial,
    scale: 0.006,
    position: { x: 0, y: 0.07, z: 0.4 },
    rotation: { x: 0.02, y: 0, z: 0 },
    renderOrder: 12,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-glasses-frame";
      removeNamedChildren(group, ["fallback-glasses"]);
      group.add(mesh);
    }
  });

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/glassesVTO/models3D/glassesLenses.json`,
    material: lensMaterial,
    scale: 0.006,
    position: { x: 0, y: 0.07, z: 0.405 },
    rotation: { x: 0.02, y: 0, z: 0 },
    renderOrder: 13,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-glasses-lenses";
      group.add(mesh);
    }
  });

  const glints = createSparkleCluster(THREE, 0.22, 0.12, 0.62);
  glints.name = "glasses-polish-glints";
  glints.scale.setScalar(0.58);
  group.add(glints);
  return group;
}

function createJeelizPartyGlasses(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-miel-pops-glasses");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToPair(group, anchors?.leftEye, anchors?.rightEye, faceObject, {
      x: 0,
      y: 0.025,
      z: 0.38,
      scale: 2.34
    });
  };

  const fallback = createFallbackGlasses(THREE);
  fallback.name = "fallback-party-glasses";
  group.add(fallback);

  const baseUrl = `${ASSET_ROOT}/miel_pops/glasses`;
  const loadingState = {
    frame: null,
    lenses: null,
    branches: null,
    deco: null
  };
  const maybeAttach = () => {
    if (!loadingState.frame || !loadingState.lenses || !loadingState.branches || !loadingState.deco) {
      return;
    }
    removeNamedChildren(group, ["fallback-party-glasses"]);
    group.add(loadingState.branches, loadingState.frame, loadingState.lenses, loadingState.deco);
  };

  loadBufferMesh(THREE, {
    url: `${baseUrl}/frame.json`,
    material: new THREE.MeshPhongMaterial({
      color: 0x050505,
      shininess: 22,
      specular: 0xffffff,
      transparent: true
    }),
    scale: 0.0067,
    position: { x: 0, y: 0.05, z: 0.25 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 13,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-party-glasses-frame";
      loadingState.frame = mesh;
      maybeAttach();
    }
  });

  loadBufferMesh(THREE, {
    url: `${baseUrl}/lenses.json`,
    material: new THREE.MeshBasicMaterial({
      map: getTexture(THREE, `${baseUrl}/texture_mp.jpg`),
      transparent: true,
      opacity: 0.96,
      depthWrite: false
    }),
    scale: 0.0067,
    position: { x: 0, y: 0.05, z: 0.27 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 14,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-party-glasses-lenses";
      loadingState.lenses = mesh;
      maybeAttach();
    }
  });

  loadBufferMesh(THREE, {
    url: `${baseUrl}/branches.json`,
    material: new THREE.MeshBasicMaterial({
      alphaMap: getTexture(THREE, `${baseUrl}/alpha_branches.jpg`),
      map: getTexture(THREE, `${baseUrl}/textureBlack.jpg`),
      transparent: true,
      depthWrite: false
    }),
    scale: 0.0067,
    position: { x: 0, y: 0.05, z: 0.25 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 12,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-party-glasses-branches";
      loadingState.branches = mesh;
      maybeAttach();
    }
  });

  loadBufferMesh(THREE, {
    url: `${baseUrl}/deco.json`,
    material: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    }),
    scale: 0.0067,
    position: { x: 0, y: 0.05, z: 0.31 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 15,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-party-glasses-deco";
      loadingState.deco = mesh;
      maybeAttach();
    }
  });

  const bees = createPartyBeeOrbit(THREE);
  bees.name = "party-bee-orbit";
  group.add(bees);

  const glints = createSparkleCluster(THREE, 0.28, 0.22, 0.64);
  glints.scale.setScalar(0.7);
  group.add(glints);
  return group;
}

function createJeelizFacePaint(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-face-paint");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.015,
      z: 0.32,
      scale: 1.08
    });
  };

  const fallback = createFallbackFacePaint(THREE);
  fallback.name = "fallback-face-paint";
  group.add(fallback);

  const material = new THREE.MeshBasicMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/football_makeup/texture.png`),
    alphaMap: getTexture(THREE, `${ASSET_ROOT}/football_makeup/alpha_map_256.png`),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/football_makeup/face.json`,
    material,
    scale: 1,
    position: { x: 0, y: -0.04, z: 0.08 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 11,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-football-face-paint";
      removeNamedChildren(group, ["fallback-face-paint"]);
      group.add(mesh);
    }
  });

  const cheekDecals = createCheekDecals(THREE);
  cheekDecals.name = "party-face-paint-accents";
  group.add(cheekDecals);
  const glamOverlay = createGlamFaceOverlay(THREE);
  glamOverlay.name = "glam-face-overlay";
  group.add(glamOverlay);

  return group;
}

function createTexturedHat(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-luffy-party-hat");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToHeadTop(group, anchors, faceObject, {
      x: 0,
      y: 0.1,
      z: 0.42,
      scale: 0.54
    });
  };

  const fallback = createFallbackHat(THREE);
  fallback.name = "fallback-hat";
  group.add(fallback);

  const hatMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/luffys_hat/Texture2.jpg`),
    shininess: 8,
    specular: 0x553311,
    side: THREE.DoubleSide
  });

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/luffys_hat/luffys_hat.json`,
    material: hatMaterial,
    scale: 1.08,
    position: { x: 0, y: 0.03, z: -0.18 },
    rotation: { x: -0.1, y: 0, z: 0 },
    renderOrder: 10,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-luffy-hat";
      removeNamedChildren(group, ["fallback-hat"]);
      group.add(mesh);
    }
  });

  return group;
}

function createJeelizPuppy(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-puppy-face");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.08,
      z: 0.28,
      scale: 1.02
    });
  };

  const fallback = createFallbackPuppy(THREE);
  fallback.name = "fallback-puppy";
  group.add(fallback);
  group.add(createVisiblePuppyAccents(THREE));

  const earsMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/dog/texture_ears.jpg`),
    alphaMap: getTexture(THREE, `${ASSET_ROOT}/dog/alpha_ears_256.jpg`),
    bumpMap: getTexture(THREE, `${ASSET_ROOT}/dog/normal_ears.jpg`),
    bumpScale: 0.0075,
    shininess: 1.5,
    specular: 0xffffff,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const noseMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/dog/texture_nose.jpg`),
    bumpMap: getTexture(THREE, `${ASSET_ROOT}/dog/normal_nose.jpg`),
    bumpScale: 0.005,
    shininess: 1.5,
    specular: 0xffffff
  });

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/dog/dog_ears.json`,
    material: earsMaterial,
    scale: 0.025,
    position: { x: 0, y: -0.22, z: 0.03 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 9,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-dog-ears";
      removeNamedChildren(group, ["fallback-puppy"]);
      group.add(mesh);
    }
  });

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/dog/dog_nose.json`,
    material: noseMaterial,
    scale: 0.018,
    position: { x: 0, y: -0.12, z: 0.15 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 14,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-dog-nose";
      group.add(mesh);
    }
  });

  const muzzle = createPuppyMuzzle(THREE);
  group.add(muzzle);
  const whiskers = createPuppyWhiskers(THREE);
  group.add(whiskers);
  const tongue = createPuppyTongue(THREE);
  group.add(tongue);
  return group;
}

function createJeelizTigerMask(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-tiger-mask");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: 0.02,
      z: 0.24,
      scale: 1.58
    });
  };

  const fallback = createFallbackTigerMask(THREE);
  fallback.name = "fallback-tiger";
  group.add(fallback);

  const skinMaterial = new THREE.MeshLambertMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/tiger/headTexture2.png`),
    transparent: true,
    opacity: 0.97,
    side: THREE.DoubleSide
  });
  const eyeMaterial = new THREE.MeshLambertMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/tiger/white.png`),
    side: THREE.DoubleSide
  });
  const whiskerMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  const innerEarMaterial = new THREE.MeshBasicMaterial({
    color: 0x3a1508,
    side: THREE.DoubleSide
  });

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/tiger/TigerHead.json`,
    material: [whiskerMaterial, eyeMaterial, skinMaterial, innerEarMaterial],
    scale: 0.22,
    position: { x: 0, y: 0.02, z: -0.02 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 16,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-tiger-mask";
      mesh.scale.set(0.7, 0.9, 0.7);
      removeNamedChildren(group, ["fallback-tiger"]);
      group.add(mesh);
    }
  });

  const eyeGlints = createSparkleCluster(THREE, 0.18, 0.12, 0.62);
  eyeGlints.scale.setScalar(0.48);
  group.add(eyeGlints);
  group.add(createTigerEnergyParticles(THREE));
  return group;
}

function createJeelizWerewolf(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-werewolf");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.045,
      z: 0.24,
      scale: 1.02
    });
  };

  const fallback = createFallbackWerewolf(THREE);
  fallback.name = "fallback-werewolf";
  group.add(fallback);

  const baseUrl = `${ASSET_ROOT}/werewolf`;
  const headMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${baseUrl}/head_diffuse.png`),
    normalMap: getTexture(THREE, `${baseUrl}/head_normal.jpg`),
    alphaMap: getTexture(THREE, `${baseUrl}/head_alpha.jpg`),
    transparent: true,
    shininess: 12,
    specular: 0x332018
  });
  const furMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${baseUrl}/fur_diffuse.jpg`),
    normalMap: getTexture(THREE, `${baseUrl}/fur_normal.png`),
    alphaMap: getTexture(THREE, `${baseUrl}/fur_alpha.jpg`),
    transparent: true,
    shininess: 20,
    specular: 0x2a1b12,
    depthWrite: false
  });
  if (furMaterial.normalScale) {
    furMaterial.normalScale.set(1.6, 1.6);
  }
  const teethMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${baseUrl}/teeth_diffuse.jpg`),
    transparent: true,
    shininess: 6,
    specular: 0xffffff
  });

  loadBufferMesh(THREE, {
    url: `${baseUrl}/werewolf_not_animated.json`,
    material: [headMaterial, furMaterial, teethMaterial],
    scale: 6.2,
    position: { x: 0, y: -1.12, z: -0.42 },
    rotation: { x: 0.02, y: 0, z: 0 },
    renderOrder: 18,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-werewolf-head";
      mesh.scale.set(6.1, 6.8, 6.1);
      removeNamedChildren(group, ["fallback-werewolf"]);
      group.add(mesh);
    }
  });

  group.add(createWerewolfGlow(THREE));
  return group;
}

function createJeelizHelmet(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-rupy-helmet");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToHeadTop(group, anchors, faceObject, {
      x: 0,
      y: -0.18,
      z: 0.2,
      scale: 0.9
    });
  };

  const fallback = createFallbackHelmet(THREE);
  fallback.name = "fallback-helmet";
  group.add(fallback);

  const baseUrl = `${ASSET_ROOT}/rupy_helmet/helmet`;
  const loaded = { helmet: null, visor: null };
  const maybeAttach = () => {
    if (!loaded.helmet || !loaded.visor) {
      return;
    }
    removeNamedChildren(group, ["fallback-helmet"]);
    group.add(loaded.helmet, loaded.visor);
  };

  loadBufferMesh(THREE, {
    url: `${baseUrl}/helmet.json`,
    material: new THREE.MeshPhongMaterial({
      map: getTexture(THREE, `${baseUrl}/diffuse_helmet.jpg`),
      shininess: 58,
      specular: 0xffffff
    }),
    scale: 0.037,
    position: { x: 0, y: -0.3, z: -0.5 },
    rotation: { x: 0.5, y: 0, z: 0 },
    renderOrder: 9,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-rupy-helmet-shell";
      loaded.helmet = mesh;
      maybeAttach();
    }
  });

  loadBufferMesh(THREE, {
    url: `${baseUrl}/visiere.json`,
    material: new THREE.MeshStandardMaterial({
      color: 0xdff7ff,
      metalness: 0.12,
      roughness: 0.18,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    }),
    scale: 0.037,
    position: { x: 0, y: -0.3, z: -0.5 },
    rotation: { x: 0.5, y: 0, z: 0 },
    renderOrder: 16,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-rupy-helmet-visor";
      loaded.visor = mesh;
      maybeAttach();
    }
  });

  group.add(createHelmetGlow(THREE));
  return group;
}

function createJeelizAnonymousMask(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-anonymous-mask");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.06,
      z: 0.26,
      scale: 1.04
    });
  };

  const fallback = createFallbackFullMask(THREE);
  fallback.name = "fallback-anonymous";
  group.add(fallback);

  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/anonymous/anonymous.json`,
    material: new THREE.MeshLambertMaterial({
      map: getTexture(THREE, `${ASSET_ROOT}/anonymous/anonymous.png`),
      transparent: true,
      opacity: 0.98
    }),
    scale: 0.056,
    position: { x: 0, y: -0.72, z: 0.26 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 16,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-anonymous-mask";
      removeNamedChildren(group, ["fallback-anonymous"]);
      group.add(mesh);
    }
  });

  return group;
}

function createJeelizCasaMask(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-cinematic-mask");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.065,
      z: 0.28,
      scale: 1.08
    });
  };

  const fallback = createFallbackFullMask(THREE);
  fallback.name = "fallback-casa-mask";
  group.add(fallback);

  const baseUrl = `${ASSET_ROOT}/casa_de_papel`;
  const maskMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${baseUrl}/CasaDePapel_DIFFUSE.png`),
    normalMap: getTexture(THREE, `${baseUrl}/CasaDePapel_NRM.png`),
    emissiveMap: getTexture(THREE, `${baseUrl}/CasaDePapel_REFLECT.png`),
    emissive: new THREE.Color(0x342012),
    emissiveIntensity: 0.18,
    shininess: 42,
    specular: 0xffffff,
    transparent: true,
    opacity: 0.98
  });

  loadBufferMesh(THREE, {
    url: `${baseUrl}/casa_de_papel.json`,
    material: maskMaterial,
    scale: 0.058,
    position: { x: 0, y: -0.73, z: 0.24 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 17,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-casa-mask";
      mesh.scale.x *= 1.04;
      mesh.scale.y *= 1.0;
      removeNamedChildren(group, ["fallback-casa-mask"]);
      group.add(mesh);
    }
  });

  const maskPolish = createMaskPolishOverlay(THREE);
  maskPolish.name = "casa-mask-polish";
  group.add(maskPolish);
  return group;
}

function createJeelizStormCloud(THREE) {
  const group = createEffectGroup(THREE, "effect-jeeliz-storm-cloud");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToHeadTop(group, anchors, faceObject, {
      x: 0,
      y: 0.36,
      z: 0.24,
      scale: 0.82
    });
  };

  const fallback = createFallbackStormCloud(THREE);
  fallback.name = "fallback-storm-cloud";
  group.add(fallback);

  const cloudMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/cloud/cloud.png`),
    shininess: 2,
    specular: 0xffffff,
    transparent: true,
    opacity: 0.78,
    depthWrite: false
  });

  loadBufferGeometry(THREE, `${ASSET_ROOT}/cloud/cloud.json`)
    .then((geometry) => {
      geometry.computeVertexNormals();
      removeNamedChildren(group, ["fallback-storm-cloud"]);
      const cloudCluster = new THREE.Group();
      cloudCluster.name = "jeeliz-cloud-cluster";
      [
        { x: 0, y: 0.02, z: 0.06, sx: 0.36, sy: 0.18, sz: 0.36, rz: 0 },
        { x: 0.38, y: 0.1, z: 0.03, sx: 0.24, sy: 0.16, sz: 0.24, rz: 0.12 },
        { x: -0.28, y: -0.05, z: 0.12, sx: 0.3, sy: 0.2, sz: 0.3, rz: -0.1 }
      ].forEach((placement) => {
        const mesh = new THREE.Mesh(geometry.clone(), cloudMaterial.clone());
        mesh.position.set(placement.x, placement.y, placement.z);
        mesh.scale.set(placement.sx, placement.sy, placement.sz);
        mesh.rotation.z = placement.rz;
        mesh.renderOrder = 19;
        mesh.frustumCulled = false;
        cloudCluster.add(mesh);
      });
      group.add(cloudCluster);
    })
    .catch((error) => {
      console.warn("Failed to load storm cloud asset:", error);
    });

  group.add(createStormDrops(THREE));
  group.add(createStormLightning(THREE));
  group.userData.animate = (timeSeconds) => {
    group.children.forEach((child) => {
      child.userData.animate?.(timeSeconds);
    });
  };
  return group;
}

function createStageBowtie(THREE) {
  const group = createEffectGroup(THREE, "effect-stage-bowtie");
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToAnchor(group, anchors?.mouthCenter, faceObject, {
      x: 0,
      y: -0.36,
      z: 0.32,
      scale: 0.38
    });
  };

  const bow = createBowtieMesh(THREE);
  const halo = createHalo(THREE);
  halo.position.y = 0.86;
  halo.scale.setScalar(0.56);
  const glints = createSparkleCluster(THREE, 0.3, 0.98, 0.2);
  group.add(halo, bow, glints);
  return group;
}

function createEffectGroup(THREE, name) {
  const group = new THREE.Group();
  group.name = name;
  group.frustumCulled = false;
  group.userData.tmpAnchor = new THREE.Vector3();
  group.userData.tmpAnchorB = new THREE.Vector3();
  return group;
}

function fitGroupToAnchor(group, anchor, faceObject, offset) {
  if (!anchor || !faceObject) {
    group.position.set(offset.x, offset.y, offset.z);
    group.scale.setScalar(offset.scale);
    return;
  }
  const localAnchor = group.userData.tmpAnchor.set(anchor.x, anchor.y, anchor.z ?? 0);
  faceObject.worldToLocal(localAnchor);
  const faceScale = faceObject.userData.renderState?.scale ?? 1;
  group.position.set(
    localAnchor.x + offset.x * faceScale,
    localAnchor.y + offset.y * faceScale,
    localAnchor.z + offset.z * faceScale
  );
  group.scale.setScalar(offset.scale * faceScale);
}

function fitGroupToPair(group, leftAnchor, rightAnchor, faceObject, offset) {
  if (!leftAnchor || !rightAnchor || !faceObject) {
    fitGroupToAnchor(group, null, faceObject, offset);
    return;
  }
  const left = group.userData.tmpAnchor.set(leftAnchor.x, leftAnchor.y, leftAnchor.z ?? 0);
  const right = group.userData.tmpAnchorB.set(rightAnchor.x, rightAnchor.y, rightAnchor.z ?? 0);
  faceObject.worldToLocal(left);
  faceObject.worldToLocal(right);
  const centerX = (left.x + right.x) / 2;
  const centerY = (left.y + right.y) / 2;
  const centerZ = (left.z + right.z) / 2;
  const eyeDistance = Math.max(0.001, Math.hypot(right.x - left.x, right.y - left.y));
  const faceScale = faceObject.userData.renderState?.scale ?? 1;
  group.position.set(
    centerX + offset.x * eyeDistance,
    centerY + offset.y * eyeDistance,
    centerZ + offset.z * faceScale
  );
  group.scale.setScalar(offset.scale * eyeDistance);
  group.rotation.set(0, 0, 0);
}

function fitGroupToHeadTop(group, anchors, faceObject, offset) {
  const forehead = anchors?.forehead;
  const chin = anchors?.chin;
  if (!forehead || !chin || !faceObject) {
    fitGroupToAnchor(group, forehead, faceObject, offset);
    return;
  }
  const headHeight = Math.max(0.001, distance2D(forehead, chin));
  fitGroupToAnchor(group, forehead, faceObject, {
    ...offset,
    y: offset.y * headHeight,
    scale: offset.scale * headHeight
  });
}

function fitGroupToFaceMask(group, anchors, faceObject, offset) {
  const eyeCenter = anchors?.eyeCenter;
  const forehead = anchors?.forehead;
  const chin = anchors?.chin;
  const leftCheek = anchors?.leftCheek;
  const rightCheek = anchors?.rightCheek;
  if (!eyeCenter || !faceObject) {
    fitGroupToAnchor(group, eyeCenter, faceObject, offset);
    return;
  }

  const headHeight = distance2D(forehead, chin);
  const faceWidth = distance2D(leftCheek, rightCheek);
  const featureSize = Math.max(0.001, headHeight * 0.62, faceWidth * 0.46);
  const localAnchor = group.userData.tmpAnchor.set(eyeCenter.x, eyeCenter.y, eyeCenter.z ?? 0);
  faceObject.worldToLocal(localAnchor);
  group.position.set(
    localAnchor.x + offset.x * featureSize,
    localAnchor.y + offset.y * featureSize,
    localAnchor.z + offset.z * featureSize
  );
  group.scale.setScalar(offset.scale * featureSize);
  group.rotation.set(0, 0, 0);
}

function fitGroupToNose(group, anchors, faceObject, offset) {
  const nose = anchors?.noseTip;
  const leftEye = anchors?.leftEye;
  const rightEye = anchors?.rightEye;
  if (!nose || !leftEye || !rightEye || !faceObject) {
    fitGroupToAnchor(group, nose, faceObject, offset);
    return;
  }
  const eyeDistance = Math.max(0.001, distance2D(leftEye, rightEye));
  fitGroupToAnchor(group, nose, faceObject, {
    ...offset,
    x: offset.x * eyeDistance,
    y: offset.y * eyeDistance,
    scale: offset.scale * eyeDistance
  });
}

function distance2D(a, b) {
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createGlassesFrameMaterial(THREE, envMap) {
  if (!THREE.ShaderLib?.standard) {
    return new THREE.MeshPhongMaterial({
      color: 0x07090d,
      envMap,
      shininess: 90,
      specular: 0xffffff,
      transparent: true
    });
  }

  const uniforms = {
    roughness: { value: 0 },
    metalness: { value: 0.05 },
    reflectivity: { value: 1 },
    envMap: { value: envMap },
    envMapIntensity: { value: 1 },
    diffuse: { value: new THREE.Color().setHex(0xffffff) },
    uBranchFading: { value: new THREE.Vector2(-90, 60) }
  };
  let vertexShader = `varying float vPosZ;\n${THREE.ShaderLib.standard.vertexShader}`;
  vertexShader = vertexShader.replace("#include <fog_vertex>", "vPosZ = position.z;");
  let fragmentShader = `uniform vec2 uBranchFading;\nvarying float vPosZ;\n${THREE.ShaderLib.standard.fragmentShader}`;
  fragmentShader = fragmentShader.replace(
    "#include <fog_fragment>",
    "gl_FragColor.a = smoothstep(uBranchFading.x - uBranchFading.y * 0.5, uBranchFading.x + uBranchFading.y * 0.5, vPosZ);"
  );

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    flatShading: false,
    transparent: true,
    extensions: {
      derivatives: true,
      shaderTextureLOD: true
    }
  });
  material.envMap = envMap;
  return material;
}

function createFaceOccluder(THREE, options = {}) {
  const scale = options.scale ?? 0.0084;
  const position = options.position ?? { x: 0, y: 0.1, z: -0.04 };
  const rotation = options.rotation ?? { x: 0.3, y: 0, z: 0 };
  const group = new THREE.Group();
  loadBufferGeometry(THREE, `${ASSET_ROOT}/glassesVTO/models3D/face.json`)
    .then((geometry) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: THREE.ShaderLib.basic.vertexShader,
        fragmentShader: "precision lowp float;\nvoid main(void){\n  gl_FragColor=vec4(1.0,0.0,0.0,1.0);\n}",
        uniforms: THREE.ShaderLib.basic.uniforms,
        colorWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "face-depth-occluder";
      mesh.renderOrder = -1;
      mesh.scale.setScalar(scale);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.set(rotation.x, rotation.y, rotation.z);
      mesh.frustumCulled = false;
      group.add(mesh);
    })
    .catch(() => {});
  return group;
}

function loadBufferMesh(THREE, { url, material, scale, position, rotation, renderOrder, onLoad }) {
  loadBufferGeometry(THREE, url)
    .then((geometry) => {
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(scale);
      mesh.position.set(position.x, position.y, position.z);
      mesh.rotation.set(rotation.x, rotation.y, rotation.z);
      mesh.renderOrder = renderOrder;
      mesh.frustumCulled = false;
      onLoad(mesh);
    })
    .catch((error) => {
      console.warn(`Failed to load effect asset ${url}:`, error);
    });
}

function loadBufferGeometry(THREE, url) {
  if (!geometryCache.has(url)) {
    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((json) => parseGeometryAsset(THREE, json));
    geometryCache.set(url, promise);
  }
  return geometryCache.get(url).then((geometry) => geometry.clone());
}

function parseGeometryAsset(THREE, json) {
  const isBufferGeometry = json?.metadata?.type === "BufferGeometry" || json?.data?.attributes;
  if (isBufferGeometry) {
    return new THREE.BufferGeometryLoader().parse(json);
  }
  if (Array.isArray(json?.vertices) && Array.isArray(json?.faces)) {
    return parseLegacyGeometry(THREE, json);
  }
  throw new Error("Unsupported geometry format");
}

function parseLegacyGeometry(THREE, json) {
  const vertices = json.vertices;
  const faces = json.faces;
  const uvLayers = json.uvs ?? [];
  const positions = [];
  const uvs = [];
  const materialGroups = [];
  let cursor = 0;
  let triangleCursor = 0;

  const pushVertex = (vertexIndex) => {
    const vertexOffset = vertexIndex * 3;
    positions.push(vertices[vertexOffset], vertices[vertexOffset + 1], vertices[vertexOffset + 2]);
  };
  const pushUv = (uvIndex) => {
    const layer = uvLayers[0] ?? [];
    const uvOffset = uvIndex * 2;
    uvs.push(layer[uvOffset] ?? 0, layer[uvOffset + 1] ?? 0);
  };
  const recordTriangleMaterial = (materialIndex) => {
    const normalizedMaterialIndex = Number.isFinite(materialIndex) ? materialIndex : 0;
    const start = triangleCursor * 3;
    const previousGroup = materialGroups[materialGroups.length - 1];
    if (previousGroup?.materialIndex === normalizedMaterialIndex && previousGroup.start + previousGroup.count === start) {
      previousGroup.count += 3;
    } else {
      materialGroups.push({
        start,
        count: 3,
        materialIndex: normalizedMaterialIndex
      });
    }
    triangleCursor += 1;
  };
  const pushTriangle = (a, b, c, uvA, uvB, uvC, materialIndex = 0) => {
    pushVertex(a);
    pushVertex(b);
    pushVertex(c);
    if (uvLayers[0]?.length) {
      pushUv(uvA);
      pushUv(uvB);
      pushUv(uvC);
    }
    recordTriangleMaterial(materialIndex);
  };

  while (cursor < faces.length) {
    const type = faces[cursor++];
    const isQuad = isBitSet(type, 0);
    const hasMaterial = isBitSet(type, 1);
    const hasFaceVertexUv = isBitSet(type, 3);
    const hasFaceNormal = isBitSet(type, 4);
    const hasFaceVertexNormal = isBitSet(type, 5);
    const hasFaceColor = isBitSet(type, 6);
    const hasFaceVertexColor = isBitSet(type, 7);
    const vertexCount = isQuad ? 4 : 3;
    const indices = faces.slice(cursor, cursor + vertexCount);
    cursor += vertexCount;
    const materialIndex = hasMaterial ? faces[cursor++] : 0;

    const faceUvs = [];
    if (hasFaceVertexUv) {
      uvLayers.forEach(() => {
        faceUvs.push(faces.slice(cursor, cursor + vertexCount));
        cursor += vertexCount;
      });
    }

    if (hasFaceNormal) {
      cursor += 1;
    }
    if (hasFaceVertexNormal) {
      cursor += vertexCount;
    }
    if (hasFaceColor) {
      cursor += 1;
    }
    if (hasFaceVertexColor) {
      cursor += vertexCount;
    }

    const uv = faceUvs[0] ?? [];
    if (isQuad) {
      pushTriangle(indices[0], indices[1], indices[3], uv[0], uv[1], uv[3], materialIndex);
      pushTriangle(indices[1], indices[2], indices[3], uv[1], uv[2], uv[3], materialIndex);
    } else {
      pushTriangle(indices[0], indices[1], indices[2], uv[0], uv[1], uv[2], materialIndex);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", createFloatAttribute(THREE, positions, 3));
  if (uvs.length) {
    geometry.setAttribute("uv", createFloatAttribute(THREE, uvs, 2));
  }
  materialGroups.forEach((group) => {
    geometry.addGroup(group.start, group.count, group.materialIndex);
  });
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function isBitSet(value, position) {
  return (value & (1 << position)) !== 0;
}

function createFloatAttribute(THREE, values, itemSize) {
  if (THREE.Float32BufferAttribute) {
    return new THREE.Float32BufferAttribute(values, itemSize);
  }
  return new THREE.BufferAttribute(new Float32Array(values), itemSize);
}

function createFallbackGlasses(THREE) {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x05070d });
  const lensMaterial = new THREE.MeshBasicMaterial({
    color: 0x14213d,
    transparent: true,
    opacity: 0.78
  });
  const lensShape = new THREE.Shape();
  lensShape.moveTo(-0.24, 0.08);
  lensShape.bezierCurveTo(-0.22, 0.19, -0.06, 0.22, 0.19, 0.16);
  lensShape.bezierCurveTo(0.24, 0.02, 0.16, -0.16, -0.11, -0.18);
  lensShape.bezierCurveTo(-0.28, -0.13, -0.31, -0.02, -0.24, 0.08);
  const lensGeometry = new THREE.ShapeGeometry(lensShape);
  const leftFrame = new THREE.Mesh(lensGeometry, frameMaterial);
  const rightFrame = leftFrame.clone();
  const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
  const rightLens = leftLens.clone();
  leftFrame.position.set(-0.27, 0, 0.02);
  rightFrame.position.set(0.27, 0, 0.02);
  rightFrame.scale.x = -1;
  leftLens.position.set(-0.27, 0, 0.04);
  rightLens.position.set(0.27, 0, 0.04);
  rightLens.scale.x = -1;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), frameMaterial);
  bridge.position.set(0, 0.01, 0.06);
  group.add(leftFrame, rightFrame, leftLens, rightLens, bridge);
  return group;
}

function createPartyBeeOrbit(THREE) {
  const group = new THREE.Group();
  const fallback = new THREE.Group();
  fallback.name = "fallback-bee-orbit";

  [-1, 1].forEach((side, index) => {
    const bee = createFallbackBee(THREE);
    bee.position.set(side * 0.46, 0.54 + index * 0.08, 0.58);
    bee.rotation.z = side * -0.24;
    bee.userData.animate = (timeSeconds) => {
      bee.position.y += Math.sin(timeSeconds * 4.2 + index) * 0.0014;
      bee.rotation.z = side * -0.24 + Math.sin(timeSeconds * 3.2 + index) * 0.06;
    };
    fallback.add(bee);
  });
  group.add(fallback);

  const beeMaterial = new THREE.MeshLambertMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/miel_pops/bee/texture_bee.jpg`),
    transparent: true
  });
  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/miel_pops/bee/bee.json`,
    material: beeMaterial,
    scale: 0.07,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    renderOrder: 18,
    onLoad: (sourceMesh) => {
      removeNamedChildren(group, ["fallback-bee-orbit"]);
      const orbit = new THREE.Group();
      orbit.name = "jeeliz-bee-orbit";
      const placements = [
        { x: -0.5, y: 0.48, z: 0.52, phase: 0, scale: 1.0 },
        { x: 0.47, y: 0.56, z: 0.48, phase: 1.7, scale: 0.88 },
        { x: -0.12, y: 0.78, z: 0.44, phase: 3.1, scale: 0.74 }
      ];
      placements.forEach((placement) => {
        const bee = sourceMesh.clone();
        bee.position.set(placement.x, placement.y, placement.z);
        bee.scale.multiplyScalar(placement.scale);
        bee.rotation.set(0.5, placement.x < 0 ? -0.2 : 0.2, placement.x < 0 ? -0.35 : 0.35);
        bee.userData.basePosition = bee.position.clone();
        bee.userData.phase = placement.phase;
        orbit.add(bee);
      });
      orbit.userData.animate = (timeSeconds) => {
        orbit.children.forEach((bee) => {
          const phase = bee.userData.phase ?? 0;
          const base = bee.userData.basePosition;
          bee.position.set(
            base.x + Math.sin(timeSeconds * 2.2 + phase) * 0.035,
            base.y + Math.cos(timeSeconds * 2.8 + phase) * 0.026,
            base.z + Math.sin(timeSeconds * 1.6 + phase) * 0.02
          );
          bee.rotation.y = Math.sin(timeSeconds * 3 + phase) * 0.35;
          bee.rotation.z += 0.035;
        });
      };
      group.add(orbit);
    }
  });
  return group;
}

function createFallbackBee(THREE) {
  const bee = new THREE.Group();
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0xffd23f,
    shininess: 24,
    specular: 0xffffff
  });
  const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0x171717 });
  const wingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 10), bodyMaterial);
  body.scale.set(1.2, 0.78, 0.58);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.12, 0.03), stripeMaterial);
  stripe.position.z = 0.03;
  const wingLeft = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), wingMaterial);
  wingLeft.scale.set(0.9, 1.38, 0.08);
  wingLeft.position.set(-0.035, 0.06, -0.01);
  wingLeft.rotation.z = -0.5;
  const wingRight = wingLeft.clone();
  wingRight.position.x = 0.035;
  wingRight.rotation.z = 0.5;
  bee.add(body, stripe, wingLeft, wingRight);
  return bee;
}

function createFallbackHat(THREE) {
  const group = new THREE.Group();
  const straw = new THREE.MeshPhongMaterial({ color: 0xd99a3d, shininess: 18 });
  const ribbon = new THREE.MeshPhongMaterial({ color: 0x8b1725, shininess: 24 });
  const brim = new THREE.Mesh(new THREE.SphereGeometry(0.74, 48, 12), straw);
  brim.scale.set(1.32, 0.13, 0.08);
  brim.position.set(0, 0.12, 0.18);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), straw);
  dome.scale.set(1.12, 0.9, 0.42);
  dome.position.set(0, 0.22, 0.14);
  dome.rotation.x = Math.PI;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.05), ribbon);
  band.position.set(0, 0.12, 0.44);
  group.add(brim, dome, band);
  return group;
}

function createFallbackFacePaint(THREE) {
  const group = new THREE.Group();
  const blue = new THREE.MeshBasicMaterial({
    color: 0x2f6dff,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const red = new THREE.MeshBasicMaterial({
    color: 0xff3d55,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const white = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  [
    { x: -0.33, y: -0.1, w: 0.28, h: 0.08, material: blue },
    { x: -0.33, y: -0.2, w: 0.28, h: 0.08, material: white },
    { x: -0.33, y: -0.3, w: 0.28, h: 0.08, material: red },
    { x: 0.33, y: -0.1, w: 0.28, h: 0.08, material: blue },
    { x: 0.33, y: -0.2, w: 0.28, h: 0.08, material: white },
    { x: 0.33, y: -0.3, w: 0.28, h: 0.08, material: red }
  ].forEach((stripe) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(stripe.w, stripe.h), stripe.material);
    mesh.position.set(stripe.x, stripe.y, 0.2);
    mesh.rotation.z = stripe.x < 0 ? -0.12 : 0.12;
    mesh.frustumCulled = false;
    group.add(mesh);
  });
  return group;
}

function createCheekDecals(THREE) {
  const group = new THREE.Group();
  group.name = "party-cheek-decals";
  const palette = [
    new THREE.MeshBasicMaterial({ color: 0x38d9ff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: 0xff3d9a, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide })
  ];
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Group();
    cheek.position.set(side * 0.34, -0.12, 0.5);
    cheek.rotation.z = side * 0.16;
    [
      { y: 0.09, w: 0.36, h: 0.064, material: palette[0] },
      { y: 0, w: 0.34, h: 0.052, material: palette[1] },
      { y: -0.084, w: 0.32, h: 0.058, material: palette[2] }
    ].forEach((stripe) => {
      const mesh = new THREE.Mesh(createRoundedStripeGeometry(THREE, stripe.w, stripe.h), stripe.material);
      mesh.position.y = stripe.y;
      mesh.frustumCulled = false;
      cheek.add(mesh);
    });
    const sparkle = createSparkleCluster(THREE, side * 0.16, 0.14, 0.08);
    sparkle.scale.setScalar(0.72);
    cheek.add(sparkle);
    group.add(cheek);
  });
  return group;
}

function createGlamFaceOverlay(THREE) {
  const group = new THREE.Group();
  const blushTexture = createRadialGlowTexture(THREE, [
    [0, "rgba(255, 120, 180, 0.72)"],
    [0.5, "rgba(255, 120, 180, 0.22)"],
    [1, "rgba(255, 120, 180, 0)"]
  ]);
  const shimmerTexture = createRadialGlowTexture(THREE, [
    [0, "rgba(255, 244, 190, 0.92)"],
    [0.38, "rgba(255, 244, 190, 0.36)"],
    [1, "rgba(255, 244, 190, 0)"]
  ]);
  const blushMaterial = new THREE.MeshBasicMaterial({
    map: blushTexture,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const shimmerMaterial = new THREE.MeshBasicMaterial({
    map: shimmerTexture,
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  [-1, 1].forEach((side) => {
    const blush = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), blushMaterial);
    blush.position.set(side * 0.3, -0.22, 0.58);
    blush.rotation.z = side * 0.12;
    blush.frustumCulled = false;
    group.add(blush);

    const browGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.065), shimmerMaterial);
    browGlow.position.set(side * 0.19, 0.13, 0.6);
    browGlow.rotation.z = side * -0.22;
    browGlow.frustumCulled = false;
    group.add(browGlow);
  });

  const noseHighlight = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.16), shimmerMaterial);
  noseHighlight.position.set(0.035, -0.055, 0.62);
  noseHighlight.rotation.z = -0.18;
  noseHighlight.frustumCulled = false;
  group.add(noseHighlight);

  group.userData.animate = (timeSeconds) => {
    const shimmer = 0.5 + Math.sin(timeSeconds * 2.4) * 0.12;
    shimmerMaterial.opacity = shimmer;
  };
  return group;
}

function createRoundedStripeGeometry(THREE, width, height) {
  const radius = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + radius, -height / 2);
  shape.lineTo(width / 2 - radius, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, 0);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
  shape.lineTo(-width / 2 + radius, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, 0);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
  return new THREE.ShapeGeometry(shape);
}

function createFallbackPuppy(THREE) {
  const group = new THREE.Group();
  const earMaterial = new THREE.MeshPhongMaterial({ color: 0x8b5328, shininess: 12 });
  const noseMaterial = new THREE.MeshPhongMaterial({ color: 0x1d120f, shininess: 40 });
  const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 14), earMaterial);
  leftEar.scale.set(0.82, 1.62, 0.18);
  leftEar.position.set(-0.46, 0.42, 0.08);
  leftEar.rotation.z = -0.46;
  const rightEar = leftEar.clone();
  rightEar.position.x = 0.46;
  rightEar.rotation.z = 0.46;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 12), noseMaterial);
  nose.scale.set(1.2, 0.72, 0.38);
  nose.position.set(0, -0.12, 0.28);
  group.add(leftEar, rightEar, nose);
  return group;
}

function createFallbackHelmet(THREE) {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.78),
    new THREE.MeshPhongMaterial({ color: 0xbfc8d4, shininess: 64, specular: 0xffffff })
  );
  shell.scale.set(1.15, 1, 0.72);
  shell.rotation.x = Math.PI;
  shell.position.set(0, 0.05, 0.03);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 32, 12),
    new THREE.MeshBasicMaterial({ color: 0xb9f4ff, transparent: true, opacity: 0.38, depthWrite: false })
  );
  visor.scale.set(1.35, 0.56, 0.22);
  visor.position.set(0, -0.12, 0.36);
  group.add(shell, visor);
  return group;
}

function createHelmetGlow(THREE) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x8deaff,
    transparent: true,
    opacity: 0.68,
    depthWrite: false
  });
  [-1, 1].forEach((side) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.36, 0.02), material);
    strip.position.set(side * 0.38, 0.14, 0.44);
    strip.rotation.z = side * 0.12;
    strip.frustumCulled = false;
    group.add(strip);
  });
  return group;
}

function createFallbackFullMask(THREE) {
  const group = new THREE.Group();
  const maskMaterial = new THREE.MeshLambertMaterial({
    color: 0xf4f0e8,
    transparent: true,
    opacity: 0.86,
    depthWrite: false
  });
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.38, 40, 20), maskMaterial);
  mask.scale.set(0.86, 1.18, 0.2);
  mask.position.set(0, -0.08, 0.28);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.75 });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 8), eyeMaterial);
    eye.scale.set(1.55, 0.58, 0.08);
    eye.position.set(side * 0.14, 0.03, 0.36);
    group.add(eye);
  });
  group.add(mask);
  return group;
}

function createFallbackStormCloud(THREE) {
  const group = new THREE.Group();
  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xe8eef8,
    transparent: true,
    opacity: 0.82,
    shininess: 8,
    depthWrite: false
  });
  [
    { x: -0.22, y: 0, s: 0.2 },
    { x: 0, y: 0.06, s: 0.26 },
    { x: 0.23, y: 0, s: 0.19 }
  ].forEach((part) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(part.s, 28, 16), cloudMaterial);
    puff.scale.y = 0.55;
    puff.position.set(part.x, part.y, 0.12);
    puff.frustumCulled = false;
    group.add(puff);
  });
  return group;
}

function createMaskPolishOverlay(THREE) {
  const group = new THREE.Group();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x2b1308,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({
    map: createRadialGlowTexture(THREE, [
      [0, "rgba(255, 240, 190, 0.92)"],
      [0.4, "rgba(255, 222, 150, 0.28)"],
      [1, "rgba(255, 222, 150, 0)"]
    ]),
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  [-1, 1].forEach((side) => {
    const eyeShadow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8), shadowMaterial);
    eyeShadow.scale.set(1.7, 0.72, 0.08);
    eyeShadow.position.set(side * 0.14, 0.04, 0.46);
    eyeShadow.rotation.z = side * 0.1;
    eyeShadow.frustumCulled = false;
    group.add(eyeShadow);

    const cheekShine = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.13), highlightMaterial);
    cheekShine.position.set(side * 0.26, -0.21, 0.52);
    cheekShine.rotation.z = side * -0.16;
    cheekShine.frustumCulled = false;
    group.add(cheekShine);
  });

  group.userData.animate = (timeSeconds) => {
    highlightMaterial.opacity = 0.48 + Math.sin(timeSeconds * 2.2) * 0.08;
  };
  return group;
}

function createFallbackTigerMask(THREE) {
  const group = new THREE.Group();
  const orange = new THREE.MeshLambertMaterial({
    color: 0xf47c2c,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const stripeMaterial = new THREE.MeshBasicMaterial({
    color: 0x19110c,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 20), orange);
  mask.scale.set(0.95, 1.18, 0.16);
  mask.position.set(0, -0.04, 0.32);
  group.add(mask);
  [-1, 1].forEach((side) => {
    [0.16, 0.02, -0.14].forEach((y, index) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18 - index * 0.02, 0.025, 0.01), stripeMaterial);
      stripe.position.set(side * (0.13 + index * 0.055), y, 0.43);
      stripe.rotation.z = side * (0.55 - index * 0.12);
      stripe.frustumCulled = false;
      group.add(stripe);
    });
  });
  return group;
}

function createFallbackWerewolf(THREE) {
  const group = new THREE.Group();
  const furMaterial = new THREE.MeshPhongMaterial({
    color: 0x5a3325,
    shininess: 24,
    specular: 0x2b1710,
    transparent: true,
    opacity: 0.9
  });
  const muzzleMaterial = new THREE.MeshPhongMaterial({
    color: 0x2f2119,
    shininess: 18,
    specular: 0x21130e
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 36, 18), furMaterial);
  head.scale.set(1, 1.22, 0.22);
  head.position.set(0, -0.04, 0.28);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 12), muzzleMaterial);
  muzzle.scale.set(1.45, 0.78, 0.42);
  muzzle.position.set(0, -0.22, 0.42);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 28), furMaterial);
    ear.position.set(side * 0.3, 0.34, 0.23);
    ear.rotation.z = side * -0.36;
    ear.rotation.x = -0.12;
    ear.frustumCulled = false;
    group.add(ear);
  });
  group.add(head, muzzle);
  return group;
}

function createVisiblePuppyAccents(THREE) {
  const group = new THREE.Group();
  group.name = "visible-puppy-accents";
  const outerEarMaterial = new THREE.MeshPhongMaterial({
    color: 0x8a542f,
    shininess: 20,
    specular: 0x332211,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide
  });
  const innerEarMaterial = new THREE.MeshBasicMaterial({
    color: 0xf0b2a4,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  [-1, 1].forEach((side) => {
    const ear = new THREE.Group();
    ear.position.set(side * 0.42, 0.5, 0.2);
    ear.rotation.z = side * 0.34;
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.16, 28, 16), outerEarMaterial);
    outer.scale.set(0.72, 1.58, 0.14);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 12), innerEarMaterial);
    inner.scale.set(0.54, 1.05, 0.07);
    inner.position.z = 0.035;
    ear.add(outer, inner);
    group.add(ear);
  });

  const noseShine = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 16, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    })
  );
  noseShine.position.set(0.034, -0.092, 0.33);
  noseShine.scale.set(1, 0.55, 0.25);
  group.add(noseShine);
  return group;
}

function createPuppyMuzzle(THREE) {
  const group = new THREE.Group();
  group.name = "soft-puppy-muzzle";
  const muzzleMaterial = new THREE.MeshBasicMaterial({
    color: 0xf7d7bd,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  });
  const blushMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8ca3,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 16), muzzleMaterial);
  muzzle.scale.set(1.52, 0.62, 0.12);
  muzzle.position.set(0, -0.2, 0.34);
  const leftBlush = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 10), blushMaterial);
  leftBlush.position.set(-0.19, -0.18, 0.38);
  const rightBlush = leftBlush.clone();
  rightBlush.position.x = 0.26;
  group.add(muzzle, leftBlush, rightBlush);
  return group;
}

function createPuppyWhiskers(THREE) {
  const group = new THREE.Group();
  group.name = "soft-puppy-whiskers";
  const material = new THREE.MeshBasicMaterial({
    color: 0x2b1a13,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });
  [-1, 1].forEach((side) => {
    [-0.08, 0.02, 0.12].forEach((offsetY, index) => {
      const whisker = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.007, 0.006), material);
      whisker.position.set(side * (0.2 + index * 0.018), -0.19 + offsetY, 0.42);
      whisker.rotation.z = side * (0.18 - index * 0.08);
      whisker.frustumCulled = false;
      group.add(whisker);
    });
  });
  return group;
}

function createPuppyTongue(THREE) {
  const group = new THREE.Group();
  group.name = "jeeliz-puppy-tongue";
  const fallbackTongue = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 18, 12),
    new THREE.MeshPhongMaterial({
      color: 0xee5f78,
      shininess: 18,
      specular: 0xffc0cb,
      transparent: true,
      opacity: 0.86
    })
  );
  fallbackTongue.scale.set(0.88, 1.95, 0.22);
  fallbackTongue.position.set(0, -0.31, 0.36);
  fallbackTongue.name = "fallback-puppy-tongue";
  group.add(fallbackTongue);

  const tongueMaterial = new THREE.MeshPhongMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/dog/dog_tongue.jpg`),
    alphaMap: getTexture(THREE, `${ASSET_ROOT}/dog/tongue_alpha_256.jpg`),
    transparent: true,
    opacity: 0.94,
    shininess: 18,
    specular: 0xffd0d0,
    side: THREE.DoubleSide
  });
  loadBufferMesh(THREE, {
    url: `${ASSET_ROOT}/dog/dog_tongue.json`,
    material: tongueMaterial,
    scale: 2,
    position: { x: 0, y: -0.28, z: 0.1 },
    rotation: { x: 0.05, y: 0, z: 0 },
    renderOrder: 15,
    onLoad: (mesh) => {
      mesh.name = "jeeliz-dog-tongue";
      mesh.scale.setScalar(0.48);
      removeNamedChildren(group, ["fallback-puppy-tongue"]);
      group.add(mesh);
    }
  });

  group.userData.animate = (timeSeconds) => {
    const bob = Math.sin(timeSeconds * 5.2) * 0.018;
    group.position.y = bob;
    group.rotation.x = 0.06 + Math.sin(timeSeconds * 4.1) * 0.05;
  };
  return group;
}

function createTigerEnergyParticles(THREE) {
  const group = new THREE.Group();
  group.name = "tiger-energy-particles";
  const spriteMaterial = new THREE.SpriteMaterial({
    map: createRadialGlowTexture(THREE, [
      [0, "rgba(255, 244, 180, 0.95)"],
      [0.32, "rgba(255, 120, 36, 0.52)"],
      [1, "rgba(255, 80, 0, 0)"]
    ]),
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const placements = [
    { x: -0.2, y: 0.15, z: 0.58, phase: 0, scale: 0.14 },
    { x: 0.22, y: 0.12, z: 0.6, phase: 1.6, scale: 0.12 },
    { x: 0.02, y: -0.26, z: 0.62, phase: 3.2, scale: 0.1 }
  ];
  placements.forEach((placement) => {
    const particle = new THREE.Sprite(spriteMaterial.clone());
    particle.position.set(placement.x, placement.y, placement.z);
    particle.scale.setScalar(placement.scale);
    particle.userData.basePosition = particle.position.clone();
    particle.userData.phase = placement.phase;
    group.add(particle);
  });
  group.userData.animate = (timeSeconds) => {
    group.children.forEach((particle) => {
      const base = particle.userData.basePosition;
      const phase = particle.userData.phase ?? 0;
      const pulse = 0.72 + Math.sin(timeSeconds * 4.4 + phase) * 0.22;
      particle.position.set(
        base.x + Math.sin(timeSeconds * 2.1 + phase) * 0.018,
        base.y + Math.cos(timeSeconds * 2.7 + phase) * 0.022,
        base.z
      );
      particle.material.opacity = 0.44 + pulse * 0.28;
      particle.scale.setScalar((0.08 + pulse * 0.06) * (phase === 3.2 ? 0.82 : 1));
    });
  };
  return group;
}

function createWerewolfGlow(THREE) {
  const group = new THREE.Group();
  group.name = "werewolf-warm-rim";
  const glowTexture = createRadialGlowTexture(THREE, [
    [0, "rgba(255, 198, 122, 0.9)"],
    [0.36, "rgba(255, 124, 66, 0.32)"],
    [1, "rgba(255, 80, 20, 0)"]
  ]);
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  [-1, 1].forEach((side) => {
    const sprite = new THREE.Sprite(material.clone());
    sprite.position.set(side * 0.22, 0.16, 0.58);
    sprite.scale.set(0.22, 0.16, 0.22);
    sprite.userData.phase = side > 0 ? 1.7 : 0;
    group.add(sprite);
  });
  group.userData.animate = (timeSeconds) => {
    group.children.forEach((sprite) => {
      const phase = sprite.userData.phase ?? 0;
      const pulse = 0.68 + Math.sin(timeSeconds * 3.5 + phase) * 0.18;
      sprite.material.opacity = 0.24 + pulse * 0.18;
      sprite.scale.set(0.18 + pulse * 0.06, 0.13 + pulse * 0.04, 0.2);
    });
  };
  return group;
}

function createStormDrops(THREE) {
  const group = new THREE.Group();
  group.name = "storm-rain-drops";
  const dropMaterial = new THREE.SpriteMaterial({
    map: getTexture(THREE, `${ASSET_ROOT}/cloud/drop.png`),
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  const placements = [
    { x: -0.34, phase: 0.1, scale: 0.11 },
    { x: -0.18, phase: 1.6, scale: 0.09 },
    { x: 0.02, phase: 0.9, scale: 0.1 },
    { x: 0.2, phase: 2.4, scale: 0.085 },
    { x: 0.36, phase: 3.2, scale: 0.1 }
  ];
  placements.forEach((placement) => {
    const drop = new THREE.Sprite(dropMaterial.clone());
    drop.position.set(placement.x, -0.2, 0.36);
    drop.scale.set(placement.scale * 0.58, placement.scale * 1.35, placement.scale);
    drop.userData.phase = placement.phase;
    drop.userData.baseX = placement.x;
    drop.frustumCulled = false;
    group.add(drop);

    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(0.018, 0.22),
      new THREE.MeshBasicMaterial({
        color: 0x8deaff,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    streak.position.set(placement.x + 0.035, -0.18, 0.34);
    streak.rotation.z = -0.18;
    streak.userData.phase = placement.phase + 0.45;
    streak.userData.baseX = placement.x + 0.035;
    streak.frustumCulled = false;
    group.add(streak);
  });

  group.userData.animate = (timeSeconds) => {
    group.children.forEach((drop) => {
      const phase = drop.userData.phase ?? 0;
      const fall = (timeSeconds * 0.76 + phase) % 1;
      drop.position.x = drop.userData.baseX + Math.sin(timeSeconds * 2.4 + phase) * 0.018;
      drop.position.y = 0.08 - fall * 0.76;
      drop.material.opacity = fall > 0.88 ? (1 - fall) * 6 : 0.48 + Math.sin(timeSeconds * 4 + phase) * 0.14;
    });
  };
  return group;
}

function createStormLightning(THREE) {
  const group = new THREE.Group();
  group.name = "storm-lightning";
  const material = new THREE.MeshBasicMaterial({
    color: 0xfff4a8,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const boltShape = new THREE.Shape();
  boltShape.moveTo(-0.03, 0.02);
  boltShape.lineTo(0.08, 0.02);
  boltShape.lineTo(0.01, -0.2);
  boltShape.lineTo(0.1, -0.2);
  boltShape.lineTo(-0.08, -0.58);
  boltShape.lineTo(-0.02, -0.29);
  boltShape.lineTo(-0.12, -0.29);
  boltShape.lineTo(-0.03, 0.02);
  const bolt = new THREE.Mesh(new THREE.ShapeGeometry(boltShape), material);
  bolt.position.set(0.06, -0.03, 0.5);
  bolt.scale.setScalar(0.64);
  bolt.frustumCulled = false;
  group.add(bolt);

  const glow = new THREE.PointLight(0xfff0a8, 0, 1.6);
  glow.position.set(0.02, -0.16, 0.42);
  group.add(glow);

  group.userData.animate = (timeSeconds) => {
    const flash = Math.max(0, Math.sin(timeSeconds * 5.4) - 0.74) * 3.4;
    material.opacity = 0.42 + flash * 0.5;
    glow.intensity = flash * 0.55;
    bolt.rotation.z = Math.sin(timeSeconds * 3.2) * 0.05;
  };
  return group;
}

function createBowtieMesh(THREE) {
  const group = new THREE.Group();
  const blue = new THREE.MeshPhongMaterial({ color: 0x176bff, shininess: 55 });
  const red = new THREE.MeshPhongMaterial({ color: 0xff3d55, shininess: 55 });
  const gold = new THREE.MeshPhongMaterial({ color: 0xffd166, shininess: 80 });

  const leftShape = new THREE.Shape();
  leftShape.moveTo(-0.08, 0);
  leftShape.bezierCurveTo(-0.25, 0.2, -0.55, 0.24, -0.68, 0.02);
  leftShape.bezierCurveTo(-0.55, -0.22, -0.25, -0.2, -0.08, 0);

  const rightShape = new THREE.Shape();
  rightShape.moveTo(0.08, 0);
  rightShape.bezierCurveTo(0.25, 0.2, 0.55, 0.24, 0.68, 0.02);
  rightShape.bezierCurveTo(0.55, -0.22, 0.25, -0.2, 0.08, 0);

  const left = new THREE.Mesh(new THREE.ExtrudeGeometry(leftShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01 }), blue);
  const right = new THREE.Mesh(new THREE.ExtrudeGeometry(rightShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01 }), red);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.08), gold);
  [left, right, knot].forEach((mesh) => {
    mesh.position.z = 0.28;
    mesh.frustumCulled = false;
  });
  group.add(left, right, knot);
  return group;
}

function createHalo(THREE) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.024, 12, 72),
    new THREE.MeshBasicMaterial({ color: 0xffd166 })
  );
  ring.rotation.x = Math.PI / 2.8;
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.012, 8, 56),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.62 })
  );
  innerRing.rotation.copy(ring.rotation);
  const glow = new THREE.PointLight(0xffd166, 0.7, 2);
  glow.position.set(0, 0.12, 0.24);
  group.add(ring, innerRing, glow);
  return group;
}

function createSparkleCluster(THREE, x, y, z) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xfff4b8, transparent: true, opacity: 0.95 });
  [
    { x: 0, y: 0, s: 0.055 },
    { x: 0.12, y: 0.12, s: 0.038 },
    { x: -0.1, y: 0.11, s: 0.032 }
  ].forEach((spark) => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(spark.s, 0), material);
    mesh.position.set(spark.x, spark.y, 0);
    mesh.frustumCulled = false;
    group.add(mesh);
  });
  group.position.set(x, y, z);
  return group;
}

function createRadialGlowTexture(THREE, stops) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function getTexture(THREE, url) {
  if (!textureCache.has(url)) {
    const texture = new THREE.TextureLoader().load(url);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    textureCache.set(url, texture);
  }
  return textureCache.get(url);
}

function removeNamedChildren(group, names) {
  [...group.children].forEach((child) => {
    if (names.includes(child.name)) {
      group.remove(child);
    }
  });
}
