// 所有 INSERT/UPSERT prepared statements 的集中工厂。
// 每个 createRepository 实例自己持有一份，避免跨实例共享 statement handle。

export function createStatements(db) {
  return {
    insertEntry: db.prepare(`
      INSERT INTO food_entries (
        recorded_at, raw_text, parse_source, parse_status, llm_total_calories,
        final_total_calories, need_review, review_reason, ignored_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    insertFoodItem: db.prepare(`
      INSERT INTO food_items (
        entry_id, raw_text, name, quantity, unit, calories, status,
        need_review, review_reason, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    insertWater: db.prepare(`
      INSERT INTO water_entries (
        recorded_at, entry_id, source_type, raw_text, amount_ml, status,
        need_review, review_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    insertWeight: db.prepare(`
      INSERT INTO weight_entries (
        recorded_at, date, weight_kg, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `),

    // 同 alias 第二次出现时 use_count + 1；其余字段被新值覆盖。
    upsertFoodAlias: db.prepare(`
      INSERT INTO food_aliases (
        alias, name, default_unit, calories_per_unit, confidence, source,
        use_count, last_used_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'auto', ?, 1, ?, ?, ?)
      ON CONFLICT(alias) DO UPDATE SET
        name = excluded.name,
        default_unit = excluded.default_unit,
        calories_per_unit = excluded.calories_per_unit,
        source = excluded.source,
        use_count = food_aliases.use_count + 1,
        last_used_at = excluded.last_used_at,
        updated_at = excluded.updated_at
    `)
  };
}
