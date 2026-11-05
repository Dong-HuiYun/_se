/**
 * 系統測試（Web API）：啟動真正的 HTTP server（隨機 port），以 fetch 呼叫 REST API，
 * 驗證「路由 + 驗證/授權 + 業務邏輯 + 回應格式」整體行為。
 */
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../../server/app");
const { createStore } = require("../../server/lib/store");

let server, base, store;

before(async () => {
  store = createStore();
  server = createApp(store).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((r) => server.close(r)));
beforeEach(() => store.reset()); // 每個測試前還原示範資料，彼此獨立

async function api(method, path, { token, body, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined || raw ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function login(role, account, password = "1234") {
  const r = await api("POST", "/api/login", { body: { role, account, password } });
  assert.equal(r.status, 200, "登入應成功");
  return r.body.token;
}

describe("基本與登入", () => {
  test("GET /api/health → 200", async () => {
    const r = await api("GET", "/api/health");
    assert.equal(r.status, 200);
    assert.equal(r.body.status, "ok");
  });

  test("POST /api/login 成功：回傳 token 與不含密碼的 user", async () => {
    const r = await api("POST", "/api/login", { body: { role: "student", account: "S001", password: "1234" } });
    assert.equal(r.status, 200);
    assert.ok(r.body.token);
    assert.equal(r.body.user.name, "王小明");
    assert.equal("password" in r.body.user, false);
  });

  test("POST /api/login 密碼錯誤 → 401 INVALID_CREDENTIALS", async () => {
    const r = await api("POST", "/api/login", { body: { role: "student", account: "S001", password: "x" } });
    assert.equal(r.status, 401);
    assert.equal(r.body.error.code, "INVALID_CREDENTIALS");
  });

  test("POST /api/login 未知角色 → 400；缺欄位 → 400", async () => {
    assert.equal((await api("POST", "/api/login", { body: { role: "x", account: "a", password: "b" } })).status, 400);
    assert.equal((await api("POST", "/api/login", { body: {} })).status, 400);
  });

  test("未帶 token / token 無效 → 401", async () => {
    assert.equal((await api("GET", "/api/courses")).status, 401);
    assert.equal((await api("GET", "/api/courses", { token: "fake" })).status, 401);
  });

  test("登出後 token 失效", async () => {
    const t = await login("student", "S001");
    assert.equal((await api("GET", "/api/me", { token: t })).status, 200);
    assert.equal((await api("POST", "/api/logout", { token: t })).status, 204);
    assert.equal((await api("GET", "/api/me", { token: t })).status, 401);
  });

  test("不存在的 API → 404 JSON；壞掉的 JSON → 400", async () => {
    const r = await api("GET", "/api/nope");
    assert.equal(r.status, 404);
    assert.equal(r.body.error.code, "NOT_FOUND");
    const bad = await api("POST", "/api/login", { raw: "{oops" });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, "BAD_JSON");
  });

  test("修改密碼：舊密碼失效、新密碼可登入", async () => {
    const t = await login("student", "S001");
    const r = await api("POST", "/api/me/password", { token: t, body: { oldPassword: "1234", newPassword: "newpass" } });
    assert.equal(r.status, 200);
    assert.equal((await api("POST", "/api/login", { body: { role: "student", account: "S001", password: "1234" } })).status, 401);
    assert.equal((await api("POST", "/api/login", { body: { role: "student", account: "S001", password: "newpass" } })).status, 200);
  });

  test("修改密碼：舊密碼錯 → 400 WRONG_PASSWORD；太短 → 400 WEAK_PASSWORD", async () => {
    const t = await login("student", "S001");
    const a = await api("POST", "/api/me/password", { token: t, body: { oldPassword: "bad", newPassword: "newpass" } });
    assert.equal(a.body.error.code, "WRONG_PASSWORD");
    const b = await api("POST", "/api/me/password", { token: t, body: { oldPassword: "1234", newPassword: "12" } });
    assert.equal(b.body.error.code, "WEAK_PASSWORD");
  });
});

describe("角色權限（RBAC）", () => {
  test("學生不可新增課程 / 管理學生 → 403", async () => {
    const t = await login("student", "S001");
    assert.equal((await api("POST", "/api/courses", { token: t, body: {} })).status, 403);
    assert.equal((await api("GET", "/api/students", { token: t })).status, 403);
    assert.equal((await api("POST", "/api/admin/reset", { token: t })).status, 403);
  });

  test("教師不可選課、不可刪公告 → 403", async () => {
    const t = await login("teacher", "T001");
    assert.equal((await api("POST", "/api/enrollments", { token: t, body: { courseId: "C003" } })).status, 403);
    assert.equal((await api("DELETE", "/api/announcements/AN001", { token: t })).status, 403);
  });

  test("管理員不可登錄成績 → 403", async () => {
    const t = await login("admin", "A001");
    assert.equal((await api("PUT", "/api/teacher/courses/C001/grades", { token: t, body: { grades: [] } })).status, 403);
  });
});

describe("選課流程", () => {
  test("GET /api/courses 回傳本學期課程，含教師姓名與已選人數", async () => {
    const t = await login("student", "S001");
    const r = await api("GET", "/api/courses", { token: t });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 6);
    const c1 = r.body.find((c) => c.id === "C001");
    assert.equal(c1.teacherName, "林志明");
    assert.equal(c1.enrolledCount, 1);
  });

  test("加選 → 出現在我的選課 → 退選 → 消失（完整往返）", async () => {
    const t = await login("student", "S001");
    const add = await api("POST", "/api/enrollments", { token: t, body: { courseId: "C003" } });
    assert.equal(add.status, 201);

    let mine = await api("GET", "/api/me/enrollments", { token: t });
    assert.equal(mine.body.length, 4);
    assert.ok(mine.body.some((e) => e.course.name === "觀光學概論"));

    assert.equal((await api("DELETE", `/api/enrollments/${add.body.id}`, { token: t })).status, 204);
    mine = await api("GET", "/api/me/enrollments", { token: t });
    assert.equal(mine.body.length, 3);
  });

  test("重複加選 → 409 ALREADY_ENROLLED", async () => {
    const t = await login("student", "S001");
    const r = await api("POST", "/api/enrollments", { token: t, body: { courseId: "C001" } });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "ALREADY_ENROLLED");
  });

  test("課程不存在 → 404", async () => {
    const t = await login("student", "S001");
    assert.equal((await api("POST", "/api/enrollments", { token: t, body: { courseId: "NOPE" } })).status, 404);
  });

  test("額滿 → 409 COURSE_FULL（管理員先把上限調成 1）", async () => {
    const admin = await login("admin", "A001");
    assert.equal((await api("PUT", "/api/courses/C003", { token: admin, body: { capacity: 1 } })).status, 200);
    const t = await login("student", "S001");
    const r = await api("POST", "/api/enrollments", { token: t, body: { courseId: "C003" } });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "COURSE_FULL");
  });

  test("衝堂 → 409 TIME_CONFLICT（管理員新增與 C001 同時段的課）", async () => {
    const admin = await login("admin", "A001");
    const created = await api("POST", "/api/courses", {
      token: admin, body: { name: "衝堂測試", teacherId: "T001", credit: 2, day: "一", periods: [3] },
    });
    assert.equal(created.status, 201);
    const t = await login("student", "S001");
    const r = await api("POST", "/api/enrollments", { token: t, body: { courseId: created.body.id } });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, "TIME_CONFLICT");
  });

  test("退選他人選課紀錄 → 403，退選不存在 → 404", async () => {
    const t = await login("student", "S002");
    assert.equal((await api("DELETE", "/api/enrollments/E001", { token: t })).status, 403);
    assert.equal((await api("DELETE", "/api/enrollments/NOPE", { token: t })).status, 404);
  });
});

