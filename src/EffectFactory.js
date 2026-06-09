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
    id: "agniPainFace",
    label: "Agni-style pain face",
    color: "#f8fafc",
    category: "privacy",
    privacyMode: "replace",
    privateAsset: true
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
const PRIVATE_ASSET_ROOT = "./assets/private";
const KENNEY_AVATAR_ROOT = "./assets/avatars/kenney-protagonists";
const KENNEY_HEAD_ONLY_MODEL = `${KENNEY_AVATAR_ROOT}/kenney-protagonist-head-only.glb`;
const KENNEY_HEAD_BUST_SKINS = {
  male: `${KENNEY_AVATAR_ROOT}/skaterMaleA.png`,
  female: `${KENNEY_AVATAR_ROOT}/skaterFemaleA.png`
};
const FACE_OVAL_LANDMARK_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];
const LOCAL_FACE_ASSETS = {
  agniPainFace: {
    name: "Local Agni-style pain face",
    url: `${PRIVATE_ASSET_ROOT}/agni-pain-face-douyin-mask.png`,
    warpUrl: `${PRIVATE_ASSET_ROOT}/agni-pain-face-warp-source.png`,
    offset: { x: 0, y: 0, z: 0.56, scale: 1.0 },
    size: { width: 1.0, height: 1.28 },
    trim: { x: 0, y: 0 },
    shadow: { width: 1.1, height: 1.46, y: -0.025, opacity: 0.1 },
    rim: { width: 1.08, height: 1.42, y: -0.025, opacity: 0.03 },
    halftone: { width: 0.94, height: 1.22, y: -0.03, opacity: 0.05 },
    meshMask: true,
    warpMask: true,
    showContour: true,
    uvPadding: { x: 0.05, y: 0.06 },
    sourceUv: {
      centerX: 0.5,
      centerY: 0.52,
      foreheadNarrow: 0.16,
      chinNarrow: 0.34
    },
    rimColor: 0xf8fafc
  }
};
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
    case "agniPainFace":
      return createLocalFaceAssetEffect(THREE, "agniPainFace");
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
  const group = createEffectGroup(THREE, `effect-full-cover-digital-head-${avatarType}`);
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFullCoverDigitalHead(group, anchors, faceObject, {
      x: 0,
      y: 0.07,
      z: 0.68,
      widthPadding: isFemale ? 1.78 : 1.7,
      heightPadding: 1.58,
      modelWidth: 0.74,
      modelHeight: 1.12,
      minScale: 0.92,
      maxScale: 2.42
    });
  };

  const head = createKenneyPrivacyAvatar(THREE, avatarType);
  head.name = `full-cover-digital-head-${avatarType}`;
  group.add(head);
  group.userData.privacyMode = "replace";
  group.userData.avatarType = avatarType;
  group.userData.avatarSource = isFemale
    ? "Kenney CC0 female head-only with procedural fallback"
    : "Kenney CC0 male head-only with procedural fallback";
  group.userData.avatarRenderer = "kenney-glb-head-only";
  group.userData.avatarCoverage = "face-anchor-full-cover-head";
  return group;
}

function createLocalFaceAssetEffect(THREE, assetId) {
  const asset = LOCAL_FACE_ASSETS[assetId];
  const group = createEffectGroup(THREE, `effect-local-face-asset-${assetId}`);
  const faceAsset = createTexturedLocalFaceAsset(THREE, asset, assetId);
  group.userData.update = ({ anchors, landmarks, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, asset?.offset ?? {
      x: 0,
      y: -0.05,
      z: 0.5,
      scale: 1.82
    });
    faceAsset.userData.updateMeshMask?.({ anchors, landmarks, faceObject });
    group.userData.maskMode = faceAsset.userData.maskMode ?? "source-face-mask-plane";
  };

  group.add(faceAsset);
  group.userData.privacyMode = "replace";
  group.userData.avatarSource = asset?.name ?? assetId;
  group.userData.avatarRenderer = "local-private-face-asset";
  group.userData.avatarCoverage = "face-mask-private-asset";
  group.userData.privateAsset = true;
  return group;
}

function createKenneyPrivacyAvatar(THREE, avatarType) {
  const group = createEffectGroup(THREE, `effect-kenney-head-only-${avatarType}`);
  const fallback = createProceduralPrivacyAvatar(THREE, avatarType);
  fallback.name = `fallback-procedural-head-${avatarType}`;
  group.add(fallback);

  if (!THREE.GLTFLoader) {
    group.userData.avatarLoadState = "fallback-no-gltf-loader";
    return group;
  }

  const texture = getTexture(THREE, KENNEY_HEAD_BUST_SKINS[avatarType] ?? KENNEY_HEAD_BUST_SKINS.male);
  texture.flipY = false;
  if (THREE.sRGBEncoding) {
    texture.encoding = THREE.sRGBEncoding;
  }

  new THREE.GLTFLoader().load(
    KENNEY_HEAD_ONLY_MODEL,
    (gltf) => {
      const model = gltf.scene;
      model.name = `kenney-head-only-${avatarType}`;
      model.rotation.x = -Math.PI / 2;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = 1.14;
      const scale = targetHeight / Math.max(0.001, size.y);

      model.scale.setScalar(scale);
      model.position.set(
        -center.x * scale,
        -center.y * scale - 0.02,
        -center.z * scale + 0.58
      );

      model.traverse((child) => {
        if (!child.isMesh) {
          return;
        }
        child.material = new THREE.MeshLambertMaterial({
          map: texture,
          side: THREE.DoubleSide
        });
        child.renderOrder = 58;
        child.frustumCulled = false;
      });

      fallback.visible = false;
      group.add(model);
      group.userData.avatarLoadState = "kenney-glb-loaded";
    },
    undefined,
    (error) => {
      group.userData.avatarLoadState = "fallback-gltf-load-error";
      console.warn("Failed to load Kenney privacy avatar:", error);
    }
  );

  return group;
}

