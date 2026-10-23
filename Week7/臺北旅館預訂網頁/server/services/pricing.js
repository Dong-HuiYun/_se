'use strict';

// 房型資料（與 A1_room1_page.html 的 roomData 相同）
const ROOMS = {
  type1: { id: 'type1', name: '豪華雙人房', basePrice: 3685, features: '30平方米 · 1張單人床 · 免費Wi-Fi' },
  type2: { id: 'type2', name: '豪華雙床房', basePrice: 3685, features: '30平方米 · 特大雙人床 · 獨立客廳' },
  type3: { id: 'type3', name: '家庭套房', basePrice: 6057, features: '30平方米 · 1張雙人床 · 免費Wi-Fi' },
  type4: { id: 'type4', name: '小型套房', basePrice: 3685, features: '30平方米 · 1張單人床 · 免費Wi-Fi' },
};

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

function getRoom(roomType) {
  return Object.prototype.hasOwnProperty.call(ROOMS, roomType) ? ROOMS[roomType] : null;
}

/** 價格試算：房價 + 5% 服務費 + 6% 稅，全部四捨五入為整數 TWD */
function calculateQuote(roomType, checkin, checkout, roomCount = 1) {
  const room = getRoom(roomType);
  if (!room) throw new Error('未知的房型');
  if (!Number.isInteger(roomCount) || roomCount < 1) throw new Error('房間數必須是大於等於 1 的整數');
  const nights = nightsBetween(checkin, checkout);
  const roomTotal = room.basePrice * nights * roomCount;
  const serviceFee = Math.round((roomTotal * SERVICE_FEE_PERCENT) / 100);
  const tax = Math.round((roomTotal * TAX_PERCENT) / 100);
  return {
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
