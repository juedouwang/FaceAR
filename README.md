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
  - `Agni-style pain face`
  - `Privacy blur shield`
- Render male/female Kenney CC0 GLB head-only digital substitutes with face-size fitting, with a procedural Three.js fallback if the model cannot load.
- Load local private face assets from `assets/private/` for classroom-only meme-style face replacement without committing copyrighted images to Git.
- Manually click a face and apply a privacy action as a fallback or demonstration tool.
- Show per-track status, matched identity, distance, FPS, and active face count.
- Capture a protected PNG frame by compositing the video and privacy overlay canvases.
- Verify positive identity binding and negative stranger rejection with Playwright scripts.

Legacy Jeeliz/WebAR effect assets remain in the repository as fallback and comparison material, but the main UI now
focuses on privacy actions instead of entertainment filters.

## Avatar Rendering

The current real-time substitutes use CC0 assets from Kenney's `Animated Characters Protagonists` pack. The original FBX
was converted to GLB and reduced to a head-only mesh so it can load through the existing Three.js r112
`GLTFLoader`. The renderer keeps the existing `avatarMale` and `avatarFemale` action IDs, but internally uses a
`kenney-glb-head-only` path:

- load the extracted Kenney head-only GLB and apply the male/female skin texture;
- fit the digital substitute from MediaPipe forehead, chin, and cheek landmarks;
- scale it as an oversized cartoon head so the real forehead and hairline are covered, not just the inner face;
- fall back to the procedural Three.js full-cover head if the GLB loader or asset fails.

This is suitable for the local course demo, but it is not yet full facial expression retargeting, body pose tracking,
video foreground segmentation, or a full VRM digital human runtime.

## Local Private Face Assets

`Agni-style pain face` is implemented as a local private face-asset loader. The runtime looks for:

```text
assets/private/agni-pain-face.png
```

That directory is intentionally ignored by Git. This lets the local classroom demo use a meme/reference image while the
public GitHub repository only contains the loading code and documentation, not the copyrighted image itself.

We also researched and tested open-source avatar ecosystems, including `pixiv/three-vrm`,
`ToxSam/open-source-avatars`, `madjin/vrm-samples`, and Kenney CC0 character packs. The current implementation uses the
Kenney protagonist bust as the primary runtime substitute because it is lightweight, redistributable, and compatible with
the existing Three.js r112 pipeline. Full VRM runtime integration remains a future upgrade.

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
  -> Kenney GLB head-only / procedural fallback / privacy shield rendering
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

## 中文说明

PersonaShield 是一个面向 AI 眼镜第一视角拍摄场景的本地 WebAR 隐私防护原型。项目从原来的多人脸 AR 特效 Demo
改造而来，核心目标不再是娱乐滤镜，而是验证一种“被拍摄者可提前声明隐私偏好，合规拍摄端在画面中自动执行保护策略”的技术流程。

当前 MVP 采用本地注册表方案，不考虑 DID 或去中心化身份。用户可以上传参考人脸图像，注册受保护身份，并为该身份选择隐私动作。
当摄像头或本地视频中出现该身份时，系统会把对应 track 绑定到该身份，并渲染该身份选择的数字替身或隐私遮挡。

核心功能：

- 使用 MediaPipe Face Landmarker 检测并追踪最多 4 张人脸。
- 使用本地 FaceAPI 模型从参考图和实时 track crop 中提取 128 维人脸 descriptor。
- 通过“MediaPipe 实时检测追踪 + FaceAPI 低频身份识别”实现身份绑定，避免每帧做人脸识别。
- 支持 `Allow real appearance`、`Male digital substitute`、`Female digital substitute`、`Agni-style pain face`、`Privacy blur shield` 五类隐私动作。
- 男性/女性数字替身使用 Kenney CC0 开源角色资源提取出的 GLB 头部模型进行实时覆盖渲染；如果模型加载失败，会退回到程序化 Three.js 3D 数字头。
- 当前覆盖方式是根据已识别人脸锚点推断身体区域，并不等同于真实人体姿态追踪或视频分割。
- 新增 `Agni-style pain face` 本地私有素材动作：运行时从 `assets/private/agni-pain-face.png` 加载素材覆盖人脸，素材目录已加入 `.gitignore`，不会上传到公开 GitHub。
- 支持手动点击某张脸，为指定 track 临时选择隐私动作。
- 支持导出受保护 PNG 帧，用于报告中的可视化展示。
- 提供正例身份绑定、陌生人负例拒绝、手动绑定和性能 profile 的自动化验证脚本。

当前版本是课程/简历项目级原型，不是生产级身份认证系统，也不接入真实 AI 眼镜 SDK。它不能阻止未接入协议的设备拍摄真实人脸，
只能证明一种面向合规拍摄端的参考实现：注册身份、识别身份、读取隐私偏好，并在本地实时视频管线中执行数字替身替换。

## License

The copied Jeeliz runtime files under `vendor/jeeliz` retain the original Apache-2.0 license. This project layer is also
intended for Apache-2.0 compatible use.
