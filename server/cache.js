/**
 * LRU Cache with TTL
 * 基于 Map 实现，支持过期自动清理
 */

class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 60 * 60 * 1000; // 默认1小时
    this.map = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      this.stats.misses++;
      return undefined;
    }
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttlMs) {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);

    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict least recently used (first item)
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
      this.stats.evictions++;
    }

    this.map.set(key, { value, expiresAt });
  }

  has(key) {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    return this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  getStats() {
    return {
      ...this.stats,
      size: this.map.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)).toFixed(4)
        : 0
    };
  }

  /**
   * 清理所有过期条目
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
      }
    }
  }
}

// 全局单例
const parseCache = new LRUCache({
  maxSize: Number(process.env.PARSE_CACHE_SIZE || 1000),
  defaultTTL: Number(process.env.PARSE_CACHE_TTL || 60 * 60 * 1000) // 1小时
});

/**
 * 计算文本的缓存 key（稳定 hash）
 */
export function hashText(text) {
  let hash = 0;
  const str = String(text || '').trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `parse_${hash}`;
}

/**
 * 判断是否为短输入（快速通道）
 * - 文本长度 < 20 字
 * - 且食物项预估 <= 2 个
 */
export function isShortInput(text) {
  const str = String(text || '').trim();
  if (str.length > 20) return false;
  // 简单估算食物项数：逗号/顿号/空格分隔的数量
  const separators = /[,，、\s]+/;
  const segments = str.split(separators).filter(s => s.length > 0);
  return segments.length <= 2;
}

export { parseCache, LRUCache };
