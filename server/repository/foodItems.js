import { addRuntimeFoodAlias } from '../parser/foodLibrary.js';
import { nowIso } from './time.js';
import { normalizeAlias } from './aliasNormalize.js';
import { AppError } from '../errors.js';

/**
 * food_items 行级别的修改与删除。
 *
 * updateFoodItemCalories 在 saveToFoodLibrary=true 时会把这次修正写入
 * foods（永久食物库），并向运行时索引追加两条别名：
 *   - 用户原始输入 rawText 的归一化（让下次同样写法直接命中）
 *   - 食物 name 本身（让其他写法首次匹配时直接走食物库覆盖）
 */
export function createFoodItemsModule(db, { getFoodEntry, recomputeEntryTotal, recomputeEntryReview }) {
  function updateFoodItemCalories(itemId, calories, saveToFoodLibrary = false) {
    const item = db.prepare('SELECT * FROM food_items WHERE id = ?').get(itemId);
    if (!item) throw AppError.notFound('Food item not found');
    const timestamp = nowIso();
    db.prepare('UPDATE food_items SET calories = ?, source = ?, need_review = 0, review_reason = ?, updated_at = ? WHERE id = ?').run(calories, 'user_edit', '', timestamp, itemId);
    const finalTotalCalories = recomputeEntryTotal(item.entry_id);
    recomputeEntryReview(item.entry_id);

    if (saveToFoodLibrary) {
      const caloriesPerUnit = item.quantity > 0 ? Math.round(calories / item.quantity) : calories;
      db.prepare(`
        INSERT INTO foods (name, alias, default_unit, calories_per_unit, confidence, last_used_at, created_by, created_at, updated_at)
        VALUES (?, '', ?, ?, 'high', ?, 'user', ?, ?)
        ON CONFLICT(name, default_unit) DO UPDATE SET
          calories_per_unit = excluded.calories_per_unit,
          confidence = 'high',
          last_used_at = excluded.last_used_at,
          created_by = 'user',
          updated_at = excluded.updated_at
      `).run(item.name, item.unit, caloriesPerUnit, timestamp, timestamp, timestamp);
      addRuntimeFoodAlias({
        name: item.name,
        alias: normalizeAlias(item.raw_text, item),
        defaultUnit: item.unit,
        caloriesPerUnit,
        source: 'user_food'
      });
      addRuntimeFoodAlias({
        name: item.name,
        alias: item.name,
        defaultUnit: item.unit,
        caloriesPerUnit,
        source: 'user_food'
      });
    }

    return { ...getFoodEntry(item.entry_id), finalTotalCalories };
  }

  function deleteFoodItem(itemId) {
    const item = db.prepare('SELECT * FROM food_items WHERE id = ?').get(itemId);
    if (!item) throw AppError.notFound('Food item not found');
    db.prepare('DELETE FROM food_items WHERE id = ?').run(itemId);
    const entry = getFoodEntry(item.entry_id);
    if (!entry) return { deleted: true };
    const finalTotalCalories = recomputeEntryTotal(item.entry_id);
    return { ...getFoodEntry(item.entry_id), finalTotalCalories };
  }

  return { updateFoodItemCalories, deleteFoodItem };
}
