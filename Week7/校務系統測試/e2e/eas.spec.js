const { test, expect } = require("@playwright/test");
const { openApp, login, logout, goto, field, toast } = require("./helpers");

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test.describe("登入 / 登出 / 權限", () => {
  test("錯誤密碼 → 顯示錯誤訊息且停留在登入頁", async ({ page }) => {
    await login(page, "student", "S001", "wrong");
    await expect(page.getByText("帳號或密碼錯誤，請重新輸入")).toBeVisible();
    await expect(page.getByRole("button", { name: "登入系統" })).toBeVisible();
  });

  test("學生帳號從教師分頁登入 → 失敗", async ({ page }) => {
    await login(page, "teacher", "S001");
    await expect(page.getByText("帳號或密碼錯誤，請重新輸入")).toBeVisible();
  });

  test("示範帳號按鈕可自動帶入帳密", async ({ page }) => {
    await page.getByRole("button", { name: /王小明（S001 \/ 1234）/ }).click();
    await expect(page.getByPlaceholder("請輸入帳號")).toHaveValue("S001");
    await expect(page.getByPlaceholder("請輸入密碼")).toHaveValue("1234");
  });

  test("學生登入成功 → 首頁問候、選單僅含學生功能；登出後回到登入頁", async ({ page }) => {
    await login(page, "student", "S001");
    await expect(page.getByRole("heading", { name: "您好，王小明 同學" })).toBeVisible();
    await expect(page.getByRole("button", { name: "加退選課" })).toBeVisible();
    await expect(page.getByRole("button", { name: "學生管理" })).toHaveCount(0);
    await logout(page);
  });

  test("管理者登入 → 看得到管理功能與統計數字", async ({ page }) => {
    await login(page, "admin", "A001");
    await expect(page.getByRole("heading", { name: "系統管理總覽" })).toBeVisible();
    for (const m of ["學生管理", "教師管理", "課程管理", "公告管理"]) {
      await expect(page.getByRole("button", { name: m })).toBeVisible();
    }
    await expect(page.getByText("學生人數")).toBeVisible();
  });
});

test.describe("學生：選課 / 課表 / 成績", () => {
  test("加選課程 → 出現在已選課程，學分合計更新，重新整理後仍保留", async ({ page }) => {
    await login(page, "student", "S001");
    await goto(page, "加退選課");
    await expect(page.getByText("目前已選 3 門課，共 8 學分")).toBeVisible();

    await page.getByRole("row", { name: /觀光學概論/ }).getByRole("button", { name: "加選" }).click();
    await toast(page, "已加選「觀光學概論」");
    await expect(page.getByText("目前已選 4 門課，共 10 學分")).toBeVisible();
    await expect(page.getByRole("row", { name: /觀光學概論/ }).getByTitle("刪除")).toBeVisible();

    // 資料持久化：重新整理後再登入仍在
    await page.reload();
    await login(page, "student", "S001");
    await goto(page, "加退選課");
    await expect(page.getByText("目前已選 4 門課，共 10 學分")).toBeVisible();
  });

  test("退選課程（含確認對話框，可取消）", async ({ page }) => {
    await login(page, "student", "S001");
    await goto(page, "加退選課");

    await page.getByRole("row", { name: /資料結構/ }).getByTitle("刪除").click();
    await expect(page.getByText("確定要退選「資料結構」嗎？")).toBeVisible();
    await page.getByRole("button", { name: "取消" }).click();
    await expect(page.getByText("目前已選 3 門課，共 8 學分")).toBeVisible(); // 取消 → 沒變

    await page.getByRole("row", { name: /資料結構/ }).getByTitle("刪除").click();
    await page.getByRole("button", { name: "確定刪除" }).click();
    await toast(page, "已退選「資料結構」");
    await expect(page.getByText("目前已選 2 門課，共 5 學分")).toBeVisible();
  });

  test("搜尋可加選課程", async ({ page }) => {
    await login(page, "student", "S001");
    await goto(page, "加退選課");
    await page.getByPlaceholder("搜尋課程名稱或系所").fill("觀光");
    await expect(page.getByRole("row", { name: /觀光學概論/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /服務業行銷/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /計算機概論/ })).toHaveCount(0);
  });

  test("課表：已選課程顯示在對應星期與節次", async ({ page }) => {
    await login(page, "student", "S001");
    await goto(page, "課表查詢");
    // 每門課佔 2 節，會在格子中出現 2 次 → 用 first() 避免 strict mode 錯誤
    await expect(page.getByText("資料結構").first()).toBeVisible();
    await expect(page.getByText("演算法設計").first()).toBeVisible();
    await expect(page.getByText("金門學導論").first()).toBeVisible();
    await expect(page.getByText("資料結構")).toHaveCount(2);
    // 資料結構：星期一 第3、4節 → 週一欄(第2欄)的第3、4列各出現一次
    const row3 = page.locator("tbody tr").nth(2);
    await expect(row3.locator("td").nth(1)).toContainText("資料結構");
  });

  test("成績查詢：切換學期顯示歷史成績與 GPA；本學期顯示「尚未登錄」", async ({ page }) => {
    await login(page, "student", "S001");
    await goto(page, "成績查詢");
    await expect(page.getByText("尚未登錄").first()).toBeVisible();

    await page.getByRole("combobox").selectOption("114-1");
    await expect(page.getByRole("row", { name: /微積分/ })).toContainText("78");
    await expect(page.getByRole("row", { name: /計算機概論/ })).toContainText("A+");
    await expect(page.getByText("3.79", { exact: true })).toBeVisible(); // 累計 GPA
  });

  test("新生沒有歷史成績 → 顯示空狀態而不是壞掉", async ({ page }) => {
    await login(page, "student", "S003");
    await goto(page, "成績查詢");
    await page.getByRole("combobox").selectOption("114-1");
    await expect(page.getByText("尚無資料")).toBeVisible();
  });

  test("修改密碼 → 以新密碼可登入、舊密碼不行", async ({ page }) => {
    await login(page, "student", "S001");
    await goto(page, "個人資料");
    await page.getByPlaceholder("目前密碼").fill("1234");
    await page.getByPlaceholder("新密碼（至少4碼）").fill("abcd1234");
    await page.getByPlaceholder("確認新密碼").fill("abcd1234");
    await page.getByRole("button", { name: "更新密碼" }).click();
    await toast(page, "密碼已更新");

    await logout(page);
    await login(page, "student", "S001", "1234");
    await expect(page.getByText("帳號或密碼錯誤，請重新輸入")).toBeVisible();
    await login(page, "student", "S001", "abcd1234");
    await expect(page.getByRole("heading", { name: "您好，王小明 同學" })).toBeVisible();
  });

  test("修改密碼：兩次輸入不一致 → 錯誤提示", async ({ page }) => {
    await login(page, "student", "S001");
    await goto(page, "個人資料");
    await page.getByPlaceholder("目前密碼").fill("1234");
    await page.getByPlaceholder("新密碼（至少4碼）").fill("abcd1234");
    await page.getByPlaceholder("確認新密碼").fill("different");
    await page.getByRole("button", { name: "更新密碼" }).click();
    await toast(page, "兩次輸入的新密碼不一致");
  });
});

