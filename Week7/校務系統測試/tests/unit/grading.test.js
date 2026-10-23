const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { scoreToGrade, computeGpa } = require("../../server/lib/grading");

describe("scoreToGrade 分數轉等第（邊界值）", () => {
  const cases = [
    [100, "A+", 4.3], [90, "A+", 4.3],
    [89, "A", 4.0], [85, "A", 4.0],
    [84, "A-", 3.7], [80, "A-", 3.7],
    [79, "B+", 3.3], [77, "B+", 3.3],
    [76, "B", 3.0], [73, "B", 3.0],
    [72, "B-", 2.7], [70, "B-", 2.7],
    [69, "C+", 2.3], [67, "C+", 2.3],
    [66, "C", 2.0], [63, "C", 2.0],
    [62, "C-", 1.7], [60, "C-", 1.7],
    [59, "D", 1.0], [50, "D", 1.0],
    [49, "F", 0], [0, "F", 0],
  ];
  for (const [score, grade, point] of cases) {
    test(`${score} 分 → ${grade} (${point})`, () => {
      assert.deepEqual(scoreToGrade(score), { grade, point });
    });
  }

  test("未登錄 / 非數字 → null", () => {
    assert.equal(scoreToGrade(null), null);
    assert.equal(scoreToGrade(undefined), null);
    assert.equal(scoreToGrade(""), null);
    assert.equal(scoreToGrade("abc"), null);
  });

  test("數字字串也可換算", () => {
    assert.equal(scoreToGrade("85").grade, "A");
  });
});

describe("computeGpa 學分加權 GPA", () => {
  test("單一科目 → 該科績點", () => {
    assert.equal(computeGpa([{ score: 85, credit: 3 }]), 4.0);
  });

  test("多科目依學分加權 (78/4學分 + 90/3學分 → 3.73)", () => {
    // (3.3*4 + 4.3*3) / 7 = 26.1 / 7 = 3.7285...
    assert.equal(computeGpa([{ score: 78, credit: 4 }, { score: 90, credit: 3 }]), 3.73);
  });

  test("王小明歷年成績 → 3.79", () => {
    const records = [
      { score: 78, credit: 4 }, { score: 90, credit: 3 },
      { score: 85, credit: 3 }, { score: 82, credit: 2 },
    ];
    assert.equal(computeGpa(records), 3.79);
  });

  test("未登錄成績不列入計算", () => {
    assert.equal(computeGpa([{ score: 85, credit: 3 }, { score: null, credit: 3 }]), 4.0);
  });

  test("沒有任何成績 → null", () => {
    assert.equal(computeGpa([]), null);
    assert.equal(computeGpa([{ score: null, credit: 3 }]), null);
  });

  test("不及格科目仍計入（績點 0）", () => {
    assert.equal(computeGpa([{ score: 85, credit: 2 }, { score: 40, credit: 2 }]), 2.0);
  });
});
