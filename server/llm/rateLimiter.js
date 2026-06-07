/**
 * Token bucket 限流器。
 *
 * 桶里最多 maxPerSecond 个令牌，按时间线性补充；
 * 不足时挂起 await 等到下一个令牌可用。
 * 全局共享一个实例，跨所有模型调用统一限速。
 */
export class RateLimiter {
  constructor(maxPerSecond = 10) {
    this.maxPerSecond = maxPerSecond;
    this.tokens = maxPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxPerSecond, this.tokens + elapsed * this.maxPerSecond);
    this.lastRefill = now;

    if (this.tokens < 1) {
      const waitMs = Math.ceil((1 - this.tokens) * 1000 / this.maxPerSecond);
      await new Promise(r => setTimeout(r, waitMs));
      return this.acquire();
    }

    this.tokens -= 1;
    return true;
  }
}

export const globalRateLimiter = new RateLimiter(Number(process.env.LLM_RATE_LIMIT_PER_SEC || 10));
