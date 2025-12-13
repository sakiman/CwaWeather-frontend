// ============================================
// API 資料轉換函式
// ============================================

/**
 * 轉換 36 小時預報 API 資料（使用 CWA 36h 原始結構）
 *  
 * 從 weatherElement[] 多維陣列轉換為 forecasts[] 扁平結構
 * 
 * 氣象局回傳的 JSON 參數說明：https://opendata.cwa.gov.tw/dataset/all/F-C0032-001
 * datasetDescription → 資料描述，例如："三十六小時天氣預報"
 * location → 縣市資料陣列
 * locationName → 地點，例如："新北市"
 * weatherElement → 氣象因子陣列
 * elementName 氣象因子名稱，例如：Wx、PoP、MinT、MaxT、CI；"Wx(天氣現象)、PoP(降雨機率)、MinT(最低溫度)、MaxT(最高溫度)、CI(舒適度)"
 * startTime → 預報資料開始時間，例如："2025-12-05 06:00:00"
 * endTime → 預報資料結束時間，例如："2025-12-05 18:00:00"
 * parameterName → 預報資料內容，例如："多雲短暫雨"
 * parameterValue → 預報資料代碼，例如：8
 * parameterUnit → 預報資料單位，例如："百分比"、"C"
 */
function transform36HourData(rawData) {
    // rawData 來自 Fetch36h，結構請參考 36h.json 範例
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
            startTime: elementMap.Wx[i].startTime, // 預報開始時間
            endTime: elementMap.Wx[i].endTime, // 預報結束時間

            // Wx
            weather: elementMap.Wx[i].parameter.parameterName, // 天氣描述
            weatherCode: elementMap.Wx[i].parameter.parameterValue, // 天氣代碼

            // PoP
            rain: elementMap.PoP ? elementMap.PoP[i].parameter.parameterName : "0", // 降雨機率

            // MinT
            minTemp: elementMap.MinT ? elementMap.MinT[i].parameter.parameterName : "5", // 最低溫度

            // MaxT
            maxTemp: elementMap.MaxT ? elementMap.MaxT[i].parameter.parameterName : "38", // 最高溫度

            // CI
            comfort: elementMap.CI ? elementMap.CI[i].parameter.parameterName : "舒適" // 舒適度
        });
    }
    return {
        city: rawData.city,
        forecasts
    };
}


/**
 * 轉換三日預報 API 資料（使用 CWA 3day 原始結構）
 * 
 * 氣象局回傳的 JSON 參數說明：https://opendata.cwa.gov.tw/dataset/all/F-D0047-061
 * Locations → 縣市鄉鎮資料包覆物件
 * datasetDescription → 資料描述，例如："臺灣各縣市鄉鎮未來3天天氣預報"
 * LocationsName → 縣市名稱，例如："臺北市"
 * Location → 鄉鎮(或縣市)資料資料包覆物件
 * LocationName → 鄉鎮(或縣市)名稱，例如："松山區"
 * Geocode → 鄉鎮(或縣市)代碼，例如："6300400"
 * Latitude → 緯度，例如："25.0478"
 * Longitude → 經度，例如："121.5319"
 * WeatherElement → 氣象因子陣列
 * ElementName 氣象因子名稱，例如：溫度、露點溫度、相對濕度、體感溫度、舒適度指數、風速、風向、3小時降雨機率、天氣現象、天氣預報綜合描述
 * StartTime → 預報資料開始時間，例如："2025-12-04T06:00:00+08:00"
 * EndTime → 預報資料結束時間，例如："2025-12-04T09:00:00+08:00"
 * DataTime → 預報資料時間
 * ElementValue → 氣象因子內容陣列
 * Temperature → 溫度資料，例如："25"
 * DewPoint → 露點溫度資料，例如："20"
 * RelativeHumidity → 相對濕度資料，例如："80"
 * ApparentTemperature → 體感溫度資料，例如："27"
 * ComfortIndex → 舒適度指數代碼，例如："16"
 * ComfortIndexDescription → 舒適度描述，例如："稍有寒意"
 * WindSpeed → 風速資料，例如："3.5"
 * BeaufortScale → 風級資料，例如："2"
 * WindDirection → 風向資料，例如："偏東風"
 * ProbabilityOfPrecipitation → 降雨機率資料，例如："20"
 * Weather → 天氣現象描述，例如："陰"
 * WeatherCode → 天氣現象代碼，例如："07"
 * WeatherDescription → 天氣預報綜合描述，例如："陰。降雨機率10%。溫度攝氏17度。稍有寒意。偏東風 平均風速1-2級(每秒3公尺)。相對濕度63至64%。"
 */

