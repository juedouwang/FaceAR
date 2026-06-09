# PersonaShield 验证结果汇总

生成位置：本地 PersonaShield 工程（当前目录名 `PartyFaceAR`）。生成日期：2026-06-06。

## 当前目标状态

项目已从原来的“多人脸差异化 AR 特效 Demo”改造为：

**PersonaShield：面向 AI 眼镜拍摄场景的数字替身隐私防护原型**

当前版本支持：

- 本地参考人脸注册；
- FaceAPI 128 维 descriptor 身份匹配；
- MediaPipe 多人脸检测、关键点和短时追踪；
- `personId -> trackId -> privacyAction` 绑定；
- 男性数字替身、女性数字替身、隐私遮挡和允许真实出镜四类隐私动作；
- 程序化 Three.js 3D 数字头替身渲染；
- 基于人脸锚点推断的 `face-anchor-full-cover-head` 覆盖模式；
- `Agni-style pain face` 本地私有素材覆盖动作，素材从 `assets/private/agni-pain-face.png` 加载；
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
npm run verify:identity-binding
npm run verify:agni-face
```

本轮重新生成：

- `docs/verification-personashield-identity-binding.png`
- `docs/verification-personashield-protected-frame.png`
- `docs/verification-agni-pain-face.png`（本地私有素材截图，已加入 `.gitignore`，不上传公开仓库）

## 自动化验证结果

| 验证项 | 结果 |
| --- | --- |
| 身份绑定正例 | `Person A -> avatarMale`，`Person B -> avatarFemale`，2 个身份绑定 track |
| 活动人脸数量 | 4 个 active tracks |
| FPS | 58-61（多次验证波动） |
| 参考图 descriptor | provider 为 `face-api-face-recognition-net`，长度 128 |
| 男性替身渲染 | `avatarRenderer = threejs-full-cover-head`，`avatarSource = Procedural 3D male head`，`avatarCoverage = face-anchor-full-cover-head` |
| 女性替身渲染 | `avatarRenderer = threejs-full-cover-head`，`avatarSource = Procedural 3D female head`，`avatarCoverage = face-anchor-full-cover-head` |
| 阿格尼痛苦脸本地素材 | `avatarRenderer = local-private-face-asset`，`avatarCoverage = face-mask-private-asset`，手动绑定到 Track 1 |
| 受保护帧输出 | 成功导出 `verification-personashield-protected-frame.png` |

## 可视化证据

- `docs/verification-personashield-identity-binding.png`：注册 `Person A/B` 后，分别绑定男性/女性 3D 数字头替身。
- `docs/verification-personashield-protected-frame.png`：合成后的受保护画面输出，只包含视频和隐私替身层，不包含右侧 UI；已识别人物由 3D 数字头替身覆盖真实脸。
- `docs/verification-agni-pain-face.png`：本地私有阿格尼痛苦脸素材覆盖人脸的手动绑定截图。该截图包含私有素材，仅用于本地报告和课堂演示。
- `docs/verification-personashield-negative.png`：注册陌生参考图后，当前视频人脸不被错误绑定。
- `docs/verification-manual-privacy-action.png`：手动点击选脸后，为指定 track 应用 `Privacy blur shield`。
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
- FPS：58-61（多次验证波动）。

## 已知限制

- 当前是本地 WebAR 原型，不接入真实 AI 眼镜硬件。
- FaceAPI 身份识别不是法律意义上的身份认证。
- 单张参考图仍受光照、姿态、清晰度影响。
- 当前只能约束合规拍摄端，无法阻止不接入协议的设备。
- 当前数字替身为程序化 3D 数字头；完整 VRM 骨骼、表情重定向和动画仍是后续升级方向。
- 当前没有人体姿态追踪或前景分割，身体覆盖范围由人脸锚点和脸部尺度推断。
