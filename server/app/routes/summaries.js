import { sendJson, todayShanghai } from '../httpUtils.js';

/**
 * /api/daily-summary?date= 与 /api/daily-summaries?start=&end= —— 每日 / 多日汇总。
 */
export function handleSummaryRoutes(req, res, url, { repo }) {
  if (req.method === 'GET' && url.pathname === '/api/daily-summary') {
    const date = url.searchParams.get('date') || todayShanghai();
    sendJson(res, 200, repo.getDailySummary(date));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/daily-summaries') {
    const start = url.searchParams.get('start') || todayShanghai();
    const end = url.searchParams.get('end') || start;
    sendJson(res, 200, repo.getDailySummaries(start, end));
    return true;
  }

  return false;
}
