import { nowIso } from './time.js';

/**
 * 解析过程日志与裁判决策统计（冻结观察期）。
 *
 * 这些数据只用于事后分析模型表现，不参与解析决策本身。
 * 每条 parse_logs 记录都把 JSON 截断到 10000 字符，
 * 避免单条解析日志撑爆 SQLite 行。
 */
export function createParseLogsModule(db) {
  function logParseResult(input, modelA, modelB, judge, final, status, foodOverlap, foodCountDiff) {
    const timestamp = nowIso();
    db.prepare(`
      INSERT INTO parse_logs (input, model_a_result, model_b_result, judge_result, final_result, status, food_overlap, food_count_diff, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(input || '').slice(0, 1000),
      JSON.stringify(modelA || {}).slice(0, 10000),
      JSON.stringify(modelB || {}).slice(0, 10000),
      JSON.stringify(judge || {}).slice(0, 10000),
      JSON.stringify(final || {}).slice(0, 10000),
      String(status || ''),
      foodOverlap ?? null,
      foodCountDiff ?? null,
      timestamp
    );
    return { logged: true };
  }

  function logJudgeStat(modelLabel, eventType, foodName) {
    db.prepare(`
      INSERT INTO judge_stats (model_label, event_type, food_name, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(
      String(modelLabel || ''),
      String(eventType || ''),
      String(foodName || ''),
      nowIso()
    );
    return { logged: true };
  }

  function getParseLogs(limit = 100) {
    return db.prepare('SELECT * FROM parse_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  function getJudgeStats() {
    return {
      aOmitted: db.prepare("SELECT COUNT(*) as c FROM judge_stats WHERE model_label = 'A' AND event_type = 'omitted'").get().c,
      bOmitted: db.prepare("SELECT COUNT(*) as c FROM judge_stats WHERE model_label = 'B' AND event_type = 'omitted'").get().c,
      aOverruled: db.prepare("SELECT COUNT(*) as c FROM judge_stats WHERE model_label = 'A' AND event_type = 'overruled'").get().c,
      bOverruled: db.prepare("SELECT COUNT(*) as c FROM judge_stats WHERE model_label = 'B' AND event_type = 'overruled'").get().c,
      judgeCorrected: db.prepare("SELECT COUNT(*) as c FROM judge_stats WHERE model_label = 'judge' AND event_type = 'corrected'").get().c
    };
  }

  return { logParseResult, logJudgeStat, getParseLogs, getJudgeStats };
}