function createProceduralPrivacyAvatar(THREE, avatarType) {
  const isFemale = avatarType === "female";
  const group = createEffectGroup(THREE, `effect-digital-substitute-${avatarType}`);
  group.userData.update = ({ anchors, faceObject }) => {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: 0,
      y: -0.075,
      z: 0.42,
      scale: 1.68
    });
  };

  const palette = isFemale
    ? {
        skin: 0xf2a386,
        skinShadow: 0xc97161,
        hair: 0x5b2a78,
        hairAccent: 0xb85bd8,
        shirt: 0x4f46e5,
        collar: 0xfdf2f8,
        accent: 0xf72585,
        rim: 0xfbcfe8,
        cheek: 0xff7aa8,
        mouth: 0xbe185d,
        accessory: 0xf4e2cf,
        glasses: 0x7c3aed
      }
    : {
        skin: 0xe5a06e,
        skinShadow: 0xa96347,
        hair: 0x182138,
        hairAccent: 0x2e7fa3,
        shirt: 0x0f766e,
        collar: 0xe0f2fe,
        accent: 0x38bdf8,
        rim: 0xbae6fd,
        cheek: 0xfb923c,
        mouth: 0x1d4ed8,
        accessory: 0x22c55e,
        glasses: 0x22c55e
      };

  addAvatarHeadBackCover(THREE, group, palette, isFemale);
  addAvatarBust(THREE, group, palette, isFemale);
  addAvatarHair(THREE, group, palette, isFemale);
  addAvatarHeadAccessory(THREE, group, palette, isFemale);
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.43, 40, 20),
    createAvatarMaterial(THREE, { color: palette.skin, shininess: 18, specular: 0x3a241d })
  );
  face.name = "avatar-face";
  face.scale.set(1.1, 1.26, 0.62);
  face.position.set(0, -0.045, 0.43);
  face.renderOrder = 40;

  const chinVolume = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 30, 14),
    createAvatarMaterial(THREE, { color: palette.skinShadow, opacity: 0.32, shininess: 20 })
  );
  chinVolume.name = "avatar-chin-volume";
  chinVolume.scale.set(1.48, 0.54, 0.22);
  chinVolume.position.set(0, -0.36, 0.6);
  chinVolume.renderOrder = 41;

  group.add(face, chinVolume);
  addAvatarPolishedSkinLayer(THREE, group, palette, isFemale);
  addAvatarHeadVolumes(THREE, group, palette);
  addAvatarFaceDetails(THREE, group, palette, isFemale);
  addAvatarFaceHighlights(THREE, group, palette, isFemale);
  addAvatarAccessories(THREE, group, palette, isFemale);

  const badge = createAvatarPrivacyBadge(THREE, isFemale);
  badge.position.set(0, -0.78, 0.68);
  badge.scale.setScalar(0.5);
  badge.renderOrder = 56;

  group.add(badge);
  group.userData.privacyMode = "replace";
  group.userData.avatarType = avatarType;
  return group;
}

function addAvatarHeadBackCover(THREE, group, palette, isFemale) {
  const backHair = new THREE.Mesh(
    new THREE.SphereGeometry(isFemale ? 0.54 : 0.52, 40, 18),
    createAvatarMaterial(THREE, {
      color: palette.hair,
      shininess: 54,
      specular: 0x6688aa
    })
  );
  backHair.name = "avatar-big-head-back-cover";
  backHair.scale.set(isFemale ? 1.22 : 1.2, isFemale ? 1.44 : 1.32, 0.52);
  backHair.position.set(0, isFemale ? -0.035 : 0.035, 0.18);
  backHair.renderOrder = 25;

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(isFemale ? 0.5 : 0.48, 30, 14),
    createAvatarMaterial(THREE, {
      color: palette.rim,
      opacity: 0.22,
      phong: false
    })
  );
  rim.name = "avatar-big-head-soft-rim";
  rim.scale.set(isFemale ? 1.24 : 1.2, isFemale ? 1.42 : 1.26, 0.12);
  rim.position.set(0.04, isFemale ? 0.02 : 0.08, 0.06);
  rim.renderOrder = 24;
  group.add(rim, backHair);
}

function addAvatarBust(THREE, group, palette, isFemale) {
  const torso = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 40, 18),
    createAvatarMaterial(THREE, { color: palette.shirt, shininess: 36, specular: 0x88ffff })
  );
  torso.name = "avatar-3d-torso";
  torso.scale.set(isFemale ? 0.72 : 0.78, 0.34, 0.26);
  torso.position.set(0, -0.66, 0.28);
  torso.renderOrder = 30;

  const chestShade = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 28, 12),
    createAvatarMaterial(THREE, { color: palette.accent, opacity: 0.32, phong: false })
  );
  chestShade.name = "avatar-torso-accent";
  chestShade.scale.set(0.62, 0.2, 0.1);
  chestShade.position.set(0, -0.61, 0.58);
  chestShade.renderOrder = 38;

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.13, 0.26, 28),
    createAvatarMaterial(THREE, { color: palette.skinShadow, shininess: 34 })
  );
  neck.name = "avatar-3d-neck";
  neck.position.set(0, -0.43, 0.38);
  neck.renderOrder = 32;

  const collarMaterial = createAvatarMaterial(THREE, { color: palette.collar, shininess: 28 });
  [-1, 1].forEach((side) => {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.08), collarMaterial);
    collar.name = `avatar-collar-3d-${side}`;
    collar.position.set(side * 0.12, -0.55, 0.61);
    collar.rotation.z = side * 0.4;
    collar.renderOrder = 42;
    group.add(collar);
  });

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 28, 12),
      createAvatarMaterial(THREE, { color: palette.shirt, shininess: 30 })
    );
    shoulder.name = `avatar-rounded-shoulder-${side}`;
    shoulder.scale.set(0.5, 0.28, 0.22);
    shoulder.position.set(side * 0.18, -0.65, 0.31);
    shoulder.renderOrder = 31;
    group.add(shoulder);
  });

  group.add(torso, chestShade, neck);
}

function addAvatarHeadVolumes(THREE, group, palette) {
  const sideMaterial = createAvatarMaterial(THREE, { color: palette.skinShadow, opacity: 0.22, shininess: 18 });
  [-1, 1].forEach((side) => {
    const cheekVolume = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 12), sideMaterial);
    cheekVolume.name = `avatar-cheek-volume-${side}`;
    cheekVolume.scale.set(0.55, 1.22, 0.25);
    cheekVolume.position.set(side * 0.31, -0.11, 0.28);
    cheekVolume.renderOrder = 34;

    const jawVolume = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 10), sideMaterial);
    jawVolume.name = `avatar-jaw-volume-${side}`;
    jawVolume.scale.set(0.72, 0.8, 0.2);
    jawVolume.position.set(side * 0.23, -0.3, 0.3);
    jawVolume.renderOrder = 34;

    group.add(cheekVolume, jawVolume);
  });
}

