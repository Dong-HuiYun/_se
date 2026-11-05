const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { seedData } = require("../../server/lib/seed");
const { getStudentGrades, getRoster, saveGrades } = require("../../server/services/grades");

let data;
beforeEach(() => {
  data = seedData();
});

describe("getStudentGrades 學生成績查詢", () => {
  test("歷史學期：回傳成績、等第與學期 GPA", () => {
    const r = getStudentGrades(data, "S001", "114-1");
    assert.equal(r.rows.length, 2);
    assert.equal(r.rows.find((x) => x.courseName === "計算機概論").grade, "A+");
    assert.equal(r.semesterGpa, 3.73);
  });

  test("累計 GPA 與已修得學分", () => {
    const r = getStudentGrades(data, "S001", "114-1");
    assert.equal(r.cumulativeGpa, 3.79);
    assert.equal(r.earnedCredits, 12);
  });

  test("本學期：以選課為準，尚未登錄者 score 為 null、GPA 為 null", () => {
    const r = getStudentGrades(data, "S001"); // 預設本學期
    assert.equal(r.rows.length, 3);
    assert.ok(r.rows.every((x) => x.score === null && x.grade === null));
    assert.equal(r.semesterGpa, null);
  });

  test("沒有任何成績的新生 → 累計 GPA 為 null、學分 0", () => {
    const r = getStudentGrades(data, "S003", "114-1");
    assert.deepEqual(r.rows, []);
    assert.equal(r.cumulativeGpa, null);
    assert.equal(r.earnedCredits, 0);
  });

  test("不及格科目不計入已修得學分", () => {
    data.grades.push({ id: "GF", studentId: "S003", semester: "114-1", courseId: null, courseName: "被當", credit: 3, teacherName: "", score: 45 });
    assert.equal(getStudentGrades(data, "S003", "114-1").earnedCredits, 0);
  });
});

describe("getRoster 修課名單", () => {
  test("回傳該課程修課學生", () => {
    const roster = getRoster(data, "T001", "C001");
    assert.deepEqual(roster.map((r) => r.studentId), ["S001"]);
    assert.equal(roster[0].score, null);
  });
  test("非自己任教的課程 → FORBIDDEN", () => {
    assert.throws(() => getRoster(data, "T002", "C001"), { code: "FORBIDDEN", status: 403 });
  });
  test("課程不存在 → COURSE_NOT_FOUND", () => {
    assert.throws(() => getRoster(data, "T001", "NOPE"), { code: "COURSE_NOT_FOUND", status: 404 });
  });
});

describe("saveGrades 成績登錄", () => {
  test("首次登錄：新增成績紀錄，學生立即可查", () => {
    assert.deepEqual(saveGrades(data, "T001", "C001", [{ studentId: "S001", score: 85 }]), { updated: 1 });
    const row = getStudentGrades(data, "S001").rows.find((r) => r.courseName === "資料結構");
    assert.equal(row.score, 85);
    assert.equal(row.grade, "A");
  });

  test("再次登錄：更新而非重複新增", () => {
    saveGrades(data, "T001", "C001", [{ studentId: "S001", score: 70 }]);
    saveGrades(data, "T001", "C001", [{ studentId: "S001", score: 90 }]);
    const recs = data.grades.filter((g) => g.courseId === "C001" && g.studentId === "S001");
    assert.equal(recs.length, 1);
    assert.equal(recs[0].score, 90);
  });

  test("邊界分數 0 與 100 可接受", () => {
    assert.doesNotThrow(() => saveGrades(data, "T001", "C001", [{ studentId: "S001", score: 0 }]));
    assert.doesNotThrow(() => saveGrades(data, "T001", "C001", [{ studentId: "S001", score: 100 }]));
  });

  for (const bad of [-1, 101, NaN, "85", null, undefined]) {
    test(`不合法分數 ${String(bad)} → INVALID_SCORE (400)`, () => {
      assert.throws(() => saveGrades(data, "T001", "C001", [{ studentId: "S001", score: bad }]), { code: "INVALID_SCORE", status: 400 });
    });
  }

  test("非自己任教的課程 → FORBIDDEN (403)", () => {
    assert.throws(() => saveGrades(data, "T002", "C001", [{ studentId: "S001", score: 80 }]), { code: "FORBIDDEN", status: 403 });
  });

  test("學生未修該課 → NOT_ENROLLED (400)", () => {
    assert.throws(() => saveGrades(data, "T001", "C001", [{ studentId: "S002", score: 80 }]), { code: "NOT_ENROLLED", status: 400 });
  });

  test("空陣列 → VALIDATION_ERROR", () => {
    assert.throws(() => saveGrades(data, "T001", "C001", []), { code: "VALIDATION_ERROR" });
    assert.throws(() => saveGrades(data, "T001", "C001", undefined), { code: "VALIDATION_ERROR" });
  });

  test("批次中有一筆不合法 → 全部不寫入（all-or-nothing）", () => {
    data.enrollments.push({ id: "EX", studentId: "S003", courseId: "C001", semester: "115-1" });
    assert.throws(() => saveGrades(data, "T001", "C001", [
      { studentId: "S001", score: 80 }, { studentId: "S003", score: 999 },
    ]), { code: "INVALID_SCORE" });
    assert.equal(data.grades.some((g) => g.courseId === "C001"), false);
  });
});
