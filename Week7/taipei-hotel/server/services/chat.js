'use strict';

const { getHotel } = require('./hotels');

// A 類（A1_detail.html 的 getAIResponse），順序即優先權
const RULES = [
  { keywords: ['價格', '多少錢', '價錢'], reply: '台北凱達大飯店的房價根據房型和季節有所不同，豪華雙人房約TWD 3,685起，豪華雙床房約TWD 3,685起，家庭套房TWD 6,057起，小型套房TWD 3,685起。我們提供價格保證，如發現更低價格將提供差價補償。' },
  { keywords: ['設施', '設備'], reply: '酒店提供戶外游泳池、健身中心、多間餐廳、免費Wi-Fi、商務中心等多種設施。所有設施均可透過手機App預約使用。' },
  { location: true, keywords: ['位置', '地址', '在哪'], reply: '酒店位於台北市萬華區艋舺大道167號，周邊有龍山寺地下街、艋舺公園等。步行5分鐘可達捷運站，交通十分便利。' },
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

// B 類（B1_detail.html 的 getAIResponse）
const RULES_B = [
  { keywords: ['價格', '多少錢', '價錢'], reply: '台北君悅酒店的房價根據房型和季節有所不同，君悅套房特大床約TWD 18,000起，101景觀客房約TWD 15,000起。我們提供價格保證，如發現更低價格將提供差價補償。' },
  { keywords: ['設施', '設備'], reply: '酒店提供室內溫水游泳池、健身中心、桑拿、免費Wi-Fi、多間餐廳等多種設施。所有設施均可透過手機App預約使用。' },
  { location: true, keywords: ['位置', '地址', '在哪'], reply: '酒店位於台北市信義區松壽路2號，周邊有台北101、信義商圈等。步行5分鐘可達捷運站，交通十分便利。' },
  { keywords: ['早餐', '用餐'], reply: '我們提供豐盛的自助早餐，包含中西式多樣選擇。營業時間為早上6:30至10:30，也提供客房送餐服務。' },
  { keywords: ['優惠', '折扣'], reply: '目前有提前預訂85折、連住優惠、會員點數回饋等多項優惠。建議您查看我們的期間優惠頁面獲取最新資訊。' },
  { keywords: ['停車', '車位'], reply: '酒店提供免費停車服務，每間客房於住宿期間可享有一個免費停車位，採先到先停原則。' },
  { keywords: ['wifi', '網絡'], reply: '酒店全區域提供免費高速Wi-Fi網路，入住後即可免費連接，無需額外付費。' },
  { keywords: ['游泳池', '泳池'], reply: '酒店設有室內溫水游泳池，全年開放，開放時間為早上7點至晚上10點。' },
  { keywords: ['健身', '運動'], reply: '酒店設有24小時開放的健身中心，配備先進的健身設備，並有專業教練指導服務。' },
  { keywords: ['你好', '您好', '嗨'], reply: '您好！很高興為您服務，有什麼關於台北君悅酒店的問題嗎？' },
  { keywords: ['入住', '退房'], reply: '最早可辦理入住的時間為下午三點，最晚可辦理退房的時間為下午12點。我們提供提前入住和延後退房服務。' },
  { keywords: ['謝謝', '感謝'], reply: '不客氣！如果有其他問題，隨時可以問我。' },
];
const FALLBACK_B = '感謝您的提問！如需更詳細的資訊，請查看頁面上的詳細介紹或聯繫我們的客服人員。';

// C 類（C1_detail.html 的 sendMessage）
const RULES_C = [
  { keywords: ['房', '間'], reply: '我們提供多種房型選擇，包括輕奢背包客八人房、雅緻大床房和豪華大床房。您可以在「房型選擇」區塊查看詳細資訊。' },
  { keywords: ['優惠', '折扣', 'discount'], reply: '目前我們有限時68.65%折扣，還有點數回饋計畫。您可以在「優惠詳情」區塊查看所有優惠資訊。' },
  { location: true, keywords: ['位置', 'location', '地圖'], reply: '飯店位於西門町中心，交通便利，周邊有豐富的購物和餐飲選擇。您可以在「位置周邊」區塊查看詳細地圖和周邊資訊。' },
  { keywords: ['評價', 'review', '評分'], reply: '我們的住客評價分數為8.7分（很棒），共有1,248則評價。您可以在「住客評價」區塊查看詳細評價內容。' },
];
const FALLBACK_C = '感謝您的詢問！如需更多幫助，請聯繫我們的客服人員。您也可以查看頁面上的各個功能區塊獲取更多資訊。';

const BY_CATEGORY = {
  A: { rules: RULES, fallback: FALLBACK, baseName: '台北凱達大飯店' },
  B: { rules: RULES_B, fallback: FALLBACK_B, baseName: '台北君悅酒店' },
  C: { rules: RULES_C, fallback: FALLBACK_C, baseName: null },
};

function locationReply(hotel) {
  return hotel.address
    ? `${hotel.name}位於台北市${hotel.address}。您可以在頁面的位置周邊區塊查看詳細地圖和周邊資訊。`
    : `${hotel.name}的位置資訊，請參考頁面上的位置周邊區塊。`;
}

/**
 * 依旅館類別選擇規則。A1/B1/C1 沿用頁面原文；
 * 其他旅館（複製頁面而來）則把旅館名稱換成自己的，並改用自己的地址回答位置問題。
 */
function getReply(message, hotelId = 'A1') {
  const hotel = getHotel(hotelId) || getHotel('A1');
  const set = BY_CATEGORY[hotel.category];
  const lower = String(message).toLowerCase();
  const rule = set.rules.find((r) => r.keywords.some((k) => lower.includes(k)));
  if (!rule) return set.fallback;
  if (hotel.isBase) return rule.reply;
  if (rule.location) return locationReply(hotel);
  return set.baseName ? rule.reply.split(set.baseName).join(hotel.name) : rule.reply;
}

module.exports = { RULES, RULES_B, RULES_C, FALLBACK, FALLBACK_B, FALLBACK_C, getReply };
