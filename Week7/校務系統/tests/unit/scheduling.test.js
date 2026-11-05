const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { coursesConflict, findConflict } = require("../../server/lib/scheduling");

const mk = (day, periods) => ({ day, periods });

describe("coursesConflict 衝堂判斷", () => {
  test("同一天、節次重疊 → 衝堂", () => {
    assert.equal(coursesConflict(mk("一", [3, 4]), mk("一", [4, 5])), true);
  });
  test("同一天、節次完全相同 → 衝堂", () => {
    assert.equal(coursesConflict(mk("二", [1, 2]), mk("二", [1, 2])), true);
  });
  test("同一天、節次相鄰但不重疊 → 不衝堂", () => {
    assert.equal(coursesConflict(mk("一", [1, 2]), mk("一", [3, 4])), false);
  });
  test("不同天、節次相同 → 不衝堂", () => {
    assert.equal(coursesConflict(mk("一", [3, 4]), mk("二", [3, 4])), false);
  });
});

describe("findConflict", () => {
  const existing = [{ id: "A", ...mk("一", [3, 4]) }, { id: "B", ...mk("三", [1, 2]) }];
  test("回傳衝堂的那一門課", () => {
    assert.equal(findConflict(existing, mk("三", [2, 3])).id, "B");
  });
  test("無衝堂 → undefined", () => {
    assert.equal(findConflict(existing, mk("五", [1])), undefined);
  });
  test("空課表 → undefined", () => {
    assert.equal(findConflict([], mk("一", [1])), undefined);
  });
});
