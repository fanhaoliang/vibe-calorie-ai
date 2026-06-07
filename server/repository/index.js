import { createStatements } from './statements.js';
import { createAliasModule } from './aliases.js';
import { createFoodEntriesModule } from './foodEntries.js';
import { createFoodItemsModule } from './foodItems.js';
import { createWaterEntriesModule } from './waterEntries.js';
import { createWeightEntriesModule } from './weightEntries.js';
import { createSummariesModule } from './summaries.js';
import { createParseLogsModule } from './parseLogs.js';
import { createClearAllModule } from './clearAll.js';

/**
 * repository 工厂：把各业务域子模块组装成一个统一的对象。
 *
 * 子模块之间的依赖：
 *   statements    ── 提供 prepared statements
 *   aliases       ── 用 upsertFoodAlias 学习别名 + 启动时 prune/reload 一次
 *   foodEntries   ── 用 statements + learnFoodAlias（写入时学习）
 *   foodItems     ── 用 foodEntries 的 getFoodEntry / recompute*
 *   waterEntries  ── 用 statements + foodEntries.recomputeEntryTotal
 *   weightEntries ── 用 statements
 *   summaries     ── 只依赖 db
 *   parseLogs     ── 只依赖 db
 *   clearAll      ── 只依赖 db
 *
 * createRepository 启动时会调用 pruneStaleLearnedAliases + reloadRuntimeFoods，
 * 保证运行时食物索引与 DB 一致。
 */
export function createRepository(db) {
  const statements = createStatements(db);

  const aliases = createAliasModule(db, { upsertFoodAlias: statements.upsertFoodAlias });
  aliases.pruneStaleLearnedAliases();
  aliases.reloadRuntimeFoods();

  const foodEntries = createFoodEntriesModule(db, {
    statements,
    learnFoodAlias: aliases.learnFoodAlias
  });

  const foodItems = createFoodItemsModule(db, {
    getFoodEntry: foodEntries.getFoodEntry,
    recomputeEntryTotal: foodEntries.recomputeEntryTotal,
    recomputeEntryReview: foodEntries.recomputeEntryReview
  });

  const waterEntries = createWaterEntriesModule(db, {
    statements,
    recomputeEntryTotal: foodEntries.recomputeEntryTotal
  });

  const weightEntries = createWeightEntriesModule(db, { statements });
  const summaries = createSummariesModule(db);
  const parseLogs = createParseLogsModule(db);
  const clearAll = createClearAllModule(db);

  return {
    // food entries
    createFoodEntry: foodEntries.createFoodEntry,
    getFoodEntry: foodEntries.getFoodEntry,
    getFoodEntriesByDate: foodEntries.getFoodEntriesByDate,
    confirmFoodEntry: foodEntries.confirmFoodEntry,
    confirmFoodEntriesByDate: foodEntries.confirmFoodEntriesByDate,
    deleteFoodEntry: foodEntries.deleteFoodEntry,

    // food items
    updateFoodItemCalories: foodItems.updateFoodItemCalories,
    deleteFoodItem: foodItems.deleteFoodItem,

    // water
    createWaterEntry: waterEntries.createWaterEntry,
    deleteWaterEntry: waterEntries.deleteWaterEntry,
    getWaterEntriesByDate: waterEntries.getWaterEntriesByDate,

    // weight
    saveWeightEntry: weightEntries.saveWeightEntry,
    getWeightEntries: weightEntries.getWeightEntries,
    getLatestWeightEntry: weightEntries.getLatestWeightEntry,

    // summaries
    getDailySummary: summaries.getDailySummary,
    getDailySummaries: summaries.getDailySummaries,

    // aliases
    getLearnedFoodAliases: aliases.getLearnedFoodAliases,
    clearLearnedFoodAliases: aliases.clearLearnedFoodAliases,

    // parse logs / judge stats (冻结观察期，只记录不参与决策)
    logParseResult: parseLogs.logParseResult,
    logJudgeStat: parseLogs.logJudgeStat,
    getParseLogs: parseLogs.getParseLogs,
    getJudgeStats: parseLogs.getJudgeStats,

    // misc
    clearAllData: clearAll.clearAllData
  };
}
