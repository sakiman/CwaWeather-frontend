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

    // 按日期分組，並以時間序列為主收集各項指標
    const dailyData = {};

    // 先用溫度時間序列收集每日溫度統計（不再當成所有元素的主時間軸）
    // 其餘像天氣現象則改用各自的時間序列尋找「最近的未來時段」。
    tempData.forEach((item, index) => {
        const timeStr = item.DataTime || item.StartTime || item.startTime;
        if (!timeStr) return;
        const date = parseDateTime(timeStr);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: timeStr,
                temps: [], // 收集當日所有溫度
                rains: [], // 收集當日所有降雨機率
                comforts: [], // 收集當日所有舒適度
                weathers: [], // 收集當日所有天氣現象
                weatherCodes: [], // 收集當日所有天氣代碼
                slots: [] // 之後會用「天氣現象」本身的時間序列填入
            };
        }

        const dayBucket = dailyData[dateKey];

        // 溫度
        const tVal = parseInt(item.Temperature || item.ElementValue?.[0]?.Temperature || item.ElementValue?.[0]?.value);
        if (!Number.isNaN(tVal)) {
             dayBucket.temps.push(tVal);
        }

        // 3小時降雨機率：以相同 index 對應 popData
        if (popData[index]) {
            const popVal = parseInt(popData[index].ProbabilityOfPrecipitation || popData[index].ElementValue?.[0]?.value);
            if (!Number.isNaN(popVal)) {
                 dayBucket.rains.push(popVal);
            }
        }

        // 舒適度描述
        if (ciData[index]) {
            const ciVal = ciData[index].ComfortIndexDescription || ciData[index].ElementValue?.[0]?.value;
            if (ciVal) {
                 dayBucket.comforts.push(ciVal);
            }
        }
    });

    // 再以「天氣現象」時間序列為主，建立 slots，供後續就近時間挑選
    weatherData.forEach(item => {
        const timeStr = item.DataTime || item.StartTime || item.startTime;
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

        const wText = item.Weather || item.ElementValue?.[0]?.Weather || item.ElementValue?.[0]?.value;
        const wCode = item.WeatherCode || item.ElementValue?.[0]?.WeatherCode || item.ElementValue?.[1]?.value;

        if (wText) {
            dayBucket.weathers.push(wText);
            slot.weather = wText;
        }
        if (wCode) {
            dayBucket.weatherCodes.push(wCode);
            slot.weatherCode = wCode;
        }

        dayBucket.slots.push(slot);
    });

    // 計算每日統計值，取前三天
    const now = new Date();
    const nowMinutesOfDay = now.getHours() * 60 + now.getMinutes();

    const dailyForecasts = Object.entries(dailyData)
        .slice(0, 3)
        .map(([key, data]) => {
            const temps = data.temps.length > 0 ? data.temps : [25];
            const rains = data.rains.length > 0 ? data.rains : [0];

            // 找出離使用者目前時間（以當天的時刻）最近的時間點
            let closestSlot = null;
            let minDiff = Infinity;

            // 只選擇「未來」的時間點（分鐘數大於等於目前時間）
            if (Array.isArray(data.slots)) {
                const futureSlots = data.slots.filter(s =>
                    typeof s.minutesOfDay === 'number' && s.minutesOfDay >= nowMinutesOfDay
                );

                futureSlots.forEach(s => {
                    const diff = Math.abs(s.minutesOfDay - nowMinutesOfDay);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestSlot = s;
                    }
                });
            }

            const fallbackWeather = data.weathers[Math.floor(data.weathers.length / 2)] || '多雲';
            const fallbackCode = data.weatherCodes[Math.floor(data.weatherCodes.length / 2)] || '04';
            const fallbackComfort = data.comforts[Math.floor(data.comforts.length / 2)] || '舒適';
            const fallbackRainProb = Math.max(...rains);

            const weather = (closestSlot && closestSlot.weather) || fallbackWeather;
            const weatherCode = (closestSlot && closestSlot.weatherCode) || fallbackCode;
            const comfort = (closestSlot && closestSlot.comfort) || fallbackComfort;
            const rainProb = (closestSlot && typeof closestSlot.rainProb === 'number') ? closestSlot.rainProb : fallbackRainProb;

            return {
                date: data.date,
                dateFormatted: formatDate(data.date),
                weather,
                weatherCode,
                minTemp: Math.min(...temps),
                maxTemp: Math.max(...temps),
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