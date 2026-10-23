'use strict';

const { getRoom, parseDate, formatDate, nightsBetween } = require('./pricing');

const PAYMENT_METHODS = ['credit', 'paypal', 'applepay', 'googlepay'];
// 與 A1_detail.html 的 bookingData.pool 相同
const POOL_SLOTS = [
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
  '19:00-20:00',
];
const POOL_UNAVAILABLE_SLOTS = ['14:00-15:00', '16:00-17:00']; // 前端標示為「不可用」的時段
const POOL_MAX_PERSONS = 4;
const MEETING_MAX_HOURS = 8;
const MAX_GUESTS_PER_ROOM = 4;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/** 手機正規化：移除空白與 -，+886 轉為 0；格式需為 09xxxxxxxx，否則回傳 null */
function normalizePhone(phone) {
  if (typeof phone !== 'string') return null;
  let p = phone.replace(/[\s-]/g, '');
  if (p.startsWith('+886')) p = '0' + p.slice(4);
  return /^09\d{8}$/.test(p) ? p : null;
}

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

/** 驗證訂房 payload。回傳 { errors: string[], value } */
function validateBooking(payload, now = new Date()) {
  const errors = [];
  if (!isObject(payload)) return { errors: ['請求內容必須是 JSON 物件'], value: null };

  const room = getRoom(payload.roomType);
  if (!room) errors.push('roomType: 未知的房型');

  let nights = null;
  try {
    nights = nightsBetween(payload.checkin, payload.checkout);
    if (payload.checkin < formatDate(now)) errors.push('checkin: 入住日期不可早於今天');
  } catch (e) {
    errors.push(`dates: ${e.message}`);
  }

  const adults = payload.adults;
  const children = payload.children === undefined ? 0 : payload.children;
  const rooms = payload.rooms === undefined ? 1 : payload.rooms;
  if (!Number.isInteger(adults) || adults < 1) errors.push('adults: 至少需要 1 位成人');
  if (!Number.isInteger(children) || children < 0) errors.push('children: 不可為負數');
  if (!Number.isInteger(rooms) || rooms < 1) errors.push('rooms: 至少需要 1 間房');
  if (Number.isInteger(adults) && Number.isInteger(children) && Number.isInteger(rooms) &&
      adults >= 1 && children >= 0 && rooms >= 1 &&
      adults + children > rooms * MAX_GUESTS_PER_ROOM) {
    errors.push(`guests: 每間房最多 ${MAX_GUESTS_PER_ROOM} 位旅客`);
  }

  if (!isNonEmptyString(payload.fullName)) errors.push('fullName: 請輸入姓名');
  else if (payload.fullName.trim().length > 50) errors.push('fullName: 姓名過長');
  if (!isValidEmail(payload.email)) errors.push('email: 電子郵件格式不正確');
  const phone = normalizePhone(payload.phone);
  if (!phone) errors.push('phone: 手機號碼格式不正確 (09xxxxxxxx)');

  const payment = payload.payment === undefined ? 'credit' : payload.payment;
  if (!PAYMENT_METHODS.includes(payment)) errors.push('payment: 不支援的付款方式');

  const special = payload.specialRequests === undefined ? '' : payload.specialRequests;
  if (typeof special !== 'string' || special.length > 500) errors.push('specialRequests: 必須是 500 字以內的文字');

  if (errors.length) return { errors, value: null };
  return {
    errors,
    value: {
      roomType: room.id,
      checkin: payload.checkin,
      checkout: payload.checkout,
      nights,
      adults,
      children,
      rooms,
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      phone,
      payment,
      specialRequests: special.trim(),
    },
  };
}

/** 驗證設施預約。type: pool | trainer | meeting */
function validateFacilityBooking(payload, now = new Date()) {
  if (!isObject(payload)) return { errors: ['請求內容必須是 JSON 物件'], value: null };
  const errors = [];
  const today = formatDate(now);

  switch (payload.type) {
    case 'pool': {
      if (parseDate(payload.date) === null) errors.push('date: 日期格式不正確');
      else if (payload.date <= today) errors.push('date: 只能預約明天（含）以後的日期');
      if (!POOL_SLOTS.includes(payload.slot)) errors.push('slot: 無效的時段');
      else if (POOL_UNAVAILABLE_SLOTS.includes(payload.slot)) errors.push('slot: 此時段不開放預約');
      if (!Number.isInteger(payload.persons) || payload.persons < 1 || payload.persons > POOL_MAX_PERSONS) {
        errors.push(`persons: 人數需為 1 ~ ${POOL_MAX_PERSONS}`);
      }
      if (payload.notes !== undefined && (typeof payload.notes !== 'string' || payload.notes.length > 300)) {
        errors.push('notes: 必須是 300 字以內的文字');
      }
      if (errors.length) return { errors, value: null };
      return { errors, value: { type: 'pool', date: payload.date, slot: payload.slot, persons: payload.persons, notes: (payload.notes || '').trim() } };
    }
    case 'trainer': {
      if (!isNonEmptyString(payload.courseId) || !/^[\w-]+$/.test(payload.courseId)) errors.push('courseId: 請選擇課程');
      const t = typeof payload.dateTime === 'string' ? Date.parse(payload.dateTime) : NaN;
      if (Number.isNaN(t)) errors.push('dateTime: 時間格式不正確');
      else if (t <= now.getTime()) errors.push('dateTime: 預約時間必須是未來');
      if (errors.length) return { errors, value: null };
      return { errors, value: { type: 'trainer', courseId: payload.courseId, dateTime: new Date(t).toISOString() } };
    }
    case 'meeting': {
      if (!isNonEmptyString(payload.room)) errors.push('room: 請選擇會議室');
      if (!Number.isInteger(payload.hours) || payload.hours < 1 || payload.hours > MEETING_MAX_HOURS) {
        errors.push(`hours: 時長需為 1 ~ ${MEETING_MAX_HOURS} 小時`);
      }
      if (!isNonEmptyString(payload.topic)) errors.push('topic: 請輸入會議主題');
      else if (payload.topic.trim().length > 100) errors.push('topic: 主題過長');
      if (errors.length) return { errors, value: null };
      return { errors, value: { type: 'meeting', room: payload.room.trim(), hours: payload.hours, topic: payload.topic.trim() } };
    }
    default:
      return { errors: ['type: 必須是 pool、trainer 或 meeting'], value: null };
  }
}

module.exports = {
  PAYMENT_METHODS, POOL_SLOTS, POOL_UNAVAILABLE_SLOTS, POOL_MAX_PERSONS, MEETING_MAX_HOURS, MAX_GUESTS_PER_ROOM,
  normalizePhone, isValidEmail, validateBooking, validateFacilityBooking,
};
