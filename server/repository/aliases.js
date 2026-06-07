import { addRuntimeFoodAlias, loadRuntimeFoodAliases } from '../parser/foodLibrary.js';
import { nowIso, oldAliasCutoff } from './time.js';
import { normalizeAlias } from './aliasNormalize.js';

/**
 * 食物别名学习与运行时缓存维护。
 *
 * food_aliases 表的两个来源：
 *   1. 用户自己保存的食物（user_*，永不过期）
 *   2. 模型/食物库自动学习（auto_*，60 天未用且 use_count<=1 时清理）
 *
 * 业务上每次写入 food_items 时都会调一次 learnFoodAlias，并触发一次
 * pruneStaleLearnedAliases；同时 runtimeFoods（内存中的解析索引）也会
 * 同步增加一条，避免下一次解析还得重新查 DB。
 */
export function createAliasModule(db, { upsertFoodAlias }) {
  function pruneStaleLearnedAliases() {
    db.prepare(`
      DELETE FROM food_aliases
      WHERE use_count <= 1
        AND COALESCE(last_used_at, updated_at, created_at) < ?
        AND source NOT LIKE 'user_%'
    `).run(oldAliasCutoff());
  }

  function reloadRuntimeFoods() {
    loadRuntimeFoodAliases(
      db.prepare('SELECT * FROM food_aliases ORDER BY id').all(),
      db.prepare('SELECT * FROM foods ORDER BY updated_at DESC, id DESC').all()
    );
  }

  function learnFoodAlias(item, timestamp) {
    const alias = normalizeAlias(item.rawText, item);
    const name = String(item.name || '').trim();
    if (!alias || !name || alias === name) return;

    const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const caloriesPerUnit = Math.round((Number(item.calories) || 0) / quantity);
    if (caloriesPerUnit <= 0) return;

    const source = item.source === 'food_library' ? 'auto_food_library' : 'auto_llm';
    upsertFoodAlias.run(alias, name, item.unit || '', caloriesPerUnit, source, timestamp, timestamp, timestamp);
    pruneStaleLearnedAliases();
    addRuntimeFoodAlias({
      alias,
      name,
      defaultUnit: item.unit || '',
      caloriesPerUnit,
      source
    });
  }

  function getLearnedFoodAliases() {
    return db.prepare('SELECT * FROM food_aliases ORDER BY updated_at DESC, id DESC').all();
  }

  function clearLearnedFoodAliases() {
    db.prepare('DELETE FROM food_aliases').run();
    reloadRuntimeFoods();
    return { cleared: true };
  }

  return {
    pruneStaleLearnedAliases,
    reloadRuntimeFoods,
    learnFoodAlias,
    getLearnedFoodAliases,
    clearLearnedFoodAliases
  };
}
