import { FOODS } from './builtinFoods.js';
import { FOOD_NAME_ALIASES } from './nameAliases.js';
import { getRuntimeFoods } from './runtimeAliases.js';

function normalizeName(name) {
  return String(name || '').trim();
}

/**
 * 食物名称归一化：清理动作词/数量前缀/修饰词，再尝试别名映射和知识库匹配。
 * @param {string} name - 原始食物名称
 * @returns {string} 归一化后的名称
 */
export function normalizeFoodName(name) {
  if (!name) return '';

  // 步骤1：清理动作词
  let normalized = String(name)
    .replace(/^(我)?(吃了?|喝了?)/, '')
    .replace(/又|还/g, '')
    .trim();

  // 步骤2：去掉开头的数量+单位
  normalized = normalized
    .replace(/^\d+[\.\d]*\s*(个|根|片|块|碗|杯|份|盘|盒|包|瓶|袋|克|g|毫升|ml|勺|串|颗|瓣)\s*/, '')
    .trim();

  // 步骤3：去掉"大/小/红/青"等修饰词（仅当修饰词后面还有内容时）
  const modifiers = ['大', '小', '红', '青', '甜', '咸', '鲜', '纯', '脱脂', '低脂', '全脂', '高钙', '巴氏', '常温', '即食', '钢切', '风味', '老', '现磨'];
  for (const mod of modifiers) {
    if (normalized.startsWith(mod) && normalized.length > mod.length) {
      normalized = normalized.slice(mod.length);
    }
  }
  normalized = normalized.trim();

  // 步骤4：别名映射
  const alias = FOOD_NAME_ALIASES.get(normalized);
  if (alias) return alias;

  // 步骤5：从食物库匹配
  const food = findFood(normalized);
  if (food) return food.name;

  return normalized;
}

/**
 * 在运行时食物库和内置食物库中查找最匹配的食物。
 * 运行时别名优先级更高（同 score 时排在前面被选中）。
 * 精确名称匹配 score 加 1000；alias 包含匹配按 alias 长度打分。
 */
export function findFood(name) {
  const normalized = normalizeName(name);
  if (!normalized) return null;
  const matches = [];
  for (const food of [...getRuntimeFoods(), ...FOODS]) {
    if (food.name === normalized) {
      matches.push({ food, score: food.name.length + 1000 });
      continue;
    }

    const alias = food.aliases.find(candidate => normalized.includes(candidate));
    if (alias) matches.push({ food, score: alias.length });
  }

  return matches.sort((a, b) => b.score - a.score)[0]?.food || null;
}
