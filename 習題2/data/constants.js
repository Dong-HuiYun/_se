/* ------------------------------------------------------------------ */
/*  系統共用常數與計算函式                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "wju-eas-data-v1";
const CURRENT_SEMESTER = "115-1";
const SEMESTERS = ["114-1", "114-2", "115-1"];
const DAYS = ["一", "二", "三", "四", "五"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const YEAR_OPTIONS = [
  { value: 0, label: "不限年級" },
  { value: 1, label: "一年級" },
  { value: 2, label: "二年級" },
  { value: 3, label: "三年級" },
  { value: 4, label: "四年級" },
];
const ANNOUNCEMENT_CATEGORIES = ["教務公告", "選課", "獎學金", "活動", "系所公告"];

function scoreToGrade(score) {
  if (score === null || score === undefined || score === "") return null;
  const s = Number(score);
  if (s >= 90) return { grade: "A+", point: 4.3 };
  if (s >= 85) return { grade: "A", point: 4.0 };
  if (s >= 80) return { grade: "A-", point: 3.7 };
  if (s >= 77) return { grade: "B+", point: 3.3 };
  if (s >= 73) return { grade: "B", point: 3.0 };
  if (s >= 70) return { grade: "B-", point: 2.7 };
  if (s >= 67) return { grade: "C+", point: 2.3 };
  if (s >= 63) return { grade: "C", point: 2.0 };
  if (s >= 60) return { grade: "C-", point: 1.7 };
  if (s >= 50) return { grade: "D", point: 1.0 };
  return { grade: "F", point: 0 };
}

function computeGpa(records) {
  const graded = records.filter((r) => r.score !== null && r.score !== undefined && r.score !== "");
  if (graded.length === 0) return null;
  let points = 0, credits = 0;
  graded.forEach((r) => {
    const g = scoreToGrade(r.score);
    points += g.point * r.credit;
    credits += r.credit;
  });
  return credits ? (points / credits).toFixed(2) : null;
}

function periodsLabel(periods) {
  return (periods || []).join(",");
}

function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1000);
}