# PersonaShield
## Online Demo

Open the hosted GitHub Pages demo directly:

- Main privacy prototype: <https://juedouwang.github.io/FaceAR/mediapipe-ar.html>
- MediaPipe screening page: <https://juedouwang.github.io/FaceAR/mediapipe-verify.html>

> Camera access requires HTTPS, so the GitHub Pages URL can use the browser camera without running a local server.

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
cd "D:\鐮旂┒鐢熸枃浠禱20_Areas\鐮旂┒鐢熻绋媆澧炲己鐜板疄涓庨珮绾у浘褰㈠\PartyFaceAR"
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

## 涓枃璇存槑

PersonaShield 鏄竴涓潰鍚?AI 鐪奸暅绗竴瑙嗚鎷嶆憚鍦烘櫙鐨勬湰鍦?WebAR 闅愮闃叉姢鍘熷瀷銆傞」鐩粠鍘熸潵鐨勫浜鸿劯 AR 鐗规晥 Demo
鏀归€犺€屾潵锛屾牳蹇冪洰鏍囦笉鍐嶆槸濞变箰婊ら暅锛岃€屾槸楠岃瘉涓€绉嶁€滆鎷嶆憚鑰呭彲鎻愬墠澹版槑闅愮鍋忓ソ锛屽悎瑙勬媿鎽勭鍦ㄧ敾闈腑鑷姩鎵ц淇濇姢绛栫暐鈥濈殑鎶€鏈祦绋嬨€?

褰撳墠 MVP 閲囩敤鏈湴娉ㄥ唽琛ㄦ柟妗堬紝涓嶈€冭檻 DID 鎴栧幓涓績鍖栬韩浠姐€傜敤鎴峰彲浠ヤ笂浼犲弬鑰冧汉鑴稿浘鍍忥紝娉ㄥ唽鍙椾繚鎶よ韩浠斤紝骞朵负璇ヨ韩浠介€夋嫨闅愮鍔ㄤ綔銆?
褰撴憚鍍忓ご鎴栨湰鍦拌棰戜腑鍑虹幇璇ヨ韩浠芥椂锛岀郴缁熶細鎶婂搴?track 缁戝畾鍒拌韬唤锛屽苟娓叉煋璇ヨ韩浠介€夋嫨鐨勬暟瀛楁浛韬垨闅愮閬尅銆?

鏍稿績鍔熻兘锛?

- 浣跨敤 MediaPipe Face Landmarker 妫€娴嬪苟杩借釜鏈€澶?4 寮犱汉鑴搞€?
- 浣跨敤鏈湴 FaceAPI 妯″瀷浠庡弬鑰冨浘鍜屽疄鏃?track crop 涓彁鍙?128 缁翠汉鑴?descriptor銆?
- 閫氳繃鈥淢ediaPipe 瀹炴椂妫€娴嬭拷韪?+ FaceAPI 浣庨韬唤璇嗗埆鈥濆疄鐜拌韩浠界粦瀹氾紝閬垮厤姣忓抚鍋氫汉鑴歌瘑鍒€?
- 鏀寔 `Allow real appearance`銆乣Male digital substitute`銆乣Female digital substitute`銆乣Agni-style pain face`銆乣Privacy blur shield` 浜旂被闅愮鍔ㄤ綔銆?- 鐢锋€?濂虫€ф暟瀛楁浛韬娇鐢?Kenney CC0 寮€婧愯鑹茶祫婧愭彁鍙栧嚭鐨?GLB 澶撮儴妯″瀷杩涜瀹炴椂瑕嗙洊娓叉煋锛涘鏋滄ā鍨嬪姞杞藉け璐ワ紝浼氶€€鍥炲埌绋嬪簭鍖?Three.js 3D 鏁板瓧澶淬€?- 褰撳墠瑕嗙洊鏂瑰紡鏄牴鎹凡璇嗗埆浜鸿劯閿氱偣鎺ㄦ柇韬綋鍖哄煙锛屽苟涓嶇瓑鍚屼簬鐪熷疄浜轰綋濮挎€佽拷韪垨瑙嗛鍒嗗壊銆?
- 鏂板 `Agni-style pain face` 鏈湴绉佹湁绱犳潗鍔ㄤ綔锛氳繍琛屾椂浠?`assets/private/agni-pain-face.png` 鍔犺浇绱犳潗瑕嗙洊浜鸿劯锛岀礌鏉愮洰褰曞凡鍔犲叆 `.gitignore`锛屼笉浼氫笂浼犲埌鍏紑 GitHub銆?
- 鏀寔鎵嬪姩鐐瑰嚮鏌愬紶鑴革紝涓烘寚瀹?track 涓存椂閫夋嫨闅愮鍔ㄤ綔銆?
- 鏀寔瀵煎嚭鍙椾繚鎶?PNG 甯э紝鐢ㄤ簬鎶ュ憡涓殑鍙鍖栧睍绀恒€?
- 鎻愪緵姝ｄ緥韬唤缁戝畾銆侀檶鐢熶汉璐熶緥鎷掔粷銆佹墜鍔ㄧ粦瀹氬拰鎬ц兘 profile 鐨勮嚜鍔ㄥ寲楠岃瘉鑴氭湰銆?

褰撳墠鐗堟湰鏄绋?绠€鍘嗛」鐩骇鍘熷瀷锛屼笉鏄敓浜х骇韬唤璁よ瘉绯荤粺锛屼篃涓嶆帴鍏ョ湡瀹?AI 鐪奸暅 SDK銆傚畠涓嶈兘闃绘鏈帴鍏ュ崗璁殑璁惧鎷嶆憚鐪熷疄浜鸿劯锛?
鍙兘璇佹槑涓€绉嶉潰鍚戝悎瑙勬媿鎽勭鐨勫弬鑰冨疄鐜帮細娉ㄥ唽韬唤銆佽瘑鍒韩浠姐€佽鍙栭殣绉佸亸濂斤紝骞跺湪鏈湴瀹炴椂瑙嗛绠＄嚎涓墽琛屾暟瀛楁浛韬浛鎹€?

## License

The copied Jeeliz runtime files under `vendor/jeeliz` retain the original Apache-2.0 license. This project layer is also
intended for Apache-2.0 compatible use.

