import { parseWithModels } from '../parser/orchestrator.js';
import { ruleBasedParse } from '../parser/ruleParser.js';
import { logStructured } from '../logger.js';
import { parseCache, hashText, isShortInput } from '../cache.js';
import { globalRateLimiter } from './rateLimiter.js';
import { getCircuitBreakerStates } from './circuitBreaker.js';
import { buildParsePrompt, buildJudgePrompt } from './prompts.js';
import { getModelConfig } from './modelConfig.js';
import { callOpenAICompatible } from './httpClient.js';
import { createDecisionLogger } from './decisionLogger.js';

/**
 * 把解析结果与 A/B/裁判的原始输出比对，落地到 judge_stats 表。
 *
 * 五个事件：
 *   A omitted        A 没识别到，但 B 和裁判都识别到
 *   B omitted        B 没识别到，但 A 和裁判都识别到
 *   A overruled      A 识别到的，裁判和 B 都未采纳
 *   B overruled      B 识别到的，裁判和 A 都未采纳
 *   judge corrected  裁判最终结果中包含 A 或 B 缺失的食物
 *
 * 仅观察期数据，不参与解析决策。
 */
function logJudgeStats(repo, modelAResult, modelBResult, judgeResult, result) {
  if (!repo?.logJudgeStat) return;

  const aFoods = modelAResult?.foodItems?.map(f => f.name) || [];
  const bFoods = modelBResult?.foodItems?.map(f => f.name) || [];
  const judgeFoods = judgeResult?.foodItems?.map(f => f.name) || [];
  const finalFoods = result?.foodItems?.map(f => f.name) || [];

  for (const food of finalFoods) {
    if (!aFoods.includes(food) && bFoods.includes(food) && judgeFoods.includes(food)) {
      repo.logJudgeStat('A', 'omitted', food);
    }
    if (!bFoods.includes(food) && aFoods.includes(food) && judgeFoods.includes(food)) {
      repo.logJudgeStat('B', 'omitted', food);
    }
  }
  for (const food of aFoods) {
    if (judgeResult && !judgeFoods.includes(food) && !bFoods.includes(food)) {
      repo.logJudgeStat('A', 'overruled', food);
    }
  }
  for (const food of bFoods) {
    if (judgeResult && !judgeFoods.includes(food) && !aFoods.includes(food)) {
      repo.logJudgeStat('B', 'overruled', food);
    }
  }
  if (judgeResult) {
    for (const food of judgeFoods) {
      if (!aFoods.includes(food) || !bFoods.includes(food)) {
        repo.logJudgeStat('judge', 'corrected', food);
      }
    }
  }
}

/**
 * 创建配置好的 parser：根据 .env 中的模型配置决定走哪条路径。
 *
 *   - 无任何 LLM 配置 → 永远走 ruleBasedParse 本地规则
 *   - 有 A/B（或其一） → 多模型 + 规则兜底
 *     - 短输入 + LLM_FAST_PATH=true → 走单模型快速通道，结果标记需确认
 *     - 否则查 parseCache，未命中时调用 parseWithModels 编排
 *     - 调用完毕后把缓存写回、把统计 / parse_logs 写到 repo
 */
export function createConfiguredParser(env = process.env) {
  const modelA = getModelConfig(env, 'LLM_A');
  const modelB = getModelConfig(env, 'LLM_B');
  const modelC = getModelConfig(env, 'LLM_C');
  const timeoutMs = Number(env.LLM_TIMEOUT_MS || 30000);

  logStructured('llm-config', 'config_loaded', {
    modelA: Boolean(modelA),
    modelB: Boolean(modelB),
    judgeModel: Boolean(modelC),
    timeoutMs,
    rateLimit: globalRateLimiter.maxPerSecond,
    circuitBreakers: getCircuitBreakerStates()
  });

  if (!modelA && !modelB) {
    logStructured('llm-config', 'parser_mode', { mode: 'rule_fallback_only' });
    return async text => ruleBasedParse(text);
  }

  logStructured('llm-config', 'parser_mode', { mode: 'llm_with_rule_fallback' });
  return async (text, repo) => {
    // 快速通道：短输入直接走单模型
    const fastPathEnabled = env.LLM_FAST_PATH === 'true';
    if (fastPathEnabled && isShortInput(text)) {
      logStructured('llm-fast', 'fast_path', { text, reason: 'short_input' });
      const model = modelA || modelB;
      const label = modelA ? 'LLM_A' : 'LLM_B';
      try {
        const result = await callOpenAICompatible(label, model, buildParsePrompt(text), timeoutMs);
        const final = {
          ...ruleBasedParse(text),
          ...result,
          parseSource: 'fast_path',
          needReview: true,
          reviewReason: '快速通道（短输入），建议确认'
        };
        if (repo?.logParseResult) {
          repo.logParseResult(text, null, null, null, final, 'fast_path', null, null);
        }
        return final;
      } catch {
        return ruleBasedParse(text);
      }
    }

    const cacheKey = hashText(text);
    const cached = parseCache.get(cacheKey);
    if (cached) {
      logStructured('llm-cache', 'cache_hit', { cacheKey, stats: parseCache.getStats() });
      return cached;
    }
    logStructured('llm-cache', 'cache_miss', { cacheKey, stats: parseCache.getStats() });

    // 这三个变量在闭包里被 callXxx 写入，便于完成后做 judge_stats 比对
    let modelAResult = null;
    let modelBResult = null;
    let judgeResult = null;

    const result = await parseWithModels(text, {
      callModelA: modelA ? async () => {
        modelAResult = await callOpenAICompatible('LLM_A', modelA, buildParsePrompt(text), timeoutMs);
        return modelAResult;
      } : undefined,
      callModelB: modelB ? async () => {
        modelBResult = await callOpenAICompatible('LLM_B', modelB, buildParsePrompt(text), timeoutMs);
        return modelBResult;
      } : undefined,
      callJudgeModel: modelC ? async (_text, diffInfo) => {
        judgeResult = await callOpenAICompatible('LLM_C', modelC, buildJudgePrompt(text, diffInfo), timeoutMs);
        return judgeResult;
      } : undefined,
      onDecision: createDecisionLogger(modelA, modelB)
    });

    parseCache.set(cacheKey, result);

    if (repo?.logParseResult) {
      logJudgeStats(repo, modelAResult, modelBResult, judgeResult, result);
      repo.logParseResult(text, modelAResult, modelBResult, judgeResult, result, result.parseSource || 'unknown', null, null);
    }

    return result;
  };
}
