# 验证结果汇总

生成位置：本地 `PartyFaceAR` 工作区。生成日期：2026-06-02。

## 当前目标状态

项目目标为“基于参考头像的人脸身份绑定 AR 特效系统”：用户上传人物 A/B 的参考头像并选择对应特效；系统在摄像头或视频中识别 A/B，并自动为其叠加对应特效。

当前代码已经完成工程级身份绑定链路：多人脸检测、短时追踪、不同特效渲染、点击选脸、track 级手动绑定、FaceAPI 128 维人脸 descriptor、`trackId -> personId -> effectId` 身份级特效绑定，以及陌生参考图误绑定回归测试。

说明：MediaPipe 负责实时多人脸检测、关键点和 AR 锚点；`@vladmandic/face-api` 负责真实人脸识别 embedding。当前实现不是安全身份认证系统，但已经不再使用单纯 landmark 几何相似度作为身份判断。

## 本地运行地址

```powershell
cd "D:\研究生文件\20_Areas\研究生课程\增强现实与高级图形学\PartyFaceAR"
python -m http.server 8000
```

- 主页面：`http://127.0.0.1:8000/mediapipe-ar.html`
- 身份绑定正例验证页：`http://127.0.0.1:8000/mediapipe-ar.html?video=partyHats4&profile=showcase&pauseAt=0.25`

## 已验证命令

```powershell
npm test
npm run screen:mediapipe
npm run verify:mediapipe-ar
npm run verify:manual-binding
npm run verify:identity-binding
npm run verify:identity-negative
npm run profile:mediapipe-ar
```

## 基础层量化结果

| 验证项 | 结果 |
| --- | --- |
| Track/effect/identity 单元测试 | 通过，包含异步识别和陌生人不绑定测试 |
| MediaPipe 视频筛选 | `party-hats-crop-wide_faces.webm` 在 33/33 个采样帧中达到 4 张脸 |
| 暂停帧浏览器验证 | 4 个活动 track，60 FPS |
| 实时浏览器验证 | 4 个活动 track，61 FPS |
| 手动点击选脸绑定验证 | 4 个活动 track；点击 `Track 1 / Face 1` 后绑定为 `Jeeliz tiger mask`；页面进入 manual 模式 |
| 身份绑定正例 | `Person A/B` 均为 FaceAPI 128 维 descriptor；2 个身份绑定 track；61 FPS |
| 身份绑定负例 | 注册陌生人参考头像后，4 个活动 track 中身份绑定数为 0 |
| 性能统计 | p50 FPS 58.817，平均 FPS 57.781 |
| 活动人脸数量统计 | p50 活动人脸数 4，平均活动人脸数 3.813 |

## 可视化证据

- `docs/verification-mediapipe-ar-showcase.png`：暂停帧结果，展示 4 张人脸、不同特效、HUD 中的 track/slot 和 FPS。
- `docs/verification-mediapipe-ar-realtime-current.png`：实时播放结果，展示 4 张活动人脸和 50 FPS 以上实时渲染。
- `docs/verification-manual-face-binding.png`：点击选脸并手动指定特效的结果，展示被高亮选中的人脸框、Manual 模式和右侧当前选中状态。
- `docs/verification-identity-binding.png`：参考头像身份绑定正例，展示注册人物列表、track 身份状态和两名人物的不同身份级特效。
- `docs/verification-identity-negative.png`：陌生参考图负例，展示陌生人已注册但当前视频无人被绑定为该身份。
- `docs/verification-reference-person-a.png` 和 `docs/verification-reference-person-b.png`：正例自动化验证中通过上传控件注册的两张参考头像。
- `docs/verification-stranger-reference.png`：负例自动化验证中注册的陌生人参考头像。
- `docs/party-face-ar-showcase-demo.webm`：动态演示视频，用于展示连续画面中的检测、追踪和特效跟随。

## 身份绑定正例结果

`npm run verify:identity-binding` 的自动化流程：

1. 打开本地 `mediapipe-ar.html?video=partyHats4&profile=showcase&pauseAt=0.25`。
2. 等待至少 2 个活动人脸 track。
3. 从暂停帧中裁剪两张人脸 PNG 作为参考头像来源。
4. 通过页面上传控件注册 `Person A` 和 `Person B`，分别绑定 `glasses` 和 `tiger`。
5. 使用 FaceAPI 提取 128 维 descriptor。
6. 验证两个活跃 track 绑定到两个不同人物和两个不同特效。
7. 输出可视化截图。

本次结果：

- `Person A`：provider 为 `face-api-face-recognition-net`，descriptor 长度 128，绑定 `Jeeliz mirrored sunglasses`，距离 0.0910。
- `Person B`：provider 为 `face-api-face-recognition-net`，descriptor 长度 128，绑定 `Jeeliz tiger mask`，距离 0.0638。
- 活动 track 数：4。
- 身份绑定 track 数：2。
- FPS：61。

## 身份绑定负例结果

`npm run verify:identity-negative` 的自动化流程：

1. 打开同一个本地验证视频。
2. 从 `docs/candidate-frames/pool.jpg` 裁剪一张视频中不存在的陌生人参考图。
3. 注册 `Stranger -> werewolf`。
4. 等待 FaceAPI 对当前活动 track 做身份识别。
5. 验证当前视频中的 4 个活动 track 均没有绑定到 `Stranger`。

本次结果：

- `Stranger`：provider 为 `face-api-face-recognition-net`，descriptor 长度 128。
- 活动 track 数：4。
- 身份绑定 track 数：0。
- 四个活动 track 均为 `below-threshold`，最佳拒绝距离范围约 0.7378-0.9144，高于阈值 0.5。

## 已知限制

- FaceAPI 识别不是身份认证，不能用于门禁、安全支付等场景。
- 单张参考图对姿态、光照、清晰度和遮挡较敏感。
- 当前 FaceAPI 推理在主线程串行执行，首次加载模型和首次注册会比几何 descriptor 慢。
- 小脸或强侧脸可能无法提取 descriptor，此时系统会保持未绑定，而不是强行贴上身份特效。
- 当前交付范围是本地静态演示，公网部署不作为验收要求。
