'use strict';
const { test, expect } = require('./fixtures');

/** 收集頁面跳出的 alert 訊息並自動按下確定 */
function collectDialogs(page) {
  const messages = [];
  page.on('dialog', async (d) => { messages.push(d.message()); await d.accept(); });
  return messages;
}

test.describe('訂房頁 A1_room1_page.html', () => {
  test('沒有選房型時顯示預設房型（豪華雙人房），預設住 1 晚', async ({ page }) => {
    await page.goto('/A1_room1_page.html');
    await expect(page.locator('#summaryRoomName')).toHaveText('豪華雙人房');
    await expect(page.locator('#nightsCount')).toHaveText('1 晚');
    await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 3,685');
  });

  test('人數調整：成人最少 1、小孩最少 0、可增加', async ({ page }) => {
    await page.goto('/A1_room1_page.html');
    const adults = page.locator('#adultsCount');
    const children = page.locator('#childrenCount');
    const rooms = page.locator('#roomsCount');

    await expect(adults).toHaveText('2');
    await page.locator('button[onclick="changeGuests(\'adults\', 1)"]').click();
    await expect(adults).toHaveText('3');

    for (let i = 0; i < 5; i++) await page.locator('button[onclick="changeGuests(\'adults\', -1)"]').click();
    await expect(adults).toHaveText('1'); // 不會低於 1

    await page.locator('button[onclick="changeGuests(\'children\', -1)"]').click();
    await expect(children).toHaveText('0'); // 不會低於 0
    await page.locator('button[onclick="changeGuests(\'children\', 1)"]').click();
    await expect(children).toHaveText('1');

    await page.locator('button[onclick="changeGuests(\'rooms\', 1)"]').click();
    await expect(rooms).toHaveText('2');
  });

  test('變更日期 → 晚數與價格即時更新', async ({ page }) => {
    await page.goto('/A1_room1_page.html');
    await page.fill('#checkin', '2025-12-01');
    await page.fill('#checkout', '2025-12-04');
    await page.locator('#checkout').dispatchEvent('change');

    await expect(page.locator('#nightsCount')).toHaveText('3 晚');
    await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 11,055'); // 3685 × 3
    await expect(page.locator('#summaryTotalPrice')).toHaveText('TWD 12,271.05'); // + 5% + 6%
  });

  test('付款方式：一次只能選一種', async ({ page }) => {
    await page.goto('/A1_room1_page.html');
    const paypal = page.locator(".payment-method[onclick*='paypal']");
    const credit = page.locator(".payment-method[onclick*='credit']");
    await expect(credit).toHaveClass(/selected/);

    await paypal.click();
    await expect(paypal).toHaveClass(/selected/);
    await expect(credit).not.toHaveClass(/selected/);
    await expect(page.locator('.payment-method.selected')).toHaveCount(1);
  });

  test('聯絡資訊未填 → alert 提示且不進入下一步', async ({ page }) => {
    const dialogs = collectDialogs(page);
    await page.goto('/A1_room1_page.html');
    await page.fill('#fullName', '王小明'); // 只填姓名
    await page.click('.btn-book');

    await expect.poll(() => dialogs).toEqual(['請填寫完整的聯絡資訊']);
    await expect(page.locator('#step3')).not.toHaveClass(/active/);
    await expect(page.locator('.btn-book')).toHaveText('確認預訂');
  });

  test('填妥資料 → 預訂成功：步驟推進、按鈕變綠、跳出確認訊息', async ({ page }) => {
    const dialogs = collectDialogs(page);
    await page.goto('/A1_room1_page.html');
    await page.fill('#fullName', '王小明');
    await page.fill('#email', 'ming@example.com');
    await page.fill('#phone', '0912345678');
    await page.fill('#specialRequests', '高樓層');
    await page.click('.btn-book');

    await expect(page.locator('.btn-book')).toHaveText('預訂成功！正在跳轉...');
    await expect(page.locator('#step2')).toHaveClass(/completed/);
    await expect(page.locator('#step3')).toHaveClass(/active/);

    // 1.5 秒後跳出確認 alert
    await expect.poll(() => dialogs.length, { timeout: 5_000 }).toBe(1);
    expect(dialogs[0]).toContain('預訂成功');
    expect(dialogs[0]).toContain('王小明');
    expect(dialogs[0]).toContain('ming@example.com');
  });

  test('「返回酒店詳情」回到詳情頁', async ({ page }) => {
    await page.goto('/A1_room1_page.html');
    await page.locator('.back-button').click();
    await page.waitForURL('**/A1_detail.html');
  });
});

test.describe('完整使用流程（跨頁）', () => {
  test('詳情頁選「家庭套房」→ 訂房頁填資料 → 預訂成功', async ({ page }) => {
    const dialogs = collectDialogs(page);

    // 1. 詳情頁：加入願望清單並選房
    await page.goto('/A1_detail.html');
    await page.locator('#wishlistBtn').click();
    await page.locator('button[onclick="showRoomSelection()"]').click();
    await page.locator('#roomSelectionModal .room-option').nth(2).locator('.select-btn').click();

    // 2. 訂房頁：確認房型 / 價格
    await page.waitForURL('**/A1_room1_page.html');
    await expect(page.locator('#summaryRoomName')).toHaveText('家庭套房');
    await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 6,057');

    // 3. 改成 2 晚、改付款方式、填聯絡資料
    await page.fill('#checkin', '2025-12-10');
    await page.fill('#checkout', '2025-12-12');
    await page.locator('#checkout').dispatchEvent('change');
    await expect(page.locator('#nightsCount')).toHaveText('2 晚');
    await page.locator(".payment-method[onclick*='applepay']").click();
    await page.fill('#fullName', '林小華');
    await page.fill('#email', 'hua@example.com');
    await page.fill('#phone', '0987654321');
    await page.click('.btn-book');

    // 4. 成功
    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect.poll(() => dialogs.length, { timeout: 5_000 }).toBe(1);
    expect(dialogs[0]).toContain('林小華');

    // 5. 回詳情頁：願望清單狀態仍在
    await page.goto('/A1_detail.html');
    await expect(page.locator('#wishlistBtn')).toContainText('已加入願望清單');
  });
});

test.describe('已知問題（用 test.fail 記錄；修好後 Playwright 會提示「預期失敗卻通過」，屆時移除標記即可）', () => {
  test('選了家庭套房後修改日期，價格應維持家庭套房的房價', async ({ page }) => {
    test.fail(true, 'Bug：A1_room1_page.html 在 DOMContentLoaded 結尾就 removeItem(selectedRoomType)，之後 updateNights() 讀不到房型而退回 type1 價格');
    await page.goto('/A1_detail.html');
    await page.locator('button[onclick="showRoomSelection()"]').click();
    await page.locator('#roomSelectionModal .room-option').nth(2).locator('.select-btn').click();
    await page.waitForURL('**/A1_room1_page.html');
    await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 6,057');

    await page.fill('#checkin', '2025-12-10');
    await page.fill('#checkout', '2025-12-12');
    await page.locator('#checkout').dispatchEvent('change');
    await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 12,114'); // 6057 × 2
  });
});
