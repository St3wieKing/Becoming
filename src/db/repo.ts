import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Difficulty,
  EventItem,
  Goal,
  GoalStatus,
  Priority,
  SkipReason,
  Task,
} from '@/core/types';
import { uid } from '@/core/util';

function nowISO(): string {
  return new Date().toISOString();
}

interface GoalRow {
  id: string;
  vision_id: string | null;
  title: string;
  deadline: string | null;
  difficulty: Difficulty;
  priority: Priority;
  status: GoalStatus;
  created_at: string;
}

export async function createGoal(
  db: SQLiteDatabase,
  input: { title: string; priority: Priority; difficulty: Difficulty; deadline?: string },
): Promise<string> {
  const id = uid();
  await db.runAsync(
    'INSERT INTO goals (id, title, priority, difficulty, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.title, input.priority, input.difficulty, input.deadline ?? null, nowISO()],
  );
  return id;
}

export async function listGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    'SELECT id, vision_id, title, deadline, difficulty, priority, status, created_at FROM goals ORDER BY created_at DESC',
  );
  return rows.map((r) => ({
    id: r.id,
    visionId: r.vision_id ?? undefined,
    title: r.title,
    deadline: r.deadline ?? undefined,
    difficulty: r.difficulty,
    priority: r.priority,
    status: r.status,
    createdAt: r.created_at,
  }));
}

interface TaskRow {
  id: string;
  goal_id: string | null;
  goal_title: string | null;
  title: string;
  estimate_min: number;
  difficulty: Difficulty;
  priority: Priority;
  scheduled_date: string | null;
  done_at: string | null;
  skip_reason: SkipReason | null;
  note: string | null;
  is_frog: number;
  created_at: string;
}

function mapTask(r: TaskRow): Task {
  return {
    id: r.id,
    goalId: r.goal_id ?? undefined,
    goalTitle: r.goal_title ?? undefined,
    title: r.title,
    estimateMin: r.estimate_min,
    difficulty: r.difficulty,
    priority: r.priority,
    scheduledDate: r.scheduled_date ?? undefined,
    doneAt: r.done_at ?? undefined,
    skipReason: r.skip_reason ?? undefined,
    note: r.note ?? undefined,
    isFrog: r.is_frog === 1,
    createdAt: r.created_at,
  };
}

export async function addTask(
  db: SQLiteDatabase,
  input: {
    title: string;
    goalId?: string;
    estimateMin?: number;
    difficulty?: Difficulty;
    priority?: Priority;
    scheduledDate?: string;
  },
): Promise<string> {
  const id = uid();
  await db.runAsync(
    'INSERT INTO tasks (id, goal_id, title, estimate_min, difficulty, priority, scheduled_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      input.goalId ?? null,
      input.title,
      input.estimateMin ?? 30,
      input.difficulty ?? 'moderate',
      input.priority ?? 'medium',
      input.scheduledDate ?? null,
      nowISO(),
    ],
  );
  return id;
}

export async function tasksForDate(db: SQLiteDatabase, dateISO: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT t.*, g.title AS goal_title FROM tasks t LEFT JOIN goals g ON g.id = t.goal_id WHERE t.scheduled_date = ? ORDER BY t.created_at ASC',
    [dateISO],
  );
  return rows.map(mapTask);
}

export async function recordCompletion(
  db: SQLiteDatabase,
  input: {
    taskId: string;
    dateISO: string;
    done: boolean;
    reason?: SkipReason;
    note?: string;
    earnCoins: boolean;
    reward: number;
  },
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO completions (id, task_id, date, done, reason, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uid(), input.taskId, input.dateISO, input.done ? 1 : 0, input.reason ?? null, input.note ?? null, nowISO()],
    );
    if (input.done) {
      await db.runAsync('UPDATE tasks SET done_at = ?, skip_reason = NULL WHERE id = ?', [
        nowISO(),
        input.taskId,
      ]);
    } else {
      await db.runAsync('UPDATE tasks SET skip_reason = ? WHERE id = ?', [
        input.reason ?? 'other',
        input.taskId,
      ]);
    }
    if (input.done && input.earnCoins && input.reward > 0) {
      await db.runAsync('INSERT INTO coin_tx (id, amount, reason, created_at) VALUES (?, ?, ?, ?)', [
        uid(),
        input.reward,
        `Task completed`,
        nowISO(),
      ]);
    }
  });
}

export async function coinBalance(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(amount) AS total FROM coin_tx',
  );
  return row?.total ?? 0;
}

interface EventRow {
  id: string;
  title: string;
  date: string;
  start_min: number;
  end_min: number;
  source: 'internal' | 'external';
}

function mapEvent(r: EventRow): EventItem {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    startMin: r.start_min,
    endMin: r.end_min,
    source: r.source,
  };
}

