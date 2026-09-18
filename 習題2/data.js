/* ------------------------------------------------------------------ */
/*  常數、計算函式與持久化儲存                                        */
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

function seedData() {
  return {
    students: [
      { id: "S001", account: "S001", password: "1234", name: "王小明", dept: "資訊工程學系", year: 2, className: "資工二甲" },
      { id: "S002", account: "S002", password: "1234", name: "陳雅婷", dept: "觀光管理學系", year: 3, className: "觀光三甲" },
      { id: "S003", account: "S003", password: "1234", name: "李承翰", dept: "資訊工程學系", year: 1, className: "資工一甲" },
    ],
    teachers: [
      { id: "T001", account: "T001", password: "1234", name: "林志明", dept: "資訊工程學系", title: "教授" },
      { id: "T002", account: "T002", password: "1234", name: "黃淑芬", dept: "觀光管理學系", title: "副教授" },
      { id: "T003", account: "T003", password: "1234", name: "洪建國", dept: "通識教育中心", title: "助理教授" },
    ],
    admins: [{ id: "A001", account: "A001", password: "1234", name: "系統管理員" }],
    courses: [
      { id: "C001", name: "資料結構", teacherId: "T001", credit: 3, dept: "資訊工程學系", semester: CURRENT_SEMESTER, capacity: 5, day: "一", periods: [3, 4], classroom: "資電大樓301", targetYear: 2 },
      { id: "C002", name: "演算法設計", teacherId: "T001", credit: 3, dept: "資訊工程學系", semester: CURRENT_SEMESTER, capacity: 45, day: "三", periods: [5, 6], classroom: "資電大樓302", targetYear: 3 },
      { id: "C003", name: "觀光學概論", teacherId: "T002", credit: 2, dept: "觀光管理學系", semester: CURRENT_SEMESTER, capacity: 60, day: "二", periods: [1, 2], classroom: "管理大樓201", targetYear: 1 },
      { id: "C004", name: "服務業行銷", teacherId: "T002", credit: 3, dept: "觀光管理學系", semester: CURRENT_SEMESTER, capacity: 55, day: "四", periods: [3, 4], classroom: "管理大樓202", targetYear: 3 },
      { id: "C005", name: "計算機概論", teacherId: "T001", credit: 3, dept: "資訊工程學系", semester: CURRENT_SEMESTER, capacity: 60, day: "五", periods: [1, 2], classroom: "資電大樓101", targetYear: 1 },
      { id: "C006", name: "金門學導論", teacherId: "T003", credit: 2, dept: "通識教育中心", semester: CURRENT_SEMESTER, capacity: 80, day: "三", periods: [1, 2], classroom: "通識大樓101", targetYear: 0 },
    ],
    enrollments: [
      { id: "E001", studentId: "S001", courseId: "C001", semester: CURRENT_SEMESTER },
      { id: "E002", studentId: "S001", courseId: "C002", semester: CURRENT_SEMESTER },
      { id: "E003", studentId: "S001", courseId: "C006", semester: CURRENT_SEMESTER },
      { id: "E004", studentId: "S002", courseId: "C003", semester: CURRENT_SEMESTER },
      { id: "E005", studentId: "S002", courseId: "C004", semester: CURRENT_SEMESTER },
      { id: "E006", studentId: "S003", courseId: "C005", semester: CURRENT_SEMESTER },
      { id: "E007", studentId: "S003", courseId: "C006", semester: CURRENT_SEMESTER },
    ],
    grades: [
      { id: "G001", studentId: "S001", semester: "114-1", courseId: null, courseName: "微積分", credit: 4, teacherName: "陳建成", score: 78 },
      { id: "G002", studentId: "S001", semester: "114-1", courseId: null, courseName: "計算機概論", credit: 3, teacherName: "林志明", score: 90 },
      { id: "G003", studentId: "S001", semester: "114-2", courseId: null, courseName: "程式設計", credit: 3, teacherName: "林志明", score: 85 },
      { id: "G004", studentId: "S001", semester: "114-2", courseId: null, courseName: "大學國文", credit: 2, teacherName: "張美玲", score: 82 },
      { id: "G005", studentId: "S002", semester: "114-1", courseId: null, courseName: "行銷學", credit: 3, teacherName: "黃淑芬", score: 88 },
      { id: "G006", studentId: "S002", semester: "114-1", courseId: null, courseName: "大學英文", credit: 2, teacherName: "王雅慧", score: 75 },
      { id: "G007", studentId: "S002", semester: "114-2", courseId: null, courseName: "消費者行為", credit: 3, teacherName: "黃淑芬", score: 91 },
    ],
    announcements: [
      { id: "AN001", title: "115學年度第1學期選課須知", category: "選課", author: "教務處", date: "2026-08-20", content: "各系所選課將於8月25日開放，請同學務必於期限內完成選課，逾期恕不受理加選，加退選作業請至「加退選課」頁面辦理。" },
      { id: "AN002", title: "弱勢助學金申請開始受理", category: "獎學金", author: "學務處", date: "2026-08-28", content: "符合資格之同學請於9月10日前備妥相關文件至生輔組申請，詳情請洽學務處公告欄。" },
      { id: "AN003", title: "期中考試日程公告", category: "教務公告", author: "教務處", date: "2026-09-05", content: "本學期期中考試訂於10月20日至10月24日辦理，請同學留意各科目考試時間與地點安排。" },
    ],
  };
}

const EAS_STORAGE = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : seedData();
    } catch (e) {
      return seedData();
    }
  },
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("本機儲存失敗");
    }
  },
  reset() {
    const seed = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
};

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