describe("成績流程（教師登錄 → 學生查詢）", () => {
  test("教師登錄成績後，學生可查到分數、等第與 GPA", async () => {
    const teacher = await login("teacher", "T001");
    const put = await api("PUT", "/api/teacher/courses/C001/grades", { token: teacher, body: { grades: [{ studentId: "S001", score: 92 }] } });
    assert.equal(put.status, 200);
    assert.deepEqual(put.body, { updated: 1 });

    const student = await login("student", "S001");
    const r = await api("GET", "/api/me/grades", { token: student });
    assert.equal(r.status, 200);
    const row = r.body.rows.find((x) => x.courseName === "資料結構");
    assert.equal(row.score, 92);
    assert.equal(row.grade, "A+");
    assert.equal(r.body.semesterGpa, 4.3);
  });

  test("GET /api/me/grades?semester=114-1 查歷史學期", async () => {
    const t = await login("student", "S001");
    const r = await api("GET", "/api/me/grades?semester=114-1", { token: t });
    assert.equal(r.body.rows.length, 2);
    assert.equal(r.body.cumulativeGpa, 3.79);
  });

  test("教師查詢修課名單；他人課程 → 403", async () => {
    const t1 = await login("teacher", "T001");
    const roster = await api("GET", "/api/teacher/courses/C001/roster", { token: t1 });
    assert.equal(roster.status, 200);
    assert.equal(roster.body[0].name, "王小明");
    const t2 = await login("teacher", "T002");
    assert.equal((await api("GET", "/api/teacher/courses/C001/roster", { token: t2 })).status, 403);
  });

  test("GET /api/teacher/courses 只回傳自己任教的課", async () => {
    const t = await login("teacher", "T001");
    const r = await api("GET", "/api/teacher/courses", { token: t });
    assert.deepEqual(r.body.map((c) => c.id).sort(), ["C001", "C002", "C005"]);
  });

  test("不合法分數 → 400 INVALID_SCORE，且不影響既有資料", async () => {
    const teacher = await login("teacher", "T001");
    const r = await api("PUT", "/api/teacher/courses/C001/grades", { token: teacher, body: { grades: [{ studentId: "S001", score: 101 }] } });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, "INVALID_SCORE");
    const student = await login("student", "S001");
    const g = await api("GET", "/api/me/grades", { token: student });
    assert.equal(g.body.rows.find((x) => x.courseName === "資料結構").score, null);
  });

  test("學生未修該課 → 400 NOT_ENROLLED", async () => {
    const teacher = await login("teacher", "T001");
    const r = await api("PUT", "/api/teacher/courses/C001/grades", { token: teacher, body: { grades: [{ studentId: "S002", score: 80 }] } });
    assert.equal(r.body.error.code, "NOT_ENROLLED");
  });
});

