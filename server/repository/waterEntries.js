import { nowIso, normalizeRecordedAt } from './time.js';
import { fromDbBool } from './mappers.js';
import { AppError } from '../errors.js';

/**
 * 独立饮水记录（source_type='manual'）+ 随文本记录的饮水查询。
 *
 * water_entries 表同时承担两种角色：
 *   - 用户单独点击"快速加水"或自定义加水量保存的记录（entry_id IS NULL）
 *   - 从文本解析出的饮水项（entry_id 指向 food_entries 主表）
 * 这里的 create/delete 只处理独立饮水；随文本的饮水由 foodEntries 模块负责。
 */
export function createWaterEntriesModule(db, { statements, recomputeEntryTotal }) {
  const { insertWater } = statements;

  function createWaterEntry(amountMl, rawText = `${amountMl}ml`, recordedAtInput) {
    const timestamp = nowIso();
    const recordedAt = normalizeRecordedAt(recordedAtInput, timestamp);
    const result = insertWater.run(
      recordedAt,
      null,
      'manual',
      rawText,
      amountMl,
      'recognized',
      0,
      '',
      timestamp,
      timestamp
    );
    return { id: Number(result.lastInsertRowid), recordedAt, amountMl, rawText };
  }

  // 删除随文本记录的饮水时同步重算主条目热量（饮水不计入热量，但 updated_at 要刷新）。
  function deleteWaterEntry(waterId) {
    const water = db.prepare('SELECT * FROM water_entries WHERE id = ?').get(waterId);
    if (!water) throw AppError.notFound('Water entry not found');
    db.prepare('DELETE FROM water_entries WHERE id = ?').run(waterId);
    if (water.entry_id) recomputeEntryTotal(water.entry_id);
    return { deleted: true, id: waterId };
  }

  function getWaterEntriesByDate(date) {
    return db.prepare(`
      SELECT * FROM water_entries
      WHERE substr(recorded_at, 1, 10) = ?
      ORDER BY recorded_at DESC, id DESC
    `).all(date).map(row => ({
      id: row.id,
      recordedAt: row.recorded_at,
      sourceType: row.source_type,
      rawText: row.raw_text,
      amountMl: row.amount_ml,
      status: row.status,
      needReview: fromDbBool(row.need_review),
      reviewReason: row.review_reason
    }));
  }

  return { createWaterEntry, deleteWaterEntry, getWaterEntriesByDate };
}
