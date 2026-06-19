/**
 * 公共数据契约：HTTP API 出参 / 进参的形状。
 * 前端 client/src/types.ts 与本文件保持一致；任何字段调整需要两边同步。
 *
 * 仅文档+类型声明，不导出运行时值。
 *
 * @typedef {object} Summary
 * @property {string} date
 * @property {number} totalCalories
 * @property {number} waterTotalMl
 * @property {number} foodEntryCount
 * @property {number} waterEntryCount
 * @property {number | null} weightKg
 * @property {string | null} weightRecordedAt
 *
 * @typedef {object} FoodItem
 * @property {number} id
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {number} calories
 * @property {string} status
 * @property {boolean} needReview
 * @property {string} reviewReason
 *
 * @typedef {object} WaterItem
 * @property {number} id
 * @property {string} rawText
 * @property {number} amountMl
 * @property {string} status
 * @property {boolean} needReview
 * @property {string} reviewReason
 *
 * @typedef {object} FoodEntry
 * @property {number} id
 * @property {string} recordedAt
 * @property {string} rawText
 * @property {string} parseSource
 * @property {string} parseStatus
 * @property {number} llmTotalCalories
 * @property {number} finalTotalCalories
 * @property {boolean} needReview
 * @property {string} reviewReason
 * @property {string[]} ignoredItems
 * @property {FoodItem[]} foodItems
 * @property {WaterItem[]} waterItems
 *
 * @typedef {object} ParsedDraft
 * @property {string} parseStatus
 * @property {string} parseSource
 * @property {number} totalCalories
 * @property {number} llmTotalCalories
 * @property {number} finalTotalCalories
 * @property {boolean} needReview
 * @property {string} reviewReason
 * @property {Array<Omit<FoodItem, 'id'>>} foodItems
 * @property {Array<Omit<WaterItem, 'id'>>} waterItems
 * @property {string[]} ignoredItems
 *
 * @typedef {object} ApiErrorBody
 * @property {{code: string, message: string}} error
 */

export {};
