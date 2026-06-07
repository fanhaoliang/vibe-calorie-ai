// utils 子模块的入口（barrel re-export）。
// 内部实现拆分在 ./utils/ 目录下：
//   - date.ts     todayShanghai / formatDateShanghai / formatDateTimeShanghai / addDays / formatTime / formatRelativeTime
//   - metrics.ts  percent / ratioPercent / buildBodyMetrics
//   - tone.ts     toneForCalories / toneForWater / toneForRecords
//   - chart.ts    buildTodayPoints
//
// 保留原 utils.ts 路径作为统一入口，让 `import { ... } from './utils'`
// 无需修改即可继续工作。
export { todayShanghai, formatDateShanghai, formatDateTimeShanghai, addDays, formatTime, formatRelativeTime } from './utils/date';
export { percent, ratioPercent, buildBodyMetrics } from './utils/metrics';
export { toneForCalories, toneForWater, toneForRecords } from './utils/tone';
export { buildTodayPoints } from './utils/chart';
