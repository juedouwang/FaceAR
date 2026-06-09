# PersonaShield 身份感知隐私动作绑定技术路线

## 目标

PersonaShield 的核心改进是把原来的多人脸娱乐 AR 特效流程，升级为“按注册身份执行隐私策略”的视频隐私防护流程：

1. 被拍摄者上传参考人脸图像，注册一个受保护身份。
2. 被拍摄者为该身份选择隐私动作，例如允许真实出镜、男性数字替身、女性数字替身或隐私遮挡。
3. 系统从参考图中提取本地人脸 descriptor，并保存 `{personId, name, privacyAction, descriptor}`。
4. 摄像头或本地视频运行时，MediaPipe 检测多人脸，`FaceTrackManager` 维护短时稳定的 `trackId`。
5. `IdentityTrackBinder` 只对新 track、未知 track 或过期 track 做低频身份识别。
6. 匹配成功后建立 `trackId -> personId -> privacyAction`。
7. `EffectManager` 优先使用身份隐私动作，再考虑手动点击绑定和默认 fallback。

当前 MVP 采用中心化/本地注册表思路：所有参考身份和隐私偏好保存在浏览器前端状态中，用于课程演示和技术验证。DID、链上声明、可信执行环境和厂商级合规协议暂作为远期方向，不纳入本次实现范围。

## 方案调研结论

| 方案 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| MediaPipe Face Landmarker | 速度快，适合 landmarks、姿态估计和 AR 锚点 | 不提供身份识别 embedding | 继续用于多人脸检测、追踪和渲染锚点 |
| `@vladmandic/face-api` | 浏览器端可用，模型可本地托管，支持 128 维 face descriptor | 精度低于 ArcFace/InsightFace，但工程风险低 | 当前 MVP 落地方案 |
| ArcFace/InsightFace + ONNX Runtime Web | 识别精度和技术含金量更高 | 需要人脸对齐、ONNX 预处理和性能调优 | 后续升级方向 |
| 完整 VRM / `@pixiv/three-vrm` 实时渲染 | 数字人生态成熟，可支持骨骼和表情 | 当前项目依赖旧 Three.js r112，升级风险较大；静态全身模型直接叠加容易出现 T-pose 或错位 | 本轮只作为调研和后续方向 |

## 当前实现

- `src/FaceApiIdentityRecognizer.js`
  - 注册参考头像时调用 FaceAPI 检测人脸并提取 128 维 descriptor。
  - 实时视频中，根据 MediaPipe track 的 bounds 裁剪人脸区域，再低频提取 live descriptor。
  - 使用欧氏距离、匹配阈值和最佳/次佳距离差判断是否属于注册人物。
  - provider 标记为 `face-api-face-recognition-net`。

- `src/IdentityTrackBinder.js`
  - 支持异步识别任务。
  - 匹配成功后才建立身份绑定。
  - 已绑定 track 通过短时追踪保持身份，不每帧重复识别。
  - 匹配失败或低于阈值时不绑定隐私动作，避免陌生参考图被误贴到当前人脸。

- `src/EffectFactory.js`
  - 新增 `Allow real appearance`、`Male digital substitute`、`Female digital substitute` 和 `Privacy blur shield` 四类隐私动作。
  - 男性/女性数字替身使用程序化 Three.js 3D 数字头，并叠加柔和阴影、头发体块、五官、材质高光和隐私徽标。
  - 当前替身通过 `face-anchor-full-cover-head` 模式渲染：根据 MediaPipe forehead、chin、cheek landmarks 估算真实脸宽高，并按大头卡通特效方式放大 3D 数字头，覆盖真实人脸、额头和发际线。
  - 旧 Jeeliz 娱乐特效保留为 legacy/fallback 资产，不再作为主界面选择项。

- `src/EffectManager.js`
  - 优先级为 identity privacy binding -> manual track binding -> manual slot binding -> automatic fallback。
  - 暴露 `getRuntimeEffectDebug()`，验证脚本可确认当前真实加载的是 `threejs-full-cover-head`，避免截图和文档不一致。

## 数字替身资产路线

