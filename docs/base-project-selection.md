# Base Project Selection

## Decision

Use Google's MediaPipe Face Landmarker web stack as the new technical base:

- Base repository: https://github.com/google-ai-edge/mediapipe-samples-web
- Core package: `@mediapipe/tasks-vision`
- Main task: `FaceLandmarker`
- License: Apache-2.0

The current Jeeliz prototype can be kept as a first proof-of-concept, but the next implementation should migrate the
detection and landmark layer to MediaPipe Face Landmarker.

## Why

Our current bottleneck is not the effect assignment code. It is Jeeliz's practical detection quality on real multi-person
video. For this project, the foundation must provide strong multi-face landmarks and pose/effect data before we spend
more time building filters.

MediaPipe Face Landmarker is the best base for this goal because it provides:

- Multiple face detection through `numFaces`.
- 478 3D face landmarks per face.
- Optional blendshape scores for expression-driven effects.
- Optional facial transformation matrices for attaching 2D/3D effects.
- Browser JavaScript support through an official package.
- An official browser demo repository with Playwright test infrastructure.
- Apache-2.0 licensing, which is suitable for an open-source course/resume project.

## Candidate Comparison

| Candidate | Strength | Risk | Decision |
| --- | --- | --- | --- |
| `google-ai-edge/mediapipe-samples-web` + `@mediapipe/tasks-vision` | Official, modern, Apache-2.0, 478 landmarks, blendshapes, transformation matrices, multi-face config | Requires us to implement our own effect assignment and rendering layer | Use as base |
| `needle-engine/facefilter` | Strongest ready-made face-filter abstraction, supports multiple faces and smoothing, 2D/3D filters | Depends on Needle Engine, small repo, no explicit license in package metadata/repo root at time of check | Use only as architecture reference |
| `breathingcyborg/mediapipe-face-effects` | Simple MediaPipe + Three.js face-effects demo | Small/old demo, limited commits, README notes lack of face transform in older facemesh JS | Do not use as base |
| `hiukim/mind-ar-js` | Friendly WebAR wrapper, MIT, face tracking and Three.js integration | Multi-face face tracking is unclear/open issue; more suited to one face or image tracking | Do not use for this project |
| `tensorflow/tfjs-models/face-landmarks-detection` | Can detect multiple faces with 478 keypoints | It is essentially a wrapper around MediaPipe facemesh; less direct for current MediaPipe Tasks features like transformation matrices | Secondary fallback |
| Zappar WebAR SDKs | Mature commercial-style face AR and Three.js helpers | Core tracking is proprietary/commercial, not ideal as open-source base | Do not use |

## Migration Direction

1. Start a new `PartyFaceAR-mediapipe` app or replace the current Jeeliz detection adapter behind a common interface.
2. Implement `MediaPipeFaceSource` that calls `FaceLandmarker.detectForVideo()` in video mode with `numFaces: 4`.
3. Convert each MediaPipe face result to our existing track input shape:
   - center: from bounding box or selected landmarks
   - scale: from face bounding box size
   - pose: from facial transformation matrix when enabled
   - expressions: from blendshape categories when enabled
4. Reuse and adapt current modules:
   - `FaceTrackManager`
   - `EffectManager`
   - `UIController`
   - `PerformanceMeter`
5. Rebuild effects around MediaPipe landmarks:
   - glasses: eye landmarks and nose bridge
   - mask: face oval / mesh texture
   - hat/crown: forehead and face scale
   - mouth animation: blendshape or mouth landmarks
6. Verify with the same real candidate videos first. If MediaPipe detects 3+ faces where Jeeliz only sees 1-2, continue the migration.

## Practical Conclusion

The most reasonable project path is not to find a more beautiful face-filter demo and modify it. It is to use the
stronger official MediaPipe Face Landmarker base, then add our differentiating layer: stable multi-face track IDs,
per-track effect assignment, manual/automatic UI, and verification tooling.
