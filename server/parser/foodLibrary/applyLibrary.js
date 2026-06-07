import { findFood } from './lookup.js';
import { calculateFoodCalories } from './unitCalories.js';

/**
 * 用食物库覆盖解析结果中的食物项：替换 name/unit/calories/source。
 * 找不到匹配时保留原始估算并标记 source 状态。
 *
 * @param {object} result - 解析结果（包含 foodItems）
 * @param {object} options
 * @param {boolean} [options.preferName] - true 时按 name 匹配，否则优先按 rawText
 * @returns 覆盖后的结果（带新的 foodItems 和 finalTotalCalories）
 */
export function applyFoodLibrary(result, options = {}) {
  const preferName = Boolean(options.preferName);
  const foodItems = result.foodItems.map(item => {
    const food = preferName
      ? findFood(item.name)
      : findFood(item.rawText) || findFood(item.name);
    if (!food) {
      return {
        ...item,
        calories: Number(item.calories) || 0,
        source: preferName && ['food_library', 'user_library'].includes(item.source) ? 'unmatched' : (item.source || 'llm')
      };
    }

    const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    return {
      ...item,
      name: food.name,
      unit: item.unit || food.defaultUnit,
      quantity,
      calories: calculateFoodCalories(food, item.unit || food.defaultUnit, quantity),
      status: item.status === 'unknown' ? 'estimated' : item.status,
      source: food.source === 'user_food' ? 'user_library' : 'food_library'
    };
  });

  const finalTotalCalories = foodItems.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  return {
    ...result,
    foodItems,
    finalTotalCalories
  };
}
