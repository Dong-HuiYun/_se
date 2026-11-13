'use strict';

/**
 * 旅館目錄。資料來源：
 *  - 旅館名稱 / 類別 / 詳情頁：hotel_interface.html
 *  - 房型與價格：各類別共用的訂房頁 A1_room1_page.html、B1_room1_page.html、C1_room1_page.html 的 roomData
 *  - 地址：各旅館詳情頁（A3、B3 的頁面是複製來的，地址不可信，所以留空）
 */
const ROOMS_BY_CATEGORY = {
  A: {
    type1: { id: 'type1', name: '豪華雙人房', basePrice: 3685, features: '30平方米 · 1張單人床 · 免費Wi-Fi' },
    type2: { id: 'type2', name: '豪華雙床房', basePrice: 3685, features: '30平方米 · 特大雙人床 · 獨立客廳' },
    type3: { id: 'type3', name: '家庭套房', basePrice: 6057, features: '30平方米 · 1張雙人床 · 免費Wi-Fi' },
    type4: { id: 'type4', name: '小型套房', basePrice: 3685, features: '30平方米 · 1張單人床 · 免費Wi-Fi' },
  },
  B: {
    type1: { id: 'type1', name: '君悅套房特大床', basePrice: 18000, features: '18坪 · 迷你吧 · 獨立辦公室' },
    type2: { id: 'type2', name: '君悅套房雙床', basePrice: 18000, features: '18坪 · 迷你吧 · 獨立辦公室' },
    type3: { id: 'type3', name: '外交官套房', basePrice: 20000, features: '60坪 · 小廚房 · iMac蘋果電腦' },
    type4: { id: 'type4', name: '101景觀客房', basePrice: 15000, features: '33至40平方米 · 特大辦公桌 · 101景觀' },
  },
  C: {
    type1: { id: 'type1', name: '輕奢背包客', basePrice: 580, features: '面積: 20平方米 · 市景 · 單人床' },
    type2: { id: 'type2', name: '雅緻大床房', basePrice: 2080, features: '面積: 14平方米 · 市景 · 1張雙人床' },
    type3: { id: 'type3', name: '豪華大床房', basePrice: 2280, features: '面積: 20平方米 · 市景 · 1張雙人床' },
  },
};

const CATEGORY_LABELS = { A: '科技愛好者', B: '高CP值追求者', C: '價格敏感者' };

// isBase：該類別的「原型」旅館（A1/B1/C1），聊天回覆沿用頁面原文；其他旅館由原型複製而來
const HOTEL_LIST = [
  { id: 'A1', category: 'A', name: '台北凱達大飯店', address: '萬華區艋舺大道167號', isBase: true },
  { id: 'A2', category: 'A', name: '台北W飯店', address: '信義區忠孝東路五段10號' },
  { id: 'A3', category: 'A', name: '台北寒舍艾美酒店', address: null },
  { id: 'B1', category: 'B', name: '台北君悅酒店', address: '信義區松壽路2號', isBase: true },
  { id: 'B2', category: 'B', name: '台北晶華酒店', address: '中山區中山北路二段39巷3號' },
  { id: 'B3', category: 'B', name: '台北遠東國際大飯店', address: null },
  { id: 'C1', category: 'C', name: '台北美好境界西門館', address: '萬華區西寧南路36號9樓之2', isBase: true },
  { id: 'C2', category: 'C', name: '台北喜來登大飯店', address: '中正區忠孝東路一段12號' },
  { id: 'C3', category: 'C', name: '台北德立莊酒店', address: '中正區寶慶路4號' },
].map((h) => ({
  ...h,
  isBase: !!h.isBase,
  detailPage: `${h.id}_detail.html`,
  bookingPage: `${h.category}1_room1_page.html`, // 同類別共用同一個訂房頁
}));

const HOTELS = Object.fromEntries(HOTEL_LIST.map((h) => [h.id, h]));
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const getHotel = (id) => (typeof id === 'string' && has(HOTELS, id) ? HOTELS[id] : null);
const listHotels = (category) => (category ? HOTEL_LIST.filter((h) => h.category === category) : [...HOTEL_LIST]);
const isCategory = (c) => typeof c === 'string' && has(ROOMS_BY_CATEGORY, c);

/** 取得旅館的房型表；旅館不存在回傳 null */
function getRooms(hotelId) {
  const hotel = getHotel(hotelId);
  return hotel ? ROOMS_BY_CATEGORY[hotel.category] : null;
}

module.exports = { ROOMS_BY_CATEGORY, CATEGORY_LABELS, HOTEL_LIST, getHotel, listHotels, isCategory, getRooms };
