# 寶可天氣 - Copilot Instructions

## 專案概述

台灣六都天氣預報應用程式，採用日系 Kawaii 雜誌風格設計。**純前端靜態網站，無建置流程**，資料來源為中央氣象署。

## 架構與資料流

```
[中央氣象署 API] ─→ [Proxy API] ─→ [前端 fetch] ─→ [transform*] ─→ [render*]
                      ↑                               ↓
               hex-cwa.zeabur.app              扁平化 forecasts[]
```

1. `fetchWeather()` 使用 `Promise.all()` 並行請求兩個端點
2. 轉換函式將巢狀 `weatherElement[]` 攤平為 `forecasts[]`
3. 渲染函式將資料注入 DOM（使用 template literal）

## 檔案架構

```
index.html           # HTML 骨架（城市選擇器、Hero、三日預報、Playground Modal）
assets/css/style.css # Kawaii 風格（粉彩色系、glassmorphism、RWD 斷點）
assets/js/app.js     # 單檔 vanilla JS（無框架、無模組化）
assets/img/          # bg-{city}.jpeg（城市背景）、w{code}.jpg（天氣圖示）
doc/api.md           # 後端 API 規格文件
```

## API 整合

**Base URL**: `https://hex-cwa.zeabur.app/api`

| 端點 | 用途 | 對應渲染 |
|------|------|----------|
| `GET /weather/{city}` | 36 小時預報 | Hero 區塊 |
| `GET /weather/3day/{city}` | 三日預報 | 三日卡片 Grid |

支援城市 key：`taipei`, `newtaipei`, `taoyuan`, `hsinchu`, `taichung`, `tainan`, `kaohsiung`

## 關鍵資料轉換

原始 API 回傳 `weatherElement[]` 多維陣列，需轉換為扁平結構：
- `transform36HourData()` - 合併 Wx/PoP/MinT/MaxT/CI 為 `forecasts[]`
- `transform3DayData()` - 取第一個行政區，按日期分組計算極值
- `generate3DayFromFallback()` - 三日 API 失敗時從 36h 資料生成替代

## CSS 變數慣例

**必須使用 `--kawaii-*` 前綴變數維持風格一致**：
```css
--kawaii-pink: #FFB5C5;    /* 強調色、active 狀態 */
--kawaii-mint: #98E4D0;    /* 漸層底色 */
--kawaii-lavender: #C9B1FF;/* 時段標籤 */
--kawaii-cream: #FFF8E7;   /* 卡片背景 */
--kawaii-white: #FFFFFF;   /* 純白 */
```

## JavaScript 模式

| 函式 | 用途 |
|------|------|
| `parseDateTime(str)` | Safari 相容時間解析（`' '`→`'T'`） |
| `getWeatherEmoji(weather)` | 天氣描述 → emoji（集中管理） |
| `getWeatherImage(code)` | 天氣代碼 → `w{code}.jpg` |
| `getAdvice(rain, temp)` | 生成穿搭/帶傘建議 |
| `WEATHER_TEXT_MAP` / `WEATHER_EMOJI_MAP` | 天氣代碼對照表（Playground 用） |

## 圖片資源

- **城市背景**：`bg-{cityKey}.jpeg`（6 張，對應六都）
- **天氣圖示**：`w{code}.jpg`，可用代碼：`01,02,03,04,05,06,07,08,11,15,18,19`
- **Fallback**：`w00.jpg`（未知天氣時使用）
- 所有 `<img>` 必須加 `onerror="this.src='./assets/img/w00.jpg'"`

## UI 元件命名

- `.hero-*` - 36 小時主卡片（含城市背景圖）
- `.forecast-*` - 三日預報卡片（三欄 Grid）
- `.city-*` - 城市選擇器（橫向滾動 pill）
- `.advice-*` - 穿搭/雨具建議區塊
- `.pg-*` / `.playground-*` - Playground Modal 元件

## 開發方式

直接用瀏覽器開啟 `index.html` 或使用 VS Code Live Server（無需 npm）。

## 修改注意事項

- **Loading 最少 1.5 秒**：`fetchWeather()` 中的 `delayPromise` 為 UX 設計決策
- **Safari 相容**：所有時間字串必須經過 `parseDateTime()` 處理
- **圖片 fallback**：天氣圖片必須加 `onerror` 降級到 `w00.jpg`
- **RWD 斷點**：320px / 360px / 480px / 768px / 1024px / 1440px
- **emoji 集中管理**：新增天氣 emoji 統一在 `getWeatherEmoji()` 或 `WEATHER_EMOJI_MAP` 維護
- **Playground**：點擊三日預報圖片可開啟，用於預覽城市背景 + 天氣圖示組合