test.describe("教師：任教課程 / 成績登錄", () => {
  test("任教課程列表只含自己的課", async ({ page }) => {
    await login(page, "teacher", "T001");
    await goto(page, "任教課程");
    await expect(page.getByRole("row", { name: /資料結構/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /演算法設計/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /觀光學概論/ })).toHaveCount(0);
  });

  test("成績超出 0~100 → 不儲存並提示；合法分數儲存後學生可見（跨角色流程）", async ({ page }) => {
    await login(page, "teacher", "T001");
    await goto(page, "成績登錄");
    const scoreInput = page.getByRole("row", { name: /王小明/ }).locator('input[type="number"]');

    await scoreInput.fill("101");
    await page.getByRole("button", { name: "儲存全部成績" }).click();
    await toast(page, "分數需介於 0 至 100 之間，請檢查後再儲存");

    await scoreInput.fill("85");
    await expect(page.getByRole("row", { name: /王小明/ }).getByRole("cell", { name: "A", exact: true })).toBeVisible(); // 即時顯示等第
    await page.getByRole("button", { name: "儲存全部成績" }).click();
    await toast(page, "已儲存 1 筆成績");

    await logout(page);
    await login(page, "student", "S001");
    await goto(page, "成績查詢");
    await expect(page.getByRole("row", { name: /資料結構/ })).toContainText("85");
    await expect(page.getByText("4.00", { exact: true })).toBeVisible(); // 本學期 GPA
  });
});

