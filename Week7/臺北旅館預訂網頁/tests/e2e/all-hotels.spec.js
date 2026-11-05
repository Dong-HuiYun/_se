'use strict';
const { test, expect } = require('./fixtures');
const { HOTEL_LIST, ROOMS_BY_CATEGORY } = require('../../server/services/hotels'); // 與後端共用同一份資料

/**
 * 三個類別的頁面結構不同，這裡把差異集中成一張表：
 *  - A（A1~A3）：聊天 #chatWindow / #chatBody，房型 4 種
 *  - B（B1~B3）：同 A 的聊天結構，房型 4 種
 *  - C（C1~C3）：聊天 #aiChatWindow / #chatMessages，房型 3 種，另有限時倒數
 */
const UI = {
  A: { chatBtn: '.ai-chat', chatWin: '#chatWindow', chatBody: '#chatBody', rooms: 4, summaryName: '#summaryRoomName', summaryPrice: '#summaryRoomPrice' },
  B: { chatBtn: '.ai-chat', chatWin: '#chatWindow', chatBody: '#chatBody', rooms: 4, summaryName: '#summaryRoomName', summaryPrice: '#summaryRoomPrice' },
  C: { chatBtn: '#aiChatBtn', chatWin: '#aiChatWindow', chatBody: '#chatMessages', rooms: 3, summaryName: '.room-name', summaryPrice: '.price-details .price-row:nth-child(1) span:last-child' },
};

/** 已知的前端問題：這些旅館頁面是從 1 號頁面複製的，內容沒改乾淨（見 README） */
const COPIED = new Set(HOTEL_LIST.filter((h) => !h.isBase).map((h) => h.id));
const TITLE_BUG = new Set(['B3']); // B3 整頁都還是君悅
const knownBug = (cond, reason) => { if (cond) test.fail(true, reason); };

const apiChat = async (request, hotelId, message) =>
  (await (await request.post('/api/chat', { data: { hotelId, message } })).json()).reply;

const money = (n) => `TWD ${n.toLocaleString('en-US')}`;

for (const hotel of HOTEL_LIST) {
  const ui = UI[hotel.category];

  test.describe(`${hotel.id} ${hotel.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${hotel.detailPage}`);
    });

    test('頁面載入：標題與主標題是自己的旅館名稱', async ({ page }) => {
      knownBug(TITLE_BUG.has(hotel.id), 'B3_detail.html 是 B1（君悅）的複製品，標題與內文都沒改成「台北遠東國際大飯店」');
      await expect(page).toHaveTitle(new RegExp(hotel.name));
      await expect(page.locator('.hotel-title')).toHaveText(hotel.name);
    });

    test('「返回」帶回 hotel_interface 並顯示對應類別', async ({ page }) => {
      // 返回按鈕可能在捲動後的區域，直接派送 click 事件即可觸發 onclick
      await page.locator(`[onclick="returnToHotelInterface('${hotel.category}')"]`).first().dispatchEvent('click');
      await page.waitForURL(new RegExp(`hotel_interface\\.html\\?type=${hotel.category}$`));
      await expect(page.locator(`#section${hotel.category}`)).toBeVisible();
    });

    test(`房型彈窗：列出 ${ui.rooms} 種房型`, async ({ page }) => {
      await expect(page.locator('#roomSelectionModal')).toBeHidden();
      await page.locator('button[onclick="showRoomSelection()"]').first().click();
      await expect(page.locator('#roomSelectionModal')).toBeVisible();
      await expect(page.locator('#roomSelectionModal .room-option')).toHaveCount(ui.rooms);
    });

    test('選第 2 種房型 → 跳轉到該類別的訂房頁，房型名稱與價格正確', async ({ page }) => {
      const room = Object.values(ROOMS_BY_CATEGORY[hotel.category])[1];
      await page.locator('button[onclick="showRoomSelection()"]').first().click();
      const option = page.locator('#roomSelectionModal .room-option').nth(1);
      await option.locator('.select-btn').click();
      await expect(option.locator('.select-btn')).toContainText('選擇中');

      await page.waitForURL(`**/${hotel.bookingPage}`);
      await expect(page.locator(ui.summaryName)).toHaveText(room.name);
      await expect(page.locator(ui.summaryPrice)).toHaveText(money(room.basePrice)); // 預設住 1 晚
    });

    // ─── 願望清單 ───
    if (hotel.id === 'C1') {
      test('C1 沒有「加入願望清單」按鈕', async ({ page }) => {
        await expect(page.locator('#wishlistBtn')).toHaveCount(0);
      });
    } else {
      test('願望清單：加入 / 移除切換', async ({ page }) => {
        const btn = page.locator('#wishlistBtn');
        await btn.click();
        await expect(btn).toContainText('已加入願望清單');
        await btn.click();
        await expect(btn).not.toContainText('已加入願望清單');
      });

      test('願望清單：通知文字提到的是自己的旅館名稱', async ({ page }) => {
        knownBug(COPIED.has(hotel.id), '願望清單通知文字是從 1 號頁面複製的，寫成別間旅館的名稱');
        await page.locator('#wishlistBtn').click();
        await expect(page.getByText(`已將${hotel.name}加入您的願望清單！`)).toBeVisible();
      });

      if (hotel.category !== 'C') {
        test('願望清單：重新整理後保留（localStorage）', async ({ page }) => {
          await page.locator('#wishlistBtn').click();
          await page.reload();
          await expect(page.locator('#wishlistBtn')).toContainText('已加入願望清單');
        });
      } else {
        test('願望清單：C 類沒有儲存狀態，重新整理後會消失', async ({ page }) => {
          await page.locator('#wishlistBtn').click();
          await page.reload();
          await expect(page.locator('#wishlistBtn')).not.toContainText('已加入願望清單');
        });
      }
    }

    // ─── AI 聊天 ───
    test.describe('AI 聊天', () => {
      const ask = async (page, msg) => {
        await page.locator(ui.chatBtn).click();
        await expect(page.locator(ui.chatWin)).toBeVisible();
        await page.fill(`${ui.chatWin} #chatInput`, msg);
        await page.press(`${ui.chatWin} #chatInput`, 'Enter');
        await expect(page.locator(`${ui.chatBody} .user-message`).last()).toHaveText(msg);
      };

      test('一般問題的回覆與後端 /api/chat 一致', async ({ page, request }) => {
        const msg = hotel.category === 'C' ? '房間' : '早餐'; // 這兩句的回覆不含旅館名稱
        const expected = await apiChat(request, hotel.id, msg);
        await ask(page, msg);
        await expect(page.locator(`${ui.chatBody} .ai-message`).last()).toHaveText(expected);
      });

      test('詢問「位置」時，回答的是自己這間旅館', async ({ page, request }) => {
        knownBug(COPIED.has(hotel.id), '複製的頁面沿用 1 號旅館的位置說明，而不是自己的地址');
        const expected = await apiChat(request, hotel.id, '位置');
        await ask(page, '位置');
        await expect(page.locator(`${ui.chatBody} .ai-message`).last()).toHaveText(expected);
      });
    });
  });
}

