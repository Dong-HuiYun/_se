'use strict';

const { classify } = require('../../server/services/classifier');
const { getReply, RULES, FALLBACK } = require('../../server/services/chat');

describe('classifier.classify', () => {
  // 這 9 句就是 index.html 裡面的 voiceInputs
  test.each([
    ['我想要有科技感的住宿體驗，像是VR看房和AI助理', 'A'],
    ['我需要智能化的房間控制系統和現代化的設施', 'A'],
    ['我偏好高科技的飯店，要有自動化服務', 'A'],
    ['我重視服務品質，希望有完整的設施和舒適的環境', 'B'],
    ['我想要豪華的住宿體驗，設施要齊全', 'B'],
    ['CP值要高，服務要好，設施要完整', 'B'],
    ['價格要便宜，最好有折扣和優惠', 'C'],
    ['我想要經濟實惠的選擇，省錢最重要', 'C'],
  ])('「%s」→ %s', (text, expected) => {
    const r = classify(text);
    expect(r.type).toBe(expected);
    expect(r.matched).toBe(true);
  });

  test('標籤正確', () => {
    expect(classify('科技').label).toBe('科技愛好者');
    expect(classify('品質').label).toBe('高CP值追求者');
    expect(classify('便宜').label).toBe('價格敏感者');
  });

  test('關鍵字大小寫不分（ai / AI / vr / cp值）', () => {
    expect(classify('ai').type).toBe('A');
    expect(classify('Vr').type).toBe('A');
    expect(classify('cp值').type).toBe('B');
  });

  test('同時符合多類時 A > B > C（與原前端 if/else 順序相同）', () => {
    expect(classify('科技又便宜').type).toBe('A');
    expect(classify('服務好價格低').type).toBe('B');
  });

  test('回傳命中的關鍵字', () => {
    expect(classify('我要省錢').keyword).toBe('省錢');
  });

  test('預算有限，希望找到划算的住宿 → 無關鍵字（前端會隨機分配）', () => {
    expect(classify('預算有限，希望找到划算的住宿')).toEqual({ type: null, label: null, matched: false });
  });

  test.each([[''], ['   '], [null], [undefined], [123], [{}]])('非法輸入 %p 回傳 matched:false', (v) => {
    expect(classify(v).matched).toBe(false);
  });
});

describe('chat.getReply', () => {
  test.each([
    ['請問價格多少', '3,685'],
    ['這裡多少錢', '3,685'],
    ['有什麼設施', '游泳池'],
    ['地址在哪', '艋舺大道167號'],
    ['有早餐嗎', '6:30'],
    ['有折扣嗎', '85折'],
    ['可以停車嗎', '免費停車'],
    ['有 WiFi 嗎', 'Wi-Fi 6'],
    ['泳池幾點開', '7點至晚上9點'],
    ['想去運動', '24小時'],
    ['你好', '很高興為您服務'],
    ['幾點可以入住', '下午三點'],
    ['謝謝你', '不客氣'],
  ])('「%s」的回覆包含「%s」', (msg, expected) => {
    expect(getReply(msg)).toContain(expected);
  });

  test('無法辨識時回傳客服電話', () => {
    expect(getReply('今天天氣如何')).toBe(FALLBACK);
    expect(FALLBACK).toContain('2306-6777');
  });

  test('規則順序決定優先權：同時問價格與設施 → 回答價格', () => {
    expect(getReply('設施和價格')).toContain('3,685');
  });

  test('小型套房價格與房型資料一致（修正原本聊天文字 2,701 與訂房頁 3,685 不一致）', () => {
    const priceRule = RULES.find((r) => r.keywords.includes('價格'));
    expect(priceRule.reply).toContain('小型套房TWD 3,685起');
  });

  test('非字串輸入不會丟例外', () => {
    expect(() => getReply(undefined)).not.toThrow();
    expect(getReply(undefined)).toBe(FALLBACK);
  });
});
