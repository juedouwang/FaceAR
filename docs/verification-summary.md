# PersonaShield 验证结果汇总

生成位置：本地 PersonaShield 工程（当前目录名 `PartyFaceAR`）。生成日期：2026-06-05。

## 当前目标状态

项目已从原来的“多人脸差异化 AR 特效 Demo”改造为：

**PersonaShield：面向 AI 眼镜拍摄场景的数字替身隐私防护原型。**

当前版本支持：

- 本地参考人脸注册；
- FaceAPI 128 维 descriptor 身份匹配；
- MediaPipe 多人脸检测、关键点和短时追踪；
- `personId -> trackId -> privacyAction` 绑定；
- 男性数字替身、女性数字替身、隐私遮挡和允许真实出镜四类隐私动作；
- 点击选脸后的手动隐私动作绑定；
- 受保护画面截图输出；
- 正例身份绑定和陌生参考图负例拒绝测试。

## 本地运行地址

```powershell
cd "D:\研究生文件\20_Areas\研究生课程\增强现实与高级图形学\PartyFaceAR"
python -m http.server 8000
```

- 主页面：`http://127.0.0.1:8000/mediapipe-ar.html`
- 验证页：`http://127.0.0.1:8000/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25`

## 已验证命令

```powershell
npm run verify:all
```

该命令包含：

```powershell
npm test
npm run screen:mediapipe
npm run verify:mediapipe-ar
npm run verify:manual-binding
npm run verify:identity-binding
npm run verify:identity-negative
npm run profile:mediapipe-ar
```

## 自动化验证结果

| 验证项 | 结果 |
| --- | --- |
| 单元测试 | 通过，覆盖 tracking、隐私动作 fallback、ReferenceFaceManager、异步身份识别和负例不绑定 |
| MediaPipe 视频筛选 | `party-hats-crop-wide_faces.webm` 达到 4 张脸，`birthday-party-hats-mixkit-4608.mp4` 达到 3 张脸 |
| 主浏览器验证 | 4 个活动 track，暂停帧 FPS 60 |
| 手动隐私动作绑定 | 点击 `Track 1 / Face 1` 后绑定 `Privacy blur shield`，页面进入 manual 模式 |
| 身份绑定正例 | `Person A -> avatarMale`，`Person B -> avatarFemale`，2 个身份绑定 track，FPS 58 |
| 身份绑定负例 | 注册 `Stranger -> privacyBlur` 后，4 个活动 track 的身份绑定数为 0 |
| 受保护帧输出 | 成功导出 `verification-personashield-protected-frame.png` |
| 性能 profile | p50 FPS 66.796，avg FPS 66.416，p50 活动人脸数 4 |

## 可视化证据

- `docs/verification-mediapipe-ar-privacy.png`：主界面暂停帧，展示 4 个活动 track、默认 `Allow real appearance`、FPS 和 HUD。
- `docs/verification-manual-privacy-action.png`：手动点击选脸后，为指定 track 应用 `Privacy blur shield`。
- `docs/verification-personashield-identity-binding.png`：注册 `Person A/B` 后，分别绑定男性/女性数字替身。
- `docs/verification-personashield-protected-frame.png`：合成后的受保护画面输出，只包含视频和隐私替身层，不包含右侧 UI。
- `docs/verification-personashield-negative.png`：注册陌生参考图后，当前视频人脸不被错误绑定。
- `docs/verification-reference-person-a.png` 和 `docs/verification-reference-person-b.png`：自动化正例中裁剪出的参考人脸。
- `docs/verification-stranger-reference.png`：自动化负例中使用的陌生参考人脸。

## 身份绑定正例详情

`npm run verify:identity-binding` 自动完成以下流程：

1. 打开 `mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25`。
2. 等待至少 2 个活动人脸 track。
3. 从暂停帧中裁剪两张人脸，作为 `Person A` 和 `Person B` 的参考图。
4. 通过页面上传控件注册两个受保护身份。
5. 为 `Person A` 选择 `Male digital substitute`。
6. 为 `Person B` 选择 `Female digital substitute`。
7. 使用 FaceAPI 提取 128 维 descriptor。
8. 验证两个活动 track 分别绑定到两个不同人物和两个不同隐私动作。
9. 输出整页截图和受保护帧截图。

本次结果：

- `Person A`：provider 为 `face-api-face-recognition-net`，descriptor 长度 128，绑定 `avatarMale`，距离 0.0910。
- `Person B`：provider 为 `face-api-face-recognition-net`，descriptor 长度 128，绑定 `avatarFemale`，距离 0.0638。
- 活动 track 数：4。
- 身份绑定 track 数：2。
- FPS：58。

## 身份绑定负例详情

`npm run verify:identity-negative` 自动完成以下流程：

1. 打开同一验证视频。
2. 从 `docs/candidate-frames/pool.jpg` 裁剪一张当前视频中不存在的陌生人参考图。
3. 注册 `Stranger -> Privacy blur shield`。
4. 等待 FaceAPI 对当前活动 track 做身份识别。
5. 验证当前视频中的 4 个活动 track 均没有绑定到 `Stranger`。

本次结果：

- `Stranger`：provider 为 `face-api-face-recognition-net`，descriptor 长度 128。
- 活动 track 数：4。
- 身份绑定 track 数：0。
- 4 个活动 track 均为 `below-threshold`。
- 距离范围约 0.7378-0.9144，高于阈值 0.5。

## 性能结果

`npm run profile:mediapipe-ar` 采样 37 次：

- 后端：worker 37/37。
- FPS：min 60.162，p50 66.796，p90 70.819，max 76.004，avg 66.416。
- 检测耗时：p50 51.500 ms。
- worker round trip：p50 57.000 ms。
- 活动人脸：min 3，p50 4，avg 3.811。
- jitter：p50 0.021，avg 0.036。

## 已知限制

- 当前是本地 WebAR 原型，不接入真实 AI 眼镜硬件。
- FaceAPI 身份识别不是法律意义上的身份认证。
- 单张参考图仍受光照、姿态、清晰度影响。
- 当前只能约束合规拍摄端，无法阻止不接入协议的设备。
- 数字替身已升级为程序化高质感 3D 卡通半身 avatar，可继续增强表情、骨骼动画和自定义外观。
- 当前输出为受保护 PNG 帧，后续可扩展为受保护视频录制。