export async function addEvent(
  db: SQLiteDatabase,
  input: { title: string; date: string; startMin: number; endMin: number },
): Promise<string> {
  const id = uid();
  await db.runAsync(
    'INSERT INTO events (id, title, date, start_min, end_min, source) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.title, input.date, input.startMin, input.endMin, 'internal'],
  );
  return id;
}

export async function upcomingEvents(db: SQLiteDatabase, fromDateISO: string): Promise<EventItem[]> {
  const rows = await db.getAllAsync<EventRow>(
    'SELECT id, title, date, start_min, end_min, source FROM events WHERE date >= ? ORDER BY date ASC, start_min ASC LIMIT 50',
    [fromDateISO],
  );
  return rows.map(mapEvent);
}

export interface AvailabilityWindow {
  id: string;
  label: string;
  days: number[];
  startMin: number;
  endMin: number;
}

export async function addAvailability(
  db: SQLiteDatabase,
  input: { label: string; days: number[]; startMin: number; endMin: number },
): Promise<string> {
  const id = uid();
  await db.runAsync('INSERT INTO availability (id, label, days, start_min, end_min) VALUES (?, ?, ?, ?, ?)', [
    id,
    input.label,
    JSON.stringify(input.days),
    input.startMin,
    input.endMin,
  ]);
  return id;
}

export async function listAvailability(db: SQLiteDatabase): Promise<AvailabilityWindow[]> {
  const rows = await db.getAllAsync<{ id: string; label: string; days: string; start_min: number; end_min: number }>(
    'SELECT id, label, days, start_min, end_min FROM availability',
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    days: JSON.parse(r.days) as number[],
    startMin: r.start_min,
    endMin: r.end_min,
  }));
}

export async function removeAvailability(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM availability WHERE id = ?', [id]);
}

export async function createVision(
  db: SQLiteDatabase,
  input: { title: string; horizonYears?: number; notes?: string },
): Promise<string> {
  const id = uid();
  await db.runAsync('INSERT INTO visions (id, title, horizon_years, notes, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    input.title,
    input.horizonYears ?? 5,
    input.notes ?? null,
    nowISO(),
  ]);
  return id;
}

export async function primaryVision(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{
    id: string;
    title: string;
    horizon_years: number;
    notes: string | null;
  }>('SELECT id, title, horizon_years, notes FROM visions ORDER BY created_at DESC LIMIT 1');
  if (!row) return null;
  return { id: row.id, title: row.title, horizonYears: row.horizon_years, notes: row.notes ?? undefined };
}

export async function getGoal(db: SQLiteDatabase, id: string): Promise<Goal | null> {
  const rows = await db.getAllAsync<GoalRow>('SELECT * FROM goals WHERE id = ?', [id]);
  const r = rows[0];
  if (!r) return null;
  const full = await db.getFirstAsync<{
    smart_specific: string | null;
    smart_measurable: string | null;
    smart_achievable: string | null;
    smart_relevant: string | null;
  }>('SELECT smart_specific, smart_measurable, smart_achievable, smart_relevant FROM goals WHERE id = ?', [id]);
  return {
    id: r.id,
    visionId: r.vision_id ?? undefined,
    title: r.title,
    deadline: r.deadline ?? undefined,
    difficulty: r.difficulty,
    priority: r.priority,
    status: r.status,
    createdAt: r.created_at,
    smart:
      full && (full.smart_specific || full.smart_measurable || full.smart_achievable || full.smart_relevant)
        ? {
            specific: full.smart_specific ?? '',
            measurable: full.smart_measurable ?? '',
            achievable: full.smart_achievable ?? '',
            relevant: full.smart_relevant ?? '',
          }
        : undefined,
  };
}

