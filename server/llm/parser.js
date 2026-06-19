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
 * 短输入快速通道：直接调单模型 + 规则兜底。
 * 永远把结果标记 needReview=true，因为没有 A/B 校验也没有规则兜底之外的护栏。
 */
async function fastPathParse(text, modelA, modelB, timeoutMs, repo) {
  const model = modelA || modelB;
  const label = modelA ? 'LLM_A' : 'LLM_B';
  logStructured('llm-fast', 'fast_path', { text, reason: 'short_input' });
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

/**
 * 把一个解析函数包装上缓存：相同文本只解析一次。
 *   - 命中：直接返回缓存值
 *   - 未命中：调原函数，结果写回缓存后返回
 */
function withCache(parse) {
  return async (text, repo) => {
    const cacheKey = hashText(text);
    const cached = parseCache.get(cacheKey);
    if (cached) {
      logStructured('llm-cache', 'cache_hit', { cacheKey, stats: parseCache.getStats() });
      return cached;
    }
    logStructured('llm-cache', 'cache_miss', { cacheKey, stats: parseCache.getStats() });

    const result = await parse(text, repo);
    parseCache.set(cacheKey, result);
    return result;
  };
}

/**
 * 主解析路径：A/B 并行 + 裁判 + 校验，外加 judge_stats / parse_logs 落库。
 * 闭包里捕获 modelAResult / modelBResult / judgeResult，等编排完成后做对比写入。
 */
function buildOrchestratedParser(modelA, modelB, modelC, timeoutMs) {
  return async (text, repo) => {
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

    if (repo?.logParseResult) {
      logJudgeStats(repo, modelAResult, modelBResult, judgeResult, result);
      repo.logParseResult(text, modelAResult, modelBResult, judgeResult, result, result.parseSource || 'unknown', null, null);
    }

    return result;
  };
}

/**
 * 创建配置好的 parser：根据 .env 中的模型配置决定走哪条路径。
 *
 *   - 无任何 LLM 配置 → 永远走 ruleBasedParse 本地规则
 *   - 有 A/B（或其一） → 多模型 + 规则兜底
 *     - 短输入 + LLM_FAST_PATH=true → fastPathParse
 *     - 否则 → withCache(buildOrchestratedParser)
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

  const fastPathEnabled = env.LLM_FAST_PATH === 'true';
  const orchestrated = withCache(buildOrchestratedParser(modelA, modelB, modelC, timeoutMs));

  return async (text, repo) => {
    if (fastPathEnabled && isShortInput(text)) {
      return fastPathParse(text, modelA, modelB, timeoutMs, repo);
    }
    return orchestrated(text, repo);
  };
}
