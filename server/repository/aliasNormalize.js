/**
 * 把用户输入的食物原文清洗成可用作 food_aliases.alias 的短字符串。
 * 例如 "我吃了两个煎蛋。" → "煎蛋"。
 * 清洗失败时回退到 item.name。
 */
export function normalizeAlias(rawText, item) {
  return String(rawText || '')
    .trim()
    .replace(/[，。；、,.]/g, '')
    .replace(/^(我)?(喝了?|吃了?)|^又|^还/g, '')
    .replace(/^(一些|一个|两个|半个|一|两|二|半|\d+(?:\.\d+)?)(毫升|ml|克|个|块|盒|包|瓶|杯|碗|根|片|袋|份|g)?/i, '')
    .replace(/[的了]$/g, '')
    .trim() || String(item?.name || '').trim();
}
