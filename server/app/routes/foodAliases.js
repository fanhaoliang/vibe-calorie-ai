import { sendJson } from '../httpUtils.js';

/**
 * /api/food-aliases —— 查看 / 清空运行时学到的食物别名。
 */
export function handleFoodAliasRoutes(req, res, url, { repo }) {
  if (req.method === 'GET' && url.pathname === '/api/food-aliases') {
    sendJson(res, 200, repo.getLearnedFoodAliases());
    return true;
  }

  if (req.method === 'DELETE' && url.pathname === '/api/food-aliases') {
    sendJson(res, 200, repo.clearLearnedFoodAliases());
    return true;
  }

  return false;
}
