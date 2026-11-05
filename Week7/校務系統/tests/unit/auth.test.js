const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { seedData } = require("../../server/lib/seed");
const { authenticate, getUser, changePassword } = require("../../server/services/auth");

let data;
beforeEach(() => {
  data = seedData();
});

describe("authenticate 登入驗證", () => {
  test("三種角色皆可登入，且回傳不含密碼", () => {
    for (const [role, account] of [["student", "S001"], ["teacher", "T001"], ["admin", "A001"]]) {
      const u = authenticate(data, role, account, "1234");
      assert.equal(u.role, role);
      assert.equal(u.id, account);
      assert.equal("password" in u, false);
    }
  });

  test("密碼錯誤 → INVALID_CREDENTIALS (401)", () => {
    assert.throws(() => authenticate(data, "student", "S001", "wrong"), { code: "INVALID_CREDENTIALS", status: 401 });
  });

  test("帳號不存在 → INVALID_CREDENTIALS (401)", () => {
    assert.throws(() => authenticate(data, "student", "S999", "1234"), { code: "INVALID_CREDENTIALS" });
  });

  test("角色與帳號不符（學生帳號走教師登入）→ 401", () => {
    assert.throws(() => authenticate(data, "teacher", "S001", "1234"), { code: "INVALID_CREDENTIALS" });
  });

  test("未知角色 → INVALID_ROLE (400)", () => {
    assert.throws(() => authenticate(data, "hacker", "S001", "1234"), { code: "INVALID_ROLE", status: 400 });
  });
});

describe("getUser", () => {
  test("找得到 / 找不到", () => {
    assert.equal(getUser(data, "student", "S001").name, "王小明");
    assert.throws(() => getUser(data, "student", "NOPE"), { code: "USER_NOT_FOUND" });
  });
});

describe("changePassword 修改密碼", () => {
  test("成功後可用新密碼登入、舊密碼失效", () => {
    changePassword(data, "student", "S001", "1234", "newpass");
    assert.doesNotThrow(() => authenticate(data, "student", "S001", "newpass"));
    assert.throws(() => authenticate(data, "student", "S001", "1234"), { code: "INVALID_CREDENTIALS" });
  });

  test("舊密碼錯誤 → WRONG_PASSWORD，密碼不變", () => {
    assert.throws(() => changePassword(data, "student", "S001", "bad", "newpass"), { code: "WRONG_PASSWORD" });
    assert.doesNotThrow(() => authenticate(data, "student", "S001", "1234"));
  });

  test("新密碼少於 4 碼 → WEAK_PASSWORD", () => {
    assert.throws(() => changePassword(data, "student", "S001", "1234", "abc"), { code: "WEAK_PASSWORD" });
    assert.throws(() => changePassword(data, "student", "S001", "1234", undefined), { code: "WEAK_PASSWORD" });
  });
});
