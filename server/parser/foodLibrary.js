// foodLibrary 子模块的入口（barrel re-export）。
// 内部实现拆分在 ./foodLibrary/ 目录下：
//   - builtinFoods.js   内置 170+ 种食物的默认单位和热量
//   - nameAliases.js    常见叫法到标准名的归一化映射
//   - runtimeAliases.js 运行时学习的别名（用户自定义/模型自动学习）
//   - lookup.js         normalizeFoodName + findFood
//   - calorieRange.js   getCalorieRange（精确范围 + 通用浮动）
//   - applyLibrary.js   applyFoodLibrary（覆盖解析结果的食物项）
export { FOODS } from './foodLibrary/builtinFoods.js';
export { normalizeFoodName, findFood } from './foodLibrary/lookup.js';
export {
  addRuntimeFoodAlias,
  loadRuntimeFoodAliases,
  resetRuntimeFoodAliases
} from './foodLibrary/runtimeAliases.js';
export { getCalorieRange } from './foodLibrary/calorieRange.js';
export { applyFoodLibrary } from './foodLibrary/applyLibrary.js';
