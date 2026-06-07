// repository 子模块的入口（barrel re-export）。
// 内部实现拆分在 ./repository/ 目录下：
//   - time.js              纯函数：Asia/Shanghai 时间戳工具
//   - mappers.js           纯函数：SQLite 行 → 业务对象
//   - aliasNormalize.js    纯函数：rawText → alias 清洗
//   - statements.js        prepared statement 工厂
//   - aliases.js           food_aliases 学习与运行时索引同步
//   - foodEntries.js       食物记录主表 + food_items / water_entries
//   - foodItems.js         单个食物项的修改/删除（含保存到永久食物库）
//   - waterEntries.js      独立饮水记录
//   - weightEntries.js     体重记录与日均值
//   - summaries.js         每日 / 多日汇总
//   - parseLogs.js         解析过程与裁判决策记录（只记录不决策）
//   - clearAll.js          一键清空所有业务数据
//   - index.js             createRepository 工厂，按依赖顺序组装上述模块
export { createRepository } from './repository/index.js';
