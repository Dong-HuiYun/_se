'use strict';
const { test, expect } = require('./fixtures');

test.describe('旅館詳情頁 A1_detail.html', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/A1_detail.html');
  });

  test('標題正確、三大區塊預設顯示', async ({ page }) => {
    await expect(page).toHaveTitle('台北凱達大飯店 - 科技體驗');
    await expect(page.locator('#location-content')).toBeVisible();
    await expect(page.locator('#rooms-content')).toBeVisible();
    await expect(page.locator('#facilities-content')).toBeVisible();
  });

  test.describe('願望清單', () => {
    test('加入 → 顯示通知與已加入狀態 → 再按一次移除', async ({ page }) => {
      const btn = page.locator('#wishlistBtn');
      await expect(btn).toContainText('加入願望清單');

      await btn.click();
      await expect(btn).toContainText('已加入願望清單');
      await expect(page.getByText('已將台北凱達大飯店加入您的願望清單！')).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('hotel_wishlist'))).toBe('true');

      await btn.click();
      await expect(btn).not.toContainText('已加入願望清單');
      await expect(page.getByText('已從願望清單中移除台北凱達大飯店。')).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('hotel_wishlist'))).toBe('false');
    });

    test('重新整理後狀態會保留（localStorage）', async ({ page }) => {
      await page.locator('#wishlistBtn').click();
      await page.reload();
      await expect(page.locator('#wishlistBtn')).toContainText('已加入願望清單');
    });
  });

  test.describe('房型選擇彈窗', () => {
    const openModal = (page) => page.locator('button[onclick="showRoomSelection()"]').click();

    test('開啟後列出四種房型與價格', async ({ page }) => {
      await expect(page.locator('#roomSelectionModal')).toBeHidden();
      await openModal(page);
      await expect(page.locator('#roomSelectionModal')).toBeVisible();

      await expect(page.locator('#roomSelectionModal .room-option')).toHaveCount(4);
      await expect(page.locator('#roomSelectionModal .room-header h3')).toHaveText(['豪華雙人房', '豪華雙床房', '家庭套房', '小型套房']);
      await expect(page.locator('#roomSelectionModal .room-price .price')).toHaveText(['TWD 3,685', 'TWD 3,685', 'TWD 6,057', 'TWD 3,685']);
    });

    test('Escape、× 按鈕、取消按鈕都能關閉', async ({ page }) => {
      const modal = page.locator('#roomSelectionModal');

      await openModal(page);
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();

      await openModal(page);
      await modal.locator('.close-btn').click();
      await expect(modal).toBeHidden();

      await openModal(page);
      await modal.locator('.cancel-btn').click();
      await expect(modal).toBeHidden();
    });

    test('前端顯示的房價與後端 /api/rooms 一致', async ({ page, request }) => {
      await openModal(page);
      const uiPrices = await page.locator('#roomSelectionModal .room-price .price').allTextContents();
      const res = await request.get('/api/rooms');
      expect(res.ok()).toBeTruthy();
      const { rooms } = await res.json();
      const apiPrices = rooms.map((r) => `TWD ${r.basePrice.toLocaleString('en-US')}`);
      expect(uiPrices).toEqual(apiPrices);
    });

    test('選擇「家庭套房」→ 按鈕變為選擇中 → 跳轉訂房頁並帶入房型與價格', async ({ page }) => {
      await openModal(page);
      const option = page.locator('#roomSelectionModal .room-option').nth(2);
      await option.locator('.select-btn').click();

      await expect(option.locator('.select-btn')).toContainText('選擇中');
      await expect(page.locator('#roomSelectionModal .select-btn').first()).toBeDisabled();

      await page.waitForURL('**/A1_room1_page.html');
      await expect(page.locator('#summaryRoomName')).toHaveText('家庭套房');
      await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 6,057');
      await expect(page).toHaveTitle(/預訂家庭套房/);
    });
  });

  test.describe('景點資訊', () => {
    test('預設顯示龍山寺，點選華西街夜市後內容更新', async ({ page }) => {
      await expect(page.locator('#detailTitle')).toHaveText('龍山寺');
      await expect(page.locator('#detailDistance')).toHaveText('步行3分鐘');

      await page.locator('.attraction-btn', { hasText: '華西街夜市' }).click();

      await expect(page.locator('#detailTitle')).toHaveText('華西街夜市');
      await expect(page.locator('#detailDistance')).toHaveText('步行4分鐘');
      await expect(page.locator('.attraction-btn.active')).toHaveCount(1);
      await expect(page.locator('.attraction-btn.active')).toContainText('華西街夜市');
    });
  });

  test.describe('AI 智能助理', () => {
    const openChat = async (page) => {
      await page.locator('.ai-chat').click();
      await expect(page.locator('#chatWindow')).toBeVisible();
    };

    test('開啟 / 關閉聊天視窗', async ({ page }) => {
      await expect(page.locator('#chatWindow')).toBeHidden();
      await openChat(page);
      await expect(page.locator('#chatBody .ai-message').first()).toContainText('AI智能助理');
      await page.locator('.close-chat').click();
      await expect(page.locator('#chatWindow')).toBeHidden();
    });

    test('輸入「早餐」按 Enter → 顯示使用者訊息與 AI 回覆', async ({ page }) => {
      await openChat(page);
      await page.fill('#chatInput', '早餐');
      await page.press('#chatInput', 'Enter');

      await expect(page.locator('#chatBody .user-message')).toHaveText('早餐');
      await expect(page.locator('#chatInput')).toHaveValue('');
      await expect(page.locator('#chatBody .ai-message').last()).toContainText('6:30至10:00');
    });

    test('按送出按鈕也能發送；空白訊息不會送出', async ({ page }) => {
      await openChat(page);
      await page.fill('#chatInput', '   ');
      await page.locator('.ai-chat-input button').click();
      await expect(page.locator('#chatBody .user-message')).toHaveCount(0);

      await page.fill('#chatInput', '可以停車嗎');
      await page.locator('.ai-chat-input button').click();
      await expect(page.locator('#chatBody .ai-message').last()).toContainText('免費停車');
    });

    // 前端的回覆邏輯與後端 /api/chat 應該一致（價格那句已知有差異，見 README）
    for (const msg of ['早餐', '可以停車嗎', '游泳池幾點', '你好', '今天天氣如何']) {
      test(`前端回覆與後端 /api/chat 一致：「${msg}」`, async ({ page, request }) => {
        const apiReply = (await (await request.post('/api/chat', { data: { message: msg } })).json()).reply;
        await openChat(page);
        await page.fill('#chatInput', msg);
        await page.press('#chatInput', 'Enter');
        await expect(page.locator('#chatBody .ai-message').last()).toHaveText(apiReply);
      });
    }
  });

  test.describe('設施預約彈窗', () => {
    const toast = (page, text) => page.getByText(text);

    test('游泳池：未填完整 → 顯示錯誤、彈窗保持開啟', async ({ page }) => {
      await page.locator('button[onclick="bookFacility(\'pool\')"]').click();
      await expect(page.locator('#bookingModal')).toBeVisible();
      await expect(page.locator('#bookingModalTitle')).toContainText('游泳池預約');

      await page.locator('#bookingModal button', { hasText: '確認預約' }).click();
      await expect(toast(page, '請填寫完整的身份信息！')).toBeVisible();
      await expect(page.locator('#bookingModal')).toBeVisible();
    });

    test('游泳池：不可用時段無法選取，選可用時段後預約成功', async ({ page }) => {
      await page.locator('button[onclick="bookFacility(\'pool\')"]').click();

      const unavailable = page.locator('.time-slot[data-slot="14:00-15:00"]');
      await expect(unavailable).toHaveClass(/unavailable/);
      await unavailable.click({ force: true });
      await expect(unavailable).not.toHaveClass(/selected/);

      const tomorrow = await page.evaluate(() => getTomorrowDate());
      await page.fill('#poolDate', tomorrow);
      const slot = page.locator('.time-slot[data-slot="09:00-10:00"]');
      await slot.click();
      await expect(slot).toHaveClass(/selected/);
      await page.fill('#poolPersons', '2');

      await page.locator('#bookingModal button', { hasText: '確認預約' }).click();
      await expect(toast(page, `成功預約游泳池！時間: ${tomorrow} 09:00-10:00, 人數: 2人`)).toBeVisible();
      await expect(page.locator('#bookingModal')).toBeHidden();
    });

    test('游泳池：同一時間只會有一個選中的時段', async ({ page }) => {
      await page.locator('button[onclick="bookFacility(\'pool\')"]').click();
      await page.locator('.time-slot[data-slot="08:00-09:00"]').click();
      await page.locator('.time-slot[data-slot="10:00-11:00"]').click();
      await expect(page.locator('.time-slot.selected')).toHaveCount(1);
      await expect(page.locator('.time-slot.selected')).toHaveAttribute('data-slot', '10:00-11:00');
    });

    test('會議室：沒填主題 → 錯誤；填了 → 預約成功', async ({ page }) => {
      await page.locator('button[onclick="bookFacility(\'meeting\')"]').click();
      await expect(page.locator('#bookingModal')).toBeVisible();

      await page.locator('#bookingModal button', { hasText: '確認預約' }).click();
      await expect(toast(page, '請輸入會議主題！')).toBeVisible();

      await page.fill('#meetingTopic', '期末專案討論');
      await page.locator('#bookingModal button', { hasText: '確認預約' }).click();
      await expect(toast(page, /成功預約會議室！.*主題: 期末專案討論/)).toBeVisible();
      await expect(page.locator('#bookingModal')).toBeHidden();
    });

    test('Escape 與取消按鈕可關閉預約彈窗', async ({ page }) => {
      const modal = page.locator('#bookingModal');
      await page.locator('button[onclick="bookFacility(\'pool\')"]').click();
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();

      await page.locator('button[onclick="bookFacility(\'pool\')"]').click();
      await modal.locator('button', { hasText: '取消' }).click();
      await expect(modal).toBeHidden();
    });
  });
});
