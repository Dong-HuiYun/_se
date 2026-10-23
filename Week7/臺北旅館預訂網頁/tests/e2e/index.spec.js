'use strict';
const { test, expect } = require('./fixtures');

/**
 * index.html 的「語音」其實是模擬：從 9 句固定文字中用 Math.random 挑一句。
 * 為了讓測試可重複，注入固定的 Math.random，讓它每次都挑同一句。
 * 9 句的索引：0~2 = A、3~5 = B、6~7 = C、8 = 無關鍵字（再隨機分配類型）。
 */
const stubRandom = (page, index) =>
  page.addInitScript((i) => { Math.random = () => (i + 0.5) / 9; }, index);

/** hotel_interface.html 不在作業檔案內，這裡用 stub 取代，並延遲回應以便觀察跳轉前的畫面 */
const stubHotelInterface = (page) =>
  page.route('**/hotel_interface.html*', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>hotel interface stub</h1>' }).catch(() => {});
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
    { index: 0, type: 'A', phrase: '科技感', name: '科技類語句 → A' },
    { index: 3, type: 'B', phrase: '服務品質', name: '品質服務類語句 → B' },
    { index: 6, type: 'C', phrase: '便宜', name: '價格類語句 → C' },
    { index: 8, type: 'C', phrase: '預算有限', name: '無關鍵字語句 → 走隨機分配（亂數固定為 0.94 → C）' },
  ];

  for (const c of cases) {
    test(`點擊麥克風：${c.name}，並跳轉到 hotel_interface.html?type=${c.type}`, async ({ page }) => {
      await stubRandom(page, c.index);
      await stubHotelInterface(page);
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
    });
  }
});
