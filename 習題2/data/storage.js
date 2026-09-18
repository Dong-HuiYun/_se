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