// ─── 跨旅館的已知問題 ───
test.describe('跨旅館', () => {
  test('願望清單各旅館應該獨立（目前全部共用同一個 localStorage 鍵）', async ({ page }) => {
    test.fail(true, '所有頁面都用 localStorage 的 hotel_wishlist，在 A2 加入後 A3 也顯示已加入');
    await page.goto('/A2_detail.html');
    await page.locator('#wishlistBtn').click();
    await page.goto('/A3_detail.html');
    await expect(page.locator('#wishlistBtn')).not.toContainText('已加入願望清單');
  });
});

// ─── C 類限時倒數（C1~C3 共用） ───
const toSeconds = (t) => t.split(':').map(Number).reduce((a, n) => a * 60 + n, 0);

for (const hotel of HOTEL_LIST.filter((h) => h.category === 'C')) {
  test.describe(`${hotel.id} 限時倒數`, () => {
    test('預設從 23:59:45 開始，上方橫幅與詳情區同步', async ({ page }) => {
      await page.goto(`/${hotel.detailPage}`);
      await expect(page.locator('#countdown')).toHaveText(/^23:59:4[1-5]$/);
      await expect(page.locator('#promotionCountdown .time-number')).toHaveCount(3);
      await expect(page.locator('#promotionCountdown .time-number').nth(0)).toHaveText('23');
      await expect(page.locator('#promotionCountdown .time-number').nth(1)).toHaveText('59');
    });

    test('每秒遞減', async ({ page }) => {
      await page.goto(`/${hotel.detailPage}`);
      const el = page.locator('#countdown');
      const first = await el.textContent();
      await expect(el).not.toHaveText(first, { timeout: 3_000 });
    });

    test('?countdown=3725 時從 01:02:05 開始', async ({ page }) => {
      await page.goto(`/${hotel.detailPage}?category=C&hotelId=hotel1&countdown=3725`);
      await expect(page.locator('#countdown')).toHaveText(/^01:02:0[2-5]$/);
    });
  });
}

test('推薦頁「立即搶訂」→ 詳情頁倒數接續推薦頁的剩餘時間', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('countdown-hotel2', '3725');
    localStorage.setItem('countdown-timestamp-hotel2', String(Date.now()));
  });
  await page.goto('/hotel_interface.html?type=C');
  await page.locator('#sectionC .book-btn').nth(1).click();
  await page.waitForURL(/C2_detail\.html\?category=C&hotelId=hotel2&countdown=\d+$/);
  await expect(page).toHaveTitle(/台北喜來登大飯店/);
  await expect.poll(async () => toSeconds(await page.locator('#countdown').textContent())).toBeGreaterThan(3700);
  await expect.poll(async () => toSeconds(await page.locator('#countdown').textContent())).toBeLessThanOrEqual(3725);
});
