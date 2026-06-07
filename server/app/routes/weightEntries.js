import { sendJson, readJson, todayShanghai, sendValidationError } from '../httpUtils.js';

/**
 * /api/weight-entries —— 保存体重 / 查询体重段（日均值）。
 */
export async function handleWeightEntryRoutes(req, res, url, { repo }) {
  const { method } = req;
  const path = url.pathname;

  if (method === 'POST' && path === '/api/weight-entries') {
    const body = await readJson(req);
    const weightKg = Number(body.weightKg);
    const date = String(body.date || todayShanghai());
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 250) {
      sendValidationError(res, '体重需要在 20 到 250 kg 之间');
      return true;
    }
    sendJson(res, 201, repo.saveWeightEntry(weightKg, date, body.recordedAt));
    return true;
  }

  if (method === 'GET' && path === '/api/weight-entries') {
    const start = url.searchParams.get('start') || todayShanghai();
    const end = url.searchParams.get('end') || start;
    sendJson(res, 200, repo.getWeightEntries(start, end));
    return true;
  }

  return false;
}
