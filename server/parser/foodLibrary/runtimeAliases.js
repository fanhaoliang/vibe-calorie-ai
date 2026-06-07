// 运行时食物库：用户自定义食物和模型自动学习的别名。
// 与 FOODS 内置库一起参与匹配，优先级更高。
const runtimeFoods = [];

export function getRuntimeFoods() {
  return runtimeFoods;
}

function normalizeName(name) {
  return String(name || '').trim();
}

/**
 * 添加或更新一条运行时别名记录。
 * 如果 alias 已存在，更新名称/单位/热量；否则追加新记录。
 */
export function addRuntimeFoodAlias({ name, alias, defaultUnit, caloriesPerUnit, source = 'auto' }) {
  const normalizedName = normalizeName(name);
  const normalizedAlias = normalizeName(alias);
  if (!normalizedName || !normalizedAlias) return null;

  const calories = Math.max(0, Math.round(Number(caloriesPerUnit) || 0));
  const existing = runtimeFoods.find(food => food.aliases.includes(normalizedAlias));
  if (existing) {
    existing.name = normalizedName;
    existing.defaultUnit = defaultUnit || existing.defaultUnit;
    existing.caloriesPerUnit = calories || existing.caloriesPerUnit;
    existing.source = source;
    return existing;
  }

  const food = {
    name: normalizedName,
    aliases: [normalizedAlias],
    defaultUnit: defaultUnit || '',
    caloriesPerUnit: calories,
    source
  };
  runtimeFoods.push(food);
  return food;
}

/**
 * 从数据库重新加载运行时别名。
 * @param {Array} rows - food_aliases 表的别名记录
 * @param {Array} userFoodRows - foods 表的用户自定义食物
 */
export function loadRuntimeFoodAliases(rows = [], userFoodRows = []) {
  runtimeFoods.length = 0;
  for (const row of userFoodRows) {
    const aliases = String(row.alias || '')
      .split(',')
      .map(alias => alias.trim())
      .filter(Boolean);
    for (const alias of [row.name, ...aliases]) {
      addRuntimeFoodAlias({
        name: row.name,
        alias,
        defaultUnit: row.default_unit,
        caloriesPerUnit: row.calories_per_unit,
        source: 'user_food'
      });
    }
  }
  for (const row of rows) {
    addRuntimeFoodAlias({
      name: row.name,
      alias: row.alias,
      defaultUnit: row.default_unit,
      caloriesPerUnit: row.calories_per_unit,
      source: row.source || 'learned'
    });
  }
}

export function resetRuntimeFoodAliases() {
  runtimeFoods.length = 0;
}
