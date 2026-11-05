'use strict';

const request = require('supertest');
const { createApp } = require('../../server/app');
const { createStore, POOL_SLOT_CAPACITY } = require('../../server/store');
const { POOL_MAX_PERSONS } = require('../../server/services/validators');

const FIXED_NOW = new Date(2025, 5, 10, 12, 0, 0); // 2025-06-10

let app;
beforeEach(() => {
  // 每個測試都用全新的 store 與固定時間，彼此完全隔離
  app = createApp({ clock: () => FIXED_NOW, store: createStore() });
});

const bookingBody = (over = {}) => ({
  roomType: 'type1',
  checkin: '2025-06-15',
  checkout: '2025-06-17',
  adults: 2,
  children: 0,
  rooms: 1,
  fullName: '王小明',
  email: 'ming@example.com',
  phone: '0912345678',
  payment: 'credit',
  ...over,
});

describe('GET /api/health', () => {
  test('200 且使用注入的時間', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', time: FIXED_NOW.toISOString() });
  });

  test('不洩漏 X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('POST /api/classify', () => {
  test.each([
    ['我想要有科技感的住宿體驗', 'A'],
    ['我重視服務品質', 'B'],
    ['價格要便宜', 'C'],
  ])('「%s」→ %s', async (text, type) => {
    const res = await request(app).post('/api/classify').send({ text });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type, matched: true });
  });

  test('沒有關鍵字 → 200 但 matched:false', async () => {
    const res = await request(app).post('/api/classify').send({ text: '隨便' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ type: null, label: null, matched: false });
  });

  test.each([[{}], [{ text: '' }], [{ text: 5 }], [undefined]])('錯誤輸入 %p → 400', async (body) => {
    const res = await request(app).post('/api/classify').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/rooms', () => {
  test('列出四種房型', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
    expect(res.body.rooms.map((r) => r.id)).toEqual(['type1', 'type2', 'type3', 'type4']);
  });

  test('單一房型', async () => {
    const res = await request(app).get('/api/rooms/type3');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: '家庭套房', basePrice: 6057 });
  });

  test('不存在 → 404', async () => {
    expect((await request(app).get('/api/rooms/type99')).status).toBe(404);
    expect((await request(app).get('/api/rooms/__proto__')).status).toBe(404);
  });
});

