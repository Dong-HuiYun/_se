'use strict';

/**
 * 契約測試：直接讀取 public/ 裡的前端頁面，確認「前端寫死的資料」與後端的旅館目錄一致。
 * 這類測試能抓到複製貼上造成的錯誤（例如 B3 頁面其實是君悅）。
 *
 * 已知的前端問題用 test.failing 記錄：目前「預期失敗」所以測試套件是綠的；
 * 一旦前端修好，Jest 會報錯提醒你把 .failing 拿掉。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { HOTEL_LIST, ROOMS_BY_CATEGORY, listHotels } = require('../../server/services/hotels');
const { getReply } = require('../../server/services/chat');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', 'public', f), 'utf8');
const pages = Object.fromEntries([...HOTEL_LIST.map((h) => h.detailPage), 'B1_room1_page.html', 'A1_room1_page.html', 'C1_room1_page.html', 'hotel_interface.html'].map((f) => [f, read(f)]));
const maybe = (isKnownBug) => (isKnownBug ? test.failing : test);

describe('hotel_interface.html ↔ 旅館目錄', () => {
  test.each(['A', 'B', 'C'])('%s 類：頁面列出的旅館名稱與詳情頁連結和目錄一致', (cat) => {
    const html = pages['hotel_interface.html'];
    const start = html.indexOf(`id="section${cat}"`);
    const next = ['A', 'B', 'C'].map((c) => html.indexOf(`id="section${c}"`)).filter((i) => i > start).sort((a, b) => a - b)[0] ?? html.length;
    const section = html.slice(start, next);
    const names = [...section.matchAll(/class="hotel-name">([^<]+)</g)].map((m) => m[1].trim());
    const links = [...section.matchAll(/([ABC]\d_detail\.html)/g)].map((m) => m[1]);
    expect(names).toEqual(listHotels(cat).map((h) => h.name));
    expect(links).toEqual(listHotels(cat).map((h) => h.detailPage));
  });
});

describe('詳情頁 ↔ 旅館目錄', () => {
  // B3 頁面是 B1（君悅）的複製品，標題與內文都沒改
  const titleBugs = new Set(['B3']);
  test.each(HOTEL_LIST.map((h) => [h.id, h]))('%s 的 <title> 與 <h1> 是自己的旅館名稱', (id, hotel) => {
    const html = pages[hotel.detailPage];
    const title = html.match(/<title>([^<]*)<\/title>/)[1];
    const h1 = html.match(/<h1 class="hotel-title">([^<]*)<\/h1>/)[1];
    const check = () => { expect(title).toContain(hotel.name); expect(h1).toBe(hotel.name); };
    if (titleBugs.has(id)) expect(check).toThrow(); // 已知問題：B3 顯示「台北君悅酒店」
    else check();
  });

  test.each(HOTEL_LIST.map((h) => [h.id, h]))('%s 選房後跳轉到所屬類別共用的訂房頁', (id, hotel) => {
    const targets = [...pages[hotel.detailPage].matchAll(/location\.href\s*=\s*'([^']*_room\d_page\.html)'/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(0);
    targets.forEach((t) => expect(t).toBe(hotel.bookingPage));
  });

  test.each(HOTEL_LIST.map((h) => [h.id, h]))('%s 的「返回」帶回正確的使用者類型', (id, hotel) => {
    const m = pages[hotel.detailPage].match(/returnToHotelInterface\('(\w)'\)/);
    expect(m && m[1]).toBe(hotel.category);
  });
});

describe('訂房頁 roomData ↔ 房型目錄', () => {
  function roomData(file) {
    const m = pages[file].match(/const roomData\s*=\s*(\{[\s\S]*?\n\s*\});/);
    return vm.runInNewContext(`(${m[1]})`);
  }
  test.each([['A', 'A1_room1_page.html'], ['B', 'B1_room1_page.html'], ['C', 'C1_room1_page.html']])('%s 類（%s）', (cat, file) => {
    const data = roomData(file);
    const expected = ROOMS_BY_CATEGORY[cat];
    expect(Object.keys(data)).toEqual(Object.keys(expected));
    for (const [id, room] of Object.entries(expected)) {
      expect({ id, name: data[id].name, basePrice: data[id].basePrice, features: data[id].features })
        .toEqual({ id, name: room.name, basePrice: room.basePrice, features: room.features });
    }
  });

  test('三個訂房頁的費率都是 5% 服務費 + 6% 稅（與後端一致）', () => {
    for (const f of ['A1_room1_page.html', 'B1_room1_page.html', 'C1_room1_page.html']) {
      expect(pages[f]).toMatch(/\*\s*0\.05/);
      expect(pages[f]).toMatch(/\*\s*0\.06/);
    }
  });
});

describe('聊天回覆：前端頁面 ↔ 後端 /api/chat', () => {
  function frontendReply(file, message) {
    const html = pages[file];
    const start = html.indexOf('function getAIResponse');
    const end = html.indexOf('// 顯示通知', start);
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(html.slice(start, end), ctx);
    return ctx.getAIResponse(message);
  }
  const probes = ['設施', '位置', '早餐', '優惠', '停車', 'wifi', '游泳池', '健身', '你好', '入住', '謝謝', '今天天氣如何'];

  test.each(probes)('B1：「%s」前後端完全一致', (p) => {
    expect(getReply(p, 'B1')).toBe(frontendReply('B1_detail.html', p));
  });
  test('B1：「價格」前後端完全一致', () => {
    expect(getReply('價格', 'B1')).toBe(frontendReply('B1_detail.html', '價格'));
  });

  test.each(probes)('A1：「%s」前後端完全一致', (p) => {
    expect(getReply(p, 'A1')).toBe(frontendReply('A1_detail.html', p));
  });
  // 已知問題：A1 前端的價格回覆把小型套房寫成 2，701（實際 3,685），還多了「起起」
  test.failing('A1：「價格」前後端一致（前端寫 2，701 ≠ 訂房頁 3,685）', () => {
    expect(getReply('價格', 'A1')).toBe(frontendReply('A1_detail.html', '價格'));
  });

  // 已知問題：A2、A3 是從 A1 複製的，聊天機器人仍自稱「台北凱達大飯店」
  test.failing.each([['A2'], ['A3']])('%s 的聊天回覆不應提到別間旅館（凱達）', (id) => {
    const hotel = HOTEL_LIST.find((h) => h.id === id);
    expect(frontendReply(hotel.detailPage, '你好')).not.toContain('凱達');
  });
});

describe('跨頁面的已知問題（用 test.failing 記錄）', () => {
  const key = (file) => (pages[file].match(/localStorage\.setItem\('(hotel_wishlist[^']*)'/) || [])[1];

  test.failing('每間旅館的願望清單使用各自的 localStorage 鍵（目前全部共用 hotel_wishlist）', () => {
    const keys = HOTEL_LIST.map((h) => key(h.detailPage)).filter(Boolean);
    expect(keys.length).toBeGreaterThan(1);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('願望清單：哪些頁面有（C1 沒有 wishlistBtn）', () => {
    const has = HOTEL_LIST.filter((h) => pages[h.detailPage].includes('id="wishlistBtn"')).map((h) => h.id);
    expect(has).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C2', 'C3']);
  });

  const confirmName = (file) => (pages[file].match(/感謝 \$\{name\} 選擇(台北[^。]+)。/) || [])[1];
  maybe(false)('B1 訂房成功訊息的旅館名稱正確', () => {
    expect(confirmName('B1_room1_page.html')).toBe('台北君悅酒店');
  });
  test.failing.each([['A1', 'A1_room1_page.html'], ['C1', 'C1_room1_page.html']])('%s 訂房成功訊息的旅館名稱正確（目前寫「台北君悅酒店」）', (id, file) => {
    expect(confirmName(file)).toBe(HOTEL_LIST.find((h) => h.id === id).name);
  });

  test.failing('共用訂房頁的標題不應固定是某一間旅館（A2/A3/B2/B3/C2/C3 訂房時會看到別間的名字）', () => {
    for (const h of HOTEL_LIST.filter((x) => !x.isBase)) {
      const title = pages[`${h.category}1_room1_page.html`].match(/<title>([^<]*)<\/title>/)[1];
      expect(title).toContain(h.name);
    }
  });
});
