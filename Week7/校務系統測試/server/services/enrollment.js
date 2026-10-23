const { AppError } = require("../lib/errors");
const { newId } = require("../lib/id");
const { CURRENT_SEMESTER } = require("../lib/constants");
const { findConflict } = require("../lib/scheduling");

function enrolledCount(data, courseId) {
  return data.enrollments.filter((e) => e.courseId === courseId && e.semester === CURRENT_SEMESTER).length;
}

function listEnrollments(data, studentId) {
  return data.enrollments
    .filter((e) => e.studentId === studentId && e.semester === CURRENT_SEMESTER)
    .map((e) => ({ ...e, course: data.courses.find((c) => c.id === e.courseId) }))
    .filter((e) => e.course);
}

/** 加選：依序檢查課程存在、重複選課、名額、衝堂 */
function enroll(data, studentId, courseId) {
  const course = data.courses.find((c) => c.id === courseId && c.semester === CURRENT_SEMESTER);
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "找不到課程");

  const mine = data.enrollments.filter((e) => e.studentId === studentId && e.semester === CURRENT_SEMESTER);
  if (mine.some((e) => e.courseId === courseId)) {
    throw new AppError(409, "ALREADY_ENROLLED", "您已選修此課程");
  }
  if (enrolledCount(data, courseId) >= course.capacity) {
    throw new AppError(409, "COURSE_FULL", "本課程選課人數已額滿");
  }
  const myCourses = mine.map((e) => data.courses.find((c) => c.id === e.courseId)).filter(Boolean);
  if (findConflict(myCourses, course)) {
    throw new AppError(409, "TIME_CONFLICT", "與已選課程時間衝堂");
  }

  const record = { id: newId("E"), studentId, courseId, semester: CURRENT_SEMESTER };
  data.enrollments.push(record);
  return record;
}

/** 退選：只能退自己的選課紀錄 */
function drop(data, studentId, enrollmentId) {
  const idx = data.enrollments.findIndex((e) => e.id === enrollmentId);
  if (idx < 0) throw new AppError(404, "ENROLLMENT_NOT_FOUND", "找不到選課紀錄");
  if (data.enrollments[idx].studentId !== studentId) {
    throw new AppError(403, "FORBIDDEN", "無法退選他人的課程");
  }
  data.enrollments.splice(idx, 1);
}

module.exports = { enroll, drop, listEnrollments, enrolledCount };
