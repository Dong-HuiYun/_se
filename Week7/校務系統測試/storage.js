/* ------------------------------------------------------------------ */
/*  資料整併與 LocalStorage 存取控制器                                 */
/* ------------------------------------------------------------------ */

function seedData() {
  return {
    students: SEED_STUDENTS,
    teachers: SEED_TEACHERS,
    admins: SEED_ADMINS,
    courses: SEED_COURSES,
    enrollments: SEED_ENROLLMENTS,
    grades: SEED_GRADES,
    announcements: SEED_ANNOUNCEMENTS,
    applications: SEED_APPLICATIONS,
  };
}

const EAS_STORAGE = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : seedData();
      // 相容舊資料：若舊存檔沒有 applications 欄位，補上空陣列避免頁面出錯
      if (!parsed.applications) parsed.applications = [];
      return parsed;
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
