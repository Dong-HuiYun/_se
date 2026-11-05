const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { AppError } = require("./lib/errors");
const { createStore } = require("./lib/store");
const { CURRENT_SEMESTER } = require("./lib/constants");
const authSvc = require("./services/auth");
const enrollSvc = require("./services/enrollment");
const gradeSvc = require("./services/grades");
const catalog = require("./services/catalog");

function createApp(store = createStore()) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  const auth = (...roles) => (req, res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    const session = token && store.sessions.get(token);
    if (!session) return next(new AppError(401, "UNAUTHENTICATED", "請先登入"));
    if (roles.length && !roles.includes(session.role)) return next(new AppError(403, "FORBIDDEN", "權限不足"));
    req.session = session;
    req.token = token;
    next();
  };
  const d = () => store.data;

  app.get("/api/health", (req, res) => res.json({ status: "ok", semester: CURRENT_SEMESTER }));

  /* 帳號 */
  app.post("/api/login", (req, res) => {
    const { role, account, password } = req.body || {};
    const user = authSvc.authenticate(d(), role, account, password);
    const token = crypto.randomUUID();
    store.sessions.set(token, { role, id: user.id });
    res.json({ token, user });
  });
  app.post("/api/logout", auth(), (req, res) => {
    store.sessions.delete(req.token);
    res.status(204).end();
  });
  app.get("/api/me", auth(), (req, res) => res.json(authSvc.getUser(d(), req.session.role, req.session.id)));
  app.post("/api/me/password", auth(), (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    authSvc.changePassword(d(), req.session.role, req.session.id, oldPassword, newPassword);
    res.json({ ok: true });
  });

  /* 課程 */
  app.get("/api/courses", auth(), (req, res) => res.json(catalog.listCourses(d())));
  app.post("/api/courses", auth("admin"), (req, res) => res.status(201).json(catalog.createCourse(d(), req.body || {})));
  app.put("/api/courses/:id", auth("admin"), (req, res) => res.json(catalog.updateCourse(d(), req.params.id, req.body || {})));
  app.delete("/api/courses/:id", auth("admin"), (req, res) => {
    catalog.deleteCourse(d(), req.params.id);
    res.status(204).end();
  });

  /* 學生管理 */
  app.get("/api/students", auth("admin"), (req, res) => res.json(catalog.listStudents(d())));
  app.post("/api/students", auth("admin"), (req, res) => res.status(201).json(catalog.createStudent(d(), req.body || {})));
  app.put("/api/students/:id", auth("admin"), (req, res) => res.json(catalog.updateStudent(d(), req.params.id, req.body || {})));
  app.delete("/api/students/:id", auth("admin"), (req, res) => {
    catalog.deleteStudent(d(), req.params.id);
    res.status(204).end();
  });

  /* 選課 */
  app.get("/api/me/enrollments", auth("student"), (req, res) => res.json(enrollSvc.listEnrollments(d(), req.session.id)));
  app.post("/api/enrollments", auth("student"), (req, res) => {
    res.status(201).json(enrollSvc.enroll(d(), req.session.id, (req.body || {}).courseId));
  });
  app.delete("/api/enrollments/:id", auth("student"), (req, res) => {
    enrollSvc.drop(d(), req.session.id, req.params.id);
    res.status(204).end();
  });

  /* 成績 */
  app.get("/api/me/grades", auth("student"), (req, res) => {
    res.json(gradeSvc.getStudentGrades(d(), req.session.id, req.query.semester || CURRENT_SEMESTER));
  });
  app.get("/api/teacher/courses", auth("teacher"), (req, res) => {
    res.json(catalog.listCourses(d()).filter((c) => c.teacherId === req.session.id));
  });
  app.get("/api/teacher/courses/:id/roster", auth("teacher"), (req, res) => {
    res.json(gradeSvc.getRoster(d(), req.session.id, req.params.id));
  });
  app.put("/api/teacher/courses/:id/grades", auth("teacher"), (req, res) => {
    res.json(gradeSvc.saveGrades(d(), req.session.id, req.params.id, (req.body || {}).grades));
  });

  /* 公告 */
  app.get("/api/announcements", auth(), (req, res) => res.json(catalog.listAnnouncements(d())));
  app.post("/api/announcements", auth("admin", "teacher"), (req, res) => {
    const author = req.session.role === "admin" ? "教務處" : authSvc.getUser(d(), "teacher", req.session.id).name;
    res.status(201).json(catalog.createAnnouncement(d(), author, req.body || {}));
  });
  app.delete("/api/announcements/:id", auth("admin"), (req, res) => {
    catalog.deleteAnnouncement(d(), req.params.id);
    res.status(204).end();
  });

  /* 管理：重設示範資料 */
  app.post("/api/admin/reset", auth("admin"), (req, res) => {
    store.reset();
    res.json({ ok: true });
  });

  app.use("/api", (req, res, next) => next(new AppError(404, "NOT_FOUND", "找不到此 API")));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: { code: "BAD_JSON", message: "JSON 格式錯誤" } });
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "伺服器發生錯誤" } });
  });

  return app;
}

module.exports = { createApp };
