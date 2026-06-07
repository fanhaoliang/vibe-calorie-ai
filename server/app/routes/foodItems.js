import { sendJson, readJson, sendValidationError } from '../httpUtils.js';

/**
 * /api/food-items/:id —— 修改热量 / 删除单个食物项。
 */
export async function handleFoodItemRoutes(req, res, url, { repo }) {
  const { method } = req;
  const path = url.pathname;

  if (method === 'PUT' && path.startsWith('/api/food-items/')) {
    const id = Number(path.split('/').pop());
    const body = await readJson(req);
    const calories = Number(body.calories);
    if (!Number.isFinite(calories) || calories < 0) {
      sendValidationError(res, '热量必须大于等于 0');
      return true;
    }
    sendJson(res, 200, repo.updateFoodItemCalories(id, Math.round(calories), Boolean(body.saveToFoodLibrary)));
    return true;
  }

  if (method === 'DELETE' && path.startsWith('/api/food-items/')) {
    const id = Number(path.split('/').pop());
    sendJson(res, 200, repo.deleteFoodItem(id));
    return true;
  }

  return false;
}
