# 参考头像身份绑定技术路线与实现说明

## 目标

PartyFaceAR 的核心改进是把多人脸特效从“按检测顺序、手动点击 track 或自动规则分配”升级为“按注册人物身份分配”：

1. 用户上传人物参考头像。
2. 用户为该人物选择 AR 特效。
3. 系统从参考头像提取真实人脸识别 embedding，并保存 `{personId, name, effectId, descriptor}`。
4. 摄像头或本地视频运行时，MediaPipe 检测多人脸，`FaceTrackManager` 维护短时 `trackId`。
5. `IdentityTrackBinder` 只对新 track、未知 track 或过期 track 做低频身份识别。
6. 匹配成功后建立 `trackId -> personId -> effectId`。
7. `EffectManager` 优先使用身份绑定特效，再考虑手动绑定和自动分配。

## 方案调研结论

本轮调研比较了三条路线：

| 方案 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| MediaPipe Face Landmarker | 当前项目已经使用，速度快，适合 landmarks、姿态和 AR 锚点 | 官方不提供身份识别 embedding，只能做检测/关键点 | 继续用于检测、追踪和渲染锚点 |
| `@vladmandic/face-api` | MIT；浏览器端可用；npm 包包含预训练模型；支持 128 维 face descriptor | 精度低于 ArcFace/InsightFace，但工程风险低 | 当前落地方案 |
| ArcFace/InsightFace + ONNX Runtime Web | 识别精度和简历深挖价值更高 | 需要脸部对齐、ONNX 预处理、模型体积和性能调优 | 后续升级方向 |

最终选择 `@vladmandic/face-api@1.7.15`。它是维护版 face-api，支持浏览器端人脸检测、人脸 landmark、128 维人脸描述子和人脸匹配，并且 npm 包内置模型权重，适合本地静态页面演示。

## 当前实现

- `vendor/face-api/dist/face-api.esm.js`
  - 本地保存 FaceAPI 浏览器端 ESM bundle，不依赖 CDN。

- `vendor/face-api/model/`
  - 保存 `tiny_face_detector`、`face_landmark_68_tiny` 和 `face_recognition` 三组模型权重。

- `src/FaceApiIdentityRecognizer.js`
  - 注册参考头像时，调用 FaceAPI 检测人脸并提取 128 维 descriptor。
  - 实时视频中，根据 MediaPipe track 的 bounds 裁剪人脸区域，再低频提取 descriptor。
  - 使用欧氏距离、匹配阈值和最佳/次佳距离差判断是否属于注册人物。
  - provider 标记为 `face-api-face-recognition-net`。

- `src/IdentityTrackBinder.js`
  - 支持异步识别任务。
  - 识别中显示 `recognizing`，匹配成功后才建立身份绑定。
  - 匹配失败或低于阈值时不绑定 identity effect，避免陌生参考图误贴到任意人脸。
  - 已绑定 track 通过短时追踪保持身份，不每帧重复识别。

- `src/EffectManager.js`
  - 优先级为 identity binding -> manual track binding -> manual slot binding -> automatic fallback。

- `src/UIController.js`
  - 展示注册人物、参考头像、所选特效、识别状态和匹配距离。

## 数据流

```mermaid
flowchart LR
  A["上传参考头像"] --> B["FaceAPI TinyFaceDetector"]
  B --> C["FaceAPI 68 点 landmark 对齐"]
  C --> D["FaceRecognitionNet 128 维 descriptor"]
  D --> E["ReferenceFaceManager"]
  E --> F["personId + effectId + descriptor"]

  G["本地视频或摄像头"] --> H["MediaPipe Face Landmarker"]
  H --> I["FaceTrackManager 短时 track"]
  I --> J["按 track 裁剪人脸 crop"]
  J --> K["FaceAPI 128 维 live descriptor"]
  F --> L["IdentityTrackBinder"]
  K --> L
  L --> M["trackId -> personId -> effectId"]
  M --> N["EffectManager"]
  N --> O["Three.js AR 渲染"]
```

## 为什么使用“MediaPipe 检测追踪 + FaceAPI 低频识别”

MediaPipe Face Landmarker 的优势是实时检测、关键点和姿态估计，适合 AR 特效锚定；FaceAPI 的优势是真实身份 embedding。两者组合后可以兼顾实时性和身份正确性：

1. MediaPipe 周期性检测 2-4 张人脸并输出 468 点关键点。
2. `FaceTrackManager` 维护短时稳定 track，减少检测槽位变化带来的闪烁。
3. FaceAPI 只在新 track 或身份不确定时做人脸识别，不进入每帧高成本推理。
4. 匹配成功后，后续帧主要复用 `trackId -> personId` 绑定。
5. track 丢失、参考人物修改或绑定重置后再重新识别。

这条路线比单纯 landmark 几何匹配更能满足“注册 A 的照片，只给 A 加特效”的目标，同时仍能保持多人脸 AR 渲染流畅。

## 当前验收结果

`npm run verify:identity-binding`：

- 注册 `Person A` 和 `Person B` 两张参考头像。
- 两人 descriptor provider 均为 `face-api-face-recognition-net`。
- descriptor 长度均为 128。
- `Track 1 -> Person A -> glasses`，距离 0.0910。
- `Track 3 -> Person B -> tiger`，距离 0.0638。
- 活动 track 数：4。
- 身份绑定 track 数：2。
- 可视化截图：`docs/verification-identity-binding.png`。

`npm run verify:identity-negative`：

- 从另一张候选图片中裁剪陌生人参考图并注册为 `Stranger -> werewolf`。
- descriptor provider 为 `face-api-face-recognition-net`，长度 128。
- 当前 `partyHats4` 视频中有 4 个活动 track。
- 身份绑定 track 数：0。
- 已识别到的最佳距离为 0.9144，高于阈值，因此拒绝绑定。
- 可视化截图：`docs/verification-identity-negative.png`。
- 陌生参考图：`docs/verification-stranger-reference.png`。

## 已知限制

- FaceAPI 不是身份认证系统，不能用于门禁、安全支付等高风险场景。
- 单张参考图对姿态、光照和清晰度仍然敏感。
- 小脸、强侧脸、严重遮挡时可能无法提取 descriptor，系统会保持未绑定状态。
- 当前识别任务在主线程串行执行，首次加载模型和首次注册会较慢。

## 后续升级

1. 支持每个人上传多张参考图，使用多 descriptor 平均或最近邻匹配。
2. 将 FaceAPI 推理迁移到 Web Worker，减少对 UI 主线程的影响。
3. 增加阈值校准集，输出正负样本距离分布。
4. 后续替换为 InsightFace/ArcFace ONNX Runtime Web，提高跨姿态和跨光照识别能力。
