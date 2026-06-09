# PersonaShield 中文报告框架

## 题目建议

**基于数字替身的身份感知视频隐私防护原型**

副标题：**面向 AI 眼镜第一视角拍摄场景**

## 1. 项目背景

AI 眼镜和智能眼镜将摄像头集成在眼镜本体上，拍摄动作比手机更自然、更隐蔽。传统手机拍摄通常需要举起设备，被拍摄者更容易察觉；而第一视角眼镜拍摄可能让旁观者难以及时判断自己是否正在被记录。

现有产品多依赖录制指示灯、权限提示或平台规则，但这些机制主要服务于拍摄者设备管理，较少体现被拍摄者对自身真实形象的主动控制。

PersonaShield 原型验证一种更主动的隐私保护机制：被拍摄者可提前注册参考人脸、选择数字替身并设置隐私偏好；当合规拍摄端检测到已注册身份时，系统在本地预览和输出画面中将该人物区域替换为数字人替身或隐私遮挡。

## 2. 问题定义

给定若干注册身份和一段摄像头/本地视频输入，系统需要完成：

1. 用户上传参考人脸图像，注册受保护身份。
2. 用户为每个身份选择隐私动作：允许真实出镜、男性数字替身、女性数字替身或隐私遮挡。
3. 系统从参考图中本地提取人脸 descriptor，并保存 `{personId, privacyAction, embedding}`。
4. 系统在视频中检测 2-4 张人脸，并维护短时稳定的 `trackId`。
5. 当新 track 出现或身份不确定时，低频执行人脸识别匹配。
6. 如果匹配到注册身份，则建立 `personId -> trackId -> privacyAction` 绑定。
7. 后续帧依靠 track 追踪保持绑定稳定，并渲染对应数字替身或遮挡。
8. 生成可视化截图，证明最终保护画面不再只是原始视频。

## 3. 系统架构

```mermaid
flowchart LR
  A["参考人脸上传"] --> B["FaceAPI 本地 descriptor"]
  B --> C["ReferenceFaceManager"]
  C --> D["personId + privacyAction + embedding"]

  E["摄像头或本地视频"] --> F["MediaPipe Face Landmarker"]
  F --> G["多人脸关键点与人脸区域"]
  G --> H["FaceTrackManager 短时追踪"]
  H --> I["IdentityTrackBinder 低频识别"]
  D --> I
  I --> J["EffectManager 隐私动作绑定"]
  J --> K["Three.js 数字替身/隐私遮挡"]
  K --> L["受保护预览画面"]
  L --> M["保护帧截图输出"]
```

系统采用纯前端静态网页实现。MediaPipe 负责人脸检测、关键点和 AR 锚点；FaceAPI 负责参考图和实时 track crop 的 128 维人脸 descriptor；IdentityTrackBinder 将识别结果绑定到短时 track；EffectManager 将原本的娱乐特效绑定扩展为隐私动作绑定。

## 4. 核心模块

- `MediaPipeFaceSource`：最多检测 4 张人脸，输出关键点、姿态和人脸区域。
- `FaceTrackManager`：将检测结果关联成稳定 track，处理短暂丢失、恢复和槽位交换。
- `FaceApiIdentityRecognizer`：加载本地 FaceAPI 模型，提取 128 维 descriptor 并计算距离。
- `ReferenceFaceManager`：保存注册身份、参考头像、隐私动作、avatar 类型和 descriptor。
- `IdentityTrackBinder`：负责 `personId -> trackId -> privacyAction` 的低频识别与绑定。
- `EffectFactory`：新增隐私动作，并渲染 Kenney CC0 GLB 数字替身、程序化 fallback 或隐私遮挡。
- `UIController`：提供身份注册、隐私动作选择、点击选脸、track 状态和截图输出。

## 5. 检测、识别与追踪策略

浏览器端每帧做人脸识别会影响实时性，因此项目采用分层策略：

1. 检测层：MediaPipe 周期性检测多张人脸。
2. 追踪层：根据屏幕位置、尺寸和槽位维护稳定 track。
3. 识别层：只在新 track 或身份不确定时进行 FaceAPI descriptor 匹配。
4. 绑定层：匹配成功后建立身份到 track 的隐私动作绑定。
5. 渲染层：连续帧直接根据 track 绑定渲染数字替身，避免每帧重复识别。

## 6. 隐私动作设计