function addAvatarPolishedSkinLayer(THREE, group, palette, isFemale) {
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(isFemale ? 0.82 : 0.8, isFemale ? 0.98 : 0.94),
    new THREE.MeshBasicMaterial({
      map: createAvatarSkinSurfaceTexture(THREE, palette, isFemale),
      transparent: true,
      opacity: 0.48,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  surface.name = "avatar-polished-skin-layer";
  surface.position.set(0, -0.065, 0.795);
  surface.renderOrder = 47;
  surface.frustumCulled = false;
  group.add(surface);
}

function addAvatarHair(THREE, group, palette, isFemale) {
  const hairMaterial = createAvatarMaterial(THREE, {
    color: palette.hair,
    shininess: 44,
    specular: 0x222222
  });
  const accentMaterial = createAvatarMaterial(THREE, {
    color: palette.hairAccent,
    shininess: 36,
    specular: 0x335577
  });

  if (isFemale) {
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.43, 42, 20), hairMaterial);
    backHair.name = "avatar-long-hair-back";
    backHair.scale.set(1.16, 1.42, 0.34);
    backHair.position.set(0, -0.08, 0.24);
    backHair.renderOrder = 28;

    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.4, 40, 18), hairMaterial);
    crown.name = "avatar-hair-crown";
    crown.scale.set(1.18, 0.66, 0.36);
    crown.position.set(0, 0.27, 0.43);
    crown.renderOrder = 44;

    [-1, 1].forEach((side) => {
      const sideLock = createAvatarCapsule(THREE, 0.075, 0.46, hairMaterial);
      sideLock.name = `avatar-hair-side-${side}`;
      sideLock.scale.set(1.18, 1.0, 0.72);
      sideLock.position.set(side * 0.34, -0.08, 0.5);
      sideLock.rotation.z = side * 0.08;
      sideLock.renderOrder = 45;
      group.add(sideLock);
    });

    [
      { x: -0.19, y: 0.22, z: 0.66, sx: 1.5, rz: 0.25, accent: false },
      { x: 0.02, y: 0.25, z: 0.69, sx: 1.65, rz: -0.08, accent: true },
      { x: 0.2, y: 0.2, z: 0.66, sx: 1.35, rz: -0.3, accent: false }
    ].forEach((part, index) => {
      const bang = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 14), part.accent ? accentMaterial : hairMaterial);
      bang.name = `avatar-soft-bang-${index}`;
      bang.scale.set(part.sx, 0.84, 0.42);
      bang.position.set(part.x, part.y, part.z);
      bang.rotation.z = part.rz;
      bang.renderOrder = 50;
      group.add(bang);
    });

    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 18, 10),
      createAvatarMaterial(THREE, { color: palette.rim, opacity: 0.42, phong: false })
    );
    shine.name = "avatar-hair-soft-highlight";
    shine.scale.set(1.6, 0.56, 0.14);
    shine.position.set(0.16, 0.28, 0.74);
    shine.rotation.z = -0.18;
    shine.renderOrder = 51;
    group.add(shine);

    group.add(backHair, crown);
    return;
  }

  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.43, 40, 18), hairMaterial);
  crown.name = "avatar-short-hair-crown";
  crown.scale.set(1.22, 0.86, 0.4);
  crown.position.set(0, 0.27, 0.43);
  crown.renderOrder = 44;

  const quiff = new THREE.Mesh(new THREE.SphereGeometry(0.15, 30, 14), accentMaterial);
  quiff.name = "avatar-hair-quiff";
  quiff.scale.set(1.62, 0.9, 0.42);
  quiff.position.set(0.08, 0.39, 0.68);
  quiff.rotation.z = -0.35;
  quiff.renderOrder = 50;

  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 18, 10),
    createAvatarMaterial(THREE, { color: palette.rim, opacity: 0.36, phong: false })
  );
  shine.name = "avatar-short-hair-highlight";
  shine.scale.set(1.5, 0.52, 0.12);
  shine.position.set(0.17, 0.37, 0.75);
  shine.rotation.z = -0.25;
  shine.renderOrder = 51;

  [-1, 1].forEach((side) => {
    const sideHair = new THREE.Mesh(new THREE.SphereGeometry(0.14, 26, 12), hairMaterial);
    sideHair.name = `avatar-short-side-hair-${side}`;
    sideHair.scale.set(0.78, 1.36, 0.34);
    sideHair.position.set(side * 0.37, 0.08, 0.5);
    sideHair.renderOrder = 45;
    group.add(sideHair);
  });

  group.add(crown, quiff, shine);
}

function addAvatarHeadAccessory(THREE, group, palette, isFemale) {
  if (isFemale) {
    const bandMaterial = createAvatarMaterial(THREE, {
      color: palette.accessory,
      shininess: 58,
      specular: 0xffffff
    });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.018, 10, 60, Math.PI * 0.92), bandMaterial);
    band.name = "avatar-polished-hair-band";
    band.position.set(0, 0.285, 0.73);
    band.rotation.z = Math.PI * 1.04;
    band.scale.set(1.45, 0.78, 0.16);
    band.renderOrder = 54;

    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 8), bandMaterial);
    bowCenter.name = "avatar-bow-center";
    bowCenter.position.set(-0.29, 0.3, 0.75);
    bowCenter.renderOrder = 55;

    [-1, 1].forEach((side) => {
      const bow = new THREE.Mesh(new THREE.SphereGeometry(0.062, 18, 10), bandMaterial);
      bow.name = `avatar-bow-loop-${side}`;
      bow.scale.set(1.34, 0.72, 0.16);
      bow.position.set(-0.29 + side * 0.06, 0.3, 0.74);
      bow.rotation.z = side * 0.42;
      bow.renderOrder = 54;
      group.add(bow);
    });

    group.add(band, bowCenter);
    return;
  }

  const spikeMaterial = createAvatarMaterial(THREE, { color: palette.hairAccent, shininess: 42, specular: 0x445566 });
  [
    { x: -0.15, rz: 0.45, s: 0.9 },
    { x: 0.02, rz: 0.08, s: 1.08 },
    { x: 0.18, rz: -0.38, s: 0.84 }
  ].forEach((part, index) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 24), spikeMaterial);
    spike.name = `avatar-hair-spike-${index}`;
    spike.scale.set(part.s, 1, 0.8);
    spike.position.set(part.x, 0.48, 0.58);
    spike.rotation.z = part.rz;
    spike.rotation.x = -0.45;
    spike.renderOrder = 52;
    group.add(spike);
  });
}

function addAvatarFaceDetails(THREE, group, palette, isFemale) {
  const white = createAvatarMaterial(THREE, { color: 0xfafafa, shininess: 18 });
  const pupil = createAvatarMaterial(THREE, { color: 0x111827, shininess: 22 });
  const brow = createAvatarMaterial(THREE, { color: palette.hair, shininess: 20 });
  const cheek = createAvatarMaterial(THREE, { color: palette.cheek, opacity: isFemale ? 0.44 : 0.28, phong: false });

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.074, 22, 12),
      createAvatarMaterial(THREE, { color: palette.skinShadow, shininess: 18 })
    );
    ear.name = `avatar-ear-${side}`;
    ear.scale.set(0.72, 1.15, 0.34);
    ear.position.set(side * 0.39, -0.015, 0.41);
    ear.renderOrder = 39;

    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.074, 26, 12), white);
    eyeWhite.name = `avatar-eye-white-${side}`;
    eyeWhite.scale.set(1.5, 0.82, 0.22);
    eyeWhite.position.set(side * 0.16, 0.07, 0.83);
    eyeWhite.renderOrder = 50;

    const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 10), pupil);
    eyePupil.name = `avatar-eye-pupil-${side}`;
    eyePupil.scale.set(0.92, 1.06, 0.12);
    eyePupil.position.set(side * 0.172, 0.058, 0.885);
    eyePupil.renderOrder = 51;

    const highlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.013, 12, 6),
      createAvatarMaterial(THREE, { color: 0xffffff, opacity: 0.9, phong: false })
    );
    highlight.name = `avatar-eye-highlight-${side}`;
    highlight.position.set(side * 0.16, 0.078, 0.915);
    highlight.renderOrder = 52;

    const eyebrow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 12), brow);
    eyebrow.name = `avatar-eyebrow-${side}`;
    eyebrow.position.set(side * 0.16, 0.17, 0.84);
    eyebrow.rotation.z = Math.PI / 2 + side * (isFemale ? 0.12 : 0.08);
    eyebrow.rotation.x = Math.PI / 2;
    eyebrow.renderOrder = 52;

    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 10), cheek);
    blush.name = `avatar-cheek-${side}`;
    blush.scale.set(1.62, 0.62, 0.08);
    blush.position.set(side * 0.25, -0.09, 0.84);
    blush.renderOrder = 49;

    if (isFemale) {
      const liner = new THREE.Mesh(
        new THREE.TorusGeometry(0.06, 0.004, 6, 18, Math.PI * 0.72),
        createAvatarMaterial(THREE, { color: 0x1f2937, shininess: 12 })
      );
      liner.name = `avatar-eye-liner-${side}`;
      liner.position.set(side * 0.14, 0.054, 0.735);
      liner.rotation.z = side > 0 ? -0.08 : Math.PI + 0.08;
      liner.scale.set(1.3, 0.46, 0.1);
      liner.renderOrder = 53;
      group.add(liner);
    }

    group.add(ear, eyeWhite, eyePupil, highlight, eyebrow, blush);
  });

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.054, 0.126, 24),
    createAvatarMaterial(THREE, { color: palette.skinShadow, shininess: 24 })
  );
  nose.name = "avatar-nose";
  nose.scale.set(0.72, 1.0, 0.72);
  nose.position.set(0, -0.04, 0.88);
  nose.rotation.x = Math.PI / 2;
  nose.renderOrder = 51;

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.108, 0.012, 10, 34, Math.PI),
    createAvatarMaterial(THREE, { color: palette.mouth, shininess: 22 })
  );
  smile.name = "avatar-smile";
  smile.position.set(0, -0.185, 0.885);
  smile.rotation.z = Math.PI;
  smile.scale.set(isFemale ? 1.24 : 1.08, isFemale ? 0.66 : 0.56, 0.16);
  smile.renderOrder = 52;

  const lowerLip = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 18, 8),
    createAvatarMaterial(THREE, { color: palette.mouth, opacity: isFemale ? 0.42 : 0.26, phong: false })
  );
  lowerLip.name = "avatar-lower-lip";
  lowerLip.scale.set(2.0, 0.32, 0.12);
  lowerLip.position.set(0, -0.21, 0.86);
  lowerLip.renderOrder = 51;

  group.add(nose, smile, lowerLip);
}

