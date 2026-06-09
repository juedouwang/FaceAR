# PersonaShield 验证结果汇总

生成位置：本地 PersonaShield 工程（当前目录名 `PartyFaceAR`）。
生成日期：2026-06-09。

## 当前目标状态

项目已从原来的“多人脸差异化 AR 特效 Demo”改造为：

**PersonaShield：基于数字替身的身份感知视频隐私防护原型**

当前版本支持：

- 本地参考人脸注册；
- FaceAPI 128 维 descriptor 身份匹配；
- MediaPipe 多人脸检测、关键点和短时追踪；
- `personId -> trackId -> privacyAction` 绑定；
- `Allow real appearance`、`Male digital substitute`、`Female digital substitute`、`Agni-style pain face`、`Privacy blur shield` 五类隐私动作；
- Kenney CC0 GLB 头部/肩颈数字替身渲染，程序化 Three.js 数字头作为 fallback；
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
- 验证页面：`http://127.0.0.1:8000/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25`

## 已验证命令

```powershell
npm test
npm run verify:agni-face
npm run verify:identity-binding
npm run verify:all
```

本轮重新生成：

- `docs/verification-personashield-identity-binding.png`
- `docs/verification-personashield-protected-frame.png`
- `docs/avatar-candidate-screenshots/kenney-head-bust-render.png`

`docs/verification-agni-pain-face.png` 属于本地私有素材截图，已通过 `.gitignore` 排除，不上传公开仓库。

## 自动化验证结果

| 验证项 | 结果 |
| --- | --- |
| 身份绑定正例 | `Person A -> avatarMale`，`Person B -> avatarFemale`，共 2 个身份绑定 track |
| 活动人脸数量 | 4 个 active tracks |
| FPS | 身份绑定验证约 57-58；性能 profile 平均约 65 FPS，满足 24 FPS 以上实时性要求 |
| 参考图 descriptor | provider 为 `face-api-face-recognition-net`，长度 128 |
| 男性替身渲染 | `avatarRenderer = kenney-glb-head-bust`，`avatarLoadState = kenney-glb-loaded`，`avatarCoverage = face-anchor-full-cover-head` |
| 女性替身渲染 | `avatarRenderer = kenney-glb-head-bust`，`avatarLoadState = kenney-glb-loaded`，`avatarCoverage = face-anchor-full-cover-head` |
| 受保护帧输出 | 成功导出 `verification-personashield-protected-frame.png` |

## 可视化证据

- `docs/verification-personashield-identity-binding.png`：注册 `Person A/B` 后，系统分别绑定男性/女性 Kenney CC0 数字替身；右侧显示参考头像、隐私动作、识别距离和 track 状态。
- `docs/verification-personashield-protected-frame.png`：最终导出的保护帧只包含视频画面和隐私替身层，不包含右侧 UI；已识别人物的真实脸、额头和发际线被数字替身覆盖。
- `docs/avatar-candidate-screenshots/kenney-head-bust-render.png`：Kenney 头部/肩颈半身像的独立渲染预览，用于说明开源资产来源和视觉形态。
- `docs/verification-personashield-negative.png`：注册视频中不存在的 `Stranger` 后，当前视频中的活动人脸没有被错误绑定。
- `docs/verification-manual-privacy-action.png`：点击画面中的某个 face box 后，手动将该 track 设置为 `Privacy blur shield`。

## 身份绑定正例流程

`npm run verify:identity-binding` 自动完成以下流程：

1. 打开 `mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25`。
2. 等待至少 2 个活动人脸 track。
3. 从暂停帧中裁剪两张人脸，作为 `Person A` 和 `Person B` 的参考图。
4. 通过页面上传控件注册两个受保护身份。
5. 为 `Person A` 选择 `Male digital substitute`。
6. 为 `Person B` 选择 `Female digital substitute`。
7. 使用 FaceAPI 提取 128 维 descriptor。
8. 验证两个活动 track 分别绑定到两个不同人物和两个不同隐私动作。
9. 等待 Kenney GLB 模型实际加载完成。
10. 输出整页截图和受保护帧截图。

## 已知限制

- 当前是本地 WebAR 原型，不接入真实 AI 眼镜硬件或 SDK。
- FaceAPI 身份识别是技术匹配，不是法律意义上的身份认证。
- 单张参考图仍受姿态、光照和清晰度影响。
- 当前只能约束合规拍摄端，无法阻止未接入协议的设备。
- 当前数字替身是 Kenney CC0 头部/肩颈半身像，不是完整 VRM 骨骼数字人，也没有表情重定向。
- 当前没有人体姿态追踪或前景分割，身体覆盖范围由人脸关键点和脸部尺寸推断。
