import { sendJson, readJson, todayShanghai, sendValidationError } from '../httpUtils.js';
import { normalizeParsedDraft, recalculateParsedDraft } from '../normalize.js';

/**
 * /api/food-entries* 系列路由。
 *
 * 每个 handle 函数返回 true 表示已处理，false 表示路径未命中。
 * 由 app/index.js 按顺序尝试调度。
 */
export async function handleFoodEntryRoutes(req, res, url, { repo, parser }) {
  const { method } = req;
  const path = url.pathname;

  if (method === 'POST' && path === '/api/food-entries/preview') {
    const body = await readJson(req);
    const text = String(body.text || '').trim();
    if (!text) {
      sendValidationError(res, '请输入要记录的内容');
      return true;
    }

    const parsed = normalizeParsedDraft(await parser(text, repo));
    sendJson(res, 200, {
      id: 0,
      recordedAt: body.recordedAt || null,
      rawText: text,
      ...parsed
    });
    return true;
  }

  if (method === 'POST' && path === '/api/food-entries/recalculate') {
    const body = await readJson(req);
    sendJson(res, 200, await recalculateParsedDraft(body.parsed || body, {}, parser, repo));
    return true;
  }

  if (method === 'POST' && path === '/api/food-entries') {
    const body = await readJson(req);
    const text = String(body.text || '').trim();
    if (!text) {
      sendValidationError(res, '请输入要记录的内容');
      return true;
    }

    // 用户已确认时走 recalculate(confirmed:true) 清掉所有 needReview；
    // 直接保存（无 parsed 字段）则现解析一次。
    const parsed = body.parsed
      ? await recalculateParsedDraft(body.parsed, { confirmed: true }, parser, repo)
      : await parser(text, repo);
    const entry = repo.createFoodEntry(text, parsed, body.recordedAt);
    sendJson(res, 201, entry);
    return true;
  }

  if (method === 'GET' && path === '/api/food-entries') {
    const date = url.searchParams.get('date') || todayShanghai();
    sendJson(res, 200, repo.getFoodEntriesByDate(date));
    return true;
  }

  if (method === 'PUT' && path === '/api/food-entries/confirm') {
    const body = await readJson(req);
    const date = String(body.date || todayShanghai());
    sendJson(res, 200, repo.confirmFoodEntriesByDate(date));
    return true;
  }

  // /api/food-entries/:id/confirm —— 单条确认
  if (method === 'PUT' && path.startsWith('/api/food-entries/') && path.endsWith('/confirm')) {
    const id = Number(path.split('/').at(-2));
    sendJson(res, 200, repo.confirmFoodEntry(id));
    return true;
  }

  // /api/food-entries/:id —— 删除一条
  if (method === 'DELETE' && path.startsWith('/api/food-entries/')) {
    const id = Number(path.split('/').pop());
    sendJson(res, 200, repo.deleteFoodEntry(id));
    return true;
  }

  return false;
}
