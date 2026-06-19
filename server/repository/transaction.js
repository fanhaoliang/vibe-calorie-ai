// @ts-check
/**
 * 把一段写操作包在 SQLite 事务里。
 * 回调抛错时自动 ROLLBACK，否则 COMMIT。
 *
 * node:sqlite 的 DatabaseSync 暴露 BEGIN/COMMIT/ROLLBACK 通过 db.exec，
 * 这里把这套样板封到一处，避免每个调用方都写 try/catch。
 *
 * @template T
 * @param {{ exec(sql: string): unknown }} db
 * @param {() => T} fn
 * @returns {T}
 */
export function withTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