function transform3DayData(rawData, options = {}) {
    // console.log('transform3DayData rawData', rawData);
    // rawData 來自 Fetch3day，結構請參考 3day.json 範例
    // options.preferNearestByLocation 為 true 時：
    //   優先依 Nominatim suburb 直接比對 LocationName，其次才使用「最近座標」挑選行政區
    //   （適用於：目前城市就是地理定位得到的城市）
    // 為 false 時：
    //   一律使用 Location 陣列中的第一個行政區
    //   （適用於：手動切換到非定位城市時，直接顯示該縣市第一個鄉鎮，例如新北市→板橋區）
    const {
        preferNearestByLocation = true,
        targetDistrictName = null // 若指定，將直接選用該 LocationName 對應的鄉鎮
    } = options || {};

    const locationsWrapper = rawData.locations;
    const locationsArray = locationsWrapper && Array.isArray(locationsWrapper.location)
        ? locationsWrapper.location
        : [];

    if (!locationsArray.length) {
        return {
            city: rawData.city || '',
            district: '',
            forecasts: []
        };
    }

    let selectedDistrict = locationsArray[0];

    // 若有指定 targetDistrictName，優先直接用該行政區
    if (targetDistrictName) {
        const matched = locationsArray.find(loc => loc.locationName === targetDistrictName);
        if (matched) {
            selectedDistrict = matched;
            // console.log('使用指定的 targetDistrictName 選擇行政區：', targetDistrictName);
        }
    } else if (preferNearestByLocation) {
        // 1) 嘗試使用 Nominatim suburb 直接比對 LocationName
        let selectedBySuburb = false;
        try {
            if (typeof window !== 'undefined' && window.__osmSuburb) {
                const suburb = window.__osmSuburb;
                const matched = locationsArray.find(loc => loc.locationName === suburb);
                if (matched) {
                    selectedDistrict = matched;
                    selectedBySuburb = true;
                    // console.log('使用 Nominatim suburb 選擇行政區：', suburb);
                }
            }
        } catch (e) {
            // 無法讀取 window 或 suburb 時略過，交由後續座標邏輯處理
        }

        // 2) 若無 suburb 比對成功，再退回使用「最近座標」邏輯
        if (!selectedBySuburb) {
            try {
                if (typeof window !== 'undefined' &&
                    typeof window.__userLat === 'number' &&
                    typeof window.__userLng === 'number') {
                    const userLat = window.__userLat;
                    const userLng = window.__userLng;
                    let minDist = Infinity;

                    locationsArray.forEach(loc => {
                        const lat = typeof loc.latitude === 'number' ? loc.latitude : parseFloat(loc.latitude);
                        const lng = typeof loc.longitude === 'number' ? loc.longitude : parseFloat(loc.longitude);
                        if (Number.isNaN(lat) || Number.isNaN(lng)) return;
                        const dLat = lat - userLat;
                        const dLng = lng - userLng;
                        const dist2 = dLat * dLat + dLng * dLng;
                        if (dist2 < minDist) {
                            minDist = dist2;
                            selectedDistrict = loc;
                        }
                    });

                    // console.log('使用最近座標選擇行政區：', selectedDistrict.locationName);
                }
            } catch (e) {
                // 若在非瀏覽器環境或 window 未定義，直接使用預設的第一個行政區
            }
        }
    }

    const districtName = selectedDistrict.locationName;
    const districtLat = typeof selectedDistrict.latitude === 'number'
        ? selectedDistrict.latitude
        : parseFloat(selectedDistrict.latitude);
    const districtLng = typeof selectedDistrict.longitude === 'number'
        ? selectedDistrict.longitude
        : parseFloat(selectedDistrict.longitude);
    const elements = selectedDistrict.weatherElement || [];

    // 將 CWA 的氣象因子節點 elementName 映射成我們需要的元素
    const elementMap = {};
    elements.forEach(el => {
        // 直接以中文名稱做 key
        if (!elementMap[el.elementName]) {
             elementMap[el.elementName] = el.time || [];
        }
    });

    // 取出需要的氣象因子元素：
    const tempData = elementMap['溫度'] || [];
    const popData = elementMap['3小時降雨機率'] || [];
    const ciData = elementMap['舒適度指數'] || [];
    const weatherData = elementMap['天氣現象'] || [];

    // 建立溫度的時間區間陣列
    const tempIntervals = [];
    tempData.forEach(t => {
        const dataTime = t.DataTime;
        const value = parseInt(t.ElementValue?.[0]?.Temperature || t.ElementValue?.[0]?.value);
        
        if (dataTime && !Number.isNaN(value)) {
            const time = parseDateTime(dataTime);
            const nextHour = new Date(time);
            nextHour.setHours(nextHour.getHours() + 1);
            
            tempIntervals.push({
                start: time,
                end: nextHour,
                value: value
            });
        }
    });

    // 建立降雨機率的時間區間陣列
    const popIntervals = [];
    popData.forEach(p => {
        const startTime = p.StartTime || p.startTime;
        const endTime = p.EndTime || p.endTime;
        const value = parseInt(p.ElementValue?.[0]?.ProbabilityOfPrecipitation || p.ElementValue?.[0]?.value);
        
        if (startTime && endTime && !Number.isNaN(value)) {
            popIntervals.push({
                start: parseDateTime(startTime),
                end: parseDateTime(endTime),
                value: value
            });
        }
    });

    // 建立舒適度指數的時間區間陣列
    const ciIntervals = [];
    ciData.forEach(c => {
        const dataTime = c.DataTime;
        const description = c.ElementValue?.[0]?.ComfortIndexDescription || c.ComfortIndexDescription;
        
        if (dataTime && description) {
            const time = parseDateTime(dataTime);
            const nextHour = new Date(time);
            nextHour.setHours(nextHour.getHours() + 1);
            
            ciIntervals.push({
                start: time,
                end: nextHour,
                description: description
            });
        }
    });

    // 建立天氣現象的時間區間陣列
    const weatherIntervals = [];
    weatherData.forEach(w => {
        const startTime = w.StartTime || w.startTime;
        const endTime = w.EndTime || w.endTime;
        const wText = w.ElementValue?.[0]?.Weather || w.ElementValue?.[0]?.value;
        const wCode = w.ElementValue?.[0]?.WeatherCode || w.ElementValue?.[1]?.value;
        
        if (startTime && endTime) {
            weatherIntervals.push({
                start: parseDateTime(startTime),
                end: parseDateTime(endTime),
                weather: wText || '',
                weatherCode: wCode || ''
            });
        }
    });

    // 輔助函式：根據時間點查找對應的溫度
    const findTemp = (dateTime) => {
        const time = parseDateTime(dateTime);
        for (const interval of tempIntervals) {
            if (time >= interval.start && time < interval.end) {
                return interval.value;
            }
        }
        return null;
    };

    // 輔助函式：根據時間點查找對應的降雨機率
    const findRainProb = (dateTime) => {
        const time = parseDateTime(dateTime);
        for (const interval of popIntervals) {
            if (time >= interval.start && time < interval.end) {
                return interval.value;
            }
        }
        return null;
    };

    // 輔助函式：根據時間點查找對應的舒適度
    const findComfort = (dateTime) => {
        const time = parseDateTime(dateTime);
        for (const interval of ciIntervals) {
            if (time >= interval.start && time < interval.end) {
                return interval.description;
            }
        }
        return null;
    };

    // 輔助函式：根據時間點查找對應的天氣現象
    const findWeather = (dateTime) => {
        const time = parseDateTime(dateTime);
        for (const interval of weatherIntervals) {
            if (time >= interval.start && time < interval.end) {
                return {
                    weather: interval.weather,
                    weatherCode: interval.weatherCode
                };
            }
        }
        return null;
    };

    // 按日期分組，並以溫度時間序列為主收集各項指標
    const dailyData = {};

    // 以溫度的時間序列為主軸（每小時一筆）
    tempData.forEach(item => {
        const timeStr = item.DataTime;
        if (!timeStr) return;
        const date = parseDateTime(timeStr);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: timeStr,
                temps: [],
                rains: [],
                comforts: [],
                weathers: [],
                weatherCodes: [],
                slots: []
            };
        }

        const dayBucket = dailyData[dateKey];
        const slot = {
            dateTime: timeStr,
            minutesOfDay: date.getHours() * 60 + date.getMinutes()
        };

        // 溫度（當前項目）
        const temp = parseInt(item.ElementValue?.[0]?.Temperature || item.ElementValue?.[0]?.value);
        if (!Number.isNaN(temp)) {
            dayBucket.temps.push(temp);
            slot.temp = temp;
        }

        // 使用時間區間查找降雨機率
        const rainProb = findRainProb(timeStr);
        if (rainProb !== null) {
            dayBucket.rains.push(rainProb);
            slot.rainProb = rainProb;
        }

        // 使用時間區間查找舒適度
        const comfort = findComfort(timeStr);
        if (comfort) {
            dayBucket.comforts.push(comfort);
            slot.comfort = comfort;
        }

        // 使用時間區間查找天氣現象
        const weatherInfo = findWeather(timeStr);
        if (weatherInfo) {
            if (weatherInfo.weather) {
                dayBucket.weathers.push(weatherInfo.weather);
                slot.weather = weatherInfo.weather;
            }
            if (weatherInfo.weatherCode) {
                dayBucket.weatherCodes.push(weatherInfo.weatherCode);
                slot.weatherCode = weatherInfo.weatherCode;
            }
        }

        dayBucket.slots.push(slot);
    });

    // 計算每日統計值，取前三天
    const now = new Date();
    const nowMinutesOfDay = now.getHours() * 60 + now.getMinutes();
    const sixHoursLater = nowMinutesOfDay + 360; // 當下時間 + 6 小時（360 分鐘）

    // 取得今天的日期 key（用於判斷 API 是否還有今天的資料）
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    const dailyForecasts = Object.entries(dailyData)
        .slice(0, 3)
        .map(([key, data], dayIndex) => {
            const temps = data.temps.length > 0 ? data.temps : [25];
            const rains = data.rains.length > 0 ? data.rains : [0];

            // 備援值（中間值代表整天平均狀況）
            const fallbackWeather = data.weathers[Math.floor(data.weathers.length / 2)] || '晴天';
            const fallbackCode = data.weatherCodes[Math.floor(data.weatherCodes.length / 2)] || '01';
            const fallbackComfort = data.comforts[Math.floor(data.comforts.length / 2)] || '舒適';
            const fallbackRainProb = Math.max(...rains);

            let weather, weatherCode, comfort, rainProb, minTemp, maxTemp;

            // 判斷：如果第一筆資料不是今天，代表 API 已無今天資料
            const firstDayKey = Object.keys(dailyData)[0];
            const apiHasToday = firstDayKey === todayKey;

            // 第 0 天處理：
            // - 若 API 有今天資料：取當下時間往後推 6 小時的區間
            // - 若 API 無今天資料（已過午夜）：取明天 00:00 時段
            if (dayIndex === 0) {
                let targetSlot = null;
                let rangeTemps = [];

                if (Array.isArray(data.slots) && data.slots.length > 0) {
                    if (apiHasToday) {
                        // API 有今天資料：使用 6 小時區間邏輯
                        const rangeSlots = data.slots.filter(s =>
                            typeof s.minutesOfDay === 'number' && 
                            s.minutesOfDay >= nowMinutesOfDay && 
                            s.minutesOfDay <= sixHoursLater
                        );

                        if (rangeSlots.length > 0) {
                            rangeSlots.forEach(s => {
                                if (typeof s.temp === 'number') {
                                    rangeTemps.push(s.temp);
                                }
                            });

                            targetSlot = rangeSlots.reduce((closest, slot) => {
                                const diff = Math.abs(slot.minutesOfDay - sixHoursLater);
                                const closestDiff = Math.abs(closest.minutesOfDay - sixHoursLater);
                                return diff < closestDiff ? slot : closest;
                            });
                        } else {
                            // 6 小時後已超過今日，取當天最後時段
                            const lastSlot = data.slots[data.slots.length - 1];
                            targetSlot = lastSlot;

                            data.slots.forEach(s => {
                                if (typeof s.minutesOfDay === 'number' && 
                                    s.minutesOfDay >= nowMinutesOfDay && 
                                    typeof s.temp === 'number') {
                                    rangeTemps.push(s.temp);
                                }
                            });
                        }
                    } else {
                        // API 無今天資料：直接取明天 00:00 時段（第一個 slot）
                        targetSlot = data.slots[0];
                        if (targetSlot && typeof targetSlot.temp === 'number') {
                            rangeTemps.push(targetSlot.temp);
                        }
                        // console.log('API 已無今天資料，使用明天 00:00 時段:', targetSlot);
                    }
                }

                weather = (targetSlot && targetSlot.weather) || fallbackWeather;
                weatherCode = (targetSlot && targetSlot.weatherCode) || fallbackCode;
                comfort = (targetSlot && targetSlot.comfort) || fallbackComfort;
                rainProb = (targetSlot && typeof targetSlot.rainProb === 'number') ? targetSlot.rainProb : fallbackRainProb;

                if (rangeTemps.length > 0) {
                    minTemp = Math.min(...rangeTemps);
                    maxTemp = Math.max(...rangeTemps);
                } else {
                    minTemp = Math.min(...temps);
                    maxTemp = Math.max(...temps);
                }

                // console.log('今天取值:', { apiHasToday, targetSlot, weather, weatherCode, rainProb, minTemp, maxTemp });
            } 
            // 第 1 天（明天）、第 2 天（後天）：使用 fallback 值和全天溫度
            else {
                weather = fallbackWeather;
                weatherCode = fallbackCode;
                comfort = fallbackComfort;
                rainProb = fallbackRainProb;
                minTemp = Math.min(...temps);
                maxTemp = Math.max(...temps);

                // console.log(`第 ${dayIndex} 天取值（fallback）:`, { weather, weatherCode, rainProb, minTemp, maxTemp });
            }

            return {
                date: data.date,
                dateFormatted: formatDate(data.date),
                weather,
                weatherCode,
                minTemp,
                maxTemp,
                rainProb,
                comfort
            };
        });

    return {
        city: rawData.city,
        district: districtName,
        lat: Number.isFinite(districtLat) ? districtLat : undefined,
        lng: Number.isFinite(districtLng) ? districtLng : undefined,
        forecasts: dailyForecasts
    };
}

// Node.js friendly export for local testing
try {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = module.exports || {};
        module.exports.transform3DayData = transform3DayData;
        module.exports.transform36HourData = transform36HourData;
    }
} catch (e) {
    // ignore in browser
}