test.describe("管理者：CRUD", () => {
  test("新增學生 → 搜尋 → 刪除", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "學生管理");
    await page.getByRole("button", { name: "新增學生" }).click();

    await field(page, "學號 / 帳號").fill("S999");
    await field(page, "密碼").fill("1234");
    await field(page, "姓名").fill("測試同學");
    await field(page, "系所").fill("資訊工程學系");
    await field(page, "班級").fill("資工一乙");
    await page.getByRole("button", { name: "儲存", exact: true }).click();
    await toast(page, "已新增學生資料");

    await page.getByPlaceholder("搜尋姓名、學號或系所").fill("S999");
    await expect(page.getByRole("row", { name: /測試同學/ })).toBeVisible();

    await page.getByRole("row", { name: /測試同學/ }).getByTitle("刪除").click();
    await page.getByRole("button", { name: "確定刪除" }).click();
    await toast(page, "已刪除學生資料");
    await expect(page.getByRole("row", { name: /測試同學/ })).toHaveCount(0);
  });

  test("新增學生：學號重複 → 錯誤提示", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "學生管理");
    await page.getByRole("button", { name: "新增學生" }).click();
    await field(page, "學號 / 帳號").fill("S001");
    await field(page, "密碼").fill("1234");
    await field(page, "姓名").fill("重複學號");
    await page.getByRole("button", { name: "儲存", exact: true }).click();
    await toast(page, "此學號已存在");
  });

  test("編輯學生姓名", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "學生管理");
    await page.getByRole("row", { name: /王小明/ }).getByTitle("編輯").click();
    await field(page, "姓名").fill("王大明");
    await page.getByRole("button", { name: "儲存", exact: true }).click();
    await toast(page, "已更新學生資料");
    await expect(page.getByRole("row", { name: /王大明/ })).toBeVisible();
  });

  test("新增課程 → 學生加選時偵測衝堂（跨角色流程）", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "課程管理");
    await page.getByRole("button", { name: "新增課程" }).click();
    await field(page, "課程名稱").fill("衝堂測試課");
    await field(page, "授課教師", "select").selectOption({ index: 1 });
    await field(page, "學分數").fill("2");
    await field(page, "上課星期", "select").selectOption("一");
    await page.locator("form").getByRole("button", { name: "3", exact: true }).click(); // 與資料結構(一 3,4)衝堂
    await page.getByRole("button", { name: "儲存", exact: true }).click();
    await toast(page, "已新增課程");
    await expect(page.getByRole("row", { name: /衝堂測試課/ })).toBeVisible();

    await logout(page);
    await login(page, "student", "S001");
    await goto(page, "加退選課");
    await page.getByPlaceholder("搜尋課程名稱或系所").fill("衝堂測試課");
    await page.getByRole("row", { name: /衝堂測試課/ }).getByRole("button", { name: "加選" }).click();
    await toast(page, "與已選課程時間衝堂，無法加選");
  });

  test("新增課程：未選節次 → 驗證提示", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "課程管理");
    await page.getByRole("button", { name: "新增課程" }).click();
    await field(page, "課程名稱").fill("缺節次");
    await page.getByRole("button", { name: "儲存", exact: true }).click();
    await toast(page, "請完整填寫課程名稱、教師、學分、星期與節次");
  });

  test("課程人數上限調為已選人數 → 其他學生看到額滿且無法加選", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "課程管理");
    await page.getByRole("row", { name: /觀光學概論/ }).getByTitle("編輯").click();
    await field(page, "選課人數上限").fill("1"); // 陳雅婷已選 → 額滿
    await page.getByRole("button", { name: "儲存", exact: true }).click();
    await toast(page, "已更新課程資料");

    await logout(page);
    await login(page, "student", "S001");
    await goto(page, "加退選課");
    const row = page.getByRole("row", { name: /觀光學概論/ });
    await expect(row).toContainText("（額滿）");
    await expect(row.getByRole("button", { name: "加選" })).toBeDisabled();
  });

  test("發布公告 → 學生在校園公告看得到", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "公告管理");
    await page.getByRole("button", { name: "發布公告" }).click();
    await field(page, "標題").fill("E2E 測試公告");
    await field(page, "發布日期").fill("2026-10-23");
    await field(page, "內容", "textarea").fill("這是 E2E 測試建立的公告內容");
    await page.getByRole("button", { name: "儲存", exact: true }).click();
    await toast(page, "公告已發布");

    await logout(page);
    await login(page, "student", "S001");
    await goto(page, "校園公告");
    await expect(page.getByText("E2E 測試公告")).toBeVisible();
    await page.getByText("E2E 測試公告").click(); // 展開內容
    await expect(page.getByText("這是 E2E 測試建立的公告內容")).toBeVisible();
  });

  test("重設示範資料會還原所有變更", async ({ page }) => {
    await login(page, "admin", "A001");
    await goto(page, "學生管理");
    await page.getByRole("row", { name: /李承翰/ }).getByTitle("刪除").click();
    await page.getByRole("button", { name: "確定刪除" }).click();
    await expect(page.getByRole("row", { name: /李承翰/ })).toHaveCount(0);

    await goto(page, "系統總覽");
    await page.getByRole("button", { name: /重設示範資料/ }).click();
    await page.getByRole("button", { name: "確定刪除" }).click();
    await toast(page, "已重設為示範資料");

    await goto(page, "學生管理");
    await expect(page.getByRole("row", { name: /李承翰/ })).toBeVisible();
  });
});
