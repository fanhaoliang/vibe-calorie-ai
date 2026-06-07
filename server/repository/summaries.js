import { addDays } from './time.js';
import { mapWeightAverage } from './mappers.js';

/**
 * 每日汇总：把饮食、饮水、体重三张表按日聚合成单一对象。
 *
 * 体重的取法是"最近一次小于等于 date 的体重日均值"，
 * 因此用户没每天称体重也能在 daily-summary 里拿到合理值。
 */
export function createSummariesModule(db) {
  function getDailySummary(date) {
    const caloriesRow = db.prepare(`
      SELECT COALESCE(SUM(final_total_calories), 0) AS total, COUNT(*) AS count
      FROM food_entries WHERE substr(recorded_at, 1, 10) = ?
    `).get(date);
    const waterRow = db.prepare(`
      SELECT COALESCE(SUM(amount_ml), 0) AS total, COUNT(*) AS count
      FROM water_entries WHERE substr(recorded_at, 1, 10) = ?
    `).get(date);
    const weightRow = db.prepare(`
      SELECT MAX(id) AS id, MAX(recorded_at) AS recorded_at, date, AVG(weight_kg) AS weight_kg
      FROM weight_entries
      WHERE date = (SELECT MAX(date) FROM weight_entries WHERE date <= ?)
      GROUP BY date
    `).get(date);
    return {
      date,
      totalCalories: caloriesRow.total || 0,
      foodEntryCount: caloriesRow.count || 0,
      waterTotalMl: waterRow.total || 0,
      waterEntryCount: waterRow.count || 0,
      weightKg: weightRow ? mapWeightAverage(weightRow).weightKg : null,
      weightRecordedAt: weightRow?.recorded_at ?? null
    };
  }

  // 按日期段批量返回，每天调一次 getDailySummary。
  function getDailySummaries(start, end) {
    const summaries = [];
    let date = start;
    while (date <= end) {
      summaries.push(getDailySummary(date));
      date = addDays(date, 1);
    }
    return summaries;
  }

  return { getDailySummary, getDailySummaries };
}
