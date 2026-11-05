'use strict';
const { test, expect } = require('./fixtures');
const { HOTEL_LIST } = require('../../server/services/hotels');

const TYPES = {
  A: { title: '科技體驗精選', first: '台北凱達大飯店', names: ['台北凱達大飯店', '台北W飯店', '台北寒舍艾美酒店'] },
  B: { title: '高CP值精選', first: '台北君悅酒店', names: ['台北君悅酒店', '台北晶華酒店', '台北遠東國際大飯店'] },
  C: { title: '限時優惠精選', first: '台北美好境界西門館', names: ['台北美好境界西門館', '台北喜來登大飯店', '台北德立莊酒店'] },
};

test.describe('旅遊推薦平台 hotel_interface.html', () => {
  test.describe('依 ?type= 顯示對應內容', () => {
    for (const [type, info] of Object.entries(TYPES)) {
      test(`type=${type}：只顯示「${info.title}」，其餘區塊隱藏`, async ({ page }) => {
        await page.goto(`/hotel_interface.html?type=${type}`);
        await expect(page).toHaveTitle('旅遊推薦平台 - 個性化選擇');
        await expect(page.locator('#userTypeIndicator')).toHaveClass(new RegExp(`user-type-${type.toLowerCase()}`));

        for (const other of ['A', 'B', 'C']) {
          const section = page.locator(`#section${other}`);
          if (other === type) await expect(section).toBeVisible();
          else await expect(section).toBeHidden();
        }
        await expect(page.locator(`#section${type} .section-title`)).toHaveText(info.title);
        await expect(page.locator(`#section${type} .hotel-name`)).toHaveText(info.names);
      });

      test(`type=${type}：只有自己的分頁標籤是 active，其他為 disabled`, async ({ page }) => {
        await page.goto(`/hotel_interface.html?type=${type}`);
        for (const t of ['A', 'B', 'C']) {
          const tab = page.locator(`#tab${t}`);
          if (t === type) {
            await expect(tab).toHaveClass(/active/);
            await expect(tab).not.toHaveClass(/disabled/);
          } else {
            await expect(tab).toHaveClass(/disabled/);
            await expect(tab).not.toHaveClass(/active/);
          }
        }
      });
    }

    test('沒有 type 參數時預設顯示 B 類', async ({ page }) => {
      await page.goto('/hotel_interface.html');
      await expect(page.locator('#sectionB')).toBeVisible();
      await expect(page.locator('#sectionA')).toBeHidden();
      await expect(page.locator('#sectionC')).toBeHidden();
    });

    test('點擊 disabled 的分頁不會切換內容', async ({ page }) => {
      await page.goto('/hotel_interface.html?type=A');
      await page.locator('#tabB').dispatchEvent('click'); // 分頁是空的 div，沒有可點的大小，故直接派送事件
      await page.locator('#tabC').dispatchEvent('click');
      await expect(page.locator('#sectionA')).toBeVisible();
      await expect(page.locator('#sectionB')).toBeHidden();
      await expect(page.locator('#sectionC')).toBeHidden();
    });

    test('無效的 type（例如 X）至少應顯示一個推薦區塊', async ({ page }) => {
      test.fail(true, 'Bug：setUserType 的 switch 沒有 default，type=X 時三個區塊全部隱藏，頁面一片空白');
      await page.goto('/hotel_interface.html?type=X');
      await expect(page.locator('.recommendation-section:visible')).toHaveCount(1);
    });
  });

  test.describe('導覽', () => {
    test('「重新語音輸入」回到首頁', async ({ page }) => {
      await page.goto('/hotel_interface.html?type=A');
      await page.locator('#backToAIBtn').click();
      await page.waitForURL('**/index.html');
      await expect(page.locator('#voiceBtn')).toBeVisible();
    });

    test('A 類第一間「體驗科技住宿」→ A1_detail.html?category=A（真實頁面）', async ({ page }) => {
      await page.goto('/hotel_interface.html?type=A');
      await page.locator('#sectionA .book-btn').first().click();
      await page.waitForURL(/A1_detail\.html\?category=A$/);
      await expect(page.locator('.logo')).toContainText('台北凱達大飯店');
    });

    // 九間旅館全部是真實頁面：點按鈕 → 網址正確 → 詳情頁標題是該旅館
    for (const [i, hotel] of HOTEL_LIST.entries()) {
      test(`${hotel.category} 類第 ${(i % 3) + 1} 間「${hotel.name}」→ ${hotel.detailPage}`, async ({ page }) => {
        if (hotel.id === 'B3') test.fail(true, 'B3_detail.html 是君悅的複製品，標題沒改成「台北遠東國際大飯店」');
        await page.goto(`/hotel_interface.html?type=${hotel.category}`);
        await page.locator(`#section${hotel.category} .book-btn`).nth(i % 3).click();
        const query = hotel.category === 'C' ? `\\?category=C&hotelId=hotel${(i % 3) + 1}&countdown=\\d+` : `\\?category=${hotel.category}`;
        await page.waitForURL(new RegExp(`${hotel.detailPage.replace('.', '\\.')}${query}$`));
        await expect(page).toHaveTitle(new RegExp(hotel.name));
      });
    }

    test('從詳情頁按「返回」→ 回到 hotel_interface.html?type=A 並顯示 A 類', async ({ page }) => {
      await page.goto('/A1_detail.html');
      await page.locator('button[onclick="returnToHotelInterface(\'A\')"]').click();
      await page.waitForURL(/hotel_interface\.html\?type=A$/);
      await expect(page.locator('#sectionA')).toBeVisible();
    });

    test('從詳情頁返回時會還原先前的捲動位置', async ({ page }) => {
      await page.addInitScript(() => {
        sessionStorage.setItem('fromDetailPage', 'true');
        sessionStorage.setItem('hotelInterfaceScrollPos', '400');
      });
      await page.goto('/hotel_interface.html?type=A');
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      expect(await page.evaluate(() => sessionStorage.getItem('fromDetailPage'))).toBeNull();
    });
  });

  test.describe('C 類限時優惠倒數', () => {
    /** 預先寫入 localStorage，讓倒數的起點可預測 */
    const seedCountdown = (page, hotelId, seconds, ageSeconds = 0) =>
      page.addInitScript(([id, sec, age]) => {
        localStorage.setItem(`countdown-${id}`, String(sec));
        localStorage.setItem(`countdown-timestamp-${id}`, String(Date.now() - age * 1000));
      }, [hotelId, seconds, ageSeconds]);

    test('三間旅館各自從不同的初始時間開始', async ({ page }) => {
      await page.goto('/hotel_interface.html?type=C');
      // 起點分別為 23:59:45 / 18:30:15 / 12:45:30，容許載入時多跳 1~2 秒
      await expect(page.locator('#countdown-hotel1')).toHaveText(/^23:59:4[3-5]$/);
      await expect(page.locator('#countdown-hotel2')).toHaveText(/^18:30:1[3-5]$/);
      await expect(page.locator('#countdown-hotel3')).toHaveText(/^12:45:(2[8-9]|30)$/);
    });

    test('每秒遞減', async ({ page }) => {
      await page.goto('/hotel_interface.html?type=C');
      const el = page.locator('#countdown-hotel1');
      const first = await el.textContent();
      await expect(el).not.toHaveText(first, { timeout: 3_000 });
    });

    test('從 localStorage 還原進度，並扣掉離開期間經過的時間', async ({ page }) => {
      await seedCountdown(page, 'hotel1', 3725, 60); // 剩 3725 秒，但已過了 60 秒 → 3665 秒 = 01:01:05
      await page.goto('/hotel_interface.html?type=C');
      await expect(page.locator('#countdown-hotel1')).toHaveText(/^01:01:0[3-5]$/);
    });

    test('倒數結束顯示「優惠已結束」，3 秒後重新開始', async ({ page }) => {
      await seedCountdown(page, 'hotel1', 0);
      await page.goto('/hotel_interface.html?type=C');
      await expect(page.locator('#countdown-hotel1')).toHaveText('優惠已結束');
      await expect(page.locator('#countdown-hotel1')).toHaveText(/^23:59:4\d$/, { timeout: 6_000 });
    });

    test('「立即搶訂」把剩餘秒數帶到詳情頁網址', async ({ page }) => {
      await seedCountdown(page, 'hotel1', 3725);
      await page.goto('/hotel_interface.html?type=C');
      await page.locator('#sectionC .book-btn').first().click();
      await page.waitForURL(/C1_detail\.html\?category=C&hotelId=hotel1&countdown=372[0-5]$/);
    });

    test('第二、三間的網址帶上各自的 hotelId', async ({ page }) => {
      await page.goto('/hotel_interface.html?type=C');
      await page.locator('#sectionC .book-btn').nth(1).click();
      await page.waitForURL(/C2_detail\.html\?category=C&hotelId=hotel2&countdown=\d+$/);
    });
  });
});
