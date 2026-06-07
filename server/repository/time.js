// 时间相关工具：所有时间戳都使用 Asia/Shanghai 的 +08:00 偏移。
// 数据库里保存的所有 ISO 字符串都按这个时区生成，因此 `substr(recorded_at, 1, 10)`
// 直接得到的是本地日（不会因为 UTC 偏移跨日）。

export function nowIso() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
}

/**
 * 校验并规范化用户提交的 recordedAt：
 *   - 空值返回 fallback
 *   - "YYYY-MM-DD HH:mm" 改成 "T"
 *   - 缺秒补上 ":00"
 *   - 缺时区补上 "+08:00"
 *   - 任何不符合格式的输入返回 fallback
 */
export function normalizeRecordedAt(value, fallback = nowIso()) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  const normalized = text.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\+08:00|Z)?$/.test(normalized)) {
    const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
    if (withSeconds.endsWith('Z') || withSeconds.endsWith('+08:00')) return withSeconds;
    return `${withSeconds}+08:00`;
  }
  return fallback;
}

export function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

// 用于决定何时清理"用过 1 次且 60 天没再用"的学习别名。
export function oldAliasCutoff(days = 60) {
  return `${addDays(nowIso().slice(0, 10), -days)}T00:00:00+08:00`;
}
