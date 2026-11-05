'use strict';

const { HOTEL_LIST, ROOMS_BY_CATEGORY, getHotel, listHotels, isCategory, getRooms } = require('../../server/services/hotels');
const { getRoom, calculateQuote } = require('../../server/services/pricing');
const { getReply, RULES_B, RULES_C, FALLBACK_B, FALLBACK_C } = require('../../server/services/chat');
const { validateBooking } = require('../../server/services/validators');
const { createStore } = require('../../server/store');

const NOW = new Date(2025, 5, 10, 12, 0, 0);
const booking = (over = {}) => ({
  hotelId: 'B1', roomType: 'type1', checkin: '2025-06-15', checkout: '2025-06-17',
  adults: 2, fullName: '王小明', email: 'ming@example.com', phone: '0912345678', ...over,
});

describe('hotels 目錄', () => {
  test('共 9 間，A/B/C 各 3 間，id 不重複', () => {
    expect(HOTEL_LIST).toHaveLength(9);
    expect(new Set(HOTEL_LIST.map((h) => h.id)).size).toBe(9);
    ['A', 'B', 'C'].forEach((c) => expect(listHotels(c)).toHaveLength(3));
    expect(listHotels()).toHaveLength(9);
  });

  test('每個類別只有一間原型旅館（1 號），頁面檔名依規則產生', () => {
    ['A', 'B', 'C'].forEach((c) => {
      expect(listHotels(c).filter((h) => h.isBase).map((h) => h.id)).toEqual([`${c}1`]);
    });
    expect(getHotel('B2')).toMatchObject({ detailPage: 'B2_detail.html', bookingPage: 'B1_room1_page.html' });
    expect(getHotel('C3').bookingPage).toBe('C1_room1_page.html');
    expect(getHotel('A3').bookingPage).toBe('A1_room1_page.html');
  });

  test('名稱與 hotel_interface.html 一致', () => {
    expect(listHotels('A').map((h) => h.name)).toEqual(['台北凱達大飯店', '台北W飯店', '台北寒舍艾美酒店']);
    expect(listHotels('B').map((h) => h.name)).toEqual(['台北君悅酒店', '台北晶華酒店', '台北遠東國際大飯店']);
    expect(listHotels('C').map((h) => h.name)).toEqual(['台北美好境界西門館', '台北喜來登大飯店', '台北德立莊酒店']);
  });

  test('getHotel / isCategory 拒絕非法輸入（含原型鏈屬性名）', () => {
    ['Z9', '', 'toString', '__proto__', undefined, null, 5].forEach((v) => expect(getHotel(v)).toBeNull());
    expect(isCategory('A')).toBe(true);
    ['D', 'toString', '', undefined, 1].forEach((v) => expect(isCategory(v)).toBe(false));
    expect(getRooms('Z9')).toBeNull();
  });

  test('房型張數：A、B 各 4 種，C 3 種；同類別旅館共用房型', () => {
    expect(Object.keys(getRooms('A2'))).toHaveLength(4);
    expect(Object.keys(getRooms('B3'))).toHaveLength(4);
    expect(Object.keys(getRooms('C2'))).toHaveLength(3);
    expect(getRooms('A2')).toBe(getRooms('A3'));
    expect(getRooms('C1')).toBe(ROOMS_BY_CATEGORY.C);
  });
});

describe('多旅館計價', () => {
  test('B 類：君悅套房特大床 2 晚 36000 + 1800 + 2160 = 39960', () => {
    const q = calculateQuote('type1', '2025-06-15', '2025-06-17', 1, 'B1');
    expect(q).toMatchObject({ hotelId: 'B1', hotelName: '台北君悅酒店', roomName: '君悅套房特大床', roomTotal: 36000, serviceFee: 1800, tax: 2160, total: 39960 });
  });

  test('C 類：輕奢背包客 1 晚 580 + 29 + 35 = 644', () => {
    const q = calculateQuote('type1', '2025-06-15', '2025-06-16', 1, 'C2');
    expect([q.roomTotal, q.serviceFee, q.tax, q.total]).toEqual([580, 29, 35, 644]);
  });

  test('C 類沒有 type4；同樣的房型代碼在不同類別價格不同', () => {
    expect(getRoom('type4', 'C1')).toBeNull();
    expect(() => calculateQuote('type4', '2025-06-15', '2025-06-16', 1, 'C1')).toThrow('未知的房型');
    expect(getRoom('type1', 'A1').basePrice).toBe(3685);
    expect(getRoom('type1', 'B1').basePrice).toBe(18000);
    expect(getRoom('type1', 'C1').basePrice).toBe(580);
  });

  test('未知旅館 → 錯誤；不指定旅館時預設 A1', () => {
    expect(() => calculateQuote('type1', '2025-06-15', '2025-06-16', 1, 'Z9')).toThrow('未知的旅館');
    expect(calculateQuote('type1', '2025-06-15', '2025-06-16').hotelId).toBe('A1');
  });

  test('同類別不同旅館價格相同（頁面共用訂房頁）', () => {
    const a = calculateQuote('type3', '2025-06-15', '2025-06-16', 1, 'A1').total;
    expect(calculateQuote('type3', '2025-06-15', '2025-06-16', 1, 'A2').total).toBe(a);
    expect(calculateQuote('type3', '2025-06-15', '2025-06-16', 1, 'A3').total).toBe(a);
  });
});