describe("管理員 CRUD", () => {
  test("學生：新增 → 列表可見(不含密碼) → 更新 → 刪除", async () => {
    const t = await login("admin", "A001");
    const created = await api("POST", "/api/students", { token: t, body: { account: "S900", name: "測試同學", password: "abcd", dept: "資訊工程學系", year: 1 } });
    assert.equal(created.status, 201);

    const list = await api("GET", "/api/students", { token: t });
    const found = list.body.find((s) => s.id === "S900");
    assert.equal(found.name, "測試同學");
    assert.equal("password" in found, false);

    const upd = await api("PUT", "/api/students/S900", { token: t, body: { name: "改名同學" } });
    assert.equal(upd.body.name, "改名同學");

    assert.equal((await api("DELETE", "/api/students/S900", { token: t })).status, 204);
    assert.equal((await api("DELETE", "/api/students/S900", { token: t })).status, 404);
  });

  test("新增學生：學號重複 → 409；缺欄位 → 400", async () => {
    const t = await login("admin", "A001");
    assert.equal((await api("POST", "/api/students", { token: t, body: { account: "S001", name: "x", password: "1234" } })).status, 409);
    assert.equal((await api("POST", "/api/students", { token: t, body: { account: "S901" } })).status, 400);
  });

  test("刪除學生會連動移除選課：課程已選人數減少", async () => {
    const t = await login("admin", "A001");
    await api("DELETE", "/api/students/S001", { token: t });
    const courses = await api("GET", "/api/courses", { token: t });
    assert.equal(courses.body.find((c) => c.id === "C001").enrolledCount, 0);
  });

  test("被刪除學生無法再登入", async () => {
    const t = await login("admin", "A001");
    await api("DELETE", "/api/students/S003", { token: t });
    const r = await api("POST", "/api/login", { body: { role: "student", account: "S003", password: "1234" } });
    assert.equal(r.status, 401);
  });

  test("課程：新增 → 修改 → 刪除；不合法資料 → 400", async () => {
    const t = await login("admin", "A001");
    const bad = await api("POST", "/api/courses", { token: t, body: { name: "", teacherId: "T001", credit: 2, day: "一", periods: [1] } });
    assert.equal(bad.status, 400);

    const c = await api("POST", "/api/courses", { token: t, body: { name: "新課", teacherId: "T001", credit: 2, day: "五", periods: [7, 8] } });
    assert.equal(c.status, 201);
    assert.equal(c.body.semester, "115-1");

    const upd = await api("PUT", `/api/courses/${c.body.id}`, { token: t, body: { classroom: "A101" } });
    assert.equal(upd.body.classroom, "A101");

    assert.equal((await api("DELETE", `/api/courses/${c.body.id}`, { token: t })).status, 204);
    assert.equal((await api("PUT", `/api/courses/${c.body.id}`, { token: t, body: {} })).status, 404);
  });

  test("POST /api/admin/reset 還原示範資料", async () => {
    const t = await login("admin", "A001");
    await api("POST", "/api/students", { token: t, body: { account: "S902", name: "暫時", password: "1234" } });
    assert.equal((await api("POST", "/api/admin/reset", { token: t })).status, 200);
    const t2 = await login("admin", "A001"); // reset 會清除 session，需重新登入
    const list = await api("GET", "/api/students", { token: t2 });
    assert.equal(list.body.length, 3);
  });
});

