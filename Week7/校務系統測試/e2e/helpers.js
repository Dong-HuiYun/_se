const { expect } = require("@playwright/test");

const ROLE_TAB = { student: "學生登入", teacher: "教師登入", admin: "管理者登入" };

/** 開啟首頁並等待登入畫面出現 */
async function openApp(page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "國立浯江大學" })).toBeVisible();
}

/** 在登入畫面登入（不會自行 goto，方便登出後再登入另一個角色） */
async function login(page, role, account, password = "1234") {
  await page.getByRole("button", { name: ROLE_TAB[role] }).click();
  await page.getByPlaceholder("請輸入帳號").fill(account);
  await page.getByPlaceholder("請輸入密碼").fill(password);
  await page.getByRole("button", { name: "登入系統" }).click();
}

async function logout(page) {
  await page.getByRole("button", { name: "登出系統" }).click();
  await expect(page.getByRole("button", { name: "登入系統" })).toBeVisible();
}

const goto = (page, menuLabel) => page.getByRole("button", { name: menuLabel }).click();

/** 表單欄位定位：本系統的 <label> 與控制項為相鄰兄弟元素 */
const field = (page, label, tag = "input") => page.locator(`label:has-text("${label}") + ${tag}`);

const toast = (page, text) => expect(page.getByText(text)).toBeVisible();

module.exports = { openApp, login, logout, goto, field, toast };
