const { AppError } = require("../lib/errors");

const POOLS = { student: "students", teacher: "teachers", admin: "admins" };

function publicUser(role, u) {
  const { password, ...rest } = u;
  return { role, ...rest };
}

function authenticate(data, role, account, password) {
  const pool = POOLS[role];
  if (!pool) throw new AppError(400, "INVALID_ROLE", "角色不正確");
  const user = data[pool].find((u) => u.account === account && u.password === password);
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "帳號或密碼錯誤");
  return publicUser(role, user);
}

function getUser(data, role, id) {
  const pool = POOLS[role];
  const user = pool && data[pool].find((u) => u.id === id);
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "找不到使用者");
  return publicUser(role, user);
}

function changePassword(data, role, id, oldPassword, newPassword) {
  if (typeof newPassword !== "string" || newPassword.length < 4) {
    throw new AppError(400, "WEAK_PASSWORD", "新密碼至少需要 4 碼");
  }
  const user = data[POOLS[role]].find((u) => u.id === id);
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "找不到使用者");
  if (user.password !== oldPassword) throw new AppError(400, "WRONG_PASSWORD", "目前密碼輸入錯誤");
  user.password = newPassword;
}

module.exports = { authenticate, getUser, changePassword, publicUser };
