import { nowIso, normalizeRecordedAt } from './time.js';
import { toDbBool, fromDbBool, mapFoodItem, mapWaterItem } from './mappers.js';
import { withTransaction } from './transaction.js';
import { AppError } from '../errors.js';

/**
 * food_entries 主表的全部 CRUD 与状态维护。
 *
 * 一条 food_entry 由：
 *   - 1 条 food_entries 行
 *   - N 条 food_items 行（外键 entry_id）
 *   - M 条 water_entries 行（外键 entry_id，source_type='text_entry'）
 * 组成。三者用事务包裹写入；删除时由 ON DELETE CASCADE 自动级联。
 *
 * final_total_calories 是 food_items 各项 calories 之和，
 * 在写入和修改 food_items 后会调 recomputeEntryTotal 重算。
 *
 * need_review 是 food_entries / food_items / water_entries 的并集——
 * 任何一项需确认，主表都标记需确认；全部确认后才能清掉。
 */
export function createFoodEntriesModule(db, { statements, learnFoodAlias }) {
  const { insertEntry, insertFoodItem, insertWater } = statements;

  function getFoodItems(entryId) {
    return db.prepare('SELECT * FROM food_items WHERE entry_id = ? ORDER BY id').all(entryId).map(mapFoodItem);
  }

  function getWaterItems(entryId) {
    return db.prepare('SELECT * FROM water_entries WHERE entry_id = ? ORDER BY id').all(entryId).map(mapWaterItem);
  }

  function getFoodEntry(id) {
    const row = db.prepare('SELECT * FROM food_entries WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      recordedAt: row.recorded_at,
      rawText: row.raw_text,
      parseSource: row.parse_source,
      parseStatus: row.parse_status,
      llmTotalCalories: row.llm_total_calories,
      finalTotalCalories: row.final_total_calories,
      needReview: fromDbBool(row.need_review),
      reviewReason: row.review_reason,
      ignoredItems: JSON.parse(row.ignored_json || '[]'),
      foodItems: getFoodItems(row.id),
      waterItems: getWaterItems(row.id)
    };
  }

  function recomputeEntryTotal(entryId) {
    const row = db.prepare('SELECT COALESCE(SUM(calories), 0) AS total FROM food_items WHERE entry_id = ?').get(entryId);
    const total = row.total || 0;
    db.prepare('UPDATE food_entries SET final_total_calories = ?, updated_at = ? WHERE id = ?').run(total, nowIso(), entryId);
    return total;
  }

  // 当 food_items 或 water_entries 中已无需确认项时，把主表的 need_review 也清掉。
  function recomputeEntryReview(entryId) {
    const row = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM food_items WHERE entry_id = ? AND need_review = 1) +
        (SELECT COUNT(*) FROM water_entries WHERE entry_id = ? AND need_review = 1) AS remaining
    `).get(entryId, entryId);
    const timestamp = nowIso();
    if ((row?.remaining || 0) === 0) {
      db.prepare('UPDATE food_entries SET need_review = 0, review_reason = ?, updated_at = ? WHERE id = ?').run('', timestamp, entryId);
    } else {
      db.prepare('UPDATE food_entries SET updated_at = ? WHERE id = ?').run(timestamp, entryId);
    }
  }

  function confirmFoodEntry(entryId) {
    const entry = getFoodEntry(entryId);
    if (!entry) throw AppError.notFound('Food entry not found');
    const timestamp = nowIso();
    db.prepare('UPDATE food_items SET need_review = 0, review_reason = ?, updated_at = ? WHERE entry_id = ?').run('', timestamp, entryId);
    db.prepare('UPDATE water_entries SET need_review = 0, review_reason = ?, updated_at = ? WHERE entry_id = ?').run('', timestamp, entryId);
    db.prepare('UPDATE food_entries SET need_review = 0, review_reason = ?, updated_at = ? WHERE id = ?').run('', timestamp, entryId);
    return getFoodEntry(entryId);
  }

  function createFoodEntry(rawText, parsed, recordedAtInput) {
    const timestamp = nowIso();
    const recordedAt = normalizeRecordedAt(recordedAtInput, timestamp);
    return withTransaction(db, () => {
      const result = insertEntry.run(
        recordedAt,
        rawText,
        parsed.parseSource,
        parsed.parseStatus,
        parsed.llmTotalCalories ?? parsed.totalCalories ?? 0,
        parsed.finalTotalCalories ?? 0,
        toDbBool(parsed.needReview),
        parsed.reviewReason || '',
        JSON.stringify(parsed.ignoredItems || []),
        timestamp,
        timestamp
      );
      const entryId = Number(result.lastInsertRowid);

      for (const item of parsed.foodItems || []) {
        insertFoodItem.run(
          entryId,
          item.rawText,
          item.name,
          item.quantity,
          item.unit || '',
          item.calories || 0,
          item.status,
          toDbBool(item.needReview),
          item.reviewReason || '',
          item.source || 'llm',
          timestamp,
          timestamp
        );
        learnFoodAlias(item, timestamp);
      }

      for (const item of parsed.waterItems || []) {
        insertWater.run(
          recordedAt,
          entryId,
          'text_entry',
          item.rawText,
          item.amountMl,
          item.status,
          toDbBool(item.needReview),
          item.reviewReason || '',
          timestamp,
          timestamp
        );
      }

      recomputeEntryTotal(entryId);
      return getFoodEntry(entryId);
    });
  }

  function getFoodEntriesByDate(date) {
    return db.prepare(`
      SELECT id FROM food_entries
      WHERE substr(recorded_at, 1, 10) = ?
      ORDER BY recorded_at DESC, id DESC
    `).all(date).map(row => getFoodEntry(row.id));
  }

  // 按日期批量确认：只挑出确实需确认的记录，逐条调 confirmFoodEntry。
  function confirmFoodEntriesByDate(date) {
    const ids = db.prepare(`
      SELECT id FROM food_entries fe
      WHERE substr(fe.recorded_at, 1, 10) = ?
        AND (
          fe.need_review = 1
          OR EXISTS (SELECT 1 FROM food_items fi WHERE fi.entry_id = fe.id AND fi.need_review = 1)
          OR EXISTS (SELECT 1 FROM water_entries we WHERE we.entry_id = fe.id AND we.need_review = 1)
        )
      ORDER BY recorded_at DESC, id DESC
    `).all(date).map(row => row.id);
    for (const id of ids) confirmFoodEntry(id);
    return { confirmed: ids.length };
  }

  function deleteFoodEntry(entryId) {
    const entry = getFoodEntry(entryId);
    if (!entry) throw AppError.notFound('Food entry not found');
    db.prepare('DELETE FROM food_entries WHERE id = ?').run(entryId);
    return { deleted: true, id: entryId };
  }

  return {
    getFoodEntry,
    getFoodEntriesByDate,
    createFoodEntry,
    confirmFoodEntry,
    confirmFoodEntriesByDate,
    deleteFoodEntry,
    recomputeEntryTotal,
    recomputeEntryReview
  };
}
