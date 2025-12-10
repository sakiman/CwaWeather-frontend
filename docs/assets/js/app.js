// ============================================
// 寶可天氣 - Japanese Magazine Kawaii Style
// ============================================

// 中央氣象署開放資料平臺之資料擷取API
// https://opendata.cwa.gov.tw/dist/opendata-swagger.html

// Nominatim 反向地理編碼服務
// https://nominatim.org/release-docs/develop/api/Reverse/

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
let currentCity = "newtaipei";

// 當前選擇的行政區（對應 3day LocationName），預設由轉換函式自動決定
let currentDistrict = "";

// 三日預報原始資料快取（key: cityKey → rawData 結構，供行政區切換時重用）
const threeDayRawCache = {};

// 使用者經緯度（由瀏覽器地理定位取得，用於就近選擇 3day LocationName）
// 會在 initGeolocation 成功後寫入 window.__userLat / window.__userLng


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
    city: currentCity,
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
        const hasCoords = typeof data.lat === 'number' && typeof data.lng === 'number';
        
        return `
            <div class="forecast-card">
                <div class="forecast-day">${dayLabel}</div>
                ${data.district ? `<div class="forecast-district">${data.district}</div>` : ''}
                ${hasCoords ? `<div class="forecast-coord">緯度 ${data.lat.toFixed(4)}，經度 ${data.lng.toFixed(4)}</div>` : ''}
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
        
        // 同時請求兩個 API（直接使用中央氣象署資料）
        const fetch36hPromise = (async () => {
            const fetchWeatherData36h = await Fetch36h(cityKey);
            return { success: true, data: fetchWeatherData36h };
        })();

        const fetch3dayPromise = (async () => {
            const fetchWeatherData3day = await Fetch3day(cityKey);
            return { success: true, data: fetchWeatherData3day };
        })();

        // 等待 loading delay + 兩個請求
        const [_, data36h, data3day] = await Promise.all([delayPromise, fetch36hPromise, fetch3dayPromise]);
        
        /**
         * 呼叫 transform36HourData 轉換 36 小時預報 API 資料
         * 從 weatherElement[] 多維陣列轉換為 forecasts[] 扁平結構
         */
        const transformed36h = transform36HourData(data36h.data);
        
        let transformed3day = { forecasts: [] };
        let districtOptions = [];
        if (data3day.success && data3day.data) { // 優先取用三日預報 API
            try {
                // 將三日預報原始資料寫入快取，供之後行政區切換時重用
                threeDayRawCache[cityKey] = data3day.data;

                // 從 3day 原始資料中取出所有 LocationName，供行政區選擇器使用
                try {
                    const locWrapper = data3day.data.locations;
                    const locArray = locWrapper && Array.isArray(locWrapper.location) ? locWrapper.location : [];
                    districtOptions = locArray.map(loc => loc.locationName).filter(Boolean);
                } catch (e) {
                    districtOptions = [];
                }

                // 判斷此次請求的 cityKey 是否為地理定位到的城市
                // 若是定位城市：使用就近鄉鎮邏輯
                // 若是手動切換到其他城市：一律使用該縣市 Location 陣列中的第一個鄉鎮
                let preferNearestByLocation = false;
                try {
                    if (typeof window !== 'undefined' && window.__detectedCityKey && window.__detectedCityKey === cityKey) {
                        preferNearestByLocation = true;
                    }
                } catch (e) {
                    // 非瀏覽器環境或無法讀取全域變數時，維持預設 false
                }

                // 若已有人為選擇的行政區，則優先依該行政區計算三日預報
                const options = {
                    preferNearestByLocation,
                    targetDistrictName: currentDistrict || null
                };

                transformed3day = transform3DayData(data3day.data, options); // 轉換三日預報資料為扁平結構
            } catch (e) {
                console.warn("三日預報 API 失敗，使用 36 小時資料替代", e);
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

        // 更新行政區選擇器
        updateDistrictSelector(districtOptions, transformed3day.district || currentDistrict || "");
        
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
    currentDistrict = ""; // 切換城市時，重置行政區選擇
    
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

/**
 * 更新行政區選擇器選項與選中狀態
 * @param {string[]} options - 所有 LocationName
 * @param {string} selected - 目前使用中的行政區名稱
 */
function updateDistrictSelector(options, selected) {
    const list = document.getElementById('districtList');
    if (!list) return;

    // 若沒有任何 options，顯示簡單提示
    if (!options || options.length === 0) {
        list.innerHTML = '<span class="district-empty">無行政區資料</span>';
        return;
    }

    const effectiveSelected = selected && options.includes(selected) ? selected : options[0];
    currentDistrict = effectiveSelected;

    list.innerHTML = options.map(name => `
        <button type="button" class="district-btn${name === effectiveSelected ? ' active' : ''}" data-district="${name}">${name}</button>
    `).join('');

    // 綁定點擊事件
    list.querySelectorAll('.district-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.district || "";
            if (!value || value === currentDistrict) return;
            currentDistrict = value;

            // 使用快取的三日預報資料重新計算該行政區的三日預報
            refreshThreeDayForecastFromCache();
        });
    });
}

/**
 * 使用快取的三日預報原始資料，依當前城市與行政區重新渲染三日預報
 * 若快取不存在，退回完整 fetch 流程
 */
function refreshThreeDayForecastFromCache() {
    const raw = threeDayRawCache[currentCity];
    if (!raw) {
        // 若尚未有快取（例如第一次點擊），退回完整流程
        fetchWeather(currentCity);
        return;
    }

    // 從快取 raw 取出所有 LocationName 供行政區列表使用
    let districtOptions = [];
    try {
        const locWrapper = raw.locations;
        const locArray = locWrapper && Array.isArray(locWrapper.location) ? locWrapper.location : [];
        districtOptions = locArray.map(loc => loc.locationName).filter(Boolean);
    } catch (e) {
        districtOptions = [];
    }

    // 依目前選擇的行政區重新轉換三日預報（此時不需就近邏輯）
    const options = {
        preferNearestByLocation: false,
        targetDistrictName: currentDistrict || null
    };

    const transformed3day = transform3DayData(raw, options);

    // 只需重新渲染三日預報卡片，36h Hero 保持不變
    render3DayForecast(transformed3day);

    // 更新行政區按鈕 active 狀態
    updateDistrictSelector(districtOptions, transformed3day.district || currentDistrict || "");
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
 * 使用 OpenStreetMap Nominatim 進行反向地理編碼，取得 suburb（行政區近似）與 city（縣市中文名）
 * API: https://nominatim.openstreetmap.org/reverse?lat={緯度}&lon={經度}&format=json&addressdetails=1
 */
async function fetchSuburbFromCoords(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1`;

    const res = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            // 根據 Nominatim 使用規範，建議提供識別用的 User-Agent
            'User-Agent': 'CwaWeather-frontend/1.0 (https://example.com)'
        }
    });

    if (!res.ok) {
        throw new Error('Reverse geocoding failed');
    }

    const data = await res.json();
    const addr = data && data.address ? data.address : {};
    const suburb = addr.suburb || null;
    const cityName = addr.city || null; // 例如："臺北市"

    try {
        // 將 suburb / city 暫存到全域，方便除錯或後續 mapping 使用
        window.__osmSuburb = suburb;
        window.__osmCity = cityName;
    } catch (e) {
        // 非瀏覽器環境可忽略
    }

    return suburb;
}

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
        async (position) => {
            const { latitude, longitude } = position.coords;

            // 將使用者座標寫入全域，供 3day 轉換時就近選擇 LocationName 使用
            try {
                window.__userLat = latitude;
                window.__userLng = longitude;

                console.log(`使用者座標：緯度 ${latitude}, 經度 ${longitude}`);
            } catch (e) {
                // 在非瀏覽器環境忽略
            }

            // 反向地理編碼取得 suburb / city（city 會是中文，如「臺北市」）
            try {
                const suburb = await fetchSuburbFromCoords(latitude, longitude);
                if (suburb) {
                    console.log('Nominatim suburb:', suburb);
                } else {
                    console.log('Nominatim suburb 未取得');
                }
            } catch (e) {
                console.warn('Nominatim 反向地理編碼失敗:', e.message);
            }
            
            // 優先使用 Nominatim 回傳的 city（中文）對應到 CITIES 的英文 key
            let detectedCity = null;
            try {
                if (typeof window !== 'undefined' && window.__osmCity) {
                    const osmCityName = window.__osmCity; // 例如：「臺北市」
                    for (const [key, city] of Object.entries(CITIES)) {
                        if (city.name === osmCityName) {
                            detectedCity = key;
                            break;
                        }
                    }
                }
            } catch (e) {
                // 若無法讀取 __osmCity，退回下一步座標判斷
            }

            // 若 Nominatim city 無法對應，退回原本的經緯度範圍判斷
            if (!detectedCity) {
                detectedCity = getCityFromCoordinates(latitude, longitude);
            }
            
            if (detectedCity) {
                currentCity = detectedCity;
                try {
                    // 紀錄地理定位得到的城市 key，供後續判斷是否為「定位城市」使用
                    window.__detectedCityKey = detectedCity;
                } catch (e) {
                    // 非瀏覽器環境可忽略
                }
                showToast(`📍 已定位到${CITIES[detectedCity].name}`, 'success');
                
                // 更新城市選擇器的 active 狀態
                document.querySelectorAll('.city-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.city === detectedCity);
                });
            } else {
                showToast('📍 定位成功，預設顯示新北市', 'info');
            }
            
            // 載入天氣資料
            fetchWeather(currentCity);
        },
        (error) => {
            console.log('地理定位失敗:', error.message);
            showToast('📍 定位失敗，預設顯示新北市', 'info');
            
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
    // 行政區 card 收合切換
    const districtCard = document.getElementById('districtCard');
    const districtCardHeader = document.getElementById('districtCardHeader');
    if (districtCard && districtCardHeader) {
        districtCardHeader.addEventListener('click', () => {
            const isCollapsed = districtCard.classList.contains('district-card-collapsed');
            districtCard.classList.toggle('district-card-collapsed', !isCollapsed);
            districtCard.classList.toggle('district-card-expanded', isCollapsed);
        });
    }
    initGeolocation(); // 啟動地理定位
});