describe('多旅館訂房驗證', () => {
  test('B1 合法、記錄旅館名稱', () => {
    const { errors, value } = validateBooking(booking(), NOW);
    expect(errors).toEqual([]);
    expect(value).toMatchObject({ hotelId: 'B1', hotelName: '台北君悅酒店' });
  });

  test('未提供 hotelId → 預設 A1', () => {
    const { hotelId, ...noHotel } = booking({ roomType: 'type4' });
    expect(validateBooking(noHotel, NOW).value.hotelId).toBe('A1');
  });

  test('未知旅館 / 該旅館沒有的房型', () => {
    expect(validateBooking(booking({ hotelId: 'Z9' }), NOW).errors.join()).toContain('hotelId');
    expect(validateBooking(booking({ hotelId: 'C1', roomType: 'type4' }), NOW).errors.join()).toContain('該旅館沒有這個房型');
    expect(validateBooking(booking({ hotelId: 5 }), NOW).errors.join()).toContain('hotelId');
  });
});

describe('願望清單可加入所有 9 間', () => {
  test.each(HOTEL_LIST.map((h) => [h.id]))('%s', (id) => {
    const store = createStore();
    expect(store.isHotelKnown(id)).toBe(true);
    store.addWishlist(id);
    expect(store.listWishlist()).toEqual([id]);
  });
});

describe('多旅館聊天', () => {
  test('A2：沿用 A 類規則，但把旅館名稱換成自己的', () => {
    expect(getReply('你好', 'A2')).toBe('您好！很高興為您服務，有什麼關於台北W飯店的問題嗎？');
    expect(getReply('價格', 'A2')).toContain('台北W飯店的房價');
    expect(getReply('價格', 'A2')).not.toContain('凱達');
  });

  test('位置：原型旅館用頁面原文，其他旅館用自己的地址，沒地址則請看頁面', () => {
    expect(getReply('在哪', 'A1')).toContain('艋舺大道167號');
    expect(getReply('在哪', 'A2')).toBe('台北W飯店位於台北市信義區忠孝東路五段10號。您可以在頁面的位置周邊區塊查看詳細地圖和周邊資訊。');
    expect(getReply('在哪', 'A3')).toContain('請參考頁面上的位置周邊區塊');
    expect(getReply('在哪', 'B1')).toContain('松壽路2號');
    expect(getReply('在哪', 'B2')).toContain('中山北路二段39巷3號');
    expect(getReply('位置', 'C3')).toContain('寶慶路4號');
  });

  test('B 類回覆與 A 類不同（室內泳池、早餐 10:30）', () => {
    expect(getReply('泳池', 'B1')).toContain('室內溫水游泳池');
    expect(getReply('早餐', 'B1')).toContain('10:30');
    expect(getReply('早餐', 'A1')).toContain('10:00');
    expect(getReply('價格', 'B1')).toContain('18,000');
    expect(getReply('價格', 'B3')).toContain('台北遠東國際大飯店');
  });

  test('B 類 fallback 沒有客服電話', () => {
    expect(getReply('xyz', 'B2')).toBe(FALLBACK_B);
    expect(FALLBACK_B).not.toContain('2306');
  });

  test('C 類：關鍵字（房/間 > 優惠 > 位置 > 評價）與 fallback', () => {
    expect(getReply('有哪些房型', 'C1')).toContain('雅緻大床房');
    expect(getReply('房間有優惠嗎', 'C1')).toContain('雅緻大床房'); // 房 優先於 優惠
    expect(getReply('有折扣嗎', 'C2')).toContain('68.65%');
    expect(getReply('評價如何', 'C1')).toContain('8.7');
    expect(getReply('hello', 'C1')).toBe(FALLBACK_C);
  });

  test('未知旅館退回 A1；所有類別的規則至少一個關鍵字', () => {
    expect(getReply('你好', 'Z9')).toContain('台北凱達大飯店');
    [...RULES_B, ...RULES_C].forEach((r) => expect(r.keywords.length).toBeGreaterThan(0));
  });

  test('所有旅館 × 所有規則的回覆都不會出現其他旅館的名稱', () => {
    const names = HOTEL_LIST.map((h) => h.name);
    for (const hotel of HOTEL_LIST) {
      const probes = ['價格', '設施', '位置', '早餐', '優惠', '停車', 'wifi', '游泳池', '健身', '你好', '入住', '謝謝', '房間', '評價', 'xyz'];
      for (const p of probes) {
        const reply = getReply(p, hotel.id);
        names.filter((n) => n !== hotel.name).forEach((other) => expect([hotel.id, p, reply.includes(other)]).toEqual([hotel.id, p, false]));
      }
    }
  });
});
