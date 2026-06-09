# Kenney Animated Characters Protagonists

Source: https://www.kenney.nl/assets/animated-characters-protagonists

License: Creative Commons Zero (CC0). See `LICENSE.kenney.txt`.

Files used in this project:

- `kenney-protagonist-head-only.glb`: extracted head-only geometry generated from `Model/characterMedium.fbx`.
- `skaterMaleA.png`: male skin texture from the original pack.
- `skaterFemaleA.png`: female skin texture from the original pack.
- `preview.png`: original pack preview for documentation and candidate review.

Extraction notes:

- The original FBX contains one skinned mesh plus skeleton bones, not separate head/body meshes.
- The project converted the FBX to GLB using FBX2glTF in a temporary workspace.
- The final runtime asset keeps only the head region by filtering out neck-below and shoulder triangles from the converted mesh.
- The current project loads the extracted GLB through the existing Three.js `GLTFLoader`.
