import { normalizeFoodName } from '../foodLibrary.js';

function normalizeName(name) {
  return String(name || '')
    .replace(/^(我)?(吃了?|喝了?)/, '')
    .replace(/又|还/g, '')
    .replace(/的|了/g, '')
    .trim()
    .toLowerCase();
}

/**
 * 中文模糊匹配：支持食物库归一化、包含关系、修饰词剥离、短字符串编辑距离。
 *
 * 匹配策略（由松到严）：
 *   1. 都归一化到 knowledge base name 后完全相等
 *   2. 一方包含另一方
 *   3. 去掉常见修饰词（大/小/红/青…）后再比较
 *   4. 短字符串（≤4 字符）编辑距离 ≤ 1
 */
export function fuzzyMatch(a, b) {
  const na = normalizeFoodName(a);
  const nb = normalizeFoodName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  if (na.includes(nb) || nb.includes(na)) return true;

  const stripModifiers = (s) => s.replace(/^(大|小|红|青|甜|咸|鲜|纯|香|辣|酸|苦)/, '');
  const sa = stripModifiers(na);
  const sb = stripModifiers(nb);
  if (sa === sb) return true;
  if (sa.includes(sb) || sb.includes(sa)) return true;

  const maxLen = Math.max(na.length, nb.length);
  if (maxLen <= 4) {
    const dist = levenshteinDistance(na, nb);
    if (dist <= 1) return true;
  }

  return false;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

export { normalizeName };