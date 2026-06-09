# Effect Assets

## Current Privacy Action Set

The main PersonaShield UI exposes privacy actions instead of entertainment filters:

| Action | Implementation | Source |
| --- | --- | --- |
| Allow real appearance | Keeps the live face unchanged when a registered person permits recording | Project logic |
| Male digital substitute | Procedural Three.js 3D full-cover digital head fitted from MediaPipe face landmarks, with hair volume, facial features, neck, and privacy badge | Project implementation |
| Female digital substitute | Procedural Three.js 3D full-cover digital head fitted from MediaPipe face landmarks, with hair volume, facial features, neck, and privacy badge | Project implementation |
| Agni-style pain face | Local private meme/reference face image loaded from an ignored local asset directory and fitted to the tracked face | `assets/private/agni-pain-face.png` local only, not committed |
| Privacy blur shield | Opaque privacy/mosaic shield anchored to the tracked face | Project implementation |

## Avatar Asset Decision

We researched open-source avatar ecosystems before choosing the final asset path:

- `pixiv/three-vrm`: strong reference ecosystem for VRM digital humans.
- `ToxSam/open-source-avatars`: useful registry of open-source VRM avatar collections.
- `madjin/vrm-samples`: useful VRoid/VRM sample source for future runtime experiments.

However, direct full-body VRM usage was not adopted in the current MVP:

- The project still depends on the older Jeeliz/Three.js r112 runtime.
- Tested full-body VRM candidates were visually unsuitable for this privacy-substitute workflow: voxel characters looked too low-poly, while humanoid/robot models appeared as static T-pose overlays.
- Newer `@pixiv/three-vrm` runtime integration would require a larger Three.js upgrade and broader visual regression testing.

Final decision: use lightweight procedural Three.js full-cover digital heads in the real-time WebAR pipeline, while documenting VRM as a future upgrade direction. The renderer uses MediaPipe forehead, chin, and cheek landmarks to fit an oversized stylized 3D head that covers the real face, forehead, and hairline. This gives stable privacy coverage without requiring a Three.js upgrade or a full VRM runtime.

## Avatar Rendering

The current male/female substitutes are generated from code in `src/EffectFactory.js`. They are not Apple/Memoji assets
and are not copied third-party character artwork. The public repository can therefore include the renderer without
redistributing external avatar images.

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
- Local procedural 3D full-cover digital heads for clear, stable face replacement.
- Local private face-asset loading for classroom-only meme-style face replacement without redistributing the image.
- VRM ecosystem research as a documented future upgrade path, not a claim of current full VRM runtime integration.
