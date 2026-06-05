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

## 中文说明

PersonaShield 是一个面向 AI 眼镜第一视角拍摄场景的本地 WebAR 隐私防护原型。项目从原来的多人脸 AR 特效 Demo 改造而来，核心目标不再是娱乐滤镜，而是验证一种“被拍摄者可以提前声明隐私偏好，拍摄端在画面中自动执行保护策略”的技术流程。

项目当前采用中心化/本地注册表 MVP 方案，不考虑 DID 或去中心化身份。用户可以上传参考人脸图像，注册一个受保护身份，并为该身份选择隐私动作。当摄像头或本地视频中出现该身份时，系统会把对应 track 绑定到该身份，并渲染该身份选择的数字替身或隐私遮挡。

### 核心功能

- 使用 MediaPipe Face Landmarker 检测并追踪最多 4 张人脸。
- 使用本地 FaceAPI 模型从参考图和实时 track crop 中提取 128 维人脸 descriptor。
- 将注册身份与实时人脸 track 进行低频识别绑定，避免每帧做人脸识别。
- 支持四类隐私动作：
  - `Allow real appearance`：允许真实形象出镜。
  - `Male digital substitute`：男性卡通数字替身。
  - `Female digital substitute`：女性卡通数字替身。
  - `Privacy blur shield`：隐私遮挡。
- 支持手动点击某张脸，为指定 track 临时选择隐私动作。
- 支持导出受保护 PNG 帧，用于报告中的可视化展示。
- 提供正例身份绑定、陌生人负例拒绝、手动绑定和性能 profile 的自动化验证脚本。

### 本地运行

```powershell
cd "D:\研究生文件\20_Areas\研究生课程\增强现实与高级图形学\PartyFaceAR"
python -m http.server 8000
```

打开：

- 主页面：<http://127.0.0.1:8000/mediapipe-ar.html>
- 固定验证帧：<http://127.0.0.1:8000/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25>

摄像头模式需要在 `localhost`、`127.0.0.1` 或 HTTPS 下运行，因为浏览器摄像头权限要求安全上下文。

### 测试与验收

```powershell
npm run verify:all
```

该命令会依次运行单元测试、MediaPipe 多人脸筛选、主页面验证、手动隐私动作绑定、身份绑定正例、身份绑定负例和性能 profile。报告可引用 `docs/` 目录下生成的截图，例如：

- `docs/verification-personashield-identity-binding.png`
- `docs/verification-personashield-protected-frame.png`
- `docs/verification-personashield-negative.png`
- `docs/verification-manual-privacy-action.png`

### 项目边界

当前版本是课程/简历项目级原型，不是生产级身份认证系统，也不接入真实 AI 眼镜 SDK。它不能阻止不接入协议的设备拍摄真实人脸，只能证明一种面向合规拍摄端的参考实现：注册身份、识别身份、读取隐私偏好，并在本地实时视频管线中执行数字替身替换。

## License

The copied Jeeliz runtime files under `vendor/jeeliz` retain the original Apache-2.0 license. This project layer is also
intended for Apache-2.0 compatible use.
