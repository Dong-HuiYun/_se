const { AppError } = require("../lib/errors");
const { newId } = require("../lib/id");
const { CURRENT_SEMESTER } = require("../lib/constants");
const { scoreToGrade, computeGpa } = require("../lib/grading");

/** 學生某學期成績列；本學期以選課紀錄為準（尚未登錄者 score 為 null） */
function semesterRows(data, studentId, semester) {
  if (semester === CURRENT_SEMESTER) {
    return data.enrollments
      .filter((e) => e.studentId === studentId && e.semester === semester)
      .map((e) => {
        const course = data.courses.find((c) => c.id === e.courseId);
        const rec = data.grades.find((g) => g.studentId === studentId && g.courseId === e.courseId && g.semester === semester);
        const teacher = course && data.teachers.find((t) => t.id === course.teacherId);
        return {
          id: e.id,
          courseName: course ? course.name : "未知課程",
          credit: course ? course.credit : 0,
          teacherName: teacher ? teacher.name : "",
          score: rec ? rec.score : null,
        };
      });
  }
  return data.grades.filter((g) => g.studentId === studentId && g.semester === semester);
}

function getStudentGrades(data, studentId, semester = CURRENT_SEMESTER) {
  const rows = semesterRows(data, studentId, semester).map((r) => ({
    ...r,
    grade: (scoreToGrade(r.score) || {}).grade || null,
  }));
  const all = data.grades.filter((g) => g.studentId === studentId);
  return {
    semester,
    rows,
    semesterGpa: computeGpa(rows),
    cumulativeGpa: computeGpa(all),
    earnedCredits: all.filter((g) => g.score >= 60).reduce((s, g) => s + g.credit, 0),
  };
}

function ownCourse(data, teacherId, courseId) {
  const course = data.courses.find((c) => c.id === courseId);
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "找不到課程");
  if (course.teacherId !== teacherId) throw new AppError(403, "FORBIDDEN", "只能操作自己任教的課程");
  return course;
}

function getRoster(data, teacherId, courseId) {
  const course = ownCourse(data, teacherId, courseId);
  return data.enrollments
    .filter((e) => e.courseId === course.id && e.semester === CURRENT_SEMESTER)
    .map((e) => {
      const s = data.students.find((x) => x.id === e.studentId);
      const rec = data.grades.find((g) => g.studentId === e.studentId && g.courseId === course.id && g.semester === CURRENT_SEMESTER);
      return s && { studentId: s.id, account: s.account, name: s.name, className: s.className, score: rec ? rec.score : null };
    })
    .filter(Boolean);
}

/** 批次登錄成績：全部驗證通過才寫入（all-or-nothing），已有紀錄則更新 */
function saveGrades(data, teacherId, courseId, entries) {
  const course = ownCourse(data, teacherId, courseId);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new AppError(400, "VALIDATION_ERROR", "請提供成績資料");
  }
  for (const en of entries) {
    if (typeof en.score !== "number" || !Number.isFinite(en.score) || en.score < 0 || en.score > 100) {
      throw new AppError(400, "INVALID_SCORE", "分數需介於 0 至 100 之間");
    }
    const enrolled = data.enrollments.some((e) => e.studentId === en.studentId && e.courseId === course.id && e.semester === CURRENT_SEMESTER);
    if (!enrolled) throw new AppError(400, "NOT_ENROLLED", `學生 ${en.studentId} 未修習此課程`);
  }
  const teacher = data.teachers.find((t) => t.id === teacherId);
  for (const en of entries) {
    const existing = data.grades.find((g) => g.studentId === en.studentId && g.courseId === course.id && g.semester === CURRENT_SEMESTER);
    if (existing) existing.score = en.score;
    else {
      data.grades.push({
        id: newId("G"), studentId: en.studentId, courseId: course.id, semester: CURRENT_SEMESTER,
        courseName: course.name, credit: course.credit, teacherName: teacher ? teacher.name : "", score: en.score,
      });
    }
  }
  return { updated: entries.length };
}

module.exports = { getStudentGrades, getRoster, saveGrades, semesterRows };