export async function updateGoal(
  db: SQLiteDatabase,
  id: string,
  patch: {
    title?: string;
    deadline?: string | null;
    status?: GoalStatus;
    smartSpecific?: string;
    smartMeasurable?: string;
    smartAchievable?: string;
    smartRelevant?: string;
  },
): Promise<void> {
  const sets: string[] = [];
  const params: (string | null)[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    params.push(patch.title);
  }
  if (patch.deadline !== undefined) {
    sets.push('deadline = ?');
    params.push(patch.deadline);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    params.push(patch.status);
  }
  if (patch.smartSpecific !== undefined) {
    sets.push('smart_specific = ?');
    params.push(patch.smartSpecific);
  }
  if (patch.smartMeasurable !== undefined) {
    sets.push('smart_measurable = ?');
    params.push(patch.smartMeasurable);
  }
  if (patch.smartAchievable !== undefined) {
    sets.push('smart_achievable = ?');
    params.push(patch.smartAchievable);
  }
  if (patch.smartRelevant !== undefined) {
    sets.push('smart_relevant = ?');
    params.push(patch.smartRelevant);
  }
  if (sets.length === 0) return;
  params.push(id);
  await db.runAsync(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function addMilestone(
  db: SQLiteDatabase,
  input: { goalId: string; title: string; dueDate?: string },
): Promise<string> {
  const id = uid();
  await db.runAsync('INSERT INTO milestones (id, goal_id, title, due_date) VALUES (?, ?, ?, ?)', [
    id,
    input.goalId,
    input.title,
    input.dueDate ?? null,
  ]);
  return id;
}

export async function listMilestones(db: SQLiteDatabase, goalId: string) {
  return db.getAllAsync<{ id: string; goal_id: string; title: string; due_date: string | null; done: number }>(
    'SELECT id, goal_id, title, due_date, done FROM milestones WHERE goal_id = ? ORDER BY rowid ASC',
    [goalId],
  );
}

export async function toggleMilestone(db: SQLiteDatabase, id: string, done: boolean): Promise<void> {
  await db.runAsync('UPDATE milestones SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}

export async function tasksForGoal(db: SQLiteDatabase, goalId: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT t.*, NULL AS goal_title FROM tasks t WHERE t.goal_id = ? ORDER BY t.created_at ASC LIMIT 100',
    [goalId],
  );
  return rows.map((r) =>
    mapTask({ ...r, goal_title: r.goal_title ?? null }),
  );
}

export async function historyForGoal(
  db: SQLiteDatabase,
  goalId: string,
  limit = 30,
): Promise<{ date: string; done: boolean; reason: SkipReason | undefined; title: string }[]> {
  const rows = await db.getAllAsync<{ date: string; done: number; reason: SkipReason | null; title: string }>(
    'SELECT c.date, c.done, c.reason, t.title FROM completions c JOIN tasks t ON t.id = c.task_id WHERE t.goal_id = ? ORDER BY c.created_at DESC LIMIT ?',
    [goalId, limit],
  );
  return rows.map((r) => ({ date: r.date, done: r.done === 1, reason: r.reason ?? undefined, title: r.title }));
}

export async function weeklyStats(db: SQLiteDatabase, fromISO: string, toISO: string) {
  const done = await db.getFirstAsync<{ n: number | null }>(
    'SELECT COUNT(*) AS n FROM completions WHERE done = 1 AND date BETWEEN ? AND ?',
    [fromISO, toISO],
  );
  const missed = await db.getFirstAsync<{ n: number | null }>(
    'SELECT COUNT(*) AS n FROM completions WHERE done = 0 AND date BETWEEN ? AND ?',
    [fromISO, toISO],
  );
  const frogsDone = await db.getFirstAsync<{ n: number | null }>(
    'SELECT COUNT(*) AS n FROM completions c JOIN tasks t ON t.id = c.task_id WHERE c.done = 1 AND t.is_frog = 1 AND c.date BETWEEN ? AND ?',
    [fromISO, toISO],
  );
  return { completed: done?.n ?? 0, missed: missed?.n ?? 0, frogsDone: frogsDone?.n ?? 0 };
}

export async function distinctDoneDates(db: SQLiteDatabase, limit = 60): Promise<string[]> {
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM completions WHERE done = 1 ORDER BY date DESC LIMIT ?',
    [limit],
  );
  return rows.map((r) => r.date);
}

export async function totalDoneCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number | null }>('SELECT COUNT(*) AS n FROM completions WHERE done = 1');
  return row?.n ?? 0;
}

export async function kvGet(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function kvSet(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export interface CreatureRecord {
  id: string;
  name: string;
  species: string;
  state: string;
  stage: string;
  revivals: number;
  lastActiveDate: string;
}

export async function getCreature(db: SQLiteDatabase): Promise<CreatureRecord | null> {
  const row = await db.getFirstAsync<{
    id: string;
    name: string;
    species: string;
    state: string;
    stage: string;
    revivals: number;
    last_active_date: string;
  }>('SELECT id, name, species, state, stage, revivals, last_active_date FROM creatures LIMIT 1');
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    state: row.state,
    stage: row.stage,
    revivals: row.revivals,
    lastActiveDate: row.last_active_date,
  };
}

export async function saveCreature(db: SQLiteDatabase, creature: CreatureRecord): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO creatures (id, name, species, state, stage, revivals, last_active_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [creature.id, creature.name, creature.species, creature.state, creature.stage, creature.revivals, creature.lastActiveDate],
  );
}

export async function unlockedAchievements(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ key: string }>('SELECT key FROM unlocked_achievements');
  return rows.map((r) => r.key);
}

export async function unlockAchievements(db: SQLiteDatabase, keys: string[]): Promise<void> {
  for (const key of keys) {
    await db.runAsync('INSERT OR IGNORE INTO unlocked_achievements (key, unlocked_at) VALUES (?, ?)', [
      key,
      nowISO(),
    ]);
  }
}
