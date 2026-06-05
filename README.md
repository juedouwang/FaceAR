# PersonaShield

PersonaShield is a local WebAR prototype for privacy-preserving AI glasses capture scenarios. It turns the original
multi-face AR effects demo into an identity-aware privacy workflow: a user registers a reference face, chooses a privacy
action, and the browser replaces or shields the matched live face during camera/video playback.

The project is designed as a course and resume demo, not as a production identity-authentication system. It runs locally
as a static web app and does not require a backend server, cloud face API, database, public deployment, or real AI glasses
hardware.

## Concept

The target scenario is first-person capture by AI glasses. Current smart glasses make recording much easier than phone
recording, but most privacy mechanisms still focus on capture indicators or device permissions. PersonaShield explores a
stronger bystander-side idea:

```text
registered identity -> privacy preference -> real-time face recognition -> digital substitute rendering
```

If a registered person appears in the video and has chosen protection, the preview and exported protected frame show a
digital substitute or privacy shield instead of the real face.

## MVP Features

- Detect and track up to 4 faces using MediaPipe Face Landmarker.
- Register protected identities from local reference face images.
- Extract local FaceAPI 128-dimensional face descriptors from reference images and low-frequency live track crops.
- Bind matched identities to stable short-term face tracks.
- Choose one privacy action per identity:
  - `Allow real appearance`
  - `Male digital substitute`
  - `Female digital substitute`
  - `Privacy blur shield`
- Manually click a face and apply a privacy action as a fallback or demonstration tool.
- Show per-track status, matched identity, distance, FPS, and active face count.
- Capture a protected PNG frame by compositing the video and privacy overlay canvases.
- Verify positive identity binding and negative stranger rejection with Playwright scripts.

Legacy Jeeliz/WebAR effect assets remain in the repository as fallback and comparison material, but the main UI now
focuses on privacy actions instead of entertainment filters.

## Architecture

```text
reference image
  -> FaceAPI local descriptor
  -> ReferenceFaceManager
  -> personId + privacyAction + descriptor

camera/local video
  -> MediaPipe Face Landmarker
  -> FaceTrackManager short-term tracking
  -> IdentityTrackBinder low-frequency recognition
  -> EffectManager privacy action binding
  -> Three.js digital substitute rendering
```

MediaPipe handles multi-face detection, landmarks, and tracking anchors. FaceAPI handles local face-recognition
descriptors. The identity binder combines low-frequency recognition with high-frequency tracking so the browser does not
rerun face recognition every frame.

## Run Locally

```powershell
cd "D:\研究生文件\20_Areas\研究生课程\增强现实与高级图形学\PartyFaceAR"
python -m http.server 8000
```

Open:

- Main privacy prototype: <http://127.0.0.1:8000/mediapipe-ar.html>
- Paused verification frame: <http://127.0.0.1:8000/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25>
- MediaPipe screening page: <http://127.0.0.1:8000/mediapipe-verify.html>

Camera access requires `localhost`, `127.0.0.1`, or HTTPS in most browsers.

## Test

```powershell
npm test
npm run screen:mediapipe
npm run verify:mediapipe-ar
npm run verify:manual-binding
npm run verify:identity-binding
npm run verify:identity-negative
npm run profile:mediapipe-ar
npm run verify:all
```

The verification scripts generate screenshots under `docs/`, including identity binding, negative stranger rejection,
manual privacy action binding, and MediaPipe runtime checks.

## Current Scope

This prototype intentionally does not implement:

- real AI glasses SDK integration;
- public deployment as a required deliverable;
- Alipay or financial-grade identity verification;
- decentralized identity / DID;
- a production biometric authentication system;
- legal enforcement against non-compliant cameras.

The product positioning is:

```text
a reference implementation for compliant AI-glasses-style capture clients
```

The engineering goal is to prove that bystander privacy preferences can be registered, matched, visualized, and executed
locally in a real-time browser video pipeline.

## License

The copied Jeeliz runtime files under `vendor/jeeliz` retain the original Apache-2.0 license. This project layer is also
intended for Apache-2.0 compatible use.
