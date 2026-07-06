# PersonaShield

> 面向 AI 眼镜第一视角拍摄场景的本地 WebAR 隐私保护原型。

PersonaShield 由多人脸 AR 特效 Demo 改造而来，核心目标不再是娱乐滤镜，而是验证一套隐私保护流程：**被拍摄者预先注册身份并声明隐私偏好，合规拍摄端在实时画面中自动用数字替身或隐私遮挡替换其真实容貌。**

本项目定位为课程与作品集 Demo，**不是**生产级身份认证系统。它以静态网页形式在本地运行，无需后端服务、云端人脸 API、数据库，也不接入真实 AI 眼镜硬件。

## 在线演示

- 主原型：<https://juedouwang.github.io/FaceAR/mediapipe-ar.html>
- MediaPipe 检测筛查页：<https://juedouwang.github.io/FaceAR/mediapipe-verify.html>

> 摄像头访问要求 HTTPS 安全上下文，因此 GitHub Pages 地址可直接调用浏览器摄像头，无需本地起服务。

## 设计理念

目标场景是 AI 眼镜的第一视角拍摄。智能眼镜让拍摄变得比手机更隐蔽，但目前多数隐私机制仍停留在拍摄提示灯或设备权限层面。PersonaShield 探索一种更强的、站在被拍摄者一侧的思路：

```text
注册身份 → 隐私偏好 → 实时人脸识别 → 数字替身渲染
```

当已注册且选择保护的人物出现在画面中时，预览和导出的受保护帧会显示数字替身或隐私遮挡，而不是其真实容貌。

## 核心功能

- 基于 **MediaPipe Face Landmarker** 检测并追踪最多 4 张人脸。
- 从本地参考图注册受保护身份。
- 使用本地 **FaceAPI** 模型，从参考图和低频采样的实时人脸裁剪中提取 128 维人脸描述符。
- 通过「MediaPipe 高频追踪 + FaceAPI 低频识别」将身份绑定到稳定的短期人脸轨迹，避免每帧都跑一次识别。
- 每个身份可选择一种隐私动作：

  | 动作 | 说明 |
  | --- | --- |
  | 保留真实容貌 | 不做处理 |
  | 男性数字替身 | Kenney CC0 头部模型替换 |
  | 女性数字替身 | Kenney CC0 头部模型替换 |
  | Agni 痛苦表情脸 | 本地私有素材遮盖 |
  | 隐私模糊护盾 | 模糊遮挡 |

- 男/女数字替身使用 Kenney CC0 开源素材提取出的 GLB 头部模型做实时覆盖渲染；模型加载失败时回退到程序化生成的 Three.js 3D 头部。
- 支持手动点选人脸并临时指定隐私动作，作为演示与兜底手段。
- 显示每条轨迹的状态、匹配身份、距离、FPS 和活跃人脸数。
- 通过合成视频层与隐私叠加层，导出受保护的 PNG 画面帧。
- 提供正例身份绑定、陌生人负例拒绝、手动绑定和性能 profile 的自动化验证脚本。

## 架构

```text
参考图
  → FaceAPI 本地描述符
  → ReferenceFaceManager
  → personId + 隐私动作 + descriptor

摄像头 / 本地视频
  → MediaPipe Face Landmarker
  → FaceTrackManager 短期追踪
  → IdentityTrackBinder 低频识别
  → EffectManager 隐私动作绑定
  → Kenney GLB 头部 / 程序化回退 / 隐私遮挡渲染
```

MediaPipe 负责多人脸检测、关键点与追踪锚点；FaceAPI 负责本地人脸识别描述符。身份绑定器把低频识别与高频追踪结合起来，因此浏览器无需每帧重跑人脸识别。

## 数字替身说明

实时替身采用 Kenney `Animated Characters Protagonists` 素材包中的 CC0 资源。原始 FBX 已转换为 GLB 并精简为纯头部网格，以便通过现有的 Three.js r112 `GLTFLoader` 加载。渲染器保留了 `avatarMale` / `avatarFemale` 动作 ID，内部走 `kenney-glb-head-only` 路径：

- 加载精简后的 Kenney 头部 GLB，并贴上男 / 女皮肤纹理；
- 依据 MediaPipe 的额头、下巴、脸颊关键点做尺寸拟合；
- 放大为夸张的卡通头，以覆盖真实的额头与发际线，而不仅是内脸；
- 若 GLB 加载或素材失败，回退到程序化的全覆盖 Three.js 头部。

这适用于本地课程 Demo，但尚未实现完整的表情重定向、身体姿态追踪、视频前景分割或完整的 VRM 数字人运行时。

## 本地私有人脸素材

`Agni 痛苦表情脸` 实现为本地私有素材加载器，运行时读取：

```text
assets/private/agni-pain-face.png
```

该目录已被 `.gitignore` 忽略。这样本地课堂 Demo 可以使用梗图 / 参考图，而公开的 GitHub 仓库只包含加载代码和文档，不包含受版权保护的图片本身。

我们也调研并测试了开源虚拟形象生态（`pixiv/three-vrm`、`ToxSam/open-source-avatars`、`madjin/vrm-samples` 及 Kenney CC0 角色包）。当前实现选用 Kenney 半身像作为主要运行时替身，因为它轻量、可再分发，且兼容现有 Three.js r112 管线。完整的 VRM 运行时集成留作后续升级。

## 本地运行

```powershell
cd PartyFaceAR
python -m http.server 8000
```

打开：

- 主原型：<http://127.0.0.1:8000/mediapipe-ar.html>
- 暂停验证帧：<http://127.0.0.1:8000/mediapipe-ar.html?video=partyHats4&profile=privacy&pauseAt=0.25>
- MediaPipe 检测筛查页：<http://127.0.0.1:8000/mediapipe-verify.html>

> 大多数浏览器要求摄像头运行在 `localhost`、`127.0.0.1` 或 HTTPS 下。

## 测试

```powershell
npm test                        # 单元测试
npm run screen:mediapipe        # MediaPipe 视频筛查
npm run verify:mediapipe-ar     # AR 运行时验证
npm run verify:manual-binding   # 手动绑定验证
npm run verify:identity-binding # 身份绑定正例
npm run verify:identity-negative# 陌生人负例拒绝
npm run profile:mediapipe-ar    # 性能 profile
npm run verify:all              # 全部串行执行
```

验证脚本会在 `docs/` 下生成截图，包括身份绑定、陌生人负例拒绝、手动隐私动作绑定和 MediaPipe 运行时检查。

## 目录结构

```text
PartyFaceAR/
├── index.html              # 入口，重定向到 mediapipe-ar.html
├── mediapipe-ar.html       # 主原型页面
├── mediapipe-verify.html   # MediaPipe 检测筛查页
├── src/                    # 前端源码（ES module）
├── assets/                 # 数字替身与素材（private/ 不入库）
├── samples/                # 演示用视频样本
├── vendor/                 # 第三方运行时（Three.js、FaceAPI 等）
├── tools/                  # Playwright 验证与筛查脚本
├── tests/                  # 单元测试
└── docs/                   # 验证截图与设计文档
```

## 许可

`vendor/jeeliz` 下复制的 Jeeliz 运行时文件保留其原始 Apache-2.0 许可。本项目层同样以 Apache-2.0 兼容方式发布。