function addAvatarFaceHighlights(THREE, group, palette, isFemale) {
  const shineMaterial = createAvatarMaterial(THREE, {
    color: 0xffffff,
    opacity: isFemale ? 0.34 : 0.28,
    phong: false
  });
  const cheekLightMaterial = createAvatarMaterial(THREE, {
    color: palette.rim,
    opacity: isFemale ? 0.2 : 0.16,
    phong: false
  });

  const foreheadShine = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 8), shineMaterial);
  foreheadShine.name = "avatar-forehead-soft-shine";
  foreheadShine.scale.set(2.2, 0.5, 0.08);
  foreheadShine.position.set(0.12, 0.2, 0.92);
  foreheadShine.rotation.z = -0.18;
  foreheadShine.renderOrder = 57;

  const noseBridgeLight = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 8), shineMaterial);
  noseBridgeLight.name = "avatar-nose-bridge-soft-shine";
  noseBridgeLight.scale.set(0.55, 1.8, 0.08);
  noseBridgeLight.position.set(0.018, -0.025, 0.93);
  noseBridgeLight.renderOrder = 57;

  [-1, 1].forEach((side) => {
    const cheekLight = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 8), cheekLightMaterial);
    cheekLight.name = `avatar-cheek-soft-light-${side}`;
    cheekLight.scale.set(1.55, 0.48, 0.06);
    cheekLight.position.set(side * 0.24, -0.055, 0.925);
    cheekLight.renderOrder = 56;
    group.add(cheekLight);
  });

  group.add(foreheadShine, noseBridgeLight);
}

function addAvatarAccessories(THREE, group, palette, isFemale) {
  if (isFemale) {
    addAvatarBeautyMarkAndFreckles(THREE, group, palette, {
      beautyMark: { x: 0.22, y: -0.18 },
      freckleColor: 0x8a4b37,
      opacity: 0.28
    });
    const earringMaterial = createAvatarMaterial(THREE, { color: 0xfbbf24, shininess: 68, specular: 0xffffff });
    [-1, 1].forEach((side) => {
      const earring = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 8), earringMaterial);
      earring.name = `avatar-earring-${side}`;
      earring.position.set(side * 0.41, -0.12, 0.5);
      earring.renderOrder = 54;
      group.add(earring);
    });
    return;
  }

  addAvatarGlasses(THREE, group, palette);
  addAvatarBeautyMarkAndFreckles(THREE, group, palette, {
    freckleColor: 0x7c3f25,
    opacity: 0.34
  });
}

function addAvatarGlasses(THREE, group, palette) {
  const frameMaterial = createAvatarMaterial(THREE, { color: palette.glasses, shininess: 34, specular: 0xffffff });
  [-1, 1].forEach((side) => {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.009, 8, 32), frameMaterial);
    frame.name = `avatar-glasses-frame-${side}`;
    frame.scale.set(1.28, 0.9, 0.1);
    frame.position.set(side * 0.145, 0.045, 0.82);
    frame.renderOrder = 56;
    group.add(frame);
  });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.018), frameMaterial);
  bridge.name = "avatar-glasses-bridge";
  bridge.position.set(0, 0.045, 0.82);
  bridge.renderOrder = 56;
  group.add(bridge);
}

function addAvatarBeautyMarkAndFreckles(THREE, group, palette, options = {}) {
  const freckleMaterial = createAvatarMaterial(THREE, {
    color: options.freckleColor ?? palette.skinShadow,
    opacity: options.opacity ?? 0.3,
    phong: false
  });
  [
    [-0.19, -0.03, 0.81],
    [-0.14, -0.07, 0.82],
    [0.15, -0.04, 0.82],
    [0.2, -0.08, 0.81]
  ].forEach(([x, y, z], index) => {
    const freckle = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 6), freckleMaterial);
    freckle.name = `avatar-freckle-${index}`;
    freckle.scale.set(1, 1, 0.18);
    freckle.position.set(x, y, z);
    freckle.renderOrder = 54;
    group.add(freckle);
  });

  if (options.beautyMark) {
    const mark = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 12, 6),
      createAvatarMaterial(THREE, { color: 0x3f241d, opacity: 0.68, phong: false })
    );
    mark.name = "avatar-beauty-mark";
    mark.scale.set(1, 1, 0.14);
    mark.position.set(options.beautyMark.x, options.beautyMark.y, 0.82);
    mark.renderOrder = 55;
    group.add(mark);
  }
}

function createAvatarCapsule(THREE, radius, height, material) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
  shaft.name = "avatar-capsule-shaft";
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), material);
  capTop.name = "avatar-capsule-top";
  capTop.position.y = height / 2;
  const capBottom = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 12), material);
  capBottom.name = "avatar-capsule-bottom";
  capBottom.position.y = -height / 2;
  group.add(shaft, capTop, capBottom);
  return group;
}

function createAvatarMaterial(THREE, options) {
  const {
    color,
    opacity = 1,
    phong = true,
    shininess = 30,
    specular = 0xffffff,
    side = THREE.FrontSide
  } = options;
  const materialOptions = {
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    depthTest: true,
    side
  };
  if (!phong) {
    return new THREE.MeshBasicMaterial(materialOptions);
  }
  return new THREE.MeshPhongMaterial({
    ...materialOptions,
    shininess,
    specular
  });
}

