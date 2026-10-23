const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { seedData } = require("../../server/lib/seed");
const c = require("../../server/services/catalog");

let data;
beforeEach(() => {
  data = seedData();
});

const validCourse = () => ({ name: "新課程", teacherId: "T001", credit: 2, day: "二", periods: [5, 6], capacity: 30 });

describe("課程管理", () => {
  test("listCourses 附帶教師姓名與已選人數", () => {
    const c001 = c.listCourses(data).find((x) => x.id === "C001");
    assert.equal(c001.teacherName, "林志明");
    assert.equal(c001.enrolledCount, 1);
  });

  test("createCourse 成功，且固定為本學期", () => {
    const course = c.createCourse(data, { ...validCourse(), semester: "100-1" });
    assert.equal(course.semester, "115-1");
    assert.ok(data.courses.some((x) => x.id === course.id));
  });

  const badInputs = {
    "缺課程名稱": { name: "" },
    "教師不存在": { teacherId: "T999" },
    "學分為 0": { credit: 0 },
    "學分為小數": { credit: 2.5 },
    "人數上限為 0": { capacity: 0 },
    "星期不正確": { day: "日" },
    "節次為空": { periods: [] },
    "節次超出範圍": { periods: [9] },
  };
  for (const [label, patch] of Object.entries(badInputs)) {
    test(`createCourse 拒絕：${label}`, () => {
      assert.throws(() => c.createCourse(data, { ...validCourse(), ...patch }), { code: "VALIDATION_ERROR", status: 400 });
    });
  }

  test("updateCourse 成功並保留 id", () => {
    const u = c.updateCourse(data, "C001", { capacity: 99, id: "HACK" });
    assert.equal(u.id, "C001");
    assert.equal(u.capacity, 99);
  });

  test("updateCourse 不存在 → 404；資料不合法 → 400", () => {
    assert.throws(() => c.updateCourse(data, "NOPE", {}), { code: "COURSE_NOT_FOUND" });
    assert.throws(() => c.updateCourse(data, "C001", { credit: -1 }), { code: "VALIDATION_ERROR" });
  });

  test("deleteCourse 連同選課紀錄一併移除", () => {
    c.deleteCourse(data, "C001");
    assert.equal(data.courses.some((x) => x.id === "C001"), false);
    assert.equal(data.enrollments.some((e) => e.courseId === "C001"), false);
  });

  test("deleteCourse 不存在 → 404", () => {
    assert.throws(() => c.deleteCourse(data, "NOPE"), { code: "COURSE_NOT_FOUND" });
  });
});

describe("學生管理", () => {
  test("listStudents 不含密碼", () => {
    assert.ok(c.listStudents(data).every((s) => !("password" in s)));
  });

  test("createStudent 成功且回傳不含密碼", () => {
    const s = c.createStudent(data, { account: "S900", name: "新生", password: "abcd", dept: "資訊工程學系", year: 1 });
    assert.equal(s.id, "S900");
    assert.equal("password" in s, false);
    assert.equal(data.students.length, 4);
  });

  test("學號重複 → DUPLICATE_ACCOUNT (409)", () => {
    assert.throws(() => c.createStudent(data, { account: "S001", name: "x", password: "1234" }), { code: "DUPLICATE_ACCOUNT", status: 409 });
  });

  test("缺必填欄位 / 年級不合法 → 400", () => {
    assert.throws(() => c.createStudent(data, { account: "S900", name: "x" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => c.createStudent(data, { account: "S900", name: "x", password: "1234", year: 5 }), { code: "VALIDATION_ERROR" });
  });

  test("updateStudent 不可更動學號", () => {
    const s = c.updateStudent(data, "S001", { name: "改名", account: "HACK" });
    assert.equal(s.name, "改名");
    assert.equal(s.account, "S001");
  });

  test("deleteStudent 連同選課與成績一併移除", () => {
    c.deleteStudent(data, "S001");
    assert.equal(data.students.some((s) => s.id === "S001"), false);
    assert.equal(data.enrollments.some((e) => e.studentId === "S001"), false);
    assert.equal(data.grades.some((g) => g.studentId === "S001"), false);
  });

  test("updateStudent / deleteStudent 不存在 → 404", () => {
    assert.throws(() => c.updateStudent(data, "NOPE", {}), { code: "STUDENT_NOT_FOUND" });
    assert.throws(() => c.deleteStudent(data, "NOPE"), { code: "STUDENT_NOT_FOUND" });
  });
});

describe("公告管理", () => {
  const input = { title: "標題", content: "內容", category: "活動", date: "2026-10-23" };

  test("listAnnouncements 依日期由新到舊", () => {
    const dates = c.listAnnouncements(data).map((a) => a.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });

  test("createAnnouncement 成功", () => {
    const a = c.createAnnouncement(data, "教務處", input);
    assert.equal(a.author, "教務處");
    assert.equal(c.listAnnouncements(data)[0].id, a.id); // 日期最新 → 排第一
  });

  test("拒絕：缺標題、類別錯誤、日期格式錯誤（例如 '115-1'）", () => {
    assert.throws(() => c.createAnnouncement(data, "x", { ...input, title: "" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => c.createAnnouncement(data, "x", { ...input, category: "亂寫" }), { code: "VALIDATION_ERROR" });
    assert.throws(() => c.createAnnouncement(data, "x", { ...input, date: "115-1" }), { code: "VALIDATION_ERROR" });
  });

  test("deleteAnnouncement 成功 / 不存在 → 404", () => {
    c.deleteAnnouncement(data, "AN001");
    assert.equal(data.announcements.some((a) => a.id === "AN001"), false);
    assert.throws(() => c.deleteAnnouncement(data, "AN001"), { code: "ANNOUNCEMENT_NOT_FOUND" });
  });
});
