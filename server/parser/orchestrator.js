// orchestrator 子模块的入口（barrel re-export）。
// 内部实现拆分在 ./orchestrator/ 目录下：
//   - fuzzyMatch.js       normalizeName / fuzzyMatch / levenshteinDistance
//   - quantityCompare.js  compareQuantityUnit
//   - modelNormalize.js   hasContent / normalizeModelFoodItems / finalize / …
//   - diffAnalysis.js     buildDiffResult
//   - judgeValidation.js  validateJudgeResult（L1–L6 校验）
//   - index.js            parseWithModels + compareFinalCalories（主编排）
export { parseWithModels, compareFinalCalories } from './orchestrator/index.js';