function createTexturedDigitalSubstitute(THREE, asset, avatarType) {
  const isFemale = avatarType === "female";
  const group = new THREE.Group();
  group.name = `textured-avatar-${avatarType}`;
  group.userData.sourceName = asset.name;
  group.userData.sourceUrl = asset.url;
  group.frustumCulled = false;

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 2.42),
    new THREE.MeshBasicMaterial({
      map: createAvatarShadowTexture(THREE, isFemale),
      transparent: true,
      opacity: 0.72,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  shadow.name = `avatar-soft-shadow-${avatarType}`;
  shadow.position.set(0, -0.54, 0.25);
  shadow.renderOrder = 43;
  shadow.frustumCulled = false;

  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02, 2.28),
    new THREE.MeshBasicMaterial({
      map: createAvatarRimTexture(THREE, asset.accent),
      transparent: true,
      opacity: 0.76,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  rim.name = `avatar-holographic-rim-${avatarType}`;
  rim.position.set(0, -0.52, 0.31);
  rim.renderOrder = 44;
  rim.frustumCulled = false;

  const avatarTexture = getTexture(THREE, asset.url);
  avatarTexture.anisotropy = Math.max(avatarTexture.anisotropy ?? 1, 4);
  const avatar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 1.92),
    new THREE.MeshBasicMaterial({
      map: avatarTexture,
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  avatar.name = `avatar-texture-${asset.name.replace(/\s+/g, "-")}`;
  avatar.position.set(asset.trim?.x ?? 0, asset.trim?.y ?? 0, 0.39);
  avatar.renderOrder = 48;
  avatar.frustumCulled = false;

  const gloss = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 1.92),
    new THREE.MeshBasicMaterial({
      map: createAvatarGlossTexture(THREE, isFemale),
      transparent: true,
      opacity: 0.6,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  gloss.name = `avatar-material-gloss-${avatarType}`;
  gloss.position.set(0, -0.505, 0.43);
  gloss.renderOrder = 50;
  gloss.frustumCulled = false;

  const badge = createAvatarPrivacyBadge(THREE, isFemale);
  badge.name = `avatar-privacy-badge-${avatarType}`;
  badge.position.set(0, -0.84, 0.5);
  badge.scale.setScalar(0.46);
  badge.renderOrder = 52;

  const anchorGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createRadialGlowTexture(THREE, [
      [0, isFemale ? "rgba(240,171,252,0.62)" : "rgba(103,232,249,0.58)"],
      [0.44, isFemale ? "rgba(236,72,153,0.24)" : "rgba(20,184,166,0.22)"],
      [1, "rgba(0,0,0,0)"]
    ]),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  anchorGlow.name = `avatar-ambient-glow-${avatarType}`;
  anchorGlow.position.set(0, -0.58, 0.22);
  anchorGlow.scale.set(1.28, 2.55, 1);
  anchorGlow.renderOrder = 42;

  group.add(anchorGlow, shadow, rim, avatar, gloss, badge);
  return group;
}

function createTexturedLocalFaceAsset(THREE, asset, assetId) {
  const group = new THREE.Group();
  group.name = `local-private-face-asset-${assetId}`;
  group.frustumCulled = false;
  group.userData.sourceName = asset.name;
  group.userData.sourceUrl = asset.url;

  const shadowConfig = asset.shadow ?? {};
  const rimConfig = asset.rim ?? {};
  const halftoneConfig = asset.halftone ?? {};

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(shadowConfig.width ?? 1.08, shadowConfig.height ?? 1.26),
    new THREE.MeshBasicMaterial({
      map: createLocalFaceAssetShadowTexture(THREE),
      transparent: true,
      opacity: shadowConfig.opacity ?? 0.66,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  shadow.name = `local-face-asset-shadow-${assetId}`;
  shadow.position.set(0, shadowConfig.y ?? -0.04, 0.28);
  shadow.renderOrder = 43;
  shadow.frustumCulled = false;

  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(rimConfig.width ?? 1.02, rimConfig.height ?? 1.2),
    new THREE.MeshBasicMaterial({
      map: createLocalFaceAssetRimTexture(THREE, asset.rimColor ?? 0xf8fafc),
      transparent: true,
      opacity: rimConfig.opacity ?? 0.88,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  rim.name = `local-face-asset-rim-${assetId}`;
  rim.position.set(0, rimConfig.y ?? -0.035, 0.32);
  rim.renderOrder = 44;
  rim.frustumCulled = false;

  const placeholder = new THREE.Mesh(
    new THREE.PlaneGeometry(asset.size?.width ?? 0.92, asset.size?.height ?? 1.12),
    new THREE.MeshBasicMaterial({
      map: createMissingPrivateAssetTexture(THREE, assetId),
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  placeholder.name = `local-face-asset-placeholder-${assetId}`;
  placeholder.position.set(asset.trim?.x ?? 0, asset.trim?.y ?? 0, 0.38);
  placeholder.renderOrder = 46;
  placeholder.frustumCulled = false;

  const assetTexture = getTexture(THREE, asset.url);
  assetTexture.anisotropy = Math.max(assetTexture.anisotropy ?? 1, 4);
  const meshTexture = asset.warpUrl ? getTexture(THREE, asset.warpUrl) : (asset.meshUrl ? getTexture(THREE, asset.meshUrl) : assetTexture);
  meshTexture.anisotropy = Math.max(meshTexture.anisotropy ?? 1, 4);
  const meshMask = asset.meshMask
    ? createFaceOvalTextureMesh(THREE, meshTexture, asset, assetId)
    : null;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(asset.size?.width ?? 0.92, asset.size?.height ?? 1.12),
    new THREE.MeshBasicMaterial({
      map: assetTexture,
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  face.name = `local-face-asset-texture-${assetId}`;
  face.position.set(asset.trim?.x ?? 0, asset.trim?.y ?? 0, 0.42);
  face.renderOrder = 48;
  face.frustumCulled = false;
  if (meshMask) {
    face.name = `local-face-asset-plane-fallback-${assetId}`;
  }

  const halftone = new THREE.Mesh(
    new THREE.PlaneGeometry(halftoneConfig.width ?? 0.9, halftoneConfig.height ?? 1.08),
    new THREE.MeshBasicMaterial({
      map: createMangaHalftoneTexture(THREE),
      transparent: true,
      opacity: halftoneConfig.opacity ?? 0.42,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  halftone.name = `local-face-asset-halftone-${assetId}`;
  halftone.position.set(0, halftoneConfig.y ?? -0.08, 0.46);
  halftone.renderOrder = 49;
  halftone.frustumCulled = false;

  if (meshMask) {
    meshMask.visible = false;
    group.add(shadow, rim, placeholder, face, meshMask, halftone);
    group.userData.updateMeshMask = ({ landmarks, faceObject }) => {
      const isUpdated = updateFaceOvalTextureMesh(THREE, meshMask, landmarks, faceObject, asset);
      face.visible = !isUpdated;
      placeholder.visible = !isUpdated;
      shadow.visible = !isUpdated;
      rim.visible = !isUpdated;
      halftone.visible = !isUpdated;
      meshMask.visible = isUpdated;
      group.userData.maskMode = isUpdated
        ? (asset.warpMask ? "face-contour-warp-mask" : "landmark-face-oval-mesh")
        : "plane-fallback";
    };
  } else {
    group.add(shadow, rim, placeholder, face, halftone);
  }
  return group;
}

function createFaceOvalTextureMesh(THREE, texture, asset, assetId) {
  const pointCount = FACE_OVAL_LANDMARK_INDICES.length;
  const ringScales = asset.warpMask ? [0, 0.42, 0.74, 1] : [0, 1];
  const vertexCount = 1 + (ringScales.length - 1) * pointCount;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = [];
  const ringStart = (ringIndex) => 1 + (ringIndex - 1) * pointCount;
  for (let i = 0; i < pointCount; i += 1) {
    indices.push(0, ringStart(1) + i, ringStart(1) + ((i + 1) % pointCount));
  }
  for (let ringIndex = 2; ringIndex < ringScales.length; ringIndex += 1) {
    const previousStart = ringStart(ringIndex - 1);
    const currentStart = ringStart(ringIndex);
    for (let i = 0; i < pointCount; i += 1) {
      const next = (i + 1) % pointCount;
      indices.push(previousStart + i, currentStart + i, currentStart + next);
      indices.push(previousStart + i, currentStart + next, previousStart + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  mesh.name = `local-face-asset-landmark-mesh-${assetId}`;
  mesh.renderOrder = 48;
  mesh.frustumCulled = false;
  mesh.userData.pointCount = pointCount;
  mesh.userData.faceOvalIndices = FACE_OVAL_LANDMARK_INDICES;
  mesh.userData.uvPadding = asset.uvPadding ?? { x: 0.08, y: 0.07 };
  mesh.userData.sourceUv = asset.sourceUv ?? {};
  mesh.userData.ringScales = ringScales;
  mesh.userData.warpMask = Boolean(asset.warpMask);
  mesh.userData.warpVertexCount = vertexCount;
  mesh.userData.sourceUvMode = asset.warpMask ? "canonical-face-oval-uv" : "target-bounds-uv";
  mesh.userData.contourOverlay = asset.showContour ? createFaceContourOverlay(THREE, pointCount) : null;
  if (mesh.userData.contourOverlay) {
    mesh.add(mesh.userData.contourOverlay);
  }
  return mesh;
}

function createFaceContourOverlay(THREE, pointCount) {
  const group = new THREE.Group();
  group.name = "face-contour-debug-overlay";
  group.frustumCulled = false;

  const stripGeometry = createFaceContourStripGeometry(THREE, pointCount);
  const stripMaterial = new THREE.MeshBasicMaterial({
    color: 0x32f5b4,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const strip = new THREE.Mesh(stripGeometry, stripMaterial);
  strip.name = "face-contour-debug-thick-strip";
  strip.renderOrder = 62;
  strip.frustumCulled = false;

  const positions = new Float32Array((pointCount + 1) * 3);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x45e0a3,
    transparent: true,
    opacity: 0.88,
    depthTest: false,
    depthWrite: false
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.name = "face-contour-debug-line";
  line.renderOrder = 63;
  line.frustumCulled = false;

  const pointPositions = new Float32Array(pointCount * 3);
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xfff08a,
    size: 6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false
  });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  points.name = "face-contour-debug-points";
  points.renderOrder = 64;
  points.frustumCulled = false;

  group.userData.strip = strip;
  group.userData.line = line;
  group.userData.points = points;
  group.userData.thickness = 0.012;
  group.add(strip, line, points);
  return group;
}

function createFaceContourStripGeometry(THREE, pointCount) {
  const positions = new Float32Array(pointCount * 2 * 3);
  const indices = [];
  for (let i = 0; i < pointCount; i += 1) {
    const next = (i + 1) % pointCount;
    const outerA = i * 2;
    const innerA = outerA + 1;
    const outerB = next * 2;
    const innerB = outerB + 1;
    indices.push(outerA, innerA, outerB);
    indices.push(innerA, innerB, outerB);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function updateFaceOvalTextureMesh(THREE, mesh, landmarks, faceObject, asset) {
  const parent = mesh.parent;
  if (!Array.isArray(landmarks) || !faceObject || !parent) {
    return false;
  }
  const ovalPoints = FACE_OVAL_LANDMARK_INDICES.map((index) => landmarks[index]).filter(Boolean);
  if (ovalPoints.length !== FACE_OVAL_LANDMARK_INDICES.length) {
    return false;
  }

  faceObject.updateMatrixWorld?.(true);
  parent.updateMatrixWorld?.(true);
  const localPoints = ovalPoints.map((point) => {
    const vector = new THREE.Vector3(point.x, point.y, point.z ?? 0);
    parent.worldToLocal(vector);
    vector.z = 0.5;
    return vector;
  });
  const center = getVectorCentroid(THREE, localPoints);
  const position = mesh.geometry.attributes.position;
  const uv = mesh.geometry.attributes.uv;
  const padding = mesh.userData.uvPadding ?? { x: 0.08, y: 0.07 };
  const trim = asset.trim ?? { x: 0, y: 0 };
  const ringScales = mesh.userData.ringScales ?? [0, 1];
  const pointCount = mesh.userData.pointCount ?? localPoints.length;
  const sourceUv = mesh.userData.sourceUv ?? {};
  const sourceUvCenter = getCanonicalUvCenter(sourceUv, trim);

  position.setXYZ(0, center.x, center.y, 0.5);
  uv.setXY(0, sourceUvCenter.u, sourceUvCenter.v);
  for (let ringIndex = 1; ringIndex < ringScales.length; ringIndex += 1) {
    const scale = ringScales[ringIndex];
    const ringStart = 1 + (ringIndex - 1) * pointCount;
    localPoints.forEach((point, index) => {
      const x = center.x + (point.x - center.x) * scale;
      const y = center.y + (point.y - center.y) * scale;
      position.setXYZ(ringStart + index, x, y, 0.5);
      const outerUv = getCanonicalFaceOvalUv(index, pointCount, padding, sourceUv, trim);
      uv.setXY(
        ringStart + index,
        mix(sourceUvCenter.u, outerUv.u, scale),
        mix(sourceUvCenter.v, outerUv.v, scale)
      );
    });
  }
  position.needsUpdate = true;
  uv.needsUpdate = true;
  updateFaceContourOverlay(mesh.userData.contourOverlay, localPoints);
  mesh.userData.maskPointCount = localPoints.length;
  mesh.userData.maskMode = mesh.userData.warpMask ? "face-contour-warp-mask" : "landmark-face-oval-mesh";
  mesh.userData.contourVisible = Boolean(mesh.userData.contourOverlay);
  mesh.geometry.computeBoundingSphere();
  return true;
}

function updateFaceContourOverlay(overlay, points) {
  if (!overlay || !Array.isArray(points) || !points.length) {
    return;
  }
  const strip = overlay.userData.strip;
  const line = overlay.userData.line;
  const pointCloud = overlay.userData.points;
  const stripPosition = strip.geometry.attributes.position;
  const thickness = overlay.userData.thickness ?? 0.012;
  points.forEach((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.max(0.0001, Math.hypot(tangentX, tangentY));
    const normalX = -tangentY / length;
    const normalY = tangentX / length;
    const base = index * 2;
    stripPosition.setXYZ(base, point.x + normalX * thickness, point.y + normalY * thickness, 0.585);
    stripPosition.setXYZ(base + 1, point.x - normalX * thickness, point.y - normalY * thickness, 0.585);
  });
  stripPosition.needsUpdate = true;
  strip.geometry.computeBoundingSphere();

  const position = line.geometry.attributes.position;
  points.forEach((point, index) => {
    position.setXYZ(index, point.x, point.y, 0.56);
  });
  const first = points[0];
  position.setXYZ(points.length, first.x, first.y, 0.56);
  position.needsUpdate = true;
  line.geometry.computeBoundingSphere();

  const pointPosition = pointCloud.geometry.attributes.position;
  points.forEach((point, index) => {
    pointPosition.setXYZ(index, point.x, point.y, 0.57);
  });
  pointPosition.needsUpdate = true;
  pointCloud.geometry.computeBoundingSphere();
}

function getCanonicalUvCenter(sourceUv, trim) {
  return {
    u: clamp((sourceUv.centerX ?? 0.5) + (trim.x ?? 0), 0.03, 0.97),
    v: clamp((sourceUv.centerY ?? 0.5) + (trim.y ?? 0), 0.03, 0.97)
  };
}

function getCanonicalFaceOvalUv(index, pointCount, padding, sourceUv, trim) {
  const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const center = getCanonicalUvCenter(sourceUv, trim);
  const rightRadius = 1 - padding.x - center.u;
  const leftRadius = center.u - padding.x;
  const topRadius = 1 - padding.y - center.v;
  const bottomRadius = center.v - padding.y;
  const horizontalRadius = cos >= 0 ? rightRadius : leftRadius;
  const verticalRadius = sin < 0 ? topRadius : bottomRadius;
  const foreheadTaper = Math.pow(Math.max(0, -sin), 2.1) * (sourceUv.foreheadNarrow ?? 0.14);
  const chinTaper = Math.pow(Math.max(0, sin), 1.65) * (sourceUv.chinNarrow ?? 0.3);
  const taperedHorizontalRadius = horizontalRadius * (1 - foreheadTaper - chinTaper);
  return {
    u: clamp(center.u + cos * taperedHorizontalRadius, 0.03, 0.97),
    v: clamp(center.v - sin * verticalRadius, 0.03, 0.97)
  };
}

function getVectorCentroid(THREE, points) {
  const center = new THREE.Vector3();
  points.forEach((point) => center.add(point));
  return center.multiplyScalar(1 / Math.max(1, points.length));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(start, end, amount) {
  return start + (end - start) * amount;
}

function createLocalFaceAssetShadowTexture(THREE) {
  const cacheKey = "local-face-asset-shadow";
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 448;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createRadialGradient(192, 210, 24, 192, 226, 210);
  gradient.addColorStop(0, "rgba(0,0,0,0.3)");
  gradient.addColorStop(0.56, "rgba(0,0,0,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(192, 226, 154, 190, 0, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createLocalFaceAssetRimTexture(THREE, color) {
  const cacheKey = `local-face-asset-rim-${color}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 448;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.lineWidth = 12;
  context.globalAlpha = 0.72;
  context.beginPath();
  context.ellipse(192, 222, 144, 176, 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "#050505";
  context.lineWidth = 5;
  context.globalAlpha = 0.72;
  context.beginPath();
  context.ellipse(192, 222, 154, 188, 0, 0, Math.PI * 2);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createMangaHalftoneTexture(THREE) {
  const cacheKey = "local-face-asset-halftone";
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 448;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 32; y < canvas.height - 32; y += 18) {
    for (let x = 36; x < canvas.width - 36; x += 18) {
      const dx = (x - 192) / 152;
      const dy = (y - 224) / 182;
      if (dx * dx + dy * dy > 1) {
        continue;
      }
      const radius = 1.4 + Math.max(0, dy) * 1.2;
      context.beginPath();
      context.arc(x + (y % 36 === 0 ? 5 : 0), y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createMissingPrivateAssetTexture(THREE, assetId) {
  const cacheKey = `missing-private-asset-${assetId}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(255,255,255,0.92)";
  context.beginPath();
  context.ellipse(256, 310, 210, 260, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#111";
  context.lineWidth = 14;
  context.stroke();
  context.fillStyle = "#111";
  context.font = "bold 34px sans-serif";
  context.textAlign = "center";
  context.fillText("LOCAL", 256, 250);
  context.fillText("ASSET", 256, 292);
  context.font = "24px sans-serif";
  context.fillText("assets/private", 256, 350);
  context.fillText(`${assetId}.png`, 256, 386);
  context.beginPath();
  context.arc(188, 204, 16, 0, Math.PI * 2);
  context.arc(324, 204, 16, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(256, 430, 62, Math.PI * 0.12, Math.PI * 0.88);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createAvatarShadowTexture(THREE, isFemale) {
  const cacheKey = `avatar-shadow-${isFemale ? "female" : "male"}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createRadialGradient(192, 236, 28, 192, 420, 360);
  gradient.addColorStop(0, "rgba(8,12,24,0.34)");
  gradient.addColorStop(0.55, isFemale ? "rgba(42,16,64,0.22)" : "rgba(8,48,64,0.18)");
  gradient.addColorStop(1, "rgba(8,12,24,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(192, 420, 166, 340, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(2,6,23,0.18)";
  context.beginPath();
  context.ellipse(192, 712, 150, 30, 0, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createAvatarRimTexture(THREE, accent) {
  const cacheKey = `avatar-rim-${accent}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 18;
  context.strokeStyle = `#${accent.toString(16).padStart(6, "0")}`;
  context.globalAlpha = 0.33;
  context.beginPath();
  context.ellipse(192, 386, 145, 318, 0, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 0.22;
  context.lineWidth = 7;
  context.beginPath();
  context.ellipse(192, 392, 166, 346, 0, 0, Math.PI * 2);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createAvatarGlossTexture(THREE, isFemale) {
  const cacheKey = `avatar-gloss-${isFemale ? "female" : "male"}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  const shine = context.createLinearGradient(92, 78, 294, 690);
  shine.addColorStop(0, "rgba(255,255,255,0)");
  shine.addColorStop(0.38, "rgba(255,255,255,0.24)");
  shine.addColorStop(0.5, "rgba(255,255,255,0.08)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = shine;
  context.beginPath();
  context.ellipse(156, 320, 42, 300, -0.28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = isFemale ? "rgba(255,206,250,0.22)" : "rgba(190,245,255,0.18)";
  context.beginPath();
  context.ellipse(226, 166, 88, 24, -0.24, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = isFemale ? "rgba(255,206,250,0.14)" : "rgba(190,245,255,0.12)";
  context.beginPath();
  context.ellipse(238, 512, 72, 34, -0.18, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function createAvatarSkinSurfaceTexture(THREE, palette, isFemale) {
  const cacheKey = `avatar-polished-skin-${isFemale ? "female" : "male"}-${palette.skin}-${palette.skinShadow}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  const skin = colorToRgba(palette.skin, 0.28);
  const skinShadow = colorToRgba(palette.skinShadow, 0.28);
  const cheek = colorToRgba(palette.cheek, isFemale ? 0.28 : 0.2);
  const glow = isFemale ? "rgba(255,238,244,0.5)" : "rgba(255,234,205,0.42)";

  context.save();
  context.beginPath();
  context.ellipse(256, 318, isFemale ? 190 : 184, isFemale ? 248 : 238, 0, 0, Math.PI * 2);
  context.clip();

  const base = context.createRadialGradient(206, 172, 16, 256, 326, 292);
  base.addColorStop(0, "rgba(255,246,231,0.34)");
  base.addColorStop(0.48, skin);
  base.addColorStop(1, skinShadow);
  context.fillStyle = base;
  context.fillRect(54, 48, 404, 548);

  const lowerShade = context.createLinearGradient(256, 302, 256, 570);
  lowerShade.addColorStop(0, "rgba(255,255,255,0)");
  lowerShade.addColorStop(0.62, colorToRgba(palette.skinShadow, 0.1));
  lowerShade.addColorStop(1, colorToRgba(palette.skinShadow, 0.24));
  context.fillStyle = lowerShade;
  context.fillRect(54, 302, 404, 290);

  context.fillStyle = colorToRgba(palette.skinShadow, 0.1);
  context.beginPath();
  context.ellipse(96, 332, 58, 204, -0.14, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(416, 332, 58, 204, 0.14, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = glow;
  context.beginPath();
  context.ellipse(214, 166, 88, 34, -0.26, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255,255,255,0.24)";
  context.beginPath();
  context.ellipse(316, 242, 44, 150, -0.1, 0, Math.PI * 2);
  context.fill();

  [-1, 1].forEach((side) => {
    context.fillStyle = cheek;
    context.beginPath();
    context.ellipse(256 + side * 110, 382, 56, 28, side * 0.08, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,0.22)";
    context.beginPath();
    context.ellipse(256 + side * 95, 346, 34, 14, side * 0.16, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();

  context.strokeStyle = colorToRgba(palette.skinShadow, 0.12);
  context.lineWidth = 8;
  context.beginPath();
  context.ellipse(256, 318, isFemale ? 190 : 184, isFemale ? 248 : 238, 0, 0, Math.PI * 2);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function colorToRgba(color, alpha) {
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  return `rgba(${red},${green},${blue},${alpha})`;
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
  group.userData.tmpAnchorC = new THREE.Vector3();
  group.userData.tmpAnchorD = new THREE.Vector3();
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

function fitGroupToFullCoverDigitalHead(group, anchors, faceObject, fit) {
  const forehead = anchors?.forehead;
  const chin = anchors?.chin;
  const leftCheek = anchors?.leftCheek;
  const rightCheek = anchors?.rightCheek;
  const noseTip = anchors?.noseTip;
  if (!forehead || !chin || !leftCheek || !rightCheek || !faceObject) {
    fitGroupToFaceMask(group, anchors, faceObject, {
      x: fit.x ?? 0,
      y: fit.y ?? -0.02,
      z: fit.z ?? 0.62,
      scale: 2.05
    });
    return;
  }

  const faceWidth = Math.max(0.001, distance2D(leftCheek, rightCheek));
  const faceHeight = Math.max(0.001, distance2D(forehead, chin));
  const modelWidth = fit.modelWidth ?? 0.9;
  const modelHeight = fit.modelHeight ?? 1.04;
  const widthScale = faceWidth * (fit.widthPadding ?? 1.24) / modelWidth;
  const heightScale = faceHeight * (fit.heightPadding ?? 1.18) / modelHeight;
  const baseScale = faceObject.userData.renderState?.scale ?? Math.max(faceWidth, faceHeight);
  const scale = clamp(
    Math.max(widthScale, heightScale),
    baseScale * (fit.minScale ?? 0.78),
    baseScale * (fit.maxScale ?? 1.7)
  );

  const centerX = (leftCheek.x + rightCheek.x + forehead.x + chin.x + (noseTip?.x ?? 0)) / (noseTip ? 5 : 4);
  const centerY = (leftCheek.y + rightCheek.y + forehead.y + chin.y + (noseTip?.y ?? 0)) / (noseTip ? 5 : 4);
  const centerZ = (
    (leftCheek.z ?? 0)
    + (rightCheek.z ?? 0)
    + (forehead.z ?? 0)
    + (chin.z ?? 0)
    + (noseTip?.z ?? 0)
  ) / (noseTip ? 5 : 4);
  const localCenter = group.userData.tmpAnchor.set(centerX, centerY, centerZ);
  faceObject.worldToLocal(localCenter);

  group.position.set(
    localCenter.x + (fit.x ?? 0) * scale,
    localCenter.y + (fit.y ?? 0) * scale,
    localCenter.z + (fit.z ?? 0.68) * baseScale
  );
  group.scale.setScalar(scale);
  group.rotation.set(0, 0, 0);
}

function fitGroupToAdaptiveFaceMask(group, anchors, faceObject, asset) {
  const eyeCenter = anchors?.eyeCenter;
  const forehead = anchors?.forehead;
  const chin = anchors?.chin;
  const leftCheek = anchors?.leftCheek;
  const rightCheek = anchors?.rightCheek;
  if (!eyeCenter || !forehead || !chin || !leftCheek || !rightCheek || !faceObject) {
    fitGroupToFaceMask(group, anchors, faceObject, asset?.offset ?? {
      x: 0,
      y: -0.05,
      z: 0.5,
      scale: 1.82
    });
    return;
  }

  const left = group.userData.tmpAnchor.set(leftCheek.x, leftCheek.y, leftCheek.z ?? 0);
  const right = group.userData.tmpAnchorB.set(rightCheek.x, rightCheek.y, rightCheek.z ?? 0);
  faceObject.worldToLocal(left);
  faceObject.worldToLocal(right);
  const top = group.userData.tmpAnchorC.set(forehead.x, forehead.y, forehead.z ?? 0);
  const bottom = group.userData.tmpAnchorD.set(chin.x, chin.y, chin.z ?? 0);
  faceObject.worldToLocal(top);
  faceObject.worldToLocal(bottom);

  const faceWidth = Math.max(0.001, Math.hypot(right.x - left.x, right.y - left.y));
  const faceHeight = Math.max(0.001, Math.hypot(bottom.x - top.x, bottom.y - top.y));
  const centerX = (left.x + right.x + top.x + bottom.x) / 4;
  const centerY = (left.y + right.y + top.y + bottom.y) / 4;
  const centerZ = (left.z + right.z + top.z + bottom.z) / 4;
  const fit = asset.adaptiveFit ?? {};
  const offset = asset.offset ?? {};
  const targetWidth = faceWidth * (fit.width ?? 1.28);
  const targetHeight = faceHeight * (fit.height ?? 1.1);
  const assetWidth = Math.max(0.001, asset.size?.width ?? 1);
  const assetHeight = Math.max(0.001, asset.size?.height ?? 1.28);
  const minScale = fit.minScale ?? 0.75;
  const maxScale = fit.maxScale ?? 1.55;
  const xScale = clamp(targetWidth / assetWidth, faceWidth * minScale, faceWidth * maxScale);
  const yScale = clamp(targetHeight / assetHeight, faceHeight * minScale, faceHeight * maxScale);
  const featureSize = Math.max(faceWidth, faceHeight);

  group.position.set(
    centerX + (offset.x ?? 0) * faceWidth,
    centerY + (offset.y ?? 0) * faceHeight,
    centerZ + (offset.z ?? 0.55) * featureSize
  );
  group.scale.set(xScale, yScale, 1);
  group.rotation.set(0, 0, 0);
}

function fitGroupToDigitalBodySubstitute(group, anchors, faceObject, offset) {
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
  const substituteUnit = Math.max(0.001, headHeight * 0.78, faceWidth * 0.58);
  const localAnchor = group.userData.tmpAnchor.set(eyeCenter.x, eyeCenter.y, eyeCenter.z ?? 0);
  faceObject.worldToLocal(localAnchor);
  group.position.set(
    localAnchor.x + offset.x * substituteUnit,
    localAnchor.y + offset.y * substituteUnit,
    localAnchor.z + offset.z * substituteUnit
  );
  group.scale.setScalar(offset.scale * substituteUnit);

  const parentRotation = faceObject.rotation ?? { x: 0, y: 0, z: 0 };
  group.rotation.set(
    -parentRotation.x * 0.72,
    -parentRotation.y * 0.56,
    -parentRotation.z * 0.86,
    "ZYX"
  );
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
