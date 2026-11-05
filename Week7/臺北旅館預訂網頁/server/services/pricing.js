'use strict';

const { ROOMS_BY_CATEGORY, getHotel, getRooms } = require('./hotels');

// 向下相容：ROOMS 仍代表 A 類（A1_room1_page.html）的房型
const ROOMS = ROOMS_BY_CATEGORY.A;

const SERVICE_FEE_PERCENT = 5; // 服務費 5%
const TAX_PERCENT = 6;         // 稅 6%
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 嚴格解析 YYYY-MM-DD，不合法（含 2025-02-30）回傳 null */
function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const dt = new Date(ms);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return ms;
}

/** 以本地時間格式化成 YYYY-MM-DD */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 計算住宿晚數；日期不合法或退房不晚於入住則丟出 Error */
function nightsBetween(checkin, checkout) {
  const a = parseDate(checkin);
  const b = parseDate(checkout);
  if (a === null) throw new Error('入住日期格式不正確 (YYYY-MM-DD)');
  if (b === null) throw new Error('退房日期格式不正確 (YYYY-MM-DD)');
  if (b <= a) throw new Error('退房日期必須晚於入住日期');
  return Math.round((b - a) / MS_PER_DAY);
}

/** 取得某旅館的房型；旅館或房型不存在回傳 null（預設為 A1，與舊版相容） */
function getRoom(roomType, hotelId = 'A1') {
  const rooms = getRooms(hotelId);
  return rooms && Object.prototype.hasOwnProperty.call(rooms, roomType) ? rooms[roomType] : null;
}

/** 價格試算：房價 + 5% 服務費 + 6% 稅，全部四捨五入為整數 TWD */
function calculateQuote(roomType, checkin, checkout, roomCount = 1, hotelId = 'A1') {
  const hotel = getHotel(hotelId);
  if (!hotel) throw new Error('未知的旅館');
  const room = getRoom(roomType, hotelId);
  if (!room) throw new Error('未知的房型');
  if (!Number.isInteger(roomCount) || roomCount < 1) throw new Error('房間數必須是大於等於 1 的整數');
  const nights = nightsBetween(checkin, checkout);
  const roomTotal = room.basePrice * nights * roomCount;
  const serviceFee = Math.round((roomTotal * SERVICE_FEE_PERCENT) / 100);
  const tax = Math.round((roomTotal * TAX_PERCENT) / 100);
  return {
    hotelId: hotel.id,
    hotelName: hotel.name,
    roomType: room.id,
    roomName: room.name,
    nights,
    rooms: roomCount,
    unitPrice: room.basePrice,
    roomTotal,
    serviceFee,
    tax,
    total: roomTotal + serviceFee + tax,
    currency: 'TWD',
  };
}

module.exports = { ROOMS, SERVICE_FEE_PERCENT, TAX_PERCENT, parseDate, formatDate, nightsBetween, getRoom, calculateQuote };
