import { sendJson, readJson, todayShanghai, sendValidationError } from '../httpUtils.js';

/**
 * /api/water-entries —— 独立饮水记录的增/查/删。
 */
export async function handleWaterEntryRoutes(req, res, url, { repo }) {
  const { method } = req;
  const path = url.pathname;

  if (method === 'POST' && path === '/api/water-entries') {
    const body = await readJson(req);
    const amountMl = Number(body.amountMl);
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      sendValidationError(res, '饮水量必须大于 0');
      return true;
    }
    if (amountMl > 3000) {
      sendValidationError(res, '单次饮水量过大，请检查输入');
      return true;
    }
    sendJson(res, 201, repo.createWaterEntry(Math.round(amountMl), body.rawText || `${amountMl}ml`, body.recordedAt));
    return true;
  }

  if (method === 'GET' && path === '/api/water-entries') {
    const date = url.searchParams.get('date') || todayShanghai();
    sendJson(res, 200, repo.getWaterEntriesByDate(date));
    return true;
  }

  if (method === 'DELETE' && path.startsWith('/api/water-entries/')) {
    const id = Number(path.split('/').pop());
    sendJson(res, 200, repo.deleteWaterEntry(id));
    return true;
  }

  return false;
}
