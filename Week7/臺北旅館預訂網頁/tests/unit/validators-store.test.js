'use strict';

const {
  normalizePhone, isValidEmail, validateBooking, validateFacilityBooking,
  POOL_SLOTS, POOL_UNAVAILABLE_SLOTS, POOL_MAX_PERSONS, MAX_GUESTS_PER_ROOM,
} = require('../../server/services/validators');
const { createStore, POOL_SLOT_CAPACITY } = require('../../server/store');

const NOW = new Date(2025, 5, 10, 12, 0, 0); // 2025-06-10 12:00（本地時間）

const validBooking = (over = {}) => ({
  roomType: 'type1',
  checkin: '2025-06-15',
  checkout: '2025-06-17',
  adults: 2,
  children: 0,
  rooms: 1,
  fullName: '王小明',
  email: 'ming@example.com',
  phone: '0912-345-678',
  payment: 'credit',
  ...over,
});

describe('normalizePhone / isValidEmail', () => {
  test.each([
    ['0912345678', '0912345678'],
    ['0912-345-678', '0912345678'],
    ['0912 345 678', '0912345678'],
    ['+886912345678', '0912345678'],
    ['+886-912-345-678', '0912345678'],
  ])('%s → %s', (input, out) => expect(normalizePhone(input)).toBe(out));

  test.each(['0212345678', '091234567', '09123456789', 'abc', '', null, 912345678])('不合法 %p', (v) => {
    expect(normalizePhone(v)).toBeNull();
  });

  test('email', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail(' a@b.co ')).toBe(true);
    ['a@b', 'a b@c.com', '@b.com', 'a@.com', '', null, 5].forEach((v) => expect(isValidEmail(v)).toBe(false));
  });
});

describe('validateBooking', () => {
  test('合法資料：正規化手機、補上預設值', () => {
    const { errors, value } = validateBooking(validBooking({ children: undefined, rooms: undefined, payment: undefined }), NOW);
    expect(errors).toEqual([]);
    expect(value).toMatchObject({ phone: '0912345678', nights: 2, children: 0, rooms: 1, payment: 'credit', specialRequests: '' });
  });

  test('姓名會 trim', () => {
    expect(validateBooking(validBooking({ fullName: '  王小明  ' }), NOW).value.fullName).toBe('王小明');
  });

  test('今天入住是允許的，昨天不行', () => {
    expect(validateBooking(validBooking({ checkin: '2025-06-10', checkout: '2025-06-11' }), NOW).errors).toEqual([]);
    const r = validateBooking(validBooking({ checkin: '2025-06-09', checkout: '2025-06-11' }), NOW);
    expect(r.errors.join()).toContain('不可早於今天');
  });

  test.each([
    ['未知房型', { roomType: 'x' }, 'roomType'],
    ['退房早於入住', { checkin: '2025-06-17', checkout: '2025-06-15' }, 'dates'],
    ['日期格式錯', { checkin: '6/15' }, 'dates'],
    ['成人 0', { adults: 0 }, 'adults'],
    ['成人是字串', { adults: '2' }, 'adults'],
    ['小孩為負', { children: -1 }, 'children'],
    ['房間 0', { rooms: 0 }, 'rooms'],
    ['姓名空白', { fullName: '   ' }, 'fullName'],
    ['姓名太長', { fullName: 'a'.repeat(51) }, 'fullName'],
    ['email 錯', { email: 'nope' }, 'email'],
    ['手機錯', { phone: '123' }, 'phone'],
    ['付款方式不支援', { payment: 'bitcoin' }, 'payment'],
    ['備註太長', { specialRequests: 'x'.repeat(501) }, 'specialRequests'],
    ['備註不是字串', { specialRequests: 5 }, 'specialRequests'],
  ])('%s → 錯誤欄位 %s', (_n, over, field) => {
    const { errors, value } = validateBooking(validBooking(over), NOW);
    expect(value).toBeNull();
    expect(errors.some((e) => e.startsWith(field))).toBe(true);
  });

  test('每間房人數上限', () => {
    expect(validateBooking(validBooking({ adults: MAX_GUESTS_PER_ROOM, children: 0 }), NOW).errors).toEqual([]);
    expect(validateBooking(validBooking({ adults: 3, children: 2 }), NOW).errors.join()).toContain('guests');
    expect(validateBooking(validBooking({ adults: 3, children: 2, rooms: 2 }), NOW).errors).toEqual([]);
  });

  test('一次回報多個錯誤', () => {
    const { errors } = validateBooking({}, NOW);
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });

  test.each([[null], [undefined], ['str'], [[]]])('非物件 body %p', (body) => {
    expect(validateBooking(body, NOW).errors).toEqual(['請求內容必須是 JSON 物件']);
  });
});