describe("公告", () => {
  const ann = { title: "測試公告", content: "內容", category: "活動", date: "2026-10-23" };

  test("所有登入者可讀，依日期新到舊", async () => {
    const t = await login("student", "S001");
    const r = await api("GET", "/api/announcements", { token: t });
    assert.equal(r.status, 200);
    assert.equal(r.body[0].id, "AN003");
  });

  test("教師可發布（作者為教師姓名），學生不可 → 403", async () => {
    const teacher = await login("teacher", "T001");
    const r = await api("POST", "/api/announcements", { token: teacher, body: ann });
    assert.equal(r.status, 201);
    assert.equal(r.body.author, "林志明");
    const student = await login("student", "S001");
    assert.equal((await api("POST", "/api/announcements", { token: student, body: ann })).status, 403);
  });

  test("管理員發布（作者為教務處）→ 學生看得到，且排在最前面", async () => {
    const admin = await login("admin", "A001");
    const r = await api("POST", "/api/announcements", { token: admin, body: ann });
    assert.equal(r.body.author, "教務處");
    const student = await login("student", "S001");
    const list = await api("GET", "/api/announcements", { token: student });
    assert.equal(list.body[0].title, "測試公告");
  });

  test("日期格式錯誤 → 400；管理員可刪除，再刪 → 404", async () => {
    const admin = await login("admin", "A001");
    assert.equal((await api("POST", "/api/announcements", { token: admin, body: { ...ann, date: "115-1" } })).status, 400);
    assert.equal((await api("DELETE", "/api/announcements/AN001", { token: admin })).status, 204);
    assert.equal((await api("DELETE", "/api/announcements/AN001", { token: admin })).status, 404);
  });
});
