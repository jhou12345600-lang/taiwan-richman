# 寶島富翁 3D

台灣環島大富翁連線版：大富翁6玩法、72 格台灣真實景點、21 種會動的 3D 台灣動物角色、4 張地圖、臨時離開託管、2–6 人用網址連線。

▶️ 開始玩：https://jhou12345600-lang.github.io/taiwan-richman/

- `index.html`：打包好的完整遊戲（GitHub Pages 直接用這個）
- `src/`：原始碼（規則引擎、3D 場景、景點模型、連線、介面）
- 重新打包：`npm i esbuild three mqtt && node build.mjs`，再把 `dist/index.html` 複製到根目錄
