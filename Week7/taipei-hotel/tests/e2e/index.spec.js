'use strict';
const { test, expect } = require('./fixtures');

/**
 * index.html 的「語音」其實是模擬：從 9 句固定文字中用 Math.random 挑一句。
 * 為了讓測試可重複，注入固定的 Math.random，讓它每次都挑同一句。
 * 9 句的索引：0~2 = A、3~5 = B、6~7 = C、8 = 無關鍵字（再隨機分配類型）。
 */
const stubRandom = (page, index) =>
  page.addInitScript((i) => { Math.random = () => (i + 0.5) / 9; }, index);

/**
 * 真正的 hotel_interface.html 會被載入；這裡只是把跳轉的請求延遲 2 秒再放行，
 * 讓測試有時間在「跳轉前」檢查首頁的畫面（否則 3.5 秒顯示、4 秒跳轉，斷言容易搶不到）。
 */
const delayHotelInterface = (page) =>
  page.route('**/hotel_interface.html*', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue().catch(() => {}); // 第二次跳轉會取消第一次請求，忽略錯誤
  });

test.describe('首頁：AI 語音分類推薦', () => {
  test('頁面載入後顯示標題、麥克風與提示卡片', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('AI語音分類推薦系統');
    await expect(page.locator('h1')).toHaveText('AI語音分類推薦系統');
    await expect(page.locator('#voiceBtn')).toBeVisible();
    await expect(page.locator('#status')).toHaveText('點擊麥克風開始語音輸入');
    await expect(page.locator('.prompt-card')).toHaveCount(5);
    await expect(page.locator('.prompt-card h3').first()).toContainText('飯店地點');
  });

  const cases = [
    { index: 0, type: 'A', phrase: '科技感', title: '科技體驗精選', name: '科技類語句 → A' },
    { index: 3, type: 'B', phrase: '服務品質', title: '高CP值精選', name: '品質服務類語句 → B' },
    { index: 6, type: 'C', phrase: '便宜', title: '限時優惠精選', name: '價格類語句 → C' },
    { index: 8, type: 'C', phrase: '預算有限', title: '限時優惠精選', name: '無關鍵字語句 → 走隨機分配（亂數固定為 0.94 → C）' },
  ];

  for (const c of cases) {
    test(`點擊麥克風：${c.name}，並跳轉到 hotel_interface.html?type=${c.type}`, async ({ page }) => {
      await stubRandom(page, c.index);
      await delayHotelInterface(page);
      await page.goto('/');

      await page.click('#voiceBtn');

      // 1. 聆聽中
      await expect(page.locator('#status')).toHaveText('正在聆聽...請說出您的需求');
      await expect(page.locator('#voiceBtn')).toHaveClass(/listening/);

      // 2. 進度條跑滿（約 2 秒）
      await expect(page.locator('#progressBar')).toHaveAttribute('style', /width:\s*100%/);

      // 3. 顯示「您說：…」，麥克風恢復
      await expect(page.locator('#userInput')).toContainText(`您說：`, { timeout: 10_000 });
      await expect(page.locator('#userInput')).toContainText(c.phrase);
      await expect(page.locator('#voiceBtn')).not.toHaveClass(/listening/);

      // 4. 跳轉並帶上使用者類型
      await page.waitForURL(new RegExp(`hotel_interface\\.html\\?type=${c.type}$`), { timeout: 15_000 });

      // 5. 真正的推薦頁顯示對應類型的內容
      await expect(page.locator('#userTypeIndicator')).toHaveClass(new RegExp(`user-type-${c.type.toLowerCase()}`));
      await expect(page.locator(`#section${c.type} .section-title`)).toHaveText(c.title);
      await expect(page.locator(`#section${c.type}`)).toBeVisible();
    });
  }

  test('完整流程：語音 → 推薦頁 → 點第一間旅館 → A1 詳情頁', async ({ page }) => {
    test.setTimeout(45_000);
    await stubRandom(page, 0); // 科技類 → A
    await page.goto('/');
    await page.click('#voiceBtn');

    await page.waitForURL(/hotel_interface\.html\?type=A$/, { timeout: 15_000 });
    await expect(page.locator('#sectionA .hotel-card-long')).toHaveCount(3);
    await expect(page.locator('#sectionA .hotel-name').first()).toHaveText('台北凱達大飯店');

    await page.locator('#sectionA .book-btn').first().click();
    await page.waitForURL(/A1_detail\.html\?category=A$/);
    await expect(page).toHaveTitle('台北凱達大飯店 - 科技體驗');
  });
});
