import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function createDatabase(filename = 'data/diet.sqlite') {
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true });
  }
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS food_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_at TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      parse_source TEXT NOT NULL,
      parse_status TEXT NOT NULL,
      llm_total_calories INTEGER NOT NULL DEFAULT 0,
      final_total_calories INTEGER NOT NULL DEFAULT 0,
      need_review INTEGER NOT NULL DEFAULT 0,
      review_reason TEXT NOT NULL DEFAULT '',
      ignored_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT '',
      calories INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      need_review INTEGER NOT NULL DEFAULT 0,
      review_reason TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(entry_id) REFERENCES food_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_at TEXT NOT NULL,
      entry_id INTEGER,
      source_type TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      status TEXT NOT NULL,
      need_review INTEGER NOT NULL DEFAULT 0,
      review_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(entry_id) REFERENCES food_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weight_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_at TEXT NOT NULL,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      alias TEXT NOT NULL DEFAULT '',
      default_unit TEXT NOT NULL DEFAULT '',
      calories_per_unit INTEGER NOT NULL,
      confidence TEXT NOT NULL DEFAULT 'medium',
      last_used_at TEXT,
      created_by TEXT NOT NULL DEFAULT 'builtin',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(name, default_unit)
    );

    CREATE TABLE IF NOT EXISTS food_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alias TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      default_unit TEXT NOT NULL DEFAULT '',
      calories_per_unit INTEGER NOT NULL DEFAULT 0,
      confidence TEXT NOT NULL DEFAULT 'auto',
      source TEXT NOT NULL DEFAULT 'auto',
      use_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parse_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      input TEXT NOT NULL,
      model_a_result TEXT,
      model_b_result TEXT,
      judge_result TEXT,
      final_result TEXT,
      status TEXT NOT NULL,
      food_overlap REAL,
      food_count_diff INTEGER,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS judge_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_label TEXT NOT NULL,
      event_type TEXT NOT NULL,
      food_name TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  const weightDateIsUnique = db.prepare("PRAGMA index_list('weight_entries')").all()
    .some(index => index.unique && index.origin === 'u');
  if (weightDateIsUnique) {
    db.exec(`
      ALTER TABLE weight_entries RENAME TO weight_entries_old;
      CREATE TABLE weight_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recorded_at TEXT NOT NULL,
        date TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO weight_entries (id, recorded_at, date, weight_kg, created_at, updated_at)
      SELECT id, recorded_at, date, weight_kg, created_at, updated_at
      FROM weight_entries_old;
      DROP TABLE weight_entries_old;
    `);
  }
}