describe('POST /api/quote', () => {
  test('正確試算', async () => {
    const res = await request(app).post('/api/quote').send({ roomType: 'type1', checkin: '2025-06-15', checkout: '2025-06-17' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nights: 2, roomTotal: 7370, serviceFee: 369, tax: 442, total: 8181 });
  });

  test('帶 rooms 參數', async () => {
    const res = await request(app).post('/api/quote').send({ roomType: 'type3', checkin: '2025-06-15', checkout: '2025-06-16', rooms: 2 });
    expect(res.body.total).toBe(6057 * 2 + 606 + 727);
  });

  test.each([
    [{ roomType: 'x', checkin: '2025-06-15', checkout: '2025-06-17' }],
    [{ roomType: 'type1', checkin: '2025-06-17', checkout: '2025-06-15' }],
    [{ roomType: 'type1', checkin: 'bad', checkout: '2025-06-15' }],
    [{ roomType: 'type1', checkin: '2025-06-15', checkout: '2025-06-17', rooms: 0 }],
    [{}],
  ])('錯誤輸入 %j → 400', async (body) => {
    const res = await request(app).post('/api/quote').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('/api/bookings', () => {
  test('建立成功 → 201 + Location + 價格與試算一致', async () => {
    const res = await request(app).post('/api/bookings').send(bookingBody());
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe('/api/bookings/BK-0001');
    expect(res.body).toMatchObject({
      id: 'BK-0001', status: 'confirmed', nights: 2, phone: '0912345678',
      quote: { total: 8181 }, createdAt: FIXED_NOW.toISOString(),
    });
  });

  test('建立後可用 GET 查回', async () => {
    const created = await request(app).post('/api/bookings').send(bookingBody());
    const res = await request(app).get(`/api/bookings/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('王小明');
  });

  test('訂單 id 遞增', async () => {
    const a = await request(app).post('/api/bookings').send(bookingBody());
    const b = await request(app).post('/api/bookings').send(bookingBody({ roomType: 'type3' }));
    expect([a.body.id, b.body.id]).toEqual(['BK-0001', 'BK-0002']);
    expect(b.body.quote.roomName).toBe('家庭套房');
  });

  test('缺少聯絡資訊（對應前端 alert「請填寫完整的聯絡資訊」）→ 400 並列出所有欄位', async () => {
    const res = await request(app).post('/api/bookings').send(bookingBody({ fullName: '', email: '', phone: '' }));
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.split(':')[0]);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'phone']));
  });

  test('入住日期在過去 → 400', async () => {
    const res = await request(app).post('/api/bookings').send(bookingBody({ checkin: '2025-06-01', checkout: '2025-06-03' }));
    expect(res.status).toBe(400);
  });

  test('錯誤的請求不會留下訂單', async () => {
    await request(app).post('/api/bookings').send(bookingBody({ email: 'bad' }));
    const ok = await request(app).post('/api/bookings').send(bookingBody());
    expect(ok.body.id).toBe('BK-0001');
  });

  test('取消訂單（冪等）', async () => {
    await request(app).post('/api/bookings').send(bookingBody());
    const r1 = await request(app).delete('/api/bookings/BK-0001');
    const r2 = await request(app).delete('/api/bookings/BK-0001');
    expect(r1.status).toBe(200);
    expect(r1.body.status).toBe('cancelled');
    expect(r2.body.status).toBe('cancelled');
    expect((await request(app).get('/api/bookings/BK-0001')).body.status).toBe('cancelled');
  });

  test('查詢 / 取消不存在的訂單 → 404', async () => {
    expect((await request(app).get('/api/bookings/BK-9999')).status).toBe(404);
    expect((await request(app).delete('/api/bookings/BK-9999')).status).toBe(404);
  });

  test('完整流程：試算 → 訂房 → 查詢 → 取消', async () => {
    const quote = await request(app).post('/api/quote').send({ roomType: 'type2', checkin: '2025-07-01', checkout: '2025-07-04' });
    const booking = await request(app).post('/api/bookings').send(bookingBody({ roomType: 'type2', checkin: '2025-07-01', checkout: '2025-07-04' }));
    expect(booking.body.quote).toEqual(quote.body);
    const fetched = await request(app).get(`/api/bookings/${booking.body.id}`);
    expect(fetched.body.quote.total).toBe(quote.body.total);
    expect((await request(app).delete(`/api/bookings/${booking.body.id}`)).body.status).toBe('cancelled');
  });
});

describe('/api/wishlist', () => {
  test('初始為空 → 加入 → 重複加入（冪等）→ 移除', async () => {
    expect((await request(app).get('/api/wishlist')).body.items).toEqual([]);
    const add = await request(app).put('/api/wishlist/A1');
    expect(add.body).toEqual({ hotelId: 'A1', inWishlist: true, items: ['A1'] });
    const again = await request(app).put('/api/wishlist/A1');
    expect(again.body.items).toEqual(['A1']);
    const del = await request(app).delete('/api/wishlist/A1');
    expect(del.body).toEqual({ hotelId: 'A1', inWishlist: false, items: [] });
    expect((await request(app).get('/api/wishlist')).body.items).toEqual([]);
  });

  test('未知旅館 → 404', async () => {
    expect((await request(app).put('/api/wishlist/Z9')).status).toBe(404);
    expect((await request(app).delete('/api/wishlist/Z9')).status).toBe(404);
  });
});

describe('POST /api/chat', () => {
  test('依關鍵字回覆', async () => {
    const res = await request(app).post('/api/chat').send({ message: '  請問早餐幾點？ ' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('6:30');
  });

  test('無法辨識 → 客服電話', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'xyz' });
    expect(res.body.reply).toContain('2306-6777');
  });

  test.each([[{}], [{ message: '' }], [{ message: '   ' }], [{ message: 42 }]])('錯誤輸入 %j → 400', async (body) => {
    expect((await request(app).post('/api/chat').send(body)).status).toBe(400);
  });

  test('超過 500 字 → 400；剛好 500 字 → 200', async () => {
    expect((await request(app).post('/api/chat').send({ message: 'a'.repeat(501) })).status).toBe(400);
    expect((await request(app).post('/api/chat').send({ message: 'a'.repeat(500) })).status).toBe(200);
  });
});

describe('POST /api/facility-bookings', () => {
  const pool = (over = {}) => ({ type: 'pool', date: '2025-06-11', slot: '09:00-10:00', persons: 2, ...over });

  test('游泳池預約成功 → 201', async () => {
    const res = await request(app).post('/api/facility-bookings').send(pool());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'FB-0001', type: 'pool', persons: 2 });
  });

  test('同時段超過容量 → 409，換時段則成功', async () => {
    // 單筆上限 4 人，所以用 5 筆填滿 20 人的時段
    const per = POOL_MAX_PERSONS;
    for (let i = 0; i < POOL_SLOT_CAPACITY / per; i++) {
      expect((await request(app).post('/api/facility-bookings').send(pool({ persons: per }))).status).toBe(201);
    }
    const full = await request(app).post('/api/facility-bookings').send(pool({ persons: 1 }));
    expect(full.status).toBe(409);
    const other = await request(app).post('/api/facility-bookings').send(pool({ persons: 1, slot: '10:00-11:00' }));
    expect(other.status).toBe(201);
  });

  test('健身教練與會議室預約', async () => {
    const t = await request(app).post('/api/facility-bookings').send({ type: 'trainer', courseId: 'yoga-1', dateTime: '2025-06-12T10:00:00Z' });
    const m = await request(app).post('/api/facility-bookings').send({ type: 'meeting', room: 'A', hours: 2, topic: '週會' });
    expect(t.status).toBe(201);
    expect(m.status).toBe(201);
    expect(m.body.topic).toBe('週會');
  });

  test.each([
    [{ type: 'pool', date: '2025-06-10', slot: '09:00-10:00', persons: 2 }], // 今天不可預約
    [{ type: 'meeting', room: 'A', hours: 2, topic: '' }],                  // 對應前端「請輸入會議主題！」
    [{ type: 'trainer', courseId: '', dateTime: '' }],                      // 對應前端「請選擇課程和預約時間！」
    [{ type: 'spa' }],
    [{}],
  ])('錯誤輸入 %j → 400', async (body) => {
    const res = await request(app).post('/api/facility-bookings').send(body);
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.details)).toBe(true);
  });
});

describe('通用行為', () => {
  test('未知 /api 路徑 → 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  test('不支援的方法 → 404', async () => {
    expect((await request(app).put('/api/health')).status).toBe(404);
  });

  test('壞掉的 JSON → 400', async () => {
    const res = await request(app).post('/api/chat').set('Content-Type', 'application/json').send('{"message": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON 格式錯誤');
  });

  test('過大的請求 → 413', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'a'.repeat(200 * 1024) });
    expect(res.status).toBe(413);
  });

  test('未預期的例外 → 500 且不洩漏內部訊息', async () => {
    const boom = createStore();
    boom.listWishlist = () => { throw new Error('secret db password'); };
    const res = await request(createApp({ store: boom })).get('/api/wishlist');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});

describe('靜態網頁', () => {
  test.each([
    ['/', 'AI語音分類推薦系統'],
    ['/index.html', 'AI語音分類推薦系統'],
    ['/hotel_interface.html', '旅遊推薦平台'],
    ['/A1_detail.html', '台北凱達大飯店'],
    ['/A1_room1_page.html', '預訂房間'],
  ])('GET %s 回傳 HTML', async (url, text) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain(text);
  });

  test('CSS 檔以 text/css 提供', async () => {
    const res = await request(app).get('/A1_detail.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/css/);
  });

  test('不存在的頁面 → 404', async () => {
    expect((await request(app).get('/nope.html')).status).toBe(404);
  });
});

// ───────────────────────── 多旅館（A1~C3） ─────────────────────────
const ALL_HOTELS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];

describe('GET /api/hotels', () => {
  test('列出 9 間；可依類別篩選', async () => {
    const all = await request(app).get('/api/hotels');
    expect(all.status).toBe(200);
    expect(all.body.hotels.map((h) => h.id)).toEqual(ALL_HOTELS);

    const b = await request(app).get('/api/hotels?category=B');
    expect(b.body.hotels.map((h) => h.id)).toEqual(['B1', 'B2', 'B3']);
  });

  test('無效類別 → 400', async () => {
    expect((await request(app).get('/api/hotels?category=Z')).status).toBe(400);
  });

  test('單一旅館與其房型', async () => {
    const h = await request(app).get('/api/hotels/B2');
    expect(h.body).toMatchObject({ id: 'B2', name: '台北晶華酒店', detailPage: 'B2_detail.html', bookingPage: 'B1_room1_page.html' });
    const rooms = await request(app).get('/api/hotels/C1/rooms');
    expect(rooms.body.rooms.map((r) => r.basePrice)).toEqual([580, 2080, 2280]);
  });

  test('不存在的旅館 → 404', async () => {
    expect((await request(app).get('/api/hotels/Z9')).status).toBe(404);
    expect((await request(app).get('/api/hotels/Z9/rooms')).status).toBe(404);
    expect((await request(app).get('/api/hotels/__proto__')).status).toBe(404);
  });
});

describe('GET /api/recommendations（對應 hotel_interface.html?type=X）', () => {
  test.each([
    ['A', '科技愛好者', ['A1', 'A2', 'A3']],
    ['B', '高CP值追求者', ['B1', 'B2', 'B3']],
    ['C', '價格敏感者', ['C1', 'C2', 'C3']],
  ])('type=%s', async (type, label, ids) => {
    const res = await request(app).get(`/api/recommendations?type=${type}`);
    expect(res.status).toBe(200);
    expect(res.body.label).toBe(label);
    expect(res.body.hotels.map((h) => h.id)).toEqual(ids);
  });

  test.each([[''], ['?type=X'], ['?type='], ['?type=a']])('無效參數 %p → 400', async (q) => {
    expect((await request(app).get(`/api/recommendations${q}`)).status).toBe(400);
  });

  test('語音文字 → 分類 → 推薦：端到端的後端流程', async () => {
    const cls = await request(app).post('/api/classify').send({ text: '價格要便宜，最好有折扣' });
    const rec = await request(app).get(`/api/recommendations?type=${cls.body.type}`);
    expect(rec.body.hotels.map((h) => h.name)).toContain('台北德立莊酒店');
  });
});

describe('多旅館報價與訂房', () => {
  test('B1 報價', async () => {
    const res = await request(app).post('/api/quote').send({ hotelId: 'B1', roomType: 'type3', checkin: '2025-06-15', checkout: '2025-06-16' });
    expect(res.body).toMatchObject({ hotelId: 'B1', roomName: '外交官套房', total: 20000 + 1000 + 1200 });
  });

  test.each([
    [{ hotelId: 'Z9', roomType: 'type1' }],
    [{ hotelId: 'C1', roomType: 'type4' }],
  ])('報價錯誤 %j → 400', async (over) => {
    const res = await request(app).post('/api/quote').send({ checkin: '2025-06-15', checkout: '2025-06-16', ...over });
    expect(res.status).toBe(400);
  });

  test.each(ALL_HOTELS)('%s 可以訂房，單據含旅館名稱與正確價格', async (hotelId) => {
    const res = await request(app).post('/api/bookings').send(bookingBody({ hotelId }));
    expect(res.status).toBe(201);
    expect(res.body.hotelId).toBe(hotelId);
    expect(res.body.hotelName).toBeTruthy();
    expect(res.body.quote.hotelId).toBe(hotelId);
    const roomPrice = { A: 3685, B: 18000, C: 580 }[hotelId[0]];
    expect(res.body.quote.roomTotal).toBe(roomPrice * 2);
  });

  test('C 類沒有 type4 → 400，且帶有錯誤欄位', async () => {
    const res = await request(app).post('/api/bookings').send(bookingBody({ hotelId: 'C2', roomType: 'type4' }));
    expect(res.status).toBe(400);
    expect(res.body.details.join()).toContain('roomType');
  });

  test('未知旅館 → 400', async () => {
    expect((await request(app).post('/api/bookings').send(bookingBody({ hotelId: 'Z9' }))).status).toBe(400);
  });
});

describe('多旅館願望清單與聊天', () => {
  test('9 間都能加入；各自獨立；可分別移除', async () => {
    for (const id of ALL_HOTELS) expect((await request(app).put(`/api/wishlist/${id}`)).status).toBe(200);
    expect((await request(app).get('/api/wishlist')).body.items).toEqual(ALL_HOTELS);
    await request(app).delete('/api/wishlist/B2');
    expect((await request(app).get('/api/wishlist')).body.items).not.toContain('B2');
    expect((await request(app).get('/api/wishlist')).body.items).toHaveLength(8);
  });

  test('聊天依旅館回覆', async () => {
    const a2 = await request(app).post('/api/chat').send({ message: '你好', hotelId: 'A2' });
    expect(a2.body).toEqual({ reply: '您好！很高興為您服務，有什麼關於台北W飯店的問題嗎？', hotelId: 'A2' });
    const b1 = await request(app).post('/api/chat').send({ message: '早餐', hotelId: 'B1' });
    expect(b1.body.reply).toContain('10:30');
    const c1 = await request(app).post('/api/chat').send({ message: '優惠', hotelId: 'C1' });
    expect(c1.body.reply).toContain('68.65%');
  });

  test('聊天未指定旅館預設 A1；未知旅館 → 404', async () => {
    expect((await request(app).post('/api/chat').send({ message: '你好' })).body.hotelId).toBe('A1');
    expect((await request(app).post('/api/chat').send({ message: '你好', hotelId: 'Z9' })).status).toBe(404);
  });
});

describe('所有頁面都由伺服器提供', () => {
  const pages = [
    ...ALL_HOTELS.map((id) => `/${id}_detail.html`),
    '/B1_room1_page.html', '/C1_room1_page.html',
  ];
  test.each(pages)('GET %s → 200 HTML', async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test.each(['/A1_detail.css', '/B1_detail.css', '/C1_detail.css'])('GET %s → css', async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/css/);
  });

  test('目錄中每間旅館的 detailPage / bookingPage 都真的存在（不會 404）', async () => {
    const { hotels } = (await request(app).get('/api/hotels')).body;
    for (const h of hotels) {
      expect([h.detailPage, (await request(app).get(`/${h.detailPage}`)).status]).toEqual([h.detailPage, 200]);
      expect([h.bookingPage, (await request(app).get(`/${h.bookingPage}`)).status]).toEqual([h.bookingPage, 200]);
    }
  });
});
