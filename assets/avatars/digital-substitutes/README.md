# PersonaShield Digital Substitute Assets

These local SVG avatars are original backup assets created during the PersonaShield MVP exploration. They avoid Apple/Memoji assets and copied character artwork, but they are no longer the primary runtime substitute.

The project also evaluated open-source VRM avatar sources from `ToxSam/open-source-avatars`, `madjin/vrm-samples`, and the `pixiv/three-vrm` ecosystem. The final real-time WebAR path uses procedural Three.js full-cover digital heads because the existing app runs on Three.js r112 and the tested full-body VRM models were visually unsuitable or unstable for the current multi-face privacy substitute workflow.

At runtime the active substitute is scaled from MediaPipe forehead, chin, and cheek landmarks as an oversized cartoon head that covers the real face, forehead, and hairline. This is not yet skeleton-driven VRM animation, facial expression retargeting, body pose tracking, or video segmentation.
