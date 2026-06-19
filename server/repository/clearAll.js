import { resetRuntimeFoodAliases } from '../parser/foodLibrary.js';
import { withTransaction } from './transaction.js';

/**
 * 一键清空所有业务数据：
 *   - 饮食、食物项、饮水、体重
 *   - 用户食物库（foods）与学习别名（food_aliases）
 *   - 应用设置（settings）
 *   - sqlite_sequence 中相关表的自增计数（让重建后的 id 从 1 开始）
 *   - 运行时食物索引（必须同步清空，否则下一次解析还会用到旧别名）
 */
export function createClearAllModule(db) {
  function clearAllData() {
    return withTransaction(db, () => {
      db.prepare('DELETE FROM water_entries').run();
      db.prepare('DELETE FROM food_items').run();
      db.prepare('DELETE FROM food_entries').run();
      db.prepare('DELETE FROM weight_entries').run();
      db.prepare('DELETE FROM food_aliases').run();
      db.prepare('DELETE FROM foods').run();
      db.prepare('DELETE FROM settings').run();
      db.prepare(`
        DELETE FROM sqlite_sequence
        WHERE name IN ('water_entries', 'food_items', 'food_entries', 'weight_entries', 'food_aliases', 'foods')
      `).run();
      resetRuntimeFoodAliases();
      return { cleared: true };
    });
  }

  return { clearAllData };
}