describe('validateFacilityBooking', () => {
  test('游泳池：合法', () => {
    const r = validateFacilityBooking({ type: 'pool', date: '2025-06-11', slot: POOL_SLOTS[0], persons: 2, notes: ' 嬰兒泳圈 ' }, NOW);
    expect(r.errors).toEqual([]);
    expect(r.value).toEqual({ type: 'pool', date: '2025-06-11', slot: POOL_SLOTS[0], persons: 2, notes: '嬰兒泳圈' });
  });

  test.each([
    ['今天（需明天以後）', { date: '2025-06-10' }, 'date'],
    ['過去', { date: '2025-06-01' }, 'date'],
    ['格式錯', { date: 'tomorrow' }, 'date'],
    ['無效時段', { slot: '03:00-04:00' }, 'slot'],
    ['不開放的時段（前端標示不可用）', { slot: POOL_UNAVAILABLE_SLOTS[0] }, 'slot'],
    ['人數 0', { persons: 0 }, 'persons'],
    ['人數超過上限', { persons: POOL_MAX_PERSONS + 1 }, 'persons'],
    ['人數非整數', { persons: 1.5 }, 'persons'],
    ['備註過長', { notes: 'x'.repeat(301) }, 'notes'],
  ])('游泳池：%s', (_n, over, field) => {
    const body = { type: 'pool', date: '2025-06-11', slot: POOL_SLOTS[0], persons: 2, ...over };
    const { errors, value } = validateFacilityBooking(body, NOW);
    expect(value).toBeNull();
    expect(errors.some((e) => e.startsWith(field))).toBe(true);
  });

  test('健身教練：合法並轉成 ISO 字串', () => {
    const r = validateFacilityBooking({ type: 'trainer', courseId: 'yoga-1', dateTime: '2025-06-12T10:00:00Z' }, NOW);
    expect(r.errors).toEqual([]);
    expect(r.value.dateTime).toBe('2025-06-12T10:00:00.000Z');
  });

  test.each([
    ['沒選課程', { courseId: '' }],
    ['課程 id 含特殊字元', { courseId: '../x' }],
    ['時間格式錯', { dateTime: 'soon' }],
    ['時間在過去', { dateTime: '2025-06-01T10:00:00Z' }],
    ['時間不是字串', { dateTime: 123 }],
  ])('健身教練：%s', (_n, over) => {
    const body = { type: 'trainer', courseId: 'yoga-1', dateTime: '2025-06-12T10:00:00Z', ...over };
    expect(validateFacilityBooking(body, NOW).errors.length).toBeGreaterThan(0);
  });

  test('會議室：合法與錯誤', () => {
    const ok = validateFacilityBooking({ type: 'meeting', room: 'A', hours: 2, topic: ' 週會 ' }, NOW);
    expect(ok.value).toEqual({ type: 'meeting', room: 'A', hours: 2, topic: '週會' });
    [{ room: '' }, { hours: 0 }, { hours: 9 }, { hours: 1.5 }, { topic: '' }, { topic: 'x'.repeat(101) }].forEach((over) => {
      const r = validateFacilityBooking({ type: 'meeting', room: 'A', hours: 2, topic: 't', ...over }, NOW);
      expect(r.errors.length).toBeGreaterThan(0);
    });
  });

  test('未知 type 與非物件', () => {
    expect(validateFacilityBooking({ type: 'spa' }, NOW).errors[0]).toContain('type');
    expect(validateFacilityBooking(null, NOW).errors).toEqual(['請求內容必須是 JSON 物件']);
  });
});

describe('store', () => {
  let store;
  beforeEach(() => { store = createStore(); });

  test('訂單 id 遞增、可查詢、可取消（取消為冪等）', () => {
    const a = store.addBooking({ roomType: 'type1' }, { total: 1 }, NOW);
    const b = store.addBooking({ roomType: 'type2' }, { total: 2 }, NOW);
    expect([a.id, b.id]).toEqual(['BK-0001', 'BK-0002']);
    expect(a.status).toBe('confirmed');
    expect(store.getBooking('BK-0001')).toBe(a);
    expect(store.getBooking('BK-9999')).toBeNull();
    expect(store.listBookings()).toHaveLength(2);
    expect(store.cancelBooking('BK-0001').status).toBe('cancelled');
    expect(store.cancelBooking('BK-0001').status).toBe('cancelled');
    expect(store.cancelBooking('BK-9999')).toBeNull();
  });

  test('願望清單', () => {
    expect(store.isHotelKnown('A1')).toBe(true);
    expect(store.isHotelKnown('Z9')).toBe(false);
    expect(store.addWishlist('A1')).toBe(true);
    expect(store.addWishlist('A1')).toBe(false); // 重複加入
    expect(store.listWishlist()).toEqual(['A1']);
    expect(store.removeWishlist('A1')).toBe(true);
    expect(store.removeWishlist('A1')).toBe(false);
  });

  test('游泳池時段容量限制，不同時段 / 日期互不影響', () => {
    const pool = (persons, slot = POOL_SLOTS[0], date = '2025-06-11') => ({ type: 'pool', date, slot, persons });
    expect(store.addFacilityBooking(pool(POOL_SLOT_CAPACITY), NOW).conflict).toBe(false);
    expect(store.poolOccupancy('2025-06-11', POOL_SLOTS[0])).toBe(POOL_SLOT_CAPACITY);
    expect(store.addFacilityBooking(pool(1), NOW).conflict).toBe(true);
    expect(store.addFacilityBooking(pool(1, POOL_SLOTS[1]), NOW).conflict).toBe(false);
    expect(store.addFacilityBooking(pool(1, POOL_SLOTS[0], '2025-06-12'), NOW).conflict).toBe(false);
  });

  test('非游泳池預約不受容量限制', () => {
    const r = store.addFacilityBooking({ type: 'meeting', room: 'A', hours: 2, topic: 't' }, NOW);
    expect(r.record.id).toBe('FB-0001');
    expect(store.listFacilityBookings()).toHaveLength(1);
  });

  test('reset 清空一切並重置流水號', () => {
    store.addBooking({}, {}, NOW);
    store.addWishlist('A1');
    store.addFacilityBooking({ type: 'meeting' }, NOW);
    store.reset();
    expect(store.listBookings()).toEqual([]);
    expect(store.listWishlist()).toEqual([]);
    expect(store.listFacilityBookings()).toEqual([]);
    expect(store.addBooking({}, {}, NOW).id).toBe('BK-0001');
  });
});
