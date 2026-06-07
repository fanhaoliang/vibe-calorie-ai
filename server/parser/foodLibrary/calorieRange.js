import { findFood } from './lookup.js';
import { calculateFoodCalories } from './unitCalories.js';

// 高频食物的精确热量范围（基于中国食物成分表 2023 版）。
// minRatio/maxRatio 表示相对于 perUnit 的下/上浮动比例。
const PRECISE_RANGES = {
  '鸡蛋': { perUnit: 70, minRatio: 0.15, maxRatio: 0.25 },
  '牛奶': { perUnit: 150, minRatio: 0.10, maxRatio: 0.20 },
  '米饭': { perUnit: 230, minRatio: 0.20, maxRatio: 0.35 },
  '面条': { perUnit: 280, minRatio: 0.15, maxRatio: 0.30 },
  '包子': { perUnit: 220, minRatio: 0.20, maxRatio: 0.35 },
  '馒头': { perUnit: 220, minRatio: 0.15, maxRatio: 0.25 },
  '苹果': { perUnit: 95, minRatio: 0.25, maxRatio: 0.40 },
  '香蕉': { perUnit: 105, minRatio: 0.20, maxRatio: 0.35 },
  '鸡胸肉': { perUnit: 1.65, minRatio: 0.05, maxRatio: 0.10 },
  '牛肉': { perUnit: 2.50, minRatio: 0.08, maxRatio: 0.15 },
  '猪肉': { perUnit: 2.43, minRatio: 0.10, maxRatio: 0.20 },
  '鱼肉': { perUnit: 1.20, minRatio: 0.10, maxRatio: 0.20 },
  '虾': { perUnit: 0.85, minRatio: 0.08, maxRatio: 0.15 },
  '豆腐': { perUnit: 0.65, minRatio: 0.05, maxRatio: 0.10 },
  '可乐': { perUnit: 210, minRatio: 0.10, maxRatio: 0.20 },
  '奶茶': { perUnit: 350, minRatio: 0.20, maxRatio: 0.40 },
  '咖啡': { perUnit: 5, minRatio: 1.00, maxRatio: 2.00 },
  '酸奶': { perUnit: 120, minRatio: 0.15, maxRatio: 0.25 },
  '汉堡': { perUnit: 500, minRatio: 0.15, maxRatio: 0.25 },
  '蛋糕': { perUnit: 350, minRatio: 0.15, maxRatio: 0.30 },
  '巧克力': { perUnit: 80, minRatio: 0.15, maxRatio: 0.25 },
  '坚果': { perUnit: 6.00, minRatio: 0.05, maxRatio: 0.10 },
  '薯片': { perUnit: 350, minRatio: 0.10, maxRatio: 0.20 },
  '冰淇淋': { perUnit: 200, minRatio: 0.15, maxRatio: 0.30 },
  '面包': { perUnit: 80, minRatio: 0.15, maxRatio: 0.25 },
};

// 通用单位浮动比例（用于精确范围之外的食物）。
const GENERAL_UNIT_RATIOS = {
  'g': 0.05, '克': 0.05, 'ml': 0.05, '毫升': 0.05,
  '个': 0.20, '根': 0.25, '片': 0.25, '块': 0.25,
  '碗': 0.30, '杯': 0.30, '份': 0.35, '盘': 0.40,
  '盒': 0.20, '包': 0.25, '瓶': 0.20, '袋': 0.25,
  '串': 0.25, '颗': 0.20, '瓣': 0.25, '勺': 0.15
};

/**
 * 获取食物在知识库中的热量合理区间。
 * 高频食物使用 PRECISE_RANGES；其他食物根据单位使用通用浮动比例。
 * @param {string} name - 食物名称
 * @param {string} unit - 单位（如 '个'、'g'、'碗'）
 * @param {number} quantity - 数量
 * @returns {{min: number, max: number, perUnit: number, source: 'precise'|'general'} | null}
 */
export function getCalorieRange(name, unit, quantity = 1) {
  const food = findFood(name);
  if (!food) return null;

  const q = Math.max(1, Number(quantity) || 1);
  const base = calculateFoodCalories(food, unit, q);

  const precise = PRECISE_RANGES[food.name];
  if (precise) {
    const min = Math.round(base * (1 - precise.minRatio));
    const max = Math.round(base * (1 + precise.maxRatio));
    return { min, max, perUnit: food.caloriesPerUnit, source: 'precise' };
  }

  const ratio = GENERAL_UNIT_RATIOS[unit] ?? 0.30;
  const min = Math.round(base * (1 - ratio));
  const max = Math.round(base * (1 + ratio));

  return { min, max, perUnit: food.caloriesPerUnit, source: 'general' };
}
