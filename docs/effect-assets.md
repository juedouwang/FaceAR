# Effect Assets

## Current Privacy Action Set

The main PersonaShield UI exposes privacy actions instead of entertainment filters:

| Action | Implementation | Source |
| --- | --- | --- |
| Allow real appearance | Keeps the live face unchanged when a registered person permits recording | Project logic |
| Male digital substitute | Kenney CC0 GLB head-bust fitted from MediaPipe face landmarks, with procedural Three.js fallback | `assets/avatars/kenney-protagonists/` |
| Female digital substitute | Kenney CC0 GLB head-bust fitted from MediaPipe face landmarks, with procedural Three.js fallback | `assets/avatars/kenney-protagonists/` |
| Agni-style pain face | Local private meme/reference face image loaded from an ignored local asset directory and fitted to the tracked face | `assets/private/agni-pain-face.png` local only, not committed |
| Privacy blur shield | Opaque privacy/mosaic shield anchored to the tracked face | Project implementation |

## Avatar Asset Decision

We researched open-source avatar ecosystems before choosing the final asset path:

- `pixiv/three-vrm`: strong reference ecosystem for VRM digital humans.
- `ToxSam/open-source-avatars`: useful registry of open-source VRM avatar collections.
- `madjin/vrm-samples`: useful VRoid/VRM sample source for future runtime experiments.
- Kenney `Animated Characters Protagonists`: CC0 stylized character pack suitable for redistribution and course demos.

However, direct full-body VRM usage was not adopted in the current MVP:

- The project still depends on the older Jeeliz/Three.js r112 runtime.
- Tested full-body VRM candidates were visually unsuitable for this privacy-substitute workflow: voxel characters looked too low-poly, while humanoid/robot models appeared as static T-pose overlays.
- Newer `@pixiv/three-vrm` runtime integration would require a larger Three.js upgrade and broader visual regression testing.

Final decision: use a lightweight Kenney CC0 head/neck/upper-shoulder bust in the real-time WebAR pipeline, while keeping the previous procedural Three.js avatar as a fallback. The Kenney FBX was converted to GLB and trimmed to the region that the current face-tracking pipeline can align reliably. The renderer uses MediaPipe forehead, chin, and cheek landmarks to fit an oversized stylized substitute that covers the real face, forehead, and hairline. Full VRM runtime integration remains a future upgrade direction.

## Avatar Rendering

The current male/female substitutes are loaded from `assets/avatars/kenney-protagonists/` by `src/EffectFactory.js`.
They are not Apple/Memoji assets and do not copy proprietary avatar artwork. Kenney distributes the source character
pack under CC0, so the public repository can include the extracted GLB, male/female textures, source notes, and license.

Runtime path:

- primary: `kenney-glb-head-bust`;
- assets: `kenney-protagonist-head-bust.glb`, `skaterMaleA.png`, `skaterFemaleA.png`;
- fallback: procedural Three.js full-cover head if `GLTFLoader` or the GLB asset fails.

## Local Private Meme Asset

The `Agni-style pain face` action is intentionally implemented as a local-only asset hook. The local demo can place a
copyrighted or meme/reference image at:

```text
assets/private/agni-pain-face.png
```

`assets/private/` and `docs/verification-agni-pain-face.png` are ignored by Git. Public GitHub commits should include
only the loader, UI option, and explanation, not the private image or screenshots containing that image.

## Legacy Effect Set

The repository still keeps Apache-2.0 demo assets from `jeeliz/jeelizFaceFilter` as fallback and comparison material:

| Effect | Implementation | Source |
| --- | --- | --- |
| Jeeliz VTO glasses | Reflective 3D frames and lenses with branch-fading shader | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz face paint | Textured face mesh with alpha map | `jeeliz/jeelizFaceFilter` football makeup demo assets plus project overlay |
| Textured party hat | Textured 3D straw hat | `jeeliz/jeelizFaceFilter` Luffy hat demo |
| Jeeliz puppy face | Textured 3D dog ears and nose with soft muzzle overlay | `jeeliz/jeelizFaceFilter` dog face demo |
| Jeeliz tiger mask | Textured tiger face mask | `jeeliz/jeelizFaceFilter` tiger demo |
| Jeeliz werewolf | Textured fur/head/teeth 3D headpiece | `jeeliz/jeelizFaceFilter` werewolf demo |
| Jeeliz cinematic mask | Textured full-face mask with normal/emissive maps | `jeeliz/jeelizFaceFilter` Casa-de-Papel demo |
| Jeeliz storm cloud | Textured cloud mesh, raindrops, and lightning animation | `jeeliz/jeelizFaceFilter` cloud demo |
| Jeeliz party glasses | Textured Miel Pops glasses | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz full mask | Textured Anonymous mask | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz AR helmet | Rupy helmet shell and translucent visor | `jeeliz/jeelizFaceFilter` demo assets |

## Design Decision

The goal is not to copy proprietary Douyin/TikTok or Apple/Memoji assets. PersonaShield uses open-source AR effects as
background comparison material, while the primary deliverable is the identity-aware privacy action pipeline:

- MediaPipe landmarks and stable track IDs for real-time multi-person attachment.
- FaceAPI identity descriptors for binding registered people to selected privacy actions.
- Kenney CC0 GLB head-bust substitutes for clearer face replacement, with procedural Three.js heads as fallback.
- Local private face-asset loading for classroom-only meme-style face replacement without redistributing the image.
- VRM ecosystem research as a documented future upgrade path, not a claim of current full VRM runtime integration.
