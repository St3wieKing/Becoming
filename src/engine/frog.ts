import type { Difficulty, Priority, Task } from '@/core/types';

const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 50,
  high: 40,
  medium: 25,
  low: 10,
  someday: 5,
};

const DIFFICULTY_BONUS: Record<Difficulty, number> = {
  easy: 2,
  moderate: 6,
  hard: 10,
  extreme: 14,
};

export function pickFrog(tasks: Task[]): Task | null {
  const candidates = tasks.filter((t) => !t.doneAt && !t.skipReason);
  if (candidates.length === 0) return null;
  let best: Task | null = null;
  let bestScore = -Infinity;
  for (const t of candidates) {
    const score =
      PRIORITY_WEIGHT[t.priority] + DIFFICULTY_BONUS[t.difficulty] + (t.goalId ? 8 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

export function frogWhy(frog: Task): string {
  const parts: string[] = [`priority ${frog.priority}`];
  if (frog.goalTitle) parts.push(`supports "${frog.goalTitle}"`);
  parts.push(`${frog.estimateMin} min`);
  return parts.join(' · ');
}
