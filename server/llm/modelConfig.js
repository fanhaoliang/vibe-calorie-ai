/**
 * 模型配置读取与请求体构建。
 *
 * 每组模型由三个环境变量定义：LLM_X_API_KEY / LLM_X_BASE_URL / LLM_X_MODEL。
 * 任何一个缺失就视为该模型未配置，返回 null。
 */
export function getModelConfig(env, prefix) {
  const apiKey = env[`${prefix}_API_KEY`];
  const baseUrl = env[`${prefix}_BASE_URL`];
  const model = env[`${prefix}_MODEL`];
  if (!apiKey || !baseUrl || !model) return null;
  return { apiKey, baseUrl, model };
}

export function isKimiK2(model) {
  return /^kimi-k2(?:\.|-|$)/i.test(model);
}

function isDeepSeekV4(model) {
  return /^deepseek-v4(?:-|$)/i.test(model);
}

export function shouldDisableThinking(model) {
  return isKimiK2(model) || isDeepSeekV4(model);
}

/**
 * 构造 OpenAI-compatible /chat/completions 请求体。
 *
 * 思考模式策略：
 *   - 裁判模型默认启用 thinking（高 reasoning_effort 或 thinking.enabled）
 *     LLM_JUDGE_THINKING=disabled 可强制关闭
 *   - 解析模型禁用 thinking 以追求快速响应
 *
 * temperature 策略：
 *   - 裁判 0.3（允许灵活审计推理）
 *   - 解析 0.1（严格稳定）
 *   - Kimi K2 不支持 temperature 参数，省略不传
 */
export function buildRequestBody(config, prompt, label) {
  const isJudge = label === 'LLM_C';

  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: isJudge ? '你是一个极度严谨的饮食热量审计专家。' : '你是一个饮食热量解析助手，只返回固定 JSON object。' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    // 裁判需要更多 token 完成三阶段审计思考
    max_tokens: isJudge ? 2000 : 1000
  };

  const judgeThinking = process.env.LLM_JUDGE_THINKING || 'enabled';
  if (isJudge) {
    if (judgeThinking === 'disabled') {
      body.thinking = { type: 'disabled' };
    } else {
      if (isKimiK2(config.model) || isDeepSeekV4(config.model)) {
        body.reasoning_effort = 'high';
      }
      if (/claude|anthropic/i.test(config.model)) {
        body.thinking = { type: 'enabled', budget_tokens: 2000 };
      }
    }
  } else {
    body.thinking = { type: 'disabled' };
  }

  if (isJudge) {
    body.temperature = 0.3;
  } else if (!isKimiK2(config.model)) {
    body.temperature = 0.1;
  }

  return body;
}

export function getModelDisplayName(label, model) {
  if (label === 'LLM_C') return '裁判模型';
  if (/deepseek/i.test(model)) return 'DeepSeek';
  if (/moonshot|kimi/i.test(model)) return 'Kimi';
  if (/doubao/i.test(model)) return '豆包';
  return label;
}
