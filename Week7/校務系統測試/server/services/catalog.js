const { AppError } = require("../lib/errors");
const { newId } = require("../lib/id");
const { CURRENT_SEMESTER, DAYS, PERIODS, ANNOUNCEMENT_CATEGORIES } = require("../lib/constants");
const { enrolledCount } = require("./enrollment");

function invalid(msg) {
  return new AppError(400, "VALIDATION_ERROR", msg);
}

/* ---------------- 課程 ---------------- */
function validateCourse(data, c) {
  if (typeof c.name !== "string" || !c.name.trim()) throw invalid("課程名稱必填");
  if (!data.teachers.some((t) => t.id === c.teacherId)) throw invalid("授課教師不存在");
  if (!Number.isInteger(c.credit) || c.credit < 1 || c.credit > 10) throw invalid("學分數需為 1~10 的整數");
  if (!Number.isInteger(c.capacity) || c.capacity < 1) throw invalid("人數上限需為正整數");
  if (!DAYS.includes(c.day)) throw invalid("上課星期不正確");
  if (!Array.isArray(c.periods) || c.periods.length === 0 || !c.periods.every((p) => PERIODS.includes(p))) {
    throw invalid("上課節次不正確");
  }
}

function listCourses(data) {
  return data.courses
    .filter((c) => c.semester === CURRENT_SEMESTER)
    .map((c) => {
      const t = data.teachers.find((x) => x.id === c.teacherId);
      return { ...c, teacherName: t ? t.name : "", enrolledCount: enrolledCount(data, c.id) };
    });
}

function createCourse(data, input) {
  const course = {
    id: newId("C"), semester: CURRENT_SEMESTER, dept: "", classroom: "", targetYear: 0, capacity: 50, ...input,
  };
  course.semester = CURRENT_SEMESTER;
  validateCourse(data, course);
  data.courses.push(course);
  return course;
}

function updateCourse(data, id, input) {
  const idx = data.courses.findIndex((c) => c.id === id);
  if (idx < 0) throw new AppError(404, "COURSE_NOT_FOUND", "找不到課程");
  const merged = { ...data.courses[idx], ...input, id, semester: data.courses[idx].semester };
  validateCourse(data, merged);
  data.courses[idx] = merged;
  return merged;
}

function deleteCourse(data, id) {
  if (!data.courses.some((c) => c.id === id)) throw new AppError(404, "COURSE_NOT_FOUND", "找不到課程");
  data.courses = data.courses.filter((c) => c.id !== id);
  data.enrollments = data.enrollments.filter((e) => e.courseId !== id);
}

/* ---------------- 學生 ---------------- */
const strip = (s) => {
  const { password, ...rest } = s;
  return rest;
};

function listStudents(data) {
  return data.students.map(strip);
}

function createStudent(data, input) {
  if (!input.account || !input.name || !input.password) throw invalid("學號、姓名與密碼必填");
  if (data.students.some((s) => s.account === input.account)) {
    throw new AppError(409, "DUPLICATE_ACCOUNT", "此學號已存在");
  }
  const year = input.year === undefined ? 1 : input.year;
  if (!Number.isInteger(year) || year < 1 || year > 4) throw invalid("年級需為 1~4");
  const student = {
    id: input.account, account: input.account, password: input.password, name: input.name,
    dept: input.dept || "", year, className: input.className || "",
  };
  data.students.push(student);
  return strip(student);
}

function updateStudent(data, id, input) {
  const s = data.students.find((x) => x.id === id);
  if (!s) throw new AppError(404, "STUDENT_NOT_FOUND", "找不到學生");
  if (input.year !== undefined && (!Number.isInteger(input.year) || input.year < 1 || input.year > 4)) {
    throw invalid("年級需為 1~4");
  }
  for (const k of ["name", "dept", "year", "className", "password"]) {
    if (input[k] !== undefined) s[k] = input[k];
  }
  return strip(s);
}

/** 刪除學生時連同選課與成績紀錄一併移除 */
function deleteStudent(data, id) {
  if (!data.students.some((s) => s.id === id)) throw new AppError(404, "STUDENT_NOT_FOUND", "找不到學生");
  data.students = data.students.filter((s) => s.id !== id);
  data.enrollments = data.enrollments.filter((e) => e.studentId !== id);
  data.grades = data.grades.filter((g) => g.studentId !== id);
}

/* ---------------- 公告 ---------------- */
function listAnnouncements(data) {
  return [...data.announcements].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function createAnnouncement(data, author, input) {
  if (!input.title || !input.content) throw invalid("標題與內容必填");
  if (!ANNOUNCEMENT_CATEGORIES.includes(input.category)) throw invalid("公告類別不正確");
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw invalid("日期格式需為 YYYY-MM-DD");
  const rec = { id: newId("AN"), title: input.title, category: input.category, date: input.date, content: input.content, author };
  data.announcements.push(rec);
  return rec;
}

function deleteAnnouncement(data, id) {
  if (!data.announcements.some((a) => a.id === id)) throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "找不到公告");
  data.announcements = data.announcements.filter((a) => a.id !== id);
}

module.exports = {
  validateCourse, listCourses, createCourse, updateCourse, deleteCourse,
  listStudents, createStudent, updateStudent, deleteStudent,
  listAnnouncements, createAnnouncement, deleteAnnouncement,
};
