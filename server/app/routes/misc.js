import { sendJson } from '../httpUtils.js';

/**
 * 杂项 API：当前只有 DELETE /api/all-data（一键清空所有本地数据）。
 */
export function handleMiscRoutes(req, res, url, { repo }) {
  if (req.method === 'DELETE' && url.pathname === '/api/all-data') {
    sendJson(res, 200, repo.clearAllData());
    return true;
  }

  return false;
}
