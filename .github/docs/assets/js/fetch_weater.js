// 中央氣象署 36 小時 + 3 日 API

/**
 * 使用中央氣象署今明 36 小時 API
 * @param {string} cityKey - 六都 key (taipei/newtaipei/...)
 * @returns {Promise<any>} - 回傳與 proxy 相同結構的 data36h (僅 data 區段)
 */
async function Fetch36h(cityKey) {
    const cityName = CITIES[cityKey]?.name || "新北市";
    const url = `${API_36h}${encodeURIComponent(cityName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("36h fetch failed");
    const json = await res.json();

    const location = json.records?.location?.[0];
    if (!location) throw new Error("36h no location data");

    // 直接回傳給 transform36HourData 使用
    return {
        city: location.locationName || cityName,
        location: location
    };
}

/**
 * 使用中央氣象署 3 日預報 API（依 cityKey 動態選 govCode）
 * @param {string} cityKey - 六都 key (taipei/newtaipei/...)
 * @returns {Promise<any>} - 回傳給 transform3DayData 的 rawData
 */
async function Fetch3day(cityKey = 'newtaipei') { // 預設用新北市
    const url = url_3day(cityKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error("3day fetch failed");
    const json = await res.json();

    // CWA F-D0047 結構：json.records.Locations 為陣列，每筆含 Location 陣列
    const locationsRoot = json.records?.Locations?.[0];
    if (!locationsRoot || !Array.isArray(locationsRoot.Location)) {
        throw new Error("3day no locations data");
    }

    // 轉成 transform3DayData 期望的小寫 key 結構，並保留經緯度供後續就近鄉鎮判斷
    const mappedLocations = {
        location: locationsRoot.Location.map(loc => ({
            locationName: loc.LocationName,
            latitude: parseFloat(loc.Latitude),
            longitude: parseFloat(loc.Longitude),
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
        __from_fetch_weather_js: true
    };
}
