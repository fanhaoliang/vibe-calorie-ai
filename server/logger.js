import { appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS || 7);

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getDateString(date = new Date()) {
  const d = new Date(date.getTime() + 8 * 60 * 60 * 1000); // Asia/Shanghai
  return d.toISOString().slice(0, 10);
}

function getTimestamp() {
  const date = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}.${ms} 上海时间`;
}

function getLogFile(name) {
  // 支持环境变量覆盖日志文件路径（测试用）
  const isReadable = name.endsWith('-readable');
  const envOverride = isReadable ? process.env.LLM_READABLE_LOG_FILE : process.env.LLM_LOG_FILE;
  if (envOverride) return envOverride;

  ensureDir(LOG_DIR);
  return join(LOG_DIR, `${name}-${getDateString()}.log`);
}

function rotateLogs(name) {
  try {
    const files = readdirSync(LOG_DIR).filter(f => f.startsWith(`${name}-`) && f.endsWith('.log'));
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const file of files) {
      const stat = statSync(join(LOG_DIR, file));
      if (now - stat.mtime.getTime() > maxAge) {
        try { unlinkSync(join(LOG_DIR, file)); } catch {}
      }
    }
  } catch {
    // rotation is best effort
  }
}

/**
 * 写入日志（自动轮转，每天一个文件）
 * @param {string} name - 日志名称（如 'llm', 'llm-readable'）
 * @param {string} line - 日志内容
 */
export function writeLog(name, line) {
  const file = getLogFile(name);
  try {
    appendFileSync(file, `${line}\n`, 'utf8');
    // 每次写入后检查是否需要清理旧日志（低成本，实际清理频率不高）
    if (Math.random() < 0.01) rotateLogs(name);
  } catch {
    // logging is best effort
  }
}

/**
 * 结构化日志（JSON格式）
 */
export function logStructured(name, event, details = {}) {
  const line = `[${getTimestamp()}] ${event} ${JSON.stringify(details)}`;
  console.log(`[${name}] ${line}`);
  writeLog(name, line);
}

/**
 * 可读日志（人类友好格式）
 */
export function logReadable(name, message, details = {}) {
  const timestamp = getTimestamp();
  const data = Object.keys(details).length ? ` | data=${JSON.stringify(details)}` : '';
  const line = `[${name}] ${timestamp} ${message}${data}`;
  writeLog(`${name}-readable`, line);
}

/**
 * 复合事件：一次写出结构化 + 可读两条日志，避免调用方在两边重复传相同字段。
 *
 *   category   日志归类，作为文件名前缀（同 logStructured 的 name）
 *   event      事件名，写入 structured 行
 *   data       结构化数据
 *   readable   {category, message} 可选，省略时不写可读日志
 */
export function logEvent({ category, event, data = {}, readable }) {
  logStructured(category, event, data);
  if (readable) {
    logReadable(readable.category || 'llm', readable.message, data);
  }
}
