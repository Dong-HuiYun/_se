'use strict';

// 與 A1_detail.html 的 getAIResponse 相同，順序即優先權
const RULES = [
  { keywords: ['價格', '多少錢', '價錢'], reply: '台北凱達大飯店的房價根據房型和季節有所不同，豪華雙人房約TWD 3,685起，豪華雙床房約TWD 3,685起，家庭套房TWD 6,057起，小型套房TWD 3,685起。我們提供價格保證，如發現更低價格將提供差價補償。' },
  { keywords: ['設施', '設備'], reply: '酒店提供戶外游泳池、健身中心、多間餐廳、免費Wi-Fi、商務中心等多種設施。所有設施均可透過手機App預約使用。' },
  { keywords: ['位置', '地址', '在哪'], reply: '酒店位於台北市萬華區艋舺大道167號，周邊有龍山寺地下街、艋舺公園等。步行5分鐘可達捷運站，交通十分便利。' },
  { keywords: ['早餐', '用餐'], reply: '我們提供豐盛的自助早餐，包含中西式多樣選擇。營業時間為早上6:30至10:00，也提供客房送餐服務。' },
  { keywords: ['優惠', '折扣'], reply: '目前有提前預訂85折、連住優惠、會員點數回饋等多項優惠。建議您查看我們的期間優惠頁面獲取最新資訊。' },
  { keywords: ['停車', '車位'], reply: '酒店提供免費停車服務，每間客房於住宿期間可享有一個免費停車位，採先到先停原則。' },
  { keywords: ['wifi', '網絡'], reply: '酒店全區域提供免費高速Wi-Fi 6網路，入住後即可免費連接，無需額外付費。' },
  { keywords: ['游泳池', '泳池'], reply: '酒店設有戶外游泳池，每年3月到12月開放，開放時間為早上7點至晚上9點。' },
  { keywords: ['健身', '運動'], reply: '酒店設有24小時開放的健身中心，配備先進的健身設備，並有專業教練指導服務。' },
  { keywords: ['你好', '您好', '嗨'], reply: '您好！很高興為您服務，有什麼關於台北凱達大飯店的問題嗎？' },
  { keywords: ['入住', '退房'], reply: '最早可辦理入住的時間為下午三點，最晚可辦理退房的時間為中午12點。我們提供快速入住/退房服務。' },
  { keywords: ['謝謝', '感謝'], reply: '不客氣！如果有其他問題，隨時可以問我。' },
];

const FALLBACK = '感謝您的提問！如需更詳細的資訊，請查看頁面上的詳細介紹或聯繫我們的客服人員，電話：（02）2306-6777。';

function getReply(message) {
  const lower = String(message).toLowerCase();
  const rule = RULES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return rule ? rule.reply : FALLBACK;
}

module.exports = { RULES, FALLBACK, getReply };
