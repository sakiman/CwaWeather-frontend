// ============================================
// 寶可天氣 - Japanese Magazine Kawaii Style
// ============================================

const API_BASE = "https://hex-cwa.zeabur.app/api";

// 六都城市設定
const CITIES = {
    kaohsiung: { name: "高雄市", emoji: "🏙️" },
    taipei: { name: "臺北市", emoji: "🗼" },
    newtaipei: { name: "新北市", emoji: "🌉" },
    taoyuan: { name: "桃園市", emoji: "✈️" },
    taichung: { name: "臺中市", emoji: "🎡" },
    tainan: { name: "臺南市", emoji: "🏯" }
};

// 當前選擇的城市
let currentCity = "taipei";

// 六都經緯度範圍
const CITY_COORDINATES = {
    taipei: { lat: [24.95, 25.20], lng: [121.45, 121.65] },
    newtaipei: { lat: [24.60, 25.30], lng: [121.30, 122.00] },
    taoyuan: { lat: [24.80, 25.10], lng: [121.10, 121.50] },
    taichung: { lat: [24.00, 24.35], lng: [120.50, 121.00] },
    tainan: { lat: [22.85, 23.20], lng: [120.05, 120.50] },
    kaohsiung: { lat: [22.50, 22.85], lng: [120.20, 120.50] }
};

// ============================================
// Playground 設定
// ============================================

// 可用的天氣代碼
const WEATHER_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '11', '14', '15', '18', '19'];

// 天氣代碼對應文字
const WEATHER_TEXT_MAP = {
    '01': '晴天',
    '02': '晴時多雲',
    '03': '多雲時晴',
    '04': '多雲',
    '05': '多雲時陰',
    '06': '陰時多雲',
    '07': '陰天',
    '08': '短暫雨',
    '11': '陰短暫雨',
    '14': '陰有雨',
    '15': '雷陣雨',
    '18': '午後雷陣雨',
    '19': '晴午後多雲短暫雨',
    '00': '未知天氣',
};

// 天氣代碼對應 emoji
const WEATHER_EMOJI_MAP = {
    '01': '☀️',
    '02': '🌤️',
    '03': '⛅',
    '04': '🌥️',
    '05': '🌥️',
    '06': '☁️',
    '07': '☁️',
    '08': '🌧️',
    '11': '🌧️',
    '14': '🌧️',
    '15': '⛈️',
    '18': '⛈️',
    '19': '🌦️',
    '00': '🌤️'
};

// Playground 當前狀態
let playgroundState = {
    city: 'taipei',
    weatherCode: '01'
};

// ============================================
// 工具函式
// ============================================

/**
 * 安全解析 API 時間格式（解決 Safari 相容性問題）
 * "2025-11-26 06:00:00" → Date 物件
 */
function parseDateTime(str) {
    if (!str) return new Date();
    // 將空格替換為 T，確保 ISO 8601 格式
    return new Date(str.replace(' ', 'T'));
}

/**
 * 根據天氣代碼回傳圖片路徑
 */
function getWeatherImage(code) {
    const paddedCode = String(code || '00').padStart(2, '0');
    return `./assets/img/w${paddedCode}.jpg`;
}

/**
 * 天氣描述轉換為 emoji
 */
function getWeatherEmoji(weather) {
    if (!weather) return "🌤️";
    if (weather.includes("陰有雨")) return "🌧️";
    if (weather.includes("晴")) return "☀️";
    if (weather.includes("多雲")) return "⛅";
    if (weather.includes("陰")) return "☁️";
    if (weather.includes("雨")) return "🌧️";
    if (weather.includes("雷")) return "⛈️";
    return "🌤️";
}

/**
 * 根據降雨機率和溫度生成建議
 */
function getAdvice(rainProb, maxTemp) {
    let rainIcon = "🌂";
    let rainText = "不用帶傘";
    if (parseInt(rainProb) > 30) {
        rainIcon = "☂️";
        rainText = "記得帶傘！";
    }

    let clothIcon = "👕";
    let clothText = "舒適穿搭";
    const temp = parseInt(maxTemp);
    if (temp >= 28) {
        clothIcon = "🎽";
        clothText = "短袖涼爽";
    } else if (temp <= 20) {
        clothIcon = "🧥";
        clothText = "加件外套";
    }

    return { rainIcon, rainText, clothIcon, clothText };
}

