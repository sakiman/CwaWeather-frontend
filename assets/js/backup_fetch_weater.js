// 備援：直接打中央氣象署 36 小時 + 3 日 API

/**
 * 使用中央氣象署今明 36 小時備援 API
 * @param {string} cityKey - 六都 key (taipei/newtaipei/...)
 * @returns {Promise<any>} - 回傳與 proxy 相同結構的 data36h (僅 data 區段)
 */
async function backupFetch36h(cityKey) {
    const cityName = CITIES[cityKey]?.name || "新北市";
    const url = `${backup_API_36h}${encodeURIComponent(cityName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("backup 36h fetch failed");
    const json = await res.json();

    const location = json.records?.location?.[0];
    if (!location) throw new Error("backup 36h no location data");

    // 直接回傳給 transform36HourData 使用
    return {
        city: location.locationName || cityName,
        location: location
    };
}

/**
 * 使用中央氣象署 3 日預報備援 API（依 cityKey 動態選 govCode）
 * @param {string} cityKey - 六都 key (taipei/newtaipei/...)
 * @returns {Promise<any>} - 回傳給 transform3DayData 的 rawData
 */
async function backupFetch3day(cityKey = 'newtaipei') { // 預設用新北市
    const url = backup_3day(cityKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error("backup 3day fetch failed");
    const json = await res.json();

    // CWA F-D0047 結構：json.records.Locations 為陣列，每筆含 Location 陣列
    const locationsRoot = json.records?.Locations?.[0];
    if (!locationsRoot || !Array.isArray(locationsRoot.Location)) {
        throw new Error("backup 3day no locations data");
    }

    // 轉成 transform3DayData 期望的小寫 key 結構
    const mappedLocations = {
        location: locationsRoot.Location.map(loc => ({
            locationName: loc.LocationName,
            weatherElement: loc.WeatherElement.map(el => ({
                // 保留舊的 elementName 命名風格，後續在 transform3DayData 以 elementMap.* 存取
                // 這裡僅做 key rename，內部 Time 結構保持原樣
                 elementName: el.ElementName,
                 time: el.Time
            }))
        }))
    };

    return {
        city: locationsRoot.LocationsName || (CITIES[cityKey]?.name || "新北市"),
        locations: mappedLocations,
        __fromBackupCWA3Day: true
    };
}

/**
 * 備援專用：轉換三日預報 API 資料（使用 CWA 3day 原始結構）
 * 結果結構需與 transform3DayData 回傳內容相同
 */
function backup_transform3DayData(rawData) {
    // rawData 來自 backupFetch3day，結構請參考 3day_temp.json
    // 取得第一個行政區（例如：板橋區）
    const locationsWrapper = rawData.locations;
    if (!locationsWrapper || !Array.isArray(locationsWrapper.location) || locationsWrapper.location.length === 0) {
        return {
            city: rawData.city || '',
            district: '',
            forecasts: []
        };
    }

    const firstDistrict = locationsWrapper.location[0];
    const districtName = firstDistrict.locationName;
    const elements = firstDistrict.weatherElement || [];

    // 將 CWA 的 elementName 映射成我們需要的元素
    const elementMap = {};
    elements.forEach(el => {
        // 直接以中文名稱做 key
        if (!elementMap[el.elementName]) {
             elementMap[el.elementName] = el.time || [];
        }
    });

    // 取出各項資料來源
    const tempData = elementMap['溫度'] || [];
    const popData = elementMap['3小時降雨機率'] || [];
    const ciData = elementMap['舒適度指數'] || [];
    const weatherData = elementMap['天氣現象'] || [];

    // 按日期分組
    const dailyData = {};

    // 以溫度時間序列為主
    tempData.forEach((item, index) => {
        const timeStr = item.DataTime || item.StartTime || item.startTime;
        if (!timeStr) return;
        const date = parseDateTime(timeStr);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: timeStr,
                weathers: [],
                weatherCodes: [],
                temps: [],
                rains: [],
                comforts: []
            };
        }

        // 溫度
        const tVal = parseInt(item.Temperature || item.ElementValue?.[0]?.Temperature || item.ElementValue?.[0]?.value);
        if (!Number.isNaN(tVal)) {
             dailyData[dateKey].temps.push(tVal);
        }

        // 降雨機率：以相同 index 對應 popData
        if (popData[index]) {
            const popVal = parseInt(popData[index].ProbabilityOfPrecipitation || popData[index].ElementValue?.[0]?.value);
            if (!Number.isNaN(popVal)) {
                 dailyData[dateKey].rains.push(popVal);
            }
        }

        // 舒適度
        if (ciData[index]) {
            const ciVal = ciData[index].ComfortIndexDescription || ciData[index].ElementValue?.[0]?.value;
            if (ciVal) {
                 dailyData[dateKey].comforts.push(ciVal);
            }
        }

        // 天氣現象
        if (weatherData[index]) {
            const wText = weatherData[index].Weather || weatherData[index].ElementValue?.[0]?.value;
            const wCode = weatherData[index].WeatherCode || weatherData[index].ElementValue?.[1]?.value;
            if (wText) dailyData[dateKey].weathers.push(wText);
            if (wCode) dailyData[dateKey].weatherCodes.push(wCode);
        }
    });

    // 計算每日統計值，取前三天
    const dailyForecasts = Object.entries(dailyData)
        .slice(0, 3)
        .map(([key, data]) => {
            const temps = data.temps.length > 0 ? data.temps : [25];
            const rains = data.rains.length > 0 ? data.rains : [0];
            return {
                date: data.date,
                dateFormatted: formatDate(data.date),
                weather: data.weathers[Math.floor(data.weathers.length / 2)] || '多雲',
                weatherCode: data.weatherCodes[Math.floor(data.weatherCodes.length / 2)] || '04',
                minTemp: Math.min(...temps),
                maxTemp: Math.max(...temps),
                rainProb: Math.max(...rains),
                comfort: data.comforts[Math.floor(data.comforts.length / 2)] || '舒適'
            };
        });

    return {
        city: rawData.city,
        district: districtName,
        forecasts: dailyForecasts
    };
}