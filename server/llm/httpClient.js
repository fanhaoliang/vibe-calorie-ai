import { logStructured, logReadable } from '../logger.js';
import { globalRateLimiter } from './rateLimiter.js';
import { getCircuitBreaker } from './circuitBreaker.js';
import { buildRequestBody, getModelDisplayName } from './modelConfig.js';

function formatSeconds(durationMs) {
  return (durationMs / 1000).toFixed(1);
}

function formatStatus(status) {
  return {
    success: '成功',
    partial: '部分识别',
    empty: '未识别到内容',
    failed: '失败'
  }[status] || status || '未知';
}

/**
 * 从 LLM 响应文本中提取 JSON object：
 *   1. 已经是 {...} 直接 parse
 *   2. markdown code block ```json ... ``` 内部 parse
 *   3. 文本中任意 {...} 子串兜底
 */
function extractJsonObject(content) {
  if (typeof content !== 'string') return content;
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return JSON.parse(trimmed);
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM did not return JSON object');
  return JSON.parse(match[0]);
}

// 读取错误响应体，JSON 走 stringify 压平；text 截断到 1000 字符避免日志爆炸。
async function readErrorBody(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!text) return '';
  if (!contentType.includes('application/json')) return text.slice(0, 1000);

  try {
    return JSON.stringify(JSON.parse(text)).slice(0, 1000);
  } catch {
    return text.slice(0, 1000);
  }
}

/**
 * OpenAI-compatible /chat/completions 调用，集成：
 *   - 全局限流（globalRateLimiter）
 *   - 每模型独立熔断器（getCircuitBreaker(label)）
 *   - 指数退避重试（LLM_MAX_RETRIES，默认 2）
 *   - timeoutMs 超时（AbortController）
 *   - 结构化日志 + 中文可读日志
 *
 * label 用于区分模型（LLM_A/B/C），同时作为熔断器分组键。
 */
export async function callOpenAICompatible(label, config, prompt, timeoutMs = 5000) {
  const breaker = getCircuitBreaker(label);
  const modelName = getModelDisplayName(label, config.model);

  return breaker.call(async () => {
    await globalRateLimiter.acquire();

    const maxRetries = Number(process.env.LLM_MAX_RETRIES || 2);
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const startedAt = Date.now();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        logStructured('llm-retry', 'retry_scheduled', { label, attempt, backoffMs, error: lastError?.message });
        await new Promise(r => setTimeout(r, backoffMs));
      }

      logStructured('llm-request', 'request_start', {
        label,
        model: config.model,
        baseUrl: config.baseUrl.replace(/\/$/, ''),
        timeoutMs,
        attempt
      });

      try {
        const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiKey}`
          },
          signal: controller.signal,
          body: JSON.stringify(buildRequestBody(config, prompt, label))
        });

        if (!response.ok) {
          const responseBody = await readErrorBody(response);
          const durationMs = Date.now() - startedAt;
          logStructured('llm-request', 'request_failed', {
            label,
            status: response.status,
            durationMs,
            responseBody,
            attempt
          });
          logReadable('llm', `${modelName} 请求失败：HTTP ${response.status}，耗时 ${formatSeconds(durationMs)} 秒`, {
            label, model: config.model, status: response.status, responseBody
          });
          throw new Error(`LLM request failed: ${response.status}${responseBody ? ` ${responseBody}` : ''}`);
        }

        const payload = await response.json();
        const result = extractJsonObject(payload.choices?.[0]?.message?.content);
        const durationMs = Date.now() - startedAt;

        logStructured('llm-request', 'request_success', {
          label,
          durationMs,
          parseStatus: result?.parseStatus,
          foodItems: result?.foodItems?.length ?? 0,
          waterItems: result?.waterItems?.length ?? 0,
          totalCalories: result?.totalCalories,
          attempt
        });
        logReadable('llm', `${modelName} 解析成功：耗时 ${formatSeconds(durationMs)} 秒，识别 ${result?.foodItems?.length ?? 0} 个食物、${result?.waterItems?.length ?? 0} 个饮水，总热量 ${result?.totalCalories ?? 0} kcal，状态：${formatStatus(result?.parseStatus)}`, {
          label, model: config.model, parseStatus: result?.parseStatus,
          foodItems: result?.foodItems?.length ?? 0,
          waterItems: result?.waterItems?.length ?? 0,
          totalCalories: result?.totalCalories
        });

        return result;
      } catch (error) {
        lastError = error;
        const durationMs = Date.now() - startedAt;
        const isTimeout = error.name === 'AbortError';

        logStructured('llm-request', 'request_error', {
          label,
          durationMs,
          error: isTimeout ? 'timeout' : error.message,
          attempt
        });

        if (isTimeout) {
          logReadable('llm', `${modelName} 解析超时：超过 ${formatSeconds(timeoutMs)} 秒未返回，本次不会采用它的结果`, {
            label, model: config.model, timeoutMs, attempt
          });
        }

        if (attempt < maxRetries) continue;
        throw lastError;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  });
}
