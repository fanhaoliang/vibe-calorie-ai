// llmClient 子模块的入口（barrel re-export）。
// 内部实现拆分在 ./llm/ 目录下：
//   - rateLimiter.js     RateLimiter + globalRateLimiter（token bucket）
//   - circuitBreaker.js  CircuitBreaker + 按 label 分组的注册表
//   - prompts.js         buildParsePrompt + buildJudgePrompt
//   - modelConfig.js     getModelConfig + buildRequestBody + 模型识别工具
//   - httpClient.js      callOpenAICompatible（限流+熔断+重试+超时+日志）
//   - decisionLogger.js  createDecisionLogger（把 orchestrator 事件翻译成中文日志）
//   - parser.js          createConfiguredParser（fast path + 缓存 + parseWithModels 编排）
export { buildParsePrompt } from './llm/prompts.js';
export { createConfiguredParser } from './llm/parser.js';
