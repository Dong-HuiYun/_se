'use strict';

const { parseDate, formatDate, nightsBetween, getRoom, calculateQuote, ROOMS } = require('../../server/services/pricing');

describe('pricing.parseDate', () => {
  test.each(['2025-01-01', '2024-02-29', '2025-12-31'])('合法日期 %s', (d) => {
    expect(parseDate(d)).not.toBeNull();
  });

  test.each([
    '2025-02-30', // 不存在的日期
    '2023-02-29', // 非閏年
    '2025-13-01',
    '2025-1-1',   // 格式不對
    '20250101',
    '',
    null,
    undefined,
    20250101,
  ])('不合法日期 %p 回傳 null', (d) => {
    expect(parseDate(d)).toBeNull();
  });
});

describe('pricing.formatDate', () => {
  test('補零並使用本地時間', () => {
    expect(formatDate(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(formatDate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });
});

describe('pricing.nightsBetween', () => {
  test('一般情況', () => {
    expect(nightsBetween('2025-03-10', '2025-03-11')).toBe(1);
    expect(nightsBetween('2025-03-10', '2025-03-15')).toBe(5);
  });

  test('跨月、跨年、跨閏日', () => {
    expect(nightsBetween('2025-01-30', '2025-02-02')).toBe(3);
    expect(nightsBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(nightsBetween('2024-02-28', '2024-03-01')).toBe(2);
  });

  test('退房 <= 入住 會丟錯（原前端用 Math.abs 會默默接受）', () => {
    expect(() => nightsBetween('2025-03-10', '2025-03-10')).toThrow('退房日期必須晚於入住日期');
    expect(() => nightsBetween('2025-03-10', '2025-03-09')).toThrow('退房日期必須晚於入住日期');
  });

  test('日期格式錯誤會指出是哪一個', () => {
    expect(() => nightsBetween('abc', '2025-03-10')).toThrow('入住日期');
    expect(() => nightsBetween('2025-03-10', 'abc')).toThrow('退房日期');
  });
});

describe('pricing.getRoom', () => {
  test('回傳已知房型', () => {
    expect(getRoom('type3').name).toBe('家庭套房');
    expect(getRoom('type3').basePrice).toBe(6057);
  });

  test('未知房型 / 原型鏈屬性名稱都回傳 null', () => {
    expect(getRoom('type9')).toBeNull();
    expect(getRoom('toString')).toBeNull();
    expect(getRoom('__proto__')).toBeNull();
    expect(getRoom(undefined)).toBeNull();
  });
});

describe('pricing.calculateQuote', () => {
  test('豪華雙人房 2 晚：7370 + 369 + 442 = 8181', () => {
    expect(calculateQuote('type1', '2025-03-10', '2025-03-12')).toEqual({
      roomType: 'type1',
      roomName: '豪華雙人房',
      nights: 2,
      rooms: 1,
      unitPrice: 3685,
      roomTotal: 7370,
      serviceFee: 369, // 368.5 四捨五入
      tax: 442,        // 442.2
      total: 8181,
      currency: 'TWD',
    });
  });

  test('家庭套房 1 晚：6057 + 303 + 363 = 6723', () => {
    const q = calculateQuote('type3', '2025-03-10', '2025-03-11');
    expect([q.roomTotal, q.serviceFee, q.tax, q.total]).toEqual([6057, 303, 363, 6723]);
  });

  test('多房間：價格乘以房間數', () => {
    const q = calculateQuote('type1', '2025-03-10', '2025-03-11', 3);
    expect(q.roomTotal).toBe(3685 * 3);
    expect(q.rooms).toBe(3);
  });

  test('所有金額皆為整數，total = 三項加總（所有房型 × 1~10 晚）', () => {
    for (const id of Object.keys(ROOMS)) {
      for (let n = 1; n <= 10; n++) {
        const out = `2025-04-${String(1 + n).padStart(2, '0')}`;
        const q = calculateQuote(id, '2025-04-01', out);
        [q.roomTotal, q.serviceFee, q.tax, q.total].forEach((v) => expect(Number.isInteger(v)).toBe(true));
        expect(q.total).toBe(q.roomTotal + q.serviceFee + q.tax);
      }
    }
  });

  test.each([
    ['未知房型', ['nope', '2025-03-10', '2025-03-11'], '未知的房型'],
    ['房間數為 0', ['type1', '2025-03-10', '2025-03-11', 0], '房間數'],
    ['房間數為小數', ['type1', '2025-03-10', '2025-03-11', 1.5], '房間數'],
    ['退房早於入住', ['type1', '2025-03-11', '2025-03-10'], '退房日期'],
  ])('%s 會丟錯', (_name, args, msg) => {
    expect(() => calculateQuote(...args)).toThrow(msg);
  });
});
