'use strict';
const { test, expect } = require('./fixtures');
const { ROOMS_BY_CATEGORY } = require('../../server/services/hotels');

/** B、C 類訂房頁（A 類見 room.spec.js）。價格全部來自後端的房型目錄。 */
const PAGES = [
  { cat: 'B', file: 'B1_room1_page.html', back: 'B1_detail.html', name: '.room-name', price: '#summaryRoomPrice', total: '#summaryTotalPrice' },
  { cat: 'C', file: 'C1_room1_page.html', back: 'C1_detail.html', name: '.room-name', price: '.price-details .price-row:nth-child(1) span:last-child', total: '.price-total span:last-child' },
];
const fmt = (n) => `TWD ${n.toLocaleString('en-US')}`;

function collectDialogs(page) {
  const messages = [];
  page.on('dialog', async (d) => { messages.push(d.message()); await d.accept(); });
  return messages;
}

for (const p of PAGES) {
  const rooms = Object.values(ROOMS_BY_CATEGORY[p.cat]);

  test.describe(`${p.cat} 類訂房頁 ${p.file}`, () => {
    test('沒選房型時顯示第 1 種房型，預設住 1 晚', async ({ page }) => {
      await page.goto(`/${p.file}`);
      await expect(page.locator(p.name)).toHaveText(rooms[0].name);
      await expect(page.locator('#nightsCount')).toHaveText('1 晚');
      await expect(page.locator(p.price)).toHaveText(fmt(rooms[0].basePrice));
    });

    for (const [i, room] of rooms.entries()) {
      test(`從詳情頁帶入的房型：${room.name}`, async ({ page }) => {
        await page.addInitScript(([type]) => localStorage.setItem('selectedRoomType', type), [`type${i + 1}`]);
        await page.goto(`/${p.file}`);
        await expect(page.locator(p.name)).toHaveText(room.name);
        await expect(page.locator(p.price)).toHaveText(fmt(room.basePrice));
      });
    }

    test('變更日期為 3 晚 → 晚數與房價更新', async ({ page }) => {
      await page.goto(`/${p.file}`);
      await page.fill('#checkin', '2025-12-01');
      await page.fill('#checkout', '2025-12-04');
      await page.locator('#checkout').dispatchEvent('change');
      await expect(page.locator('#nightsCount')).toHaveText('3 晚');
      await expect(page.locator(p.price)).toHaveText(fmt(rooms[0].basePrice * 3));
    });

    test('前端顯示的總價與後端 /api/quote 相差不到 1 元（前端未四捨五入）', async ({ page, request }) => {
      await page.goto(`/${p.file}`);
      await page.fill('#checkin', '2025-12-01');
      await page.fill('#checkout', '2025-12-04');
      await page.locator('#checkout').dispatchEvent('change');
      const uiTotal = Number((await page.locator(p.total).textContent()).replace(/[^\d.]/g, ''));
      const api = await (await request.post('/api/quote', {
        data: { hotelId: `${p.cat}1`, roomType: 'type1', checkin: '2025-12-01', checkout: '2025-12-04' },
      })).json();
      expect(Math.abs(uiTotal - api.total)).toBeLessThan(1);
    });

    test('人數與付款方式', async ({ page }) => {
      await page.goto(`/${p.file}`);
      await expect(page.locator('#adultsCount')).toHaveText('2');
      await page.locator('button[onclick="changeGuests(\'adults\', 1)"]').click();
      await expect(page.locator('#adultsCount')).toHaveText('3');

      const paypal = page.locator(".payment-method[onclick*='paypal']");
      await paypal.click();
      await expect(paypal).toHaveClass(/selected/);
      await expect(page.locator('.payment-method.selected')).toHaveCount(1);
    });

    test('聯絡資訊未填 → alert；填妥 → 預訂成功', async ({ page }) => {
      const dialogs = collectDialogs(page);
      await page.goto(`/${p.file}`);

      await page.click('.btn-book');
      await expect.poll(() => dialogs).toEqual(['請填寫完整的聯絡資訊']);
      await expect(page.locator('#step3')).not.toHaveClass(/active/);

      await page.fill('#fullName', '王小明');
      await page.fill('#email', 'ming@example.com');
      await page.fill('#phone', '0912345678');
      await page.click('.btn-book');
      await expect(page.locator('.btn-book')).toHaveText('預訂成功！正在跳轉...');
      await expect(page.locator('#step3')).toHaveClass(/active/);
      await expect.poll(() => dialogs.length, { timeout: 5_000 }).toBe(2);
      expect(dialogs[1]).toContain('王小明');
      expect(dialogs[1]).toContain('ming@example.com');
    });

    test('「返回酒店詳情」回到該類別的詳情頁', async ({ page }) => {
      await page.goto(`/${p.file}`);
      await page.locator('.back-button').click();
      await page.waitForURL(`**/${p.back}`);
    });
  });
}

test.describe('已知問題：訂房成功訊息的旅館名稱', () => {
  test('C 類訂房頁的成功訊息應該是「台北美好境界西門館」', async ({ page }) => {
    test.fail(true, 'C1_room1_page.html 的成功訊息寫死「台北君悅酒店」（A1_room1_page.html 同樣有此問題）');
    const dialogs = collectDialogs(page);
    await page.goto('/C1_room1_page.html');
    await page.fill('#fullName', '王小明');
    await page.fill('#email', 'ming@example.com');
    await page.fill('#phone', '0912345678');
    await page.click('.btn-book');
    await expect.poll(() => dialogs.length, { timeout: 5_000 }).toBe(1);
    expect(dialogs[0]).toContain('台北美好境界西門館');
  });
});
