# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

Diet Tracker 是一个本地运行的饮食、饮水和体重记录 Web 应用。前端使用 React 19 + TypeScript + Vite + Tailwind CSS v4，后端是原生 Node.js HTTP 服务，并通过 `node:sqlite` 使用 SQLite。应用主要面向本地使用，运行数据保存在 `data/diet.sqlite`。

## 常用命令

在 Windows PowerShell 中，如果 `npm` 被解析为 `npm.ps1` 并触发执行策略问题，优先使用 `npm.cmd`。

```bash
npm install
npm run dev      # 启动 Vite 开发服务：http://127.0.0.1:5173，/api 代理到 127.0.0.1:3000
npm start        # 启动 Node 后端，端口来自 .env 的 PORT，默认 3000
npm run build    # 构建前端到 public/
npm test         # 运行全部 Node 测试
node --test test/parser.test.js      # 运行单个测试文件
node --test --test-name-pattern "preview parses" test/api.test.js  # 按名称匹配运行测试
```

也可以直接启动后端：

```bash
node server/index.js
```

Windows 本地启动脚本：

```powershell
.\start-diet-tracker.bat
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\start-diet-tracker-clean-env.ps1 -Background
```

`package.json` 中没有 lint 脚本。前端类型和构建校验主要使用 `npm run build`，后端和解析逻辑校验使用 `npm test`。

## 架构要点

- `server/index.js` 负责加载 `.env`、创建 SQLite 数据库、创建 repository、配置 parser，并启动 HTTP 服务。
- `server/app.js`、`server/repository.js`、`server/llmClient.js`、`server/parser/orchestrator.js`、`server/parser/foodLibrary.js` 都是薄 **barrel re-export** 文件，公开 API 不变。真正的实现拆在同名子目录里，每个子文件单一职责：
  - `server/app/` — `httpUtils`、`static`、`normalize`，以及 `routes/` 下按业务域拆分的路由文件。`app/index.js` 是 `createApp`，按顺序调度每组路由处理器，未命中走静态资源。
  - `server/repository/` — `time`、`mappers`、`aliasNormalize`、`statements`，以及按业务域拆分的 `aliases`、`foodEntries`、`foodItems`、`waterEntries`、`weightEntries`、`summaries`、`parseLogs`、`clearAll`。`repository/index.js` 是 `createRepository` 工厂，按依赖顺序组装这些模块。
  - `server/llm/` — `rateLimiter`、`circuitBreaker`、`prompts`、`modelConfig`、`httpClient`、`decisionLogger`、`parser`。`llm/parser.js` 是 `createConfiguredParser`：负责 fast path、缓存、调用 `parseWithModels` 编排。
  - `server/parser/orchestrator/` — `fuzzyMatch`、`quantityCompare`、`modelNormalize`、`diffAnalysis`、`judgeValidation`，以及主入口 `index.js`（`parseWithModels` + `compareFinalCalories`）。
  - `server/parser/foodLibrary/` — `builtinFoods`（170+ 食物）、`nameAliases`、`runtimeAliases`、`lookup`、`calorieRange`、`applyLibrary`。
- `server/db.js` 初始化 SQLite 表结构并执行轻量迁移。运行时数据默认写入 `data/diet.sqlite`；测试通常使用 `createDatabase(':memory:')`。
- LLM 解析契约会把 `foodItems` 和零热量 `waterItems` 分开；有热量饮品应进入 `foodItems`。`finalTotalCalories` 不包含饮水。
- 前端源码在 `client/src/`：
  - `App.tsx` 是顶层组合层，持有共享状态（`submitting`、`selectedDate`、`weightKg` 等）并把 hooks 组合起来。
  - `client/src/hooks/` — `useDailyData`、`useFoodEntry`、`useWaterActions`、`useMutations`、`useResetData`。每个 hook 接收公共依赖（`refresh`、`isSubmitting`、`setMessage` 等）作为参数，避免在多个 hook 间隐式共享状态。
  - `client/src/utils.ts` 是 barrel re-export，真正实现拆在 `client/src/utils/` 下：`date`、`metrics`、`tone`、`chart`。
- 前端请求统一通过 `client/src/api.ts`，该封装期望服务端返回 JSON，并在失败时抛出 `body.error.message`。
- Vite 配置使用 `root: 'client'`，构建输出到 `public/`，开发时把 `/api` 代理到后端 3000 端口。

## 关键业务流程

- 食物文本提交在 UI 中是两步流程：先调用 `POST /api/food-entries/preview` 解析但不保存，再把用户确认或编辑后的 `parsed` 草稿提交到 `POST /api/food-entries`。
- 解析预览中编辑食物名称会调用 `POST /api/food-entries/recalculate`；如果食物库未匹配，后端可能再次调用配置好的 parser 来兜底估算热量。
- 修改已保存食物项时，`PUT /api/food-items/:id` 会重算父级饮食记录总热量。传入 `saveToFoodLibrary: true` 时，修正后的食物会保存到用户食物库，用于后续匹配。
- 同一天可以保存多条体重记录；汇总中展示日均体重，并会把最近一次已知体重延续到后续日期汇总。
- 创建 repository 时会从 `foods` 和 `food_aliases` 加载运行时食物别名；依赖别名状态的测试会调用 `resetRuntimeFoodAliases()` 清理全局状态。

## 测试说明

测试使用 Node 内置的 `node:test`，位于 `test/`：

- `api.test.js` 启动临时 HTTP 服务和内存 SQLite，测试 API 行为。
- `repository.test.js` 测试持久化、汇总、别名学习和重算逻辑。
- `parser.test.js` 测试规则解析、LLM schema 校验，以及用 mock 模型调用测试编排决策。
- `llmClient.test.js` mock `globalThis.fetch` 和日志文件，测试 LLM 客户端行为。
- `config.test.js` 和 `logger.test.js` 覆盖本地 `.env` 解析与日志输出。

修改 parser、repository、API 或时间/日期逻辑时，先运行相关单个测试文件；影响范围较大时再运行 `npm test`。

## 环境变量和本地生成文件

`.env` 由 `server/config.js` 手动加载；如果同名环境变量已经存在，不会被 `.env` 覆盖。常见变量包括 `PORT`、`LLM_A_*`、`LLM_B_*`、`LLM_C_*`、`LLM_TIMEOUT_MS`、`LLM_READABLE_LOG_FILE`、缓存配置，以及 L2/L4 校验开关。

需要谨慎处理的本地状态：

- `data/diet.sqlite` 保存用户本地饮食、饮水、体重和食物库记录。
- `logs/`、`server.log`、`server.err.log` 是运行日志。
- `public/assets/` 是前端构建产物。
- `.env` 可能包含本地 API Key 和端口配置。