本轮数字替身升级先调研了 `pixiv/three-vrm`、`ToxSam/open-source-avatars` 和 `madjin/vrm-samples` 等开源数字人生态。实际测试后，未采用完整 VRM 作为当前主链路：

1. `100Avatars R1` 的 Robert/Rose 属于 voxel 风格，用作隐私替身后效果偏低像素。
2. ToxSam 的 Orion/Aurora 是全身机甲/机器人模型，直接叠加会出现静态 T-pose 或错位遮挡，不适合当前课程演示。
3. VRoid sample 视觉方向更接近数字人，但完整 `@pixiv/three-vrm` 需要升级 Three.js，并会增加当前多人脸实时管线风险。

最终方案改为：

- 实时端使用本地程序化 Three.js 3D 数字头；
- Three.js r112 负责把头壳、头发、五官、肩颈和徽标挂到人脸锚点，并根据脸部尺度推断数字头覆盖范围；
- 报告中把 VRM 写成调研与后续升级方向，而不是当前已接入能力。

这样可以保证当前截图清晰、稳定、实时，同时避免“代码声称用了 VRM，但视觉仍像低质量小人”的问题。

## 为什么使用“MediaPipe 检测追踪 + FaceAPI 低频识别”

MediaPipe Face Landmarker 的优势是实时检测、关键点和姿态估计；FaceAPI 的优势是提供本地可运行的人脸识别 descriptor。两者组合后可以兼顾实时性和身份正确性：

1. MediaPipe 周期性检测 2-4 张人脸并输出关键点。
2. `FaceTrackManager` 维护短时稳定 track，减少检测槽位变化带来的闪烁。
3. FaceAPI 只在新 track 或身份不确定时做人脸识别，不进入每帧高成本推理。
4. 匹配成功后，后续帧主要复用 `trackId -> personId` 绑定。
5. track 丢失、参考人物修改或绑定重置后再重新识别。

## 当前验收结果

`npm run verify:identity-binding`：

- 注册 `Person A` 和 `Person B` 两张参考头像。
- descriptor provider 均为 `face-api-face-recognition-net`。
- `Person A -> avatarMale`，距离 0.0910。
- `Person B -> avatarFemale`，距离 0.0638。
- 活动 track 数：4。
- 身份绑定 track 数：2。
- FPS：61。
- 可视化截图：`docs/verification-personashield-identity-binding.png`。
- 受保护帧截图：`docs/verification-personashield-protected-frame.png`。

`npm run verify:identity-negative`：

- 注册视频中不存在的 `Stranger -> privacyBlur`。
- 当前 4 个活动 track 的身份绑定数为 0。
- 证明系统不会把陌生参考图错误绑定到当前人物。

## 已知限制

- FaceAPI 是身份匹配组件，不是法律意义上的身份认证系统。
- 单张参考图对姿态、光照和清晰度仍然敏感。
- 小脸、强侧脸、严重遮挡时可能无法提取 descriptor。
- 当前中心化/本地注册表只验证技术闭环，没有解决跨设备信任和厂商强制执行问题。
- 当前数字替身是程序化 3D 数字头，不是完整 VRM 骨骼数字人，也还没有表情重定向。
- 当前没有人体姿态追踪和前景分割，身体覆盖区域由人脸锚点和脸部尺度推断；人物在画面边缘或姿态变化较大时，替身可能被裁切或与真实身体不完全贴合。

## 后续升级

1. 支持每个人上传多张参考图，使用多 descriptor 平均或最近邻匹配。
2. 将 FaceAPI 推理迁移到 Web Worker，减少对 UI 主线程的影响。
3. 增加阈值校准集，输出正负样本距离分布。
4. 替换为 InsightFace/AdaFace/EdgeFace ONNX Runtime Web，提高跨姿态和跨光照识别能力。
5. 升级 Three.js 后接入完整 `@pixiv/three-vrm`，支持骨骼、表情和动画驱动。
6. 引入 MediaPipe Pose 或 Selfie Segmentation，让替身覆盖从人脸锚点推断升级为人体区域/姿态感知覆盖。
7. 扩展受保护视频录制，而不仅是保护帧截图。
