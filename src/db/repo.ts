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
