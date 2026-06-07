// app 子模块的入口（barrel re-export）。
// 内部实现拆分在 ./app/ 目录下：
//   - httpUtils.js              JSON 读写、todayShanghai、统一 error 响应
//   - static.js                 public/ + vendor 白名单静态资源
//   - normalize.js              normalizeParsedDraft / recalculateParsedDraft
//   - routes/foodEntries.js     POST/GET preview/recalculate/confirm/delete
//   - routes/foodItems.js       PUT/DELETE food-items
//   - routes/foodAliases.js     GET/DELETE food-aliases
//   - routes/waterEntries.js    POST/GET/DELETE water-entries
//   - routes/weightEntries.js   POST/GET weight-entries
//   - routes/summaries.js       GET daily-summary / daily-summaries
//   - routes/misc.js            DELETE all-data
//   - index.js                  createApp，按顺序调度 route handler，未命中走静态资源
export { createApp } from './app/index.js';
