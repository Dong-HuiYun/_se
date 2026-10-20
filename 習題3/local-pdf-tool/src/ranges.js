// 解析像 "1-3, 5, 8-10" 的頁碼字串，回傳 0-based 頁索引的群組：[[0,1,2],[4],[7,8,9]]
export function parseRanges(text, max) {
  const cleaned = text.replace(/\s*([-~–])\s*/g, '$1');
  const groups = [];
  for (const part of cleaned.split(/[,，、\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:[-~–](\d+))?$/);
    if (!m) throw new Error(`看不懂「${part}」，請用像 1-3, 5, 8-10 的格式`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > max || a > b) throw new Error(`「${part}」超出範圍（這份文件共 ${max} 頁）`);
    groups.push(Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i));
  }
  if (!groups.length) throw new Error('請輸入頁碼區間，例如 1-3, 5, 8-10');
  return groups;
}
