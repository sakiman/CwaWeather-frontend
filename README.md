# 🌤️ 寶可天氣 (CwaWeather)

> 台灣六都天氣預報應用程式，採用日系 Kawaii 雜誌風格設計

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web-brightgreen.svg)]()
[![Data Source](https://img.shields.io/badge/data-CWA-orange.svg)](https://opendata.cwa.gov.tw/)

---

![](./assets/img/week4-result.gif)

## 📋 目錄

1. [簡介與目標](#1-簡介與目標)
2. [系統範圍與限制](#2-系統範圍與限制)
3. [系統架構概覽](#3-系統架構概覽)
4. [C4 架構模型](#4-c4-架構模型)
5. [資料流程](#5-資料流程)
6. [部署架構](#6-部署架構)
7. [功能設計](#7-功能設計)
8. [技術決策](#8-技術決策)
9. [品質需求](#9-品質需求)
10. [檔案結構](#10-檔案結構)
11. [快速開始](#11-快速開始)
12. [API 參考](#12-api-參考)
13. [設計規範](#13-設計規範)
14. [開發者資訊](#14-開發者資訊)

---

## 1. 簡介與目標

### 1.1 專案願景

「寶可天氣」是一款專為台灣六都設計的天氣預報網頁應用程式，以日系 Kawaii 雜誌風格呈現天氣資訊，讓查看天氣變成一種視覺享受。

### 1.2 核心目標

| 目標 | 說明 |
|------|------|
| 🎯 **使用者體驗** | 提供直覺、美觀的天氣資訊介面 |
| 🚀 **輕量化** | 純前端靜態網站，無需建置流程 |
| 📱 **響應式設計** | 完美支援從 320px 到 1440px+ 的所有裝置 |
| 🔄 **即時資料** | 整合中央氣象署開放資料 API |

### 1.3 利害關係人

```mermaid
mindmap
  root((寶可天氣))
    使用者
      一般民眾
      通勤族
      旅遊規劃者
    資料提供者
      中央氣象署
      Proxy API
    開發者
      前端工程師
      UI/UX 設計師
```

---

## 2. 系統範圍與限制

### 2.1 功能範圍

```mermaid
pie title 功能分布
    "36小時預報" : 35
    "三日預報" : 35
    "城市切換" : 15
    "Playground" : 15
```

### 2.2 技術限制

| 限制項目 | 說明 |
|----------|------|
| 純前端架構 | 無後端、無資料庫、無建置流程 |
| 外部 API 依賴 | 需透過 Proxy API 取得氣象資料 |
| 六都範圍 | 僅支援臺北、新北、桃園、臺中、臺南、高雄 |
| 瀏覽器支援 | 現代瀏覽器（含 Safari 相容處理） |

### 2.3 支援城市

| 城市代碼 | 城市名稱 | Emoji |
|----------|----------|-------|
| `taipei` | 臺北市 | 🗼 |
| `newtaipei` | 新北市 | 🌉 |
| `taoyuan` | 桃園市 | ✈️ |
| `taichung` | 臺中市 | 🎡 |
| `tainan` | 臺南市 | 🏯 |
| `kaohsiung` | 高雄市 | 🏙️ |

---

## 3. 系統架構概覽

### 3.1 高階架構圖

```mermaid
flowchart TB
    subgraph External["☁️ 外部服務"]
        CWA["🌐 中央氣象署<br/>Open Data API"]
        PROXY["🔄 Proxy API<br/>hex-cwa.zeabur.app"]
    end
    
    subgraph Frontend["🖥️ 前端應用"]
        HTML["📄 index.html<br/>DOM 結構"]
        CSS["🎨 style.css<br/>Kawaii 風格"]
        JS["⚡ app.js<br/>核心邏輯"]
        IMG["🖼️ assets/img<br/>城市背景 & 天氣圖示"]
    end
    
    subgraph Browser["👤 使用者瀏覽器"]
        UI["🌈 使用者介面"]
    end
    
    CWA -->|"原始氣象資料"| PROXY
    PROXY -->|"RESTful API"| JS
    JS -->|"DOM 操作"| HTML
    CSS -->|"樣式渲染"| HTML
    IMG -->|"圖片資源"| HTML
    HTML -->|"視覺呈現"| UI
    
    style CWA fill:#e3f2fd,stroke:#1976d2
    style PROXY fill:#fff3e0,stroke:#ff9800
    style Frontend fill:#f3e5f5,stroke:#9c27b0
    style Browser fill:#e8f5e9,stroke:#4caf50
```

### 3.2 元件互動圖

```mermaid
flowchart LR
    subgraph UI_Components["UI 元件"]
        HEADER["🏙️ Header<br/>城市選擇器"]
        HERO["🌤️ Hero Section<br/>36小時預報"]
        FORECAST["📅 Forecast Grid<br/>三日預報"]
        PLAYGROUND["🎮 Playground<br/>預覽模式"]
    end
    
    subgraph Core_Functions["核心函式"]
        FETCH["fetchWeather()"]
        TRANSFORM["transform*()"]
        RENDER["render*()"]
    end
    
    HEADER -->|"城市選擇"| FETCH
    FETCH -->|"API 資料"| TRANSFORM
    TRANSFORM -->|"扁平化資料"| RENDER
    RENDER -->|"更新 DOM"| HERO
    RENDER -->|"更新 DOM"| FORECAST
    FORECAST -->|"點擊圖片"| PLAYGROUND
```

---

## 4. C4 架構模型

### 4.1 Context Diagram (Level 1)

```mermaid
C4Context
    title 系統上下文圖 - 寶可天氣

    Person(user, "使用者", "查看台灣六都天氣預報的民眾")
    
    System(weather_app, "寶可天氣", "提供美觀的天氣預報資訊")
    
    System_Ext(cwa, "中央氣象署", "提供官方氣象資料")
    System_Ext(proxy, "Proxy API", "轉發並快取氣象資料")
    
    Rel(user, weather_app, "使用瀏覽器查看", "HTTPS")
    Rel(weather_app, proxy, "取得天氣資料", "REST API")
    Rel(proxy, cwa, "取得原始資料", "REST API")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### 4.2 Container Diagram (Level 2)

```mermaid
C4Container
    title 容器圖 - 寶可天氣

    Person(user, "使用者", "")
    
    Container_Boundary(frontend, "前端應用") {
        Container(html, "HTML", "index.html", "頁面結構與骨架")
        Container(css, "CSS", "style.css", "Kawaii 視覺風格")
        Container(js, "JavaScript", "app.js", "核心業務邏輯")
        Container(assets, "靜態資源", "images", "城市背景與天氣圖示")
    }
    
    System_Ext(proxy, "Proxy API", "hex-cwa.zeabur.app")
    
    Rel(user, html, "瀏覽", "Browser")
    Rel(html, css, "載入樣式")
    Rel(html, js, "載入腳本")
    Rel(html, assets, "載入圖片")
    Rel(js, proxy, "API 請求", "fetch()")
```

### 4.3 Component Diagram (Level 3)

```mermaid
flowchart TB
    subgraph JavaScript["app.js 元件結構"]
        direction TB
        
        subgraph Config["⚙️ 設定區塊"]
            API_BASE["API_BASE"]
            CITIES["CITIES 城市設定"]
            WEATHER_CODES["WEATHER_CODES"]
            WEATHER_MAPS["WEATHER_*_MAP"]
        end
        
        subgraph Utils["🔧 工具函式"]
            parseDateTime["parseDateTime()"]
            getWeatherImage["getWeatherImage()"]
            getWeatherEmoji["getWeatherEmoji()"]
            getAdvice["getAdvice()"]
            formatDate["formatDate()"]
        end
        
        subgraph Transform["🔄 資料轉換"]
            transform36h["transform36HourData()"]
            transform3day["transform3DayData()"]
            fallback["generate3DayFromFallback()"]
        end
        
        subgraph Render["🎨 渲染函式"]
            renderHero["renderHero()"]
            render3Day["render3DayForecast()"]
        end
        
        subgraph API["🌐 API 整合"]
            fetchWeather["fetchWeather()"]
            switchCity["switchCity()"]
        end
        
        subgraph Playground["🎮 Playground"]
            initPlayground["initPlayground()"]
            openPlayground["openPlayground()"]
            updatePlayground["updatePlayground*()"]
        end
    end
    
    Config --> Utils
    Utils --> Transform
    Transform --> Render
    API --> Transform
    Render --> Playground
```

---

## 5. 資料流程

### 5.1 主要資料流程圖

```mermaid
flowchart LR
    subgraph External["外部"]
        CWA["中央氣象署 API"]
        PROXY["Proxy API"]
    end
    
    subgraph Fetch["資料取得"]
        F1["fetch 36h API"]
        F2["fetch 3day API"]
        PA["Promise.all()"]
    end
    
    subgraph Transform["資料轉換"]
        T1["transform36HourData()"]
        T2["transform3DayData()"]
        FB["generate3DayFromFallback()"]
    end
    
    subgraph Render["DOM 渲染"]
        R1["renderHero()"]
        R2["render3DayForecast()"]
    end
    
    CWA --> PROXY
    PROXY --> F1 & F2
    F1 & F2 --> PA
    PA --> T1
    PA --> T2
    T2 -.->|"失敗時"| FB
    T1 --> FB
    T1 --> R1
    T2 --> R2
    FB --> R2
```

### 5.2 資料轉換序列圖

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 使用者
    participant App as 📱 App.js
    participant Proxy as 🔄 Proxy API
    participant CWA as 🌐 中央氣象署

    User->>App: 選擇城市 (e.g., taipei)
    
    activate App
    App->>App: 顯示 Loading 畫面
    
    par 並行請求
        App->>Proxy: GET /api/weather/taipei
        Proxy->>CWA: 取得 36h 資料
        CWA-->>Proxy: weatherElement[]
        Proxy-->>App: 36h 原始資料
    and
        App->>Proxy: GET /api/weather/3day/taipei
        Proxy->>CWA: 取得 3day 資料
        CWA-->>Proxy: locations.weatherElement[]
        Proxy-->>App: 3day 原始資料
    end
    
    App->>App: transform36HourData()
    Note right of App: 合併 Wx/PoP/MinT/MaxT/CI<br/>為 forecasts[]
    
    App->>App: transform3DayData()
    Note right of App: 取第一行政區<br/>按日期分組計算極值
    
    alt 3day API 失敗
        App->>App: generate3DayFromFallback()
        Note right of App: 從 36h 資料生成替代
    end
    
    App->>App: renderHero(data36h, cityKey)
    App->>App: render3DayForecast(data3day)
    App->>App: 隱藏 Loading
    
    deactivate App
    App-->>User: 顯示天氣資訊
```

### 5.3 資料結構轉換

```mermaid
flowchart TB
    subgraph Raw["原始 API 結構"]
        direction TB
        R1["weatherElement[]"]
        R2["├─ Wx.time[]"]
        R3["├─ PoP.time[]"]
        R4["├─ MinT.time[]"]
        R5["├─ MaxT.time[]"]
        R6["└─ CI.time[]"]
    end
    
    subgraph Transformed["轉換後結構"]
        direction TB
        T1["forecasts[]"]
        T2["├─ startTime"]
        T3["├─ weather"]
        T4["├─ weatherCode"]
        T5["├─ rain"]
        T6["├─ minTemp"]
        T7["├─ maxTemp"]
        T8["└─ comfort"]
    end
    
    Raw -->|"transform*Data()"| Transformed
    
    style Raw fill:#ffebee,stroke:#c62828
    style Transformed fill:#e8f5e9,stroke:#2e7d32
```

---

## 6. 部署架構

### 6.1 部署圖

```mermaid
flowchart TB
    subgraph Client["🖥️ 客戶端"]
        Browser["現代瀏覽器<br/>(Chrome, Safari, Firefox, Edge)"]
    end
    
    subgraph Hosting["☁️ 靜態網站託管"]
        direction TB
        CDN["CDN"]
        subgraph Static["靜態檔案"]
            HTML["index.html"]
            CSS["style.css"]
            JS["app.js"]
            IMG["images/"]
        end
    end
    
    subgraph APIs["🌐 外部 API"]
        PROXY["Proxy API<br/>hex-cwa.zeabur.app<br/>(Zeabur)"]
        CWA["中央氣象署<br/>opendata.cwa.gov.tw"]
    end
    
    Browser <-->|"HTTPS"| CDN
    CDN --> Static
    Browser <-->|"REST API"| PROXY
    PROXY <-->|"REST API"| CWA
    
    style Client fill:#e3f2fd,stroke:#1976d2
    style Hosting fill:#f3e5f5,stroke:#9c27b0
    style APIs fill:#fff3e0,stroke:#ff9800
```

### 6.2 開發環境

```mermaid
flowchart LR
    subgraph Dev["開發環境"]
        IDE["VS Code"]
        LS["Live Server"]
        Browser["瀏覽器"]
    end
    
    IDE -->|"啟動"| LS
    LS -->|"熱重載"| Browser
    
    style Dev fill:#e8f5e9,stroke:#4caf50
```

---

## 7. 功能設計

### 7.1 功能模組圖

```mermaid
flowchart TB
    subgraph Features["🎯 核心功能"]
        direction TB
        
        subgraph City["城市選擇"]
            C1["六都切換"]
            C2["Active 狀態"]
            C3["背景圖切換"]
        end
        
        subgraph Hero["36小時預報"]
            H1["當前天氣"]
            H2["溫度範圍"]
            H3["舒適度指標"]
            H4["穿搭建議"]
            H5["帶傘提醒"]
        end
        
        subgraph Forecast["三日預報"]
            F1["每日天氣卡片"]
            F2["溫度極值"]
            F3["降雨機率"]
            F4["天氣圖示"]
        end
        
        subgraph PG["Playground"]
            P1["城市背景預覽"]
            P2["天氣圖示預覽"]
            P3["組合展示"]
        end
    end
    
    City --> Hero
    City --> Forecast
    Forecast --> PG
```

### 7.2 使用者操作流程

```mermaid
stateDiagram-v2
    [*] --> Loading: 開啟網頁
    Loading --> 顯示天氣: 資料載入完成 (≥1.5s)
    
    顯示天氣 --> 切換城市: 點擊城市按鈕
    切換城市 --> Loading: 載入新城市資料
    
    顯示天氣 --> Playground: 點擊天氣圖示
    Playground --> 顯示天氣: 關閉 Modal
    Playground --> 預覽城市: 選擇城市
    Playground --> 預覽天氣: 選擇天氣
    預覽城市 --> Playground
    預覽天氣 --> Playground
    
    顯示天氣 --> [*]: 關閉網頁
```

---

## 8. 技術決策

### 8.1 技術選型

| 決策項目 | 選擇 | 理由 |
|----------|------|------|
| 框架 | Vanilla JS | 輕量化、無依賴、學習成本低 |
| CSS | 原生 CSS Variables | 主題一致性、無需預處理器 |
| 模組化 | 單檔架構 | 簡化部署、適合小型專案 |
| 圖片策略 | Lazy Loading + Fallback | 效能優化、容錯處理 |
| API 整合 | Proxy API | 解決 CORS、API Key 安全性 |

### 8.2 設計決策記錄 (ADR)

```mermaid
timeline
    title 關鍵設計決策時間線
    section 架構決策
        純前端靜態網站 : 無需後端維護成本
        單檔 JavaScript : 簡化開發與部署
    section UX 決策
        1.5 秒最低 Loading : 避免閃爍、提升體驗
        Safari 時間相容 : parseDateTime() 處理
    section 視覺決策
        Kawaii 風格 : 日系雜誌視覺定位
        Glassmorphism : 現代感玻璃態效果
```

### 8.3 錯誤處理策略

```mermaid
flowchart TB
    subgraph Errors["錯誤處理"]
        API_ERR["API 請求失敗"]
        IMG_ERR["圖片載入失敗"]
        DATA_ERR["資料轉換失敗"]
    end
    
    subgraph Fallbacks["降級策略"]
        FB1["顯示錯誤訊息"]
        FB2["使用 w00.jpg 預設圖"]
        FB3["generate3DayFromFallback()"]
    end
    
    API_ERR --> FB1
    IMG_ERR --> FB2
    DATA_ERR --> FB3
    
    style Errors fill:#ffebee,stroke:#c62828
    style Fallbacks fill:#e8f5e9,stroke:#2e7d32
```

---

## 9. 品質需求

### 9.1 品質屬性

```mermaid
quadrantChart
    title 品質屬性優先級
    x-axis 低複雜度 --> 高複雜度
    y-axis 低優先級 --> 高優先級
    quadrant-1 重點投資
    quadrant-2 維持現狀
    quadrant-3 持續監控
    quadrant-4 適度投資
    
    使用者體驗: [0.7, 0.9]
    響應式設計: [0.6, 0.85]
    效能優化: [0.5, 0.7]
    瀏覽器相容: [0.4, 0.8]
    可維護性: [0.3, 0.6]
    可擴展性: [0.2, 0.4]
```

### 9.2 響應式斷點

| 斷點 | 裝置類型 | 主要調整 |
|------|----------|----------|
| 320px | 小型手機 | 極簡佈局 |
| 360px | 手機 | 標準行動版 |
| 480px | 大型手機 | 增強細節 |
| 768px | 平板 | 三欄預報 Grid |
| 1024px | 小型桌面 | 完整佈局 |
| 1440px | 大型桌面 | 最大化空間利用 |

---

## 10. 檔案結構

```
CwaWeather-frontend/
├── 📄 README.md           # 專案文件
└── 📁 docs/
    ├── 📄 index.html          # 主頁面 (HTML 骨架)
    ├── 📁 assets/
    │   ├── 📁 css/
    │   │   └── 🎨 style.css   # Kawaii 風格樣式
    │   │
    │   ├── 📁 js/
    │   │   └── ⚡ app.js      # 核心 JavaScript
    │   │
    │   └── 📁 img/
    │       ├── 🖼️ icon.png    # 網站圖示
    │       ├── 🌆 bg-*.jpeg   # 城市背景圖 (6張)
    │       └── 🎨 w*.jpg      # 天氣圖示 (13張)
│
└── 📁 doc/
    ├── 📋 api.md          # API 規格文件
    ├── 📋 plan.md         # 重構計畫
    └── 📁 changelog/      # 變更記錄
```

### 10.1 圖片資源對照

#### 城市背景圖

| 檔名 | 城市 |
|------|------|
| `bg-taipei.jpeg` | 臺北市 |
| `bg-newtaipei.jpeg` | 新北市 |
| `bg-taoyuan.jpeg` | 桃園市 |
| `bg-taichung.jpeg` | 臺中市 |
| `bg-tainan.jpeg` | 臺南市 |
| `bg-kaohsiung.jpeg` | 高雄市 |

#### 天氣圖示

| 代碼 | 檔名 | 天氣描述 |
|------|------|----------|
| 00 | `w00.jpg` | 未知天氣 (Fallback) |
| 01 | `w01.jpg` | 晴天 |
| 02 | `w02.jpg` | 晴時多雲 |
| 03 | `w03.jpg` | 多雲時晴 |
| 04 | `w04.jpg` | 多雲 |
| 05 | `w05.jpg` | 多雲時陰 |
| 06 | `w06.jpg` | 陰時多雲 |
| 07 | `w07.jpg` | 陰天 |
| 08 | `w08.jpg` | 短暫雨 |
| 11 | `w11.jpg` | 陰短暫雨 |
| 14 | `w14.jpg` | 陰有雨 |
| 15 | `w15.jpg` | 雷陣雨 |
| 18 | `w18.jpg` | 午後雷陣雨 |
| 19 | `w19.jpg` | 晴午後多雲短暫雨 |

---

## 11. 快速開始

### 11.1 環境需求

- 現代網頁瀏覽器 (Chrome, Firefox, Safari, Edge)
- [VS Code](https://code.visualstudio.com/) (建議)
- [Live Server 擴充套件](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (開發用)

### 11.2 啟動方式

```bash
# 若要讓備緩機可用
index.html?holishitKey=你的中央氣象局 CWA API KEY
```

#### 方法一：直接開啟

```bash
# 直接用瀏覽器開啟
open index.html  # macOS
start index.html # Windows
```

#### 方法二：使用 Live Server

1. 在 VS Code 開啟專案資料夾
2. 右鍵點擊 `index.html`
3. 選擇「Open with Live Server」

#### 方法三：使用任意 HTTP 伺服器

```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js
npx serve
```

### 11.3 開發流程

```mermaid
flowchart LR
    A["修改程式碼"] --> B["儲存檔案"]
    B --> C["Live Server 自動重載"]
    C --> D["瀏覽器預覽"]
    D --> A
```

---

## 12. API 參考

### 12.1 API 端點總覽

| 端點 | 方法 | 用途 |
|------|------|------|
| `/api/weather/:city` | GET | 36 小時預報 |
| `/api/weather/3day/:city` | GET | 三日預報 |
| `/api/cities` | GET | 城市列表 |
| `/api/health` | GET | 健康檢查 |

### 12.2 請求範例

```javascript
// 36 小時預報
fetch('https://hex-cwa.zeabur.app/api/weather/taipei')
  .then(res => res.json())
  .then(data => console.log(data));

// 三日預報
fetch('https://hex-cwa.zeabur.app/api/weather/3day/taipei')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 12.3 回應結構

```mermaid
classDiagram
    class Response36h {
        +boolean success
        +boolean cached
        +Data36h data
    }
    
    class Data36h {
        +string city
        +Location location
    }
    
    class Location {
        +string locationName
        +WeatherElement[] weatherElement
    }
    
    class WeatherElement {
        +string elementName
        +TimeData[] time
    }
    
    Response36h --> Data36h
    Data36h --> Location
    Location --> WeatherElement
```

---

## 13. 設計規範

### 13.1 Kawaii 配色系統

```css
/* 主要色彩 */
--kawaii-pink: #FFB5C5;     /* 強調色、active 狀態 */
--kawaii-mint: #98E4D0;     /* 漸層底色 */
--kawaii-lavender: #C9B1FF; /* 時段標籤 */
--kawaii-cream: #FFF8E7;    /* 卡片背景 */
--kawaii-white: #FFFFFF;    /* 純白 */
--kawaii-peach: #FFDAB9;    /* 輔助色 */
--kawaii-sky: #87CEEB;      /* 天空藍 */
```

### 13.2 CSS 命名規範

| 前綴 | 用途 |
|------|------|
| `.hero-*` | Hero 區塊（36小時預報） |
| `.forecast-*` | 三日預報卡片 |
| `.city-*` | 城市選擇器 |
| `.advice-*` | 建議區塊 |
| `.pg-*` / `.playground-*` | Playground 元件 |

### 13.3 JavaScript 函式命名

| 類型 | 命名模式 | 範例 |
|------|----------|------|
| 工具函式 | `get*` / `parse*` / `format*` | `getWeatherEmoji()` |
| 轉換函式 | `transform*` | `transform36HourData()` |
| 渲染函式 | `render*` | `renderHero()` |
| 事件處理 | `handle*` / `on*` | `switchCity()` |
| 初始化 | `init*` | `initPlayground()` |

---

## 14. 開發者資訊

### 👨‍💻 作者

**Brian**

📧 Email: [dpi.studio@gmail.com](mailto:dpi.studio@gmail.com)

### 📄 授權條款

本專案採用 MIT 授權條款。

### 🙏 致謝

- [中央氣象署](https://opendata.cwa.gov.tw/) - 氣象資料來源
- [Zeabur](https://zeabur.com/) - Proxy API 託管
- [Google Fonts](https://fonts.google.com/) - Zen Maru Gothic 字型

---

<div align="center">

**☁️ 寶可天氣 - 讓查看天氣成為一種享受 ☁️**

</div>

![](./assets/img/finish.jpeg)