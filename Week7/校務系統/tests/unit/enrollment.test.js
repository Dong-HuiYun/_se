const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { seedData } = require("../../server/lib/seed");
const { enroll, drop, listEnrollments, enrolledCount } = require("../../server/services/enrollment");

let data;
beforeEach(() => {
  data = seedData();
});

describe("enroll 加選", () => {
  test("成功加選：新增選課紀錄並增加課程人數", () => {
    const before = enrolledCount(data, "C003");
    const rec = enroll(data, "S001", "C003"); // 二 1,2，與 S001 現有課程不衝堂
    assert.equal(rec.studentId, "S001");
    assert.equal(rec.courseId, "C003");
    assert.equal(enrolledCount(data, "C003"), before + 1);
    assert.equal(listEnrollments(data, "S001").length, 4);
  });

  test("課程不存在 → COURSE_NOT_FOUND (404)", () => {
    assert.throws(() => enroll(data, "S001", "NOPE"), { code: "COURSE_NOT_FOUND", status: 404 });
  });

  test("重複加選 → ALREADY_ENROLLED (409)", () => {
    assert.throws(() => enroll(data, "S001", "C001"), { code: "ALREADY_ENROLLED", status: 409 });
  });

  test("名額已滿 → COURSE_FULL (409)", () => {
    data.courses.find((c) => c.id === "C003").capacity = 1; // S002 已選，剛好額滿
    assert.throws(() => enroll(data, "S001", "C003"), { code: "COURSE_FULL", status: 409 });
  });

  test("名額剛好還剩 1 個時可加選（邊界）", () => {
    data.courses.find((c) => c.id === "C003").capacity = 2;
    assert.doesNotThrow(() => enroll(data, "S001", "C003"));
  });

  test("時間衝堂 → TIME_CONFLICT (409)", () => {
    data.courses.push({
      id: "CX", name: "衝堂課", teacherId: "T001", credit: 2, dept: "", semester: "115-1",
      capacity: 10, day: "三", periods: [2, 3], classroom: "", targetYear: 0, // S001 的 C006 為 三 1,2
    });
    assert.throws(() => enroll(data, "S001", "CX"), { code: "TIME_CONFLICT", status: 409 });
  });

  test("非本學期課程視為不存在", () => {
    data.courses.push({
      id: "COLD", name: "舊課", teacherId: "T001", credit: 2, dept: "", semester: "114-2",
      capacity: 10, day: "五", periods: [7], classroom: "", targetYear: 0,
    });
    assert.throws(() => enroll(data, "S001", "COLD"), { code: "COURSE_NOT_FOUND" });
  });

  test("失敗時不應寫入任何紀錄", () => {
    const n = data.enrollments.length;
    assert.throws(() => enroll(data, "S001", "C001"));
    assert.equal(data.enrollments.length, n);
  });
});

describe("drop 退選", () => {
  test("成功退選", () => {
    drop(data, "S001", "E001");
    assert.equal(data.enrollments.some((e) => e.id === "E001"), false);
    assert.equal(enrolledCount(data, "C001"), 0);
  });

  test("選課紀錄不存在 → ENROLLMENT_NOT_FOUND (404)", () => {
    assert.throws(() => drop(data, "S001", "NOPE"), { code: "ENROLLMENT_NOT_FOUND", status: 404 });
  });

  test("退選他人的課 → FORBIDDEN (403) 且紀錄保留", () => {
    assert.throws(() => drop(data, "S002", "E001"), { code: "FORBIDDEN", status: 403 });
    assert.equal(data.enrollments.some((e) => e.id === "E001"), true);
  });

  test("退選後可重新加選同一門課", () => {
    drop(data, "S001", "E001");
    assert.doesNotThrow(() => enroll(data, "S001", "C001"));
  });
});