| 动作 | 含义 | 展示效果 |
| --- | --- | --- |
| Allow real appearance | 允许真实形象出镜 | 不遮挡 |
| Male digital substitute | 使用男性数字替身 | Kenney CC0 男性角色头部/肩颈半身像，按人脸关键点放大覆盖真实头部；模型加载失败时退回程序化 3D 数字头 |
| Female digital substitute | 使用女性数字替身 | Kenney CC0 女性角色头部/肩颈半身像，按人脸关键点放大覆盖真实头部；模型加载失败时退回程序化 3D 数字头 |
| Privacy blur shield | 隐私遮挡 | 马赛克/遮挡式保护 |

本轮曾调研 `pixiv/three-vrm`、`ToxSam/open-source-avatars`、`madjin/vrm-samples` 和 Kenney CC0 角色资源。实际测试后发现，部分 VRM 是 voxel 风格，部分模型是全身 T-pose/机甲风格，直接叠加到当前多人脸 WebAR 管线中容易出现错位或观感不稳定。最终选择 Kenney `Animated Characters Protagonists` 中的 CC0 角色资源，将 FBX 转换为 GLB，并提取头部、颈部和上肩区域作为当前主数字替身；完整 VRM 数字人作为后续升级方向。

当前数字人替身采用 `face-anchor-full-cover-head` 覆盖方式：系统先识别人脸身份，再根据 MediaPipe forehead、chin、cheek landmarks 估算真实脸宽高，把 Kenney 头部半身像放在真实脸前方并放大。它已经能在画面中覆盖被保护者真实脸、额头和发际线，但不是人体姿态追踪、前景分割或完整表情重定向。

## 7. 可视化结果

运行地址：

```text
http://127.0.0.1:8000/mediapipe-ar.html
```

关键截图：

![PersonaShield 主界面与身份绑定](./verification-personashield-identity-binding.png)

图 1：注册 `Person A` 和 `Person B` 后，系统将两名已识别人物分别绑定到男性/女性 3D 数字头替身；右侧显示参考头像、隐私动作、识别距离和 track 状态。

![受保护输出帧](./verification-personashield-protected-frame.png)

图 2：最终导出的保护帧只包含视频画面和隐私替身层，不包含右侧 UI。被保护者头部到身体区域已被数字人替身覆盖。

![陌生参考图不误绑定](./verification-personashield-negative.png)

图 3：注册视频中不存在的 `Stranger` 后，当前视频中的活动人脸没有被错误绑定，证明系统具备负例拒绝能力。

![手动隐私动作绑定](./verification-manual-privacy-action.png)

图 4：点击画面中的某个 face box，手动将该 track 设置为 `Privacy blur shield`，证明系统支持人工指定受保护对象。

## 8. 验收标准

1. 可以注册至少 2 个受保护身份。
2. 每个身份可以上传 1 张参考人脸图像。
3. 每个身份可以选择男性数字替身、女性数字替身、隐私遮挡或允许真实出镜。
4. 视频中出现注册身份时，系统能自动绑定对应 track。
5. 两个注册身份同时出现时，能够展示不同数字替身或隐私动作。
6. 注册陌生参考图时，不应错误绑定到当前视频人脸。
7. 手动点击选脸后，可以为指定 track 设置隐私动作。
8. 保护帧截图输出应包含视频画面和隐私保护层。
9. 身份绑定开启后仍保持 24 FPS 以上实时性。
10. 报告中包含架构图、运行界面截图、正例/负例测试结果、数字人替身覆盖截图和局限性分析。

## 9. 当前局限性

- 当前是本地 WebAR 原型，不接入真实 AI 眼镜硬件或 SDK。
- 人脸识别是身份匹配，不是法律意义上的身份认证。
- 单张参考图对姿态、光照和清晰度敏感。
- 对未接入协议或恶意设备无法强制执行隐私保护。
- 当前数字替身是 Kenney CC0 头部/肩颈半身像，不是完整 VRM 骨骼数字人，也还没有表情重定向。
- 当前身体覆盖区域由人脸锚点推断，没有人体姿态追踪和前景分割，人物靠近画面边缘或身体姿态变化大时可能出现裁切或贴合不准。
- 中心化注册方案存在信任问题，DID/去中心化身份暂作未来方向。

## 10. 后续工作

- 增加多张参考图融合，提高识别稳定性。
- 增加自定义数字替身编辑器。
- 将 FaceAPI 识别迁移到 Web Worker。
- 引入更强的人脸识别模型，如 InsightFace/AdaFace/EdgeFace ONNX。
- 升级 Three.js 后接入完整 `@pixiv/three-vrm`，支持骨骼姿态、表情和更自然的数字人动画。
- 引入 MediaPipe Pose 或 Selfie Segmentation，让替身覆盖从人脸锚点推断升级为人体区域/姿态感知覆盖。
- 加入录制受保护视频功能，而不仅是保护帧截图。
