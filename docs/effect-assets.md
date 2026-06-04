# Effect Assets

## What MediaPipe Provides

MediaPipe Face Landmarker does not ship Douyin/TikTok-style commercial filter packs. It provides the tracking base:

- Multiple face detection.
- 478 3D landmarks per face.
- Face pose and transformation data.
- Blendshape scores for expression-driven effects.

The visual filters in this project are built on top of those outputs.

## Current Effect Set

| Effect | Implementation | Source |
| --- | --- | --- |
| Jeeliz VTO glasses | Reflective 3D frames and lenses with branch-fading shader, adapted from Jeeliz glasses VTO demo | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz face paint | Textured face mesh with alpha map, plus small cheek highlights for multi-person visibility | `jeeliz/jeelizFaceFilter` football makeup demo assets plus project overlay |
| Textured party hat | Textured 3D straw hat adapted from the Jeeliz Luffy hat demo | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz puppy face | Textured 3D dog ears and nose with soft muzzle overlay, adapted from Jeeliz dog face demo | `jeeliz/jeelizFaceFilter` demo assets plus project overlay |
| Jeeliz tiger mask | Textured tiger face mask adapted from the Jeeliz tiger demo, exposed as a manual high-impact effect | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz werewolf | Textured fur/head/teeth 3D headpiece adapted from the Jeeliz werewolf demo, used as the high-impact showcase effect | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz cinematic mask | Textured full-face mask with normal/emissive maps, adapted from the Casa-de-Papel demo | `jeeliz/jeelizFaceFilter` demo assets plus project overlay |
| Jeeliz storm cloud | Textured cloud mesh, raindrops, and lightning animation adapted from the cloud demo | `jeeliz/jeelizFaceFilter` demo assets plus project animation |
| Jeeliz party glasses | Textured Miel Pops glasses, exposed as a manual effect while calibration is refined | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz full mask | Textured Anonymous mask, exposed as a manual effect while calibration is refined | `jeeliz/jeelizFaceFilter` demo assets |
| Jeeliz AR helmet | Rupy helmet shell and translucent visor, exposed as a manual effect while calibration is refined | `jeeliz/jeelizFaceFilter` demo assets |

## Third-Party Asset Credits

The current main visual cycle reuses Apache-2.0 demo assets from `jeeliz/jeelizFaceFilter`:

- `assets/jeeliz/glassesVTO/`: reflective sunglasses VTO frame/lens geometry and environment map.
- `assets/jeeliz/football_makeup/`: alpha-mapped face paint mesh and texture.
- `assets/jeeliz/luffys_hat/`: textured hat geometry and texture.
- `assets/jeeliz/dog/`: dog ears/nose geometry and texture/normal/alpha maps.
- `assets/jeeliz/miel_pops/`: party glasses frame/lens/branch/deco geometry and textures.
- `assets/jeeliz/anonymous/`: full-face mask geometry and texture.
- `assets/jeeliz/casa_de_papel/`: full-face cinematic mask geometry and diffuse/normal/reflect maps.
- `assets/jeeliz/cloud/`: textured cloud geometry and drop texture.
- `assets/jeeliz/rupy_helmet/`: helmet shell/visor geometry and texture.
- `assets/jeeliz/tiger/`: tiger mask geometry and textures.
- `assets/jeeliz/werewolf/`: werewolf head/fur/teeth geometry and diffuse/normal/alpha textures.

The project uses selected assets from `hiukim/mind-ar-js` face-tracking examples. The MindAR project itself is MIT
licensed, while several embedded 3D models are CC-BY-4.0 Sketchfab assets and require attribution.

- `assets/mindar/glasses/`: "Thug Life | Cool glasses | Stylise goggles" by MR EXPERT, CC-BY-4.0.
- `assets/mindar/glasses2/`: Sunglasses model by TiimB, CC-BY-4.0, according to the glTF asset metadata.
- `assets/mindar/hat/`: "Clown Hat" by PatelDev, CC-BY-4.0.
- `assets/mindar/earring/`: "Earring Jade" by Softmind Game Factory, CC-BY-4.0. Currently downloaded for evaluation, not used in the main effect cycle.

The downloaded MindAR glTF assets are kept as documented references and fallback/evaluation material. `assets/mindar/hat2/`
is intentionally not used in the main demo because it is clearly based on Mario's cap and is less suitable for a
course/resume report screenshot.

## Design Decision

The goal is not to copy proprietary Douyin/TikTok filters. Those assets are normally commercial and not reusable in an
open-source course project. Instead, this project uses a safe combination:

- Open-source/CC-attributed 3D models for recognizable AR accessories.
- Programmatic particles, rings, masks, and color accents for visual polish.
- MediaPipe landmarks and stable track IDs for real-time multi-person attachment.
