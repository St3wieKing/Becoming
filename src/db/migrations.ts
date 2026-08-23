import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = row?.user_version ?? 0;
  if (currentDbVersion >= DATABASE_VERSION) return;
  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      CREATE TABLE IF NOT EXISTS visions (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        horizon_years INTEGER NOT NULL DEFAULT 5,
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY NOT NULL,
        vision_id TEXT REFERENCES visions(id),
        title TEXT NOT NULL,
        smart_specific TEXT,
        smart_measurable TEXT,
        smart_achievable TEXT,
        smart_relevant TEXT,
        deadline TEXT,
        difficulty TEXT NOT NULL DEFAULT 'moderate',
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'healthy',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY NOT NULL,
        goal_id TEXT NOT NULL REFERENCES goals(id),
        title TEXT NOT NULL,
        due_date TEXT,
        done INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        goal_id TEXT REFERENCES goals(id),
        milestone_id TEXT REFERENCES milestones(id),
        title TEXT NOT NULL,
        estimate_min INTEGER NOT NULL DEFAULT 30,
        difficulty TEXT NOT NULL DEFAULT 'moderate',
        priority TEXT NOT NULL DEFAULT 'medium',
        scheduled_date TEXT,
        done_at TEXT,
        skip_reason TEXT,
        note TEXT,
        is_frog INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS completions (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        date TEXT NOT NULL,
        done INTEGER NOT NULL,
        reason TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS coin_tx (
        id TEXT PRIMARY KEY NOT NULL,
        amount INTEGER NOT NULL CHECK (amount != 0),
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        start_min INTEGER NOT NULL,
        end_min INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT 'internal'
      );
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    currentDbVersion = 1;
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
