'use strict';

// 與 index.html 的關鍵字分類邏輯一致（優先順序 A → B → C）
const TYPES = [
  { type: 'A', label: '科技愛好者', keywords: ['科技', 'ai', 'vr', '智能', '現代', '高科技'] },
  { type: 'B', label: '高CP值追求者', keywords: ['品質', '服務', '舒適', '豪華', '設施', 'cp值'] },
  { type: 'C', label: '價格敏感者', keywords: ['便宜', '價格', '優惠', '折扣', '省錢', '經濟'] },
];

/**
 * 依語音轉文字內容判斷使用者類型。
 * 找不到關鍵字時回傳 matched:false（前端原本是隨機挑一種）。
 */
function classify(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { type: null, label: null, matched: false };
  }
  const lower = text.toLowerCase();
  for (const t of TYPES) {
    const hit = t.keywords.find((k) => lower.includes(k));
    if (hit) return { type: t.type, label: t.label, matched: true, keyword: hit };
  }
  return { type: null, label: null, matched: false };
}

module.exports = { TYPES, classify };
