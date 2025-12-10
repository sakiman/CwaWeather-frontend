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
const govCode_taichung = "F-D0047-073"; // 臺中市
const govCode_tainan = "F-D0047-077"; // 臺南市
const govCode_kaohsiung = "F-D0047-065"; // 高雄市

// cityKey 對應 3 天預報 govCode 的 mapping
const GOVCODE_3DAY_MAP = {
	taipei: govCode_taipei,
	newtaipei: govCode_newtaipei,
	taoyuan: govCode_taoyuan,
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