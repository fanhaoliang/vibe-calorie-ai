import { logStructured } from '../logger.js';

/**
 * 标准三态熔断器。
 *
 *   CLOSED    正常调用；连续 failureThreshold 次失败 → OPEN
 *   OPEN      短路；recoveryTimeout 后 → HALF_OPEN
 *   HALF_OPEN 试探一次；成功 → CLOSED，失败 → OPEN
 *
 * 每个模型标签（LLM_A/B/C）独立一个实例，避免一个模型故障拖累其他模型。
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60 * 1000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.stats = { successes: 0, failures: 0, trips: 0 };
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logStructured('llm-circuit', 'breaker_half_open', { failures: this.failures });
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logStructured('llm-circuit', 'breaker_closed', { stats: this.stats });
    }
    this.stats.successes++;
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.stats.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.stats.trips++;
      logStructured('llm-circuit', 'breaker_open', {
        failures: this.failures,
        recoveryTimeout: this.recoveryTimeout,
        stats: this.stats
      });
    }
  }

  getState() {
    return { state: this.state, failures: this.failures, stats: this.stats };
  }
}

const circuitBreakers = new Map();

export function getCircuitBreaker(label) {
  if (!circuitBreakers.has(label)) {
    circuitBreakers.set(label, new CircuitBreaker({
      failureThreshold: Number(process.env.LLM_CIRCUIT_FAILURE_THRESHOLD || 5),
      recoveryTimeout: Number(process.env.LLM_CIRCUIT_RECOVERY_MS || 60000)
    }));
  }
  return circuitBreakers.get(label);
}

export function getCircuitBreakerStates() {
  return Object.fromEntries(
    [...circuitBreakers.entries()].map(([k, v]) => [k, v.getState()])
  );
}
