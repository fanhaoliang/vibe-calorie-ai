import { nowIso, normalizeRecordedAt } from './time.js';
import { mapWeightAverage } from './mappers.js';

/**
 * 体重记录的写入与按日均值查询。
 *
 * 同一天可以保存多次体重；表里保留所有原始记录，
 * 所有读取接口都按 date 做 AVG 聚合，前端看到的是日均值（一位小数）。
 *
 * date 字段的来源：
 *   - 显式传 recordedAt 时，以 recordedAt 切出的 YYYY-MM-DD 为准
 *     （让"补录昨天体重"按昨天分组，而不是按 date 参数）
 *   - 未传 recordedAt 时，使用 date 参数或当前日
 */
export function createWeightEntriesModule(db, { statements }) {
  const { insertWeight } = statements;

  function saveWeightEntry(weightKg, date, recordedAtInput) {
    const timestamp = nowIso();
    const recordedAt = normalizeRecordedAt(recordedAtInput, timestamp);
    const entryDate = recordedAtInput ? recordedAt.slice(0, 10) : (date || recordedAt.slice(0, 10));
    insertWeight.run(recordedAt, entryDate, weightKg, timestamp, timestamp);
    return mapWeightAverage(db.prepare(`
      SELECT MAX(id) AS id, MAX(recorded_at) AS recorded_at, date, AVG(weight_kg) AS weight_kg
      FROM weight_entries
      WHERE date = ?
      GROUP BY date
    `).get(entryDate));
  }

  function getWeightEntries(start, end) {
    return db.prepare(`
      SELECT MAX(id) AS id, MAX(recorded_at) AS recorded_at, date, AVG(weight_kg) AS weight_kg
      FROM weight_entries
      WHERE date >= ? AND date <= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(start, end).map(mapWeightAverage);
  }

  // 最近一次已保存的体重（用于 daily-summary 中把上一次的体重延续到后续日期）。
  function getLatestWeightEntry(date = nowIso().slice(0, 10)) {
    const row = db.prepare(`
      SELECT MAX(id) AS id, MAX(recorded_at) AS recorded_at, date, AVG(weight_kg) AS weight_kg
      FROM weight_entries
      WHERE date = (SELECT MAX(date) FROM weight_entries WHERE date <= ?)
      GROUP BY date
    `).get(date);
    return row ? mapWeightAverage(row) : null;
  }

  return { saveWeightEntry, getWeightEntries, getLatestWeightEntry };
}