/**
 * 時間轉換為時段描述
 */
function getTimePeriod(startTime) {
    const hour = parseDateTime(startTime).getHours();
    if (hour >= 5 && hour < 11) return "早晨";
    if (hour >= 11 && hour < 14) return "中午";
    if (hour >= 14 && hour < 18) return "下午";
    if (hour >= 18 && hour < 23) return "晚上";
    return "深夜";
}

/**
 * 格式化日期為中文顯示
 */
function formatDate(date) {
    const d = parseDateTime(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    return `${month}/${day} ${weekdays[d.getDay()]}`;
}

/**
 * 格式化日期為簡短顯示（用於 Hero 區塊）
 * 輸出格式：11/27(四)
 */
function formatShortDate(date) {
    const d = parseDateTime(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${month}/${day}(${weekdays[d.getDay()]})`;
}

// ============================================
// API 資料轉換函式
// ============================================

/**
 * 轉換 36 小時預報 API 資料
 * 從 weatherElement[] 多維陣列轉換為 forecasts[] 扁平結構
 */
function transform36HourData(rawData) {
    const location = rawData.location;
    const elements = location.weatherElement;
    
    // 建立 elementName → data 的映射
    const elementMap = {};
    elements.forEach(el => {
        elementMap[el.elementName] = el.time;
    });
    
    // 取得時段數量（以 Wx 為基準）
    const timeCount = elementMap.Wx ? elementMap.Wx.length : 0;
    const forecasts = [];
    
    for (let i = 0; i < timeCount; i++) {
        forecasts.push({
            startTime: elementMap.Wx[i].startTime,
            endTime: elementMap.Wx[i].endTime,
            weather: elementMap.Wx[i].parameter.parameterName,
            weatherCode: elementMap.Wx[i].parameter.parameterValue,
            rain: elementMap.PoP ? elementMap.PoP[i].parameter.parameterName : "0",
            minTemp: elementMap.MinT ? elementMap.MinT[i].parameter.parameterName : "20",
            maxTemp: elementMap.MaxT ? elementMap.MaxT[i].parameter.parameterName : "30",
            comfort: elementMap.CI ? elementMap.CI[i].parameter.parameterName : "舒適"
        });
    }
    
    return {
        city: rawData.city,
        forecasts
    };
}

/**
 * 從 36 小時預報資料生成替代的三日預報
 * 當三日預報 API 失敗時使用
 */
function generate3DayFromFallback(data36h) {
    const forecasts = data36h.forecasts;
    const dailyForecasts = [];
    const processedDates = new Set();
    
    forecasts.forEach((forecast, index) => {
        const date = parseDateTime(forecast.startTime);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        
        if (!processedDates.has(dateKey) && dailyForecasts.length < 3) {
            processedDates.add(dateKey);
            dailyForecasts.push({
                date: forecast.startTime,
                dateFormatted: formatDate(forecast.startTime),
                weather: forecast.weather,
                weatherCode: forecast.weatherCode,
                minTemp: parseInt(forecast.minTemp),
                maxTemp: parseInt(forecast.maxTemp),
                rainProb: parseInt(forecast.rain),
                comfort: forecast.comfort
            });
        }
    });
    
    // 如果不足三天，複製最後一天的資料
    while (dailyForecasts.length < 3 && dailyForecasts.length > 0) {
        const lastDay = dailyForecasts[dailyForecasts.length - 1];
        const nextDate = new Date(parseDateTime(lastDay.date));
        nextDate.setDate(nextDate.getDate() + 1);
        
        dailyForecasts.push({
            ...lastDay,
            date: nextDate.toISOString(),
            dateFormatted: formatDate(nextDate.toISOString())
        });
    }
    
    return {
        city: data36h.city,
        forecasts: dailyForecasts
    };
}

/**
 * 轉換三日預報 API 資料
 * 取第一個行政區，按日期分組並計算每日極值
 */
function transform3DayData(rawData) {
    // 取得第一個行政區的資料
    const locations = rawData.locations;
    const firstDistrict = locations.location[0];
    const districtName = firstDistrict.locationName;
    const elements = firstDistrict.weatherElement;
    
    // 建立 elementName → data 的映射
    const elementMap = {};
    elements.forEach(el => {
        elementMap[el.elementName] = el.time;
    });
    
    // 按日期分組
    const dailyData = {};
    const wxData = elementMap.Wx || [];
    
    wxData.forEach((item, index) => {
        const date = parseDateTime(item.startTime);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: item.startTime,
                weathers: [],
                weatherCodes: [],
                temps: [],
                rains: [],
                comforts: []
            };
        }
        
        // 收集天氣描述和代碼
        if (item.elementValue && item.elementValue[0]) {
            dailyData[dateKey].weathers.push(item.elementValue[0].value);
            dailyData[dateKey].weatherCodes.push(item.elementValue[1]?.value || '00');
        }
        
        // 收集溫度（MinT）
        if (elementMap.MinT && elementMap.MinT[index]) {
            const minT = elementMap.MinT[index].elementValue?.[0]?.value;
            if (minT) dailyData[dateKey].temps.push(parseInt(minT));
        }
        
        // 收集溫度（MaxT）
        if (elementMap.MaxT && elementMap.MaxT[index]) {
            const maxT = elementMap.MaxT[index].elementValue?.[0]?.value;
            if (maxT) dailyData[dateKey].temps.push(parseInt(maxT));
        }
        
        // 收集降雨機率
        if (elementMap.PoP12h && elementMap.PoP12h[Math.floor(index / 4)]) {
            const pop = elementMap.PoP12h[Math.floor(index / 4)].elementValue?.[0]?.value;
            if (pop) dailyData[dateKey].rains.push(parseInt(pop));
        }
        
        // 收集舒適度
        if (elementMap.CI && elementMap.CI[index]) {
            const ci = elementMap.CI[index].elementValue?.[0]?.value;
            if (ci) dailyData[dateKey].comforts.push(ci);
        }
    });
    
    // 計算每日統計值
    const dailyForecasts = Object.entries(dailyData)
        .slice(0, 3) // 只取三天
        .map(([key, data]) => {
            const temps = data.temps.length > 0 ? data.temps : [25];
            const rains = data.rains.length > 0 ? data.rains : [0];
            
            return {
                date: data.date,
                dateFormatted: formatDate(data.date),
                weather: data.weathers[Math.floor(data.weathers.length / 2)] || "多雲",
                weatherCode: data.weatherCodes[Math.floor(data.weatherCodes.length / 2)] || "04",
                minTemp: Math.min(...temps),
                maxTemp: Math.max(...temps),
                rainProb: Math.max(...rains),
                comfort: data.comforts[Math.floor(data.comforts.length / 2)] || "舒適"
            };
        });
    return {
        city: rawData.city,
        district: districtName,
        forecasts: dailyForecasts
    };
}

// ============================================
// 渲染函式
// ============================================

/**
 * 渲染 Hero 區塊（36 小時預報）
 */
function renderHero(data, cityKey) {
    const heroSection = document.getElementById('heroSection');
    const heroCard = document.getElementById('heroCard');
    const current = data.forecasts[0];
    
    // 設定背景圖片
    heroSection.style.backgroundImage = `url('./assets/img/bg-${cityKey}.jpeg')`;
    
    // 計算平均溫度
    const avgTemp = Math.round((parseInt(current.maxTemp) + parseInt(current.minTemp)) / 2);
    const period = getTimePeriod(current.startTime);
    const advice = getAdvice(current.rain, current.maxTemp);
    
    heroCard.innerHTML = `
        <div class="hero-layout">
            <!-- 左側：主要天氣資訊 -->
            <div class="hero-left">
                <div class="hero-temp-display">
                    <span class="hero-emoji">${getWeatherEmoji(current.weather)}</span>
                    <span class="hero-temp">${avgTemp}°</span>
                </div>
                <div class="hero-info-row">
                    <div class="hero-weather-desc">${current.weather}</div>
                    <div class="hero-date-badge">${formatShortDate(current.startTime)}</div>
                </div>
            </div>
            
            <!-- 右側：詳細資訊 -->
            <div class="hero-right">
                <!-- 右側上方：高低溫 + 舒適度 -->
                <div class="hero-right-top">
                    <div class="hero-temp-range">
                        <span class="range-icon">🌡️</span>
                        <span class="range-value">${current.minTemp}° ~ ${current.maxTemp}°</span>
                    </div>
                    <div class="hero-comfort">
                        <span class="comfort-badge">😊 ${current.comfort}</span>
                    </div>
                </div>
                
                <!-- 右側下方：降雨率 + 穿搭建議 -->
                <div class="hero-right-bottom">
                    <div class="advice-card">
                        <span class="advice-icon">${advice.rainIcon}</span>
                        <span class="advice-text">${advice.rainText}</span>
                        <span class="advice-detail">💧 ${current.rain}%</span>
                    </div>
                    <div class="advice-card">
                        <span class="advice-icon">${advice.clothIcon}</span>
                        <span class="advice-text">${advice.clothText}</span>
                        <span class="advice-detail">🌡️ ${current.maxTemp}°</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染三日預報
 */
function render3DayForecast(data) {
    const grid = document.getElementById('forecastGrid');
    
    if (!data.forecasts || data.forecasts.length === 0) {
        grid.innerHTML = '<p class="no-data">暫無預報資料</p>';
        return;
    }
    
    grid.innerHTML = data.forecasts.map((day, index) => {
        const dayLabel = index === 0 ? '今天' : index === 1 ? '明天' : '後天';
        const imgSrc = getWeatherImage(day.weatherCode);
        const paddedCode = String(day.weatherCode || '00').padStart(2, '0');
        
        return `
            <div class="forecast-card">
                <div class="forecast-day">${dayLabel}</div>
                <div class="forecast-date">${day.dateFormatted}</div>
                
                <div class="forecast-img-container" title="Playground" data-weather-code="${paddedCode}" onclick="openPlayground('${paddedCode}')">
                    <img 
                        src="${imgSrc}" 
                        alt="${day.weather}"
                        class="forecast-img"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='./assets/img/w00.jpg';"
                    />
                </div>
                
                <div class="forecast-weather">
                    <span class="weather-emoji">${getWeatherEmoji(day.weather)}</span>
                    <span class="weather-text">${day.weather}</span>
                </div>
                
                <div class="forecast-details">
                    <div class="detail-row">
                        <span class="detail-icon">🌡️</span>
                        <span class="detail-label">溫度</span>
                        <span class="detail-value">${day.minTemp}° ~ ${day.maxTemp}°</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">💧</span>
                        <span class="detail-label">降雨</span>
                        <span class="detail-value">${day.rainProb}%</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">😊</span>
                        <span class="detail-label">體感</span>
                        <span class="detail-value">${day.comfort}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 更新頁面日期顯示
 */
function updateHeaderDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    document.getElementById('updateTime').textContent = `${month}月${date}日 ${days[now.getDay()]}`;
}

// ============================================
// API 請求與主流程
// ============================================

/**
 * 獲取天氣資料（同時請求 36 小時與三日預報）
 */
async function fetchWeather(cityKey = currentCity) {
    try {
        // 顯示 loading
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('mainContent').style.display = 'none';
        
        // 最低顯示 loading 1.5 秒
        const delayPromise = new Promise(resolve => setTimeout(resolve, 1500));
        
        // 同時請求兩個 API（含備援機制）
        const fetch36hPromise = (async () => {
            try {
                const res = await fetch(`${API_BASE}/weather/${cityKey}`);
                if (!res.ok) throw new Error('API_BASE 36h HTTP error');
                const json = await res.json();
                if (!json.success) throw new Error('API_BASE 36h payload error');
                return json;
            } catch (e) {
                console.warn('36 小時預報主 API 失敗，改用備援來源', e);
                const backupData = await backupFetch36h(cityKey);
                return { success: true, data: backupData };
            }
        })();

        const fetch3dayPromise = (async () => {
            try {
                const res = await fetch(`${API_BASE}/weather/3day/${cityKey}`);
                if (!res.ok) throw new Error('API_BASE 3day HTTP error');
                const json = await res.json();
                if (!json.success) throw new Error('API_BASE 3day payload error');
                return json;
            } catch (e) {
                console.warn('三日預報主 API 失敗，改用備援來源', e);
                const backupData = await backupFetch3day(cityKey);
                return { success: true, data: backupData };
            }
        })();

        // 等待 loading delay + 兩個請求
        const [_, data36h, data3day] = await Promise.all([delayPromise, fetch36hPromise, fetch3dayPromise]);
        
        // 轉換資料格式
        const transformed36h = transform36HourData(data36h.data);
        
        let transformed3day = { forecasts: [] };
        if (data3day.success && data3day.data) {
            try {
                // 如果是備援資料（來自 CWA），使用 backup_transform3DayData
                if (data3day.data.__fromBackupCWA3Day) {
                    transformed3day = backup_transform3DayData(data3day.data);
                } else {
                    transformed3day = transform3DayData(data3day.data);
                }
            } catch (e) {
                console.warn("三日預報資料轉換失敗，使用替代方案", e);
                transformed3day = generate3DayFromFallback(transformed36h);
            }
        } else {
            // 三日預報 API 失敗，使用 36 小時資料生成替代
            console.warn("三日預報 API 失敗，使用 36 小時資料替代");
            transformed3day = generate3DayFromFallback(transformed36h);
        }
        
        // 渲染頁面
        renderHero(transformed36h, cityKey);
        render3DayForecast(transformed3day);
        
        // 隱藏 loading，顯示主內容
        document.getElementById('loading').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
    } catch (e) {
        console.error(e);
        alert("天氣資料讀取失敗，狸克把網路線咬斷了！🦝");
        document.getElementById('loading').style.display = 'none';
    }
}

/**
 * 切換城市
 */
function switchCity(cityKey) {
    if (cityKey === currentCity) return;
    
    currentCity = cityKey;
    
    // 更新按鈕狀態
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.city === cityKey);
    });
    
    // 重新載入資料
    fetchWeather(cityKey);
}

/**
 * 初始化城市選擇器事件
 */
function initCitySelector() {
    document.querySelectorAll('.city-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchCity(btn.dataset.city);
        });
    });
}

// ============================================
// Playground 功能
// ============================================

/**
 * 初始化 Playground
 */
function initPlayground() {
    const modal = document.getElementById('playgroundModal');
    const closeBtn = modal.querySelector('.playground-close');
    const backdrop = modal.querySelector('.playground-backdrop');
    
    // 關閉按鈕
    closeBtn.addEventListener('click', closePlayground);
    
    // 點擊遮罩關閉
    backdrop.addEventListener('click', closePlayground);
    
    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closePlayground();
        }
    });
    
    // 渲染城市和天氣選擇器
    renderPlaygroundCities();
    renderPlaygroundWeathers();
}

/**
 * 開啟 Playground
 * @param {string} weatherCode - 天氣代碼
 */
function openPlayground(weatherCode) {
    const modal = document.getElementById('playgroundModal');
    
    // 設定初始狀態：當前城市 + 點擊的天氣
    playgroundState.city = currentCity;
    playgroundState.weatherCode = weatherCode || '01';
    
    // 更新預覽區
    updatePlaygroundCity(playgroundState.city);
    updatePlaygroundWeather(playgroundState.weatherCode);
    
    // 更新按鈕 active 狀態
    updatePlaygroundActiveStates();
    
    // 顯示 modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // 防止背景滾動
}

/**
 * 關閉 Playground
 */
function closePlayground() {
    const modal = document.getElementById('playgroundModal');
    modal.classList.remove('active');
    document.body.style.overflow = ''; // 恢復滾動
}

/**
 * 更新 Playground 城市背景
 * @param {string} cityKey - 城市 key
 */
function updatePlaygroundCity(cityKey) {
    playgroundState.city = cityKey;
    const bgImg = document.getElementById('playgroundBg');
    bgImg.src = `./assets/img/bg-${cityKey}.jpeg`;
    updatePlaygroundActiveStates();
}

/**
 * 更新 Playground 天氣資訊
 * @param {string} code - 天氣代碼
 */
function updatePlaygroundWeather(code) {
    playgroundState.weatherCode = code;
    const paddedCode = String(code).padStart(2, '0');
    
    // 更新寶可夢圖片
    document.getElementById('pgPokemonImg').src = `./assets/img/w${paddedCode}.jpg`;
    
    // 更新天氣 emoji
    document.getElementById('pgWeatherEmoji').textContent = WEATHER_EMOJI_MAP[paddedCode] || WEATHER_EMOJI_MAP['00'];
    
    // 更新天氣文字
    document.getElementById('pgWeatherText').textContent = WEATHER_TEXT_MAP[paddedCode] || WEATHER_TEXT_MAP['00'];
    
    updatePlaygroundActiveStates();
}

/**
 * 更新 Playground 按鈕 active 狀態
 */
function updatePlaygroundActiveStates() {
    // 城市按鈕
    document.querySelectorAll('.pg-city-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.city === playgroundState.city);
    });
    
    // 天氣按鈕
    document.querySelectorAll('.pg-weather-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.code === playgroundState.weatherCode);
    });
}

/**
 * 渲染 Playground 城市按鈕
 */
function renderPlaygroundCities() {
    const grid = document.getElementById('pgCityGrid');
    
    grid.innerHTML = Object.entries(CITIES).map(([key, city]) => `
        <button class="pg-city-btn" data-city="${key}">${city.name}</button>
    `).join('');
    
    // 綁定點擊事件
    grid.querySelectorAll('.pg-city-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updatePlaygroundCity(btn.dataset.city);
        });
    });
}

/**
 * 渲染 Playground 天氣圖示
 */
function renderPlaygroundWeathers() {
    const grid = document.getElementById('pgWeatherGrid');
    
    grid.innerHTML = WEATHER_CODES.map(code => `
        <button class="pg-weather-btn" data-code="${code}" title="${WEATHER_TEXT_MAP[code] || ''}">
            <img src="./assets/img/w${code}.jpg" alt="${WEATHER_TEXT_MAP[code] || ''}" onerror="this.onerror=null; this.src='./assets/img/w00.jpg';">
        </button>
    `).join('');
    
    // 綁定點擊事件
    grid.querySelectorAll('.pg-weather-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updatePlaygroundWeather(btn.dataset.code);
        });
    });
}

// ============================================
// 地理位置功能
// ============================================

/**
 * 顯示 Toast 通知
 * @param {string} message - 通知訊息
 * @param {string} type - 類型 ('success' | 'info' | 'warning')
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 觸發動畫
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3 秒後移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * 根據經緯度判斷城市
 * @param {number} lat - 緯度
 * @param {number} lng - 經度
 * @returns {string|null} 城市 key 或 null
 */
function getCityFromCoordinates(lat, lng) {
    for (const [cityKey, bounds] of Object.entries(CITY_COORDINATES)) {
        if (lat >= bounds.lat[0] && lat <= bounds.lat[1] &&
            lng >= bounds.lng[0] && lng <= bounds.lng[1]) {
            return cityKey;
        }
    }
    return null;
}

/**
 * 取得使用者地理位置並設定城市
 */
function initGeolocation() {
    if (!navigator.geolocation) {
        console.log('瀏覽器不支援地理定位');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const detectedCity = getCityFromCoordinates(latitude, longitude);
            
            if (detectedCity) {
                currentCity = detectedCity;
                showToast(`📍 已定位到${CITIES[detectedCity].name}`, 'success');
                
                // 更新城市選擇器的 active 狀態
                document.querySelectorAll('.city-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.city === detectedCity);
                });
            } else {
                showToast('📍 定位成功，預設顯示臺北市', 'info');
            }
            
            // 載入天氣資料
            fetchWeather(currentCity);
        },
        (error) => {
            console.log('地理定位失敗:', error.message);
            showToast('📍 定位失敗，預設顯示臺北市', 'info');
            
            // 載入預設城市的天氣資料
            fetchWeather(currentCity);
        },
        {
            timeout: 5000,
            maximumAge: 300000 // 5 分鐘快取
        }
    );
}

// ============================================
// 頁面初始化
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    initCitySelector();
    initPlayground();
    initGeolocation(); // 啟動地理定位
});
