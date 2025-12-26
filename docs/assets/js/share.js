// 從網址參數讀取 holishitKey，可覆寫預設值
const holishitKey = (() => {
	try {
		if (typeof window === 'undefined') return "";
		const params = new URLSearchParams(window.location.search);
		const fromQuery = params.get('holishitKey');
		if (fromQuery && fromQuery.trim()) {
			return fromQuery.trim();
		}
	} catch (e) {
		// 忽略解析錯誤，退回預設值
	}
	// 沒有帶參數時，可選擇留空或填你的預設 key
	return "";
})();

// 今明 36 小時預報
const govCode_36h = "F-C0032-001"; // 今明 36 小時
const API_36h = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${govCode_36h}?Authorization=${holishitKey}&format=JSON&locationName=`;

// 3 天預報
const govCode_taipei = "F-D0047-061"; // 臺北市
const govCode_newtaipei = "F-D0047-069"; // 新北市
const govCode_taoyuan = "F-D0047-005"; // 桃園市
const govCode_hsinchu = "F-D0047-053"; // 新竹市
const govCode_taichung = "F-D0047-073"; // 臺中市
const govCode_tainan = "F-D0047-077"; // 臺南市
const govCode_kaohsiung = "F-D0047-065"; // 高雄市

// cityKey 對應 3 天預報 govCode 的 mapping
const GOVCODE_3DAY_MAP = {
	taipei: govCode_taipei,
	newtaipei: govCode_newtaipei,
	taoyuan: govCode_taoyuan,
	hsinchu: govCode_hsinchu,
	taichung: govCode_taichung,
	tainan: govCode_tainan,
	kaohsiung: govCode_kaohsiung,
};

// 動態產生 3 天預報 API（預設用新北市）
function get3DayUrl(cityKey = 'newtaipei') {
	const code = GOVCODE_3DAY_MAP[cityKey] || govCode_newtaipei;
	return `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${code}?Authorization=${holishitKey}`;
}

// 舊名保留一個 helper，方便既有程式呼叫（預設用新北市）
function url_3day(cityKey = 'newtaipei') {
	return get3DayUrl(cityKey);
}

// ============================================
// TGOS API 相關設定
// ============================================

// 六都所有行政區清單（用於比對 TGOS 回傳的地址）
const DISTRICT_LIST = [
    // 臺北市
     '松山區',  '信義區', '大安區', '中山區', '中正區', '大同區', '萬華區', '文山區', '南港區', '內湖區', '士林區', '北投區',
    // 新北市
    '板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區', '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區', '石碇區', '坪林區', '三芝區', '石門區', '八里區', '平溪區', '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區',
    // 桃園市
    '桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '大園區', '龜山區', '八德區', '龍潭區', '平鎮區', '新屋區', '觀音區', '復興區',
    // 新竹市
    '東區', '北區', '香山區',
    // 臺中市
    '中區', '東區', '南區', '西區', '北區', '西屯區', '南屯區', '北屯區', '豐原區', '東勢區', '大甲區', '清水區', '沙鹿區', '梧棲區', '后里區', '神岡區', '潭子區', '大雅區', '新社區', '石岡區', '外埔區', '大安區', '烏日區', '大肚區', '龍井區', '霧峰區', '太平區', '大里區', '和平區',
    // 臺南市
    '新營區', '鹽水區', '白河區', '柳營區', '後壁區', '東山區', '麻豆區', '下營區', '六甲區', '官田區', '大內區', '佳里區', '學甲區', '西港區', '七股區', '將軍區', '北門區', '新化區', '善化區', '新市區', '安定區', '山上區', '玉井區', '楠西區', '南化區', '左鎮區', '仁德區', '歸仁區', '關廟區', '龍崎區', '永康區', '東區', '南區', '北區', '安南區', '安平區', '中西區',
	// 高雄市
    '鹽埕區', '鼓山區', '左營區', '楠梓區', '三民區', '新興區', '前金區', '苓雅區', '前鎮區', '旗津區', '小港區', '鳳山區', '林園區', '大寮區', '大樹區', '大社區', '仁武區', '鳥松區', '岡山區', '橋頭區', '燕巢區', '田寮區', '阿蓮區', '路竹區', '湖內區', '茄萣區', '永安區', '彌陀區', '梓官區', '旗山區', '美濃區','六龜區', '甲仙區', '杉林區', '內門區', '茂林區', '桃源區', '那瑪夏區'
];

/**
 * WGS84 經緯度轉換為 TWD97 二度分帶座標（TGOS 使用）
 * @param {number} lng - WGS84 經度
 * @param {number} lat - WGS84 緯度
 * @returns {{x: number, y: number}} TWD97 座標
 */
function wgs84ToTwd97(lng, lat) {
    // 參數設定（TWD97 使用 TM2 二度分帶）
    const a = 6378137.0; // GRS80 長半軸
    const b = 6356752.314140; // GRS80 短半軸
    const lon0 = 121 * Math.PI / 180; // 中央經線 121 度
    const k0 = 0.9999; // 尺度因子
    const dx = 250000; // 東偏移量

    const radLat = lat * Math.PI / 180;
    const radLon = lng * Math.PI / 180;

    const e = Math.sqrt(1 - (b * b) / (a * a));
    const e2 = e * e / (1 - e * e);

    const N = a / Math.sqrt(1 - e * e * Math.sin(radLat) * Math.sin(radLat));
    const T = Math.tan(radLat) * Math.tan(radLat);
    const C = e2 * Math.cos(radLat) * Math.cos(radLat);
    const A = (radLon - lon0) * Math.cos(radLat);

    const M = a * ((1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256) * radLat
        - (3 * e * e / 8 + 3 * e * e * e * e / 32 + 45 * e * e * e * e * e * e / 1024) * Math.sin(2 * radLat)
        + (15 * e * e * e * e / 256 + 45 * e * e * e * e * e * e / 1024) * Math.sin(4 * radLat)
        - (35 * e * e * e * e * e * e / 3072) * Math.sin(6 * radLat));

    const x = dx + k0 * N * (A + (1 - T + C) * A * A * A / 6
        + (5 - 18 * T + T * T + 72 * C - 58 * e2) * A * A * A * A * A / 120);

    const y = k0 * (M + N * Math.tan(radLat) * (A * A / 2
        + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
        + (61 - 58 * T + T * T + 600 * C - 330 * e2) * A * A * A * A * A * A / 720));

    return { x: Math.round(x), y: Math.round(y) };
}

/**
 * 從 TGOS 地址字串中解析出行政區
 * @param {string} address - TGOS 回傳的地址，例如："新北市五股區興珍里37鄰五工六路41號"
 * @returns {string|null} 行政區名稱，例如："五股區"，找不到則回傳 null
 */
function parseDistrictFromAddress(address) {
    if (!address) return null;
    
    // 尋找第一個符合的行政區
    for (const district of DISTRICT_LIST) {
        if (address.includes(district)) {
            return district;
        }
    }
    
    return null;
}