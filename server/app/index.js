import { createServer } from 'node:http';
import { createConfiguredParser } from '../llmClient.js';
import { sendJson } from './httpUtils.js';
import { serveStatic } from './static.js';
import { AppError } from '../errors.js';
import { handleFoodEntryRoutes } from './routes/foodEntries.js';
import { handleFoodItemRoutes } from './routes/foodItems.js';
import { handleFoodAliasRoutes } from './routes/foodAliases.js';
import { handleWaterEntryRoutes } from './routes/waterEntries.js';
import { handleWeightEntryRoutes } from './routes/weightEntries.js';
import { handleSummaryRoutes } from './routes/summaries.js';
import { handleMiscRoutes } from './routes/misc.js';

// 按业务域分组的路由处理器；按顺序尝试，第一个返回 true 的就是匹配项。
const ROUTE_HANDLERS = [
  handleFoodEntryRoutes,
  handleFoodItemRoutes,
  handleFoodAliasRoutes,
  handleWaterEntryRoutes,
  handleWeightEntryRoutes,
  handleSummaryRoutes,
  handleMiscRoutes
];

/**
 * 创建 HTTP 服务：
 *   - /api/* 请求：依次尝试每组 route handler；都没命中 → 404
 *   - 其他请求：交给静态资源服务（public/ + node_modules 白名单）
 *   - 任意未捕获异常：500 + 统一 error envelope
 */
export function createApp(repo, parser = createConfiguredParser(process.env, repo)) {
  const ctx = { repo, parser };

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');

      for (const handle of ROUTE_HANDLERS) {
        if (await handle(req, res, url, ctx)) return;
      }

      if (url.pathname.startsWith('/api/')) {
        sendJson(res, 404, { error: { code: 'NOT_FOUND', message: '接口不存在' } });
        return;
      }

      serveStatic(req, res);
    } catch (error) {
      if (error instanceof AppError) {
        sendJson(res, error.status, { error: { code: error.code, message: error.message } });
      } else {
        sendJson(res, 500, { error: { code: 'SERVER_ERROR', message: error.message } });
      }
    }
  });
}
