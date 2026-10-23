# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: room.spec.js >> 已知問題（用 test.fail 記錄；修好後 Playwright 會提示「預期失敗卻通過」，屆時移除標記即可） >> 選了家庭套房後修改日期，價格應維持家庭套房的房價
- Location: tests\e2e\room.spec.js:140:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#summaryRoomPrice')
Expected: "TWD 12,114"
Received: "TWD 7,370"
Timeout:  7000ms

Call log:
  - Expect "toHaveText" locator('#summaryRoomPrice') with timeout 7000ms
  - waiting for locator('#summaryRoomPrice')
    18 × locator resolved to <span id="summaryRoomPrice">TWD 7,370</span>
       - unexpected value "TWD 7,370"

```

```yaml
- text: TWD 7,370
```

# Test source

```ts
  51  | 
  52  |   test('付款方式：一次只能選一種', async ({ page }) => {
  53  |     await page.goto('/A1_room1_page.html');
  54  |     const paypal = page.locator(".payment-method[onclick*='paypal']");
  55  |     const credit = page.locator(".payment-method[onclick*='credit']");
  56  |     await expect(credit).toHaveClass(/selected/);
  57  | 
  58  |     await paypal.click();
  59  |     await expect(paypal).toHaveClass(/selected/);
  60  |     await expect(credit).not.toHaveClass(/selected/);
  61  |     await expect(page.locator('.payment-method.selected')).toHaveCount(1);
  62  |   });
  63  | 
  64  |   test('聯絡資訊未填 → alert 提示且不進入下一步', async ({ page }) => {
  65  |     const dialogs = collectDialogs(page);
  66  |     await page.goto('/A1_room1_page.html');
  67  |     await page.fill('#fullName', '王小明'); // 只填姓名
  68  |     await page.click('.btn-book');
  69  | 
  70  |     await expect.poll(() => dialogs).toEqual(['請填寫完整的聯絡資訊']);
  71  |     await expect(page.locator('#step3')).not.toHaveClass(/active/);
  72  |     await expect(page.locator('.btn-book')).toHaveText('確認預訂');
  73  |   });
  74  | 
  75  |   test('填妥資料 → 預訂成功：步驟推進、按鈕變綠、跳出確認訊息', async ({ page }) => {
  76  |     const dialogs = collectDialogs(page);
  77  |     await page.goto('/A1_room1_page.html');
  78  |     await page.fill('#fullName', '王小明');
  79  |     await page.fill('#email', 'ming@example.com');
  80  |     await page.fill('#phone', '0912345678');
  81  |     await page.fill('#specialRequests', '高樓層');
  82  |     await page.click('.btn-book');
  83  | 
  84  |     await expect(page.locator('.btn-book')).toHaveText('預訂成功！正在跳轉...');
  85  |     await expect(page.locator('#step2')).toHaveClass(/completed/);
  86  |     await expect(page.locator('#step3')).toHaveClass(/active/);
  87  | 
  88  |     // 1.5 秒後跳出確認 alert
  89  |     await expect.poll(() => dialogs.length, { timeout: 5_000 }).toBe(1);
  90  |     expect(dialogs[0]).toContain('預訂成功');
  91  |     expect(dialogs[0]).toContain('王小明');
  92  |     expect(dialogs[0]).toContain('ming@example.com');
  93  |   });
  94  | 
  95  |   test('「返回酒店詳情」回到詳情頁', async ({ page }) => {
  96  |     await page.goto('/A1_room1_page.html');
  97  |     await page.locator('.back-button').click();
  98  |     await page.waitForURL('**/A1_detail.html');
  99  |   });
  100 | });
  101 | 
  102 | test.describe('完整使用流程（跨頁）', () => {
  103 |   test('詳情頁選「家庭套房」→ 訂房頁填資料 → 預訂成功', async ({ page }) => {
  104 |     const dialogs = collectDialogs(page);
  105 | 
  106 |     // 1. 詳情頁：加入願望清單並選房
  107 |     await page.goto('/A1_detail.html');
  108 |     await page.locator('#wishlistBtn').click();
  109 |     await page.locator('button[onclick="showRoomSelection()"]').click();
  110 |     await page.locator('#roomSelectionModal .room-option').nth(2).locator('.select-btn').click();
  111 | 
  112 |     // 2. 訂房頁：確認房型 / 價格
  113 |     await page.waitForURL('**/A1_room1_page.html');
  114 |     await expect(page.locator('#summaryRoomName')).toHaveText('家庭套房');
  115 |     await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 6,057');
  116 | 
  117 |     // 3. 改成 2 晚、改付款方式、填聯絡資料
  118 |     await page.fill('#checkin', '2025-12-10');
  119 |     await page.fill('#checkout', '2025-12-12');
  120 |     await page.locator('#checkout').dispatchEvent('change');
  121 |     await expect(page.locator('#nightsCount')).toHaveText('2 晚');
  122 |     await page.locator(".payment-method[onclick*='applepay']").click();
  123 |     await page.fill('#fullName', '林小華');
  124 |     await page.fill('#email', 'hua@example.com');
  125 |     await page.fill('#phone', '0987654321');
  126 |     await page.click('.btn-book');
  127 | 
  128 |     // 4. 成功
  129 |     await expect(page.locator('#step3')).toHaveClass(/active/);
  130 |     await expect.poll(() => dialogs.length, { timeout: 5_000 }).toBe(1);
  131 |     expect(dialogs[0]).toContain('林小華');
  132 | 
  133 |     // 5. 回詳情頁：願望清單狀態仍在
  134 |     await page.goto('/A1_detail.html');
  135 |     await expect(page.locator('#wishlistBtn')).toContainText('已加入願望清單');
  136 |   });
  137 | });
  138 | 
  139 | test.describe('已知問題（用 test.fail 記錄；修好後 Playwright 會提示「預期失敗卻通過」，屆時移除標記即可）', () => {
  140 |   test('選了家庭套房後修改日期，價格應維持家庭套房的房價', async ({ page }) => {
  141 |     test.fail(true, 'Bug：A1_room1_page.html 在 DOMContentLoaded 結尾就 removeItem(selectedRoomType)，之後 updateNights() 讀不到房型而退回 type1 價格');
  142 |     await page.goto('/A1_detail.html');
  143 |     await page.locator('button[onclick="showRoomSelection()"]').click();
  144 |     await page.locator('#roomSelectionModal .room-option').nth(2).locator('.select-btn').click();
  145 |     await page.waitForURL('**/A1_room1_page.html');
  146 |     await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 6,057');
  147 | 
  148 |     await page.fill('#checkin', '2025-12-10');
  149 |     await page.fill('#checkout', '2025-12-12');
  150 |     await page.locator('#checkout').dispatchEvent('change');
> 151 |     await expect(page.locator('#summaryRoomPrice')).toHaveText('TWD 12,114'); // 6057 × 2
      |                                                     ^ Error: expect(locator).toHaveText(expected) failed
  152 |   });
  153 | });
  154 | 
```