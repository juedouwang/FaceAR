# PartyFaceAR

PartyFaceAR is a Web AR demo for differentiated multi-face effects. The first prototype was built on
[`jeeliz/jeelizFaceFilter`](https://github.com/jeeliz/jeelizFaceFilter). After screening real multi-person clips, the
active demo uses MediaPipe Face Landmarker as the detection base while reusing Jeeliz/WebAR-style effects and the same
track/effect/UI project layer.

## Goal

The target MVP is a reference-face identity binding AR demo for a social AR glasses scenario. The user registers one or
more reference face images, assigns an effect to each registered person, then starts a camera or local video. When a
registered person appears in the scene, the app should recognize that face, bind the matching identity to the active
short-term track, and render that person's selected AR effect.

The current implementation now includes a local identity-binding pipeline with real face descriptors. MediaPipe remains
the fast multi-face detection, landmark, pose, and AR-anchor layer, while `@vladmandic/face-api` extracts 128-dimensional
face-recognition descriptors from reference images and low-frequency live track crops. A registered stranger reference is
rejected instead of being bound to an arbitrary active face. This is still not a production-grade identity-authentication
system, but it is a real face-recognition MVP rather than a landmark-geometry-only demo.

## Features

- Detect up to 4 faces with MediaPipe Face Landmarker in the migrated demo.
- Keep the Jeeliz prototype available for comparison.
- Render different Three.js effects per face track.
- Provide Jeeliz-style VTO sunglasses, Miel Pops party glasses, football face paint, puppy face, tiger mask, helmet,
  Anonymous mask, and textured hat effects.
- Keep effect binding on a stable track ID using screen-position matching and same-slot fallback.
- Support automatic assignment and clickable manual face binding: click a face box, then choose that face's effect.
- Register reference face images, choose a per-person effect, and match registered people when they appear in
  camera/video.
- Combine low-frequency identity matching with `FaceTrackManager` so recognized tracks keep their identity effect
  without rerunning recognition every frame.
- Toggle effects, reset bindings, and inspect FPS/face count/track state.
- Run from camera input or local/sample video input.

## Run

```powershell
cd .\PartyFaceAR
python -m http.server 8000
```

Open:

- Camera mode: <http://127.0.0.1:8000/>
- Verified real multi-face demo: <http://127.0.0.1:8000/?video=party>
- MediaPipe 4-face migrated demo: <http://127.0.0.1:8000/mediapipe-ar.html>
- MediaPipe detection screening page: <http://127.0.0.1:8000/mediapipe-verify.html>
- Single-face smoke test: <http://127.0.0.1:8000/?video=sample>

Camera access requires `localhost`, `127.0.0.1`, or HTTPS in most browsers.

## Local delivery

PartyFaceAR is delivered as a local static web app for the course demo. It does not require a backend server, database,
public URL, or cloud deployment. A local static file server such as `python -m http.server 8000` is enough.

Optional public deployment notes are kept in `docs/deployment.md`, but public deployment is not part of the current
acceptance scope.

## Test

```powershell
cd .\PartyFaceAR
node tests/run-tests.mjs
npm run screen:mediapipe
npm run verify:mediapipe-ar
npm run verify:manual-binding
npm run verify:identity-binding
npm run verify:identity-negative
npm run profile:mediapipe-ar
npm run verify:all
```

Current automated test coverage:

- Creates 3 active tracks from 3 detections.
- Keeps track IDs stable during short motion.
- Handles short detection loss and recovery.
- Preserves track identity when two detection slots swap positions.
- Stores registered reference people, selected effects, and descriptors.
- Matches a live track descriptor to registered people and binds `trackId -> personId -> effectId`.
- Prioritizes identity binding over manual and automatic effect assignment.
- Verifies clickable manual binding by selecting a face box, changing its effect, and saving a visual screenshot.
- Verifies identity binding by registering two reference tracks, assigning different effects, and saving a visual
  screenshot with two active identity-bound tracks.
- Verifies the negative identity case by registering a stranger reference and asserting that no current video track is
  bound to that identity.

Manual effect-binding verification is also part of acceptance. In the MediaPipe demo, each active face gets a clickable
preview box labeled `Track X / Face Y`. Click the target face, choose an effect in `Manual effect binding`, and verify
that the selected track keeps the chosen effect during normal non-crossing motion.

The current local verification summary is documented in `docs/verification-summary.md`.

## Key changes from Jeeliz demo

Jeeliz already provides the face detector, pose output, multi-face slots, and Three.js helper. PartyFaceAR adds:

- `src/FaceTrackManager.js`: stable track IDs, lost-track grace window, nearest-neighbor matching, same-slot fallback.
- `src/EffectManager.js`: effect registry, automatic/manual binding, track-level effect persistence.
- `src/EffectFactory.js`: Jeeliz demo asset adapters plus project-built polish overlays.
- `src/UIController.js`: input/mode controls and debug panel.
- `src/app.js`: app orchestration, camera/video input, Jeeliz initialization, render loop integration.
- `src/MediaPipeFaceSource.js`: MediaPipe Face Landmarker adapter for 4-face landmarks and blendshape-ready results.
- `src/MediaPipeEffectRenderer.js`: Three.js overlay renderer for the migrated MediaPipe demo.

Identity-recognition additions:

- `src/ReferenceFaceManager.js`: stores registered people, reference images, selected effects, and face descriptors.
- `src/FaceApiIdentityRecognizer.js`: loads local FaceAPI models, extracts 128-dimensional face-recognition descriptors
  from reference images and live track crops, then computes descriptor distances.
- `src/IdentityTrackBinder.js`: binds `personId -> trackId -> effectId`, supports async low-frequency recognition, and
  rechecks identity only when a new/uncertain track appears or the binding becomes stale.
- `src/UIController.js`: exposes the reference-person registration panel, per-person effect selectors, and identity
  status in face boxes and the track list.
- `vendor/face-api/` and `vendor/tfjs-backend-wasm/`: local browser bundle, model weights, and TFJS WASM assets used by
  the identity-recognition layer without CDN dependency.

## Effect assets

MediaPipe provides the face tracking base, not a ready-made short-video filter library. The current visual layer combines
Jeeliz demo-quality 3D assets and project-built procedural overlays:

- Apache-2.0 Jeeliz demo assets: reflective VTO glasses, textured hat, dog ears, and dog nose.
- Apache-2.0 Jeeliz demo assets: Miel Pops party glasses, football makeup, Rupy helmet, Anonymous mask, and tiger mask.
- Project-built overlays: soft muzzle, glam highlights, sparkles, bowtie, and halo.
- CC-BY glTF sunglasses and party/clown hat assets from MindAR face-tracking examples / Sketchfab are included as
  documented references/fallback material.
- Asset credits and licensing notes: `docs/effect-assets.md`.

## Current verification status

### MediaPipe migration

The MediaPipe screening script samples existing real videos with `numFaces: 4`, blendshapes enabled, and facial
transformation matrices enabled. Results are written to `docs/mediapipe-video-screening.md`.

Current best evidence from the 2026-06-02 verification run:

- `samples/party-hats-crop-wide_faces.webm`: 4 simultaneous faces on 33/33 sampled frames.
- `samples/birthday-party-hats-mixkit-4608.mp4`: 3 simultaneous faces on 33/33 sampled frames.
- Paused browser verification: `npm run verify:mediapipe-ar` reached 4 active tracks at 60 FPS and rendered different
  Jeeliz-style effects on different faces.
- Realtime browser verification:
  `MP_AR_REALTIME=1 MP_AR_MIN_FPS=24 MP_AR_SCREENSHOT=docs/verification-mediapipe-ar-realtime-current.png npm run verify:mediapipe-ar`
  reached 4 active tracks at 61 FPS.
- Performance profiling over 32 stable samples: p50 FPS 58.952, average FPS 58.401, p50 active faces 4, average active
  faces 3.719, p50 worker detection round trip 106.4 ms.
- Manual binding verification: `npm run verify:manual-binding` selected `Track 1 / Face 1`, bound it to the Jeeliz tiger
  mask, switched the UI to manual mode, and saved `docs/verification-manual-face-binding.png`.
- Identity binding verification: `npm run verify:identity-binding` cropped two reference face PNGs from the paused
  sample frame, registered them through the reference upload UI, assigned `glasses` and `tiger`, extracted FaceAPI
  128-dimensional descriptors, matched two active tracks to two different people, and saved
  `docs/verification-identity-binding.png`.
- Negative identity verification: `npm run verify:identity-negative` registered a stranger reference from a different
  image, kept 4 active video tracks, produced 0 identity bindings, and saved
  `docs/verification-identity-negative.png`.
- Evidence screenshots: `docs/verification-mediapipe-ar-showcase.png` and
  `docs/verification-mediapipe-ar-realtime-current.png`, plus the manual-binding screenshot
  `docs/verification-manual-face-binding.png`, identity-binding screenshot
  `docs/verification-identity-binding.png`, and negative identity screenshot
  `docs/verification-identity-negative.png`.

This validates the decision to migrate the detection layer from Jeeliz to MediaPipe Face Landmarker.

### Jeeliz prototype

Legacy proof-of-concept verified locally on `http://127.0.0.1:8000/?video=party` with the real Mixkit stock video
["Friends taking a selfie by a pool"](https://mixkit.co/free-stock-video/friends-taking-a-selfie-by-a-pool-43089/):

- Page loads without resource errors.
- Jeeliz initializes in video mode.
- The demo reaches 2 simultaneous active face tracks on different real people.
- Different effects are bound to different tracks, for example Cyber glasses and Neon halo.
- Debug panel reports active track IDs, Jeeliz slots, effect names, confidence, and FPS.
- Local verification reached above 200 FPS on the test machine.
- Evidence screenshot: `docs/verification-pool-selfie.png`.

Additional candidate videos were tested because some party/wide-shot clips had multiple people but only one stable
front-facing face at a time. `?video=nightclub` also reaches 2 simultaneous tracks briefly, while `?video=partyWide`,
`?video=party2`, `?video=friends`, `?video=windowSelfie`, and `?video=groupSelfie` are kept only as optional screening
inputs.

## License

The copied Jeeliz runtime files under `vendor/jeeliz` retain the original Apache-2.0 license. This project layer is also
intended for Apache-2.0 compatible use.

The bundled Mixkit demo videos are free stock videos available under the license stated on each Mixkit item page:

- `samples/friends-selfie-pool-mixkit-43089.mp4`: "Friends taking a selfie by a pool".
- `samples/birthday-party-hats-mixkit-4608.mp4`: "Excited young people partying with party hats".

The derived `samples/party-hats-crop-wide_faces.webm` clip is a crop of the Mixkit party-hats source video used only to
keep four real faces large enough for repeatable automated verification. It does not duplicate or synthesize faces.
