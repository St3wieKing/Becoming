export interface AchievementDef {
  key: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_step', title: 'First Step', description: 'Complete your first action.' },
  { key: 'frog_hunter', title: 'Frog Hunter', description: 'Eat 10 Frogs.' },
  { key: 'finisher', title: 'Finisher', description: 'Complete your first major goal.' },
  { key: 'consistent', title: 'Consistent', description: 'Keep a 7-day action streak.' },
];

export function streakFromDates(datesDesc: string[], todayISODate: string): number {
  if (datesDesc.length === 0) return 0;
  let expected = new Date(`${todayISODate}T00:00:00`);
  const first = new Date(`${datesDesc[0]}T00:00:00`);
  const gapDays = Math.round((expected.getTime() - first.getTime()) / 86400000);
  if (gapDays > 1) return 0;
  let streak = 0;
  for (const d of datesDesc) {
    const cur = new Date(`${d}T00:00:00`);
    if (cur.getTime() === expected.getTime()) {
      streak += 1;
      expected = new Date(expected.getTime() - 86400000);
    } else if (cur.getTime() < expected.getTime()) {
      break;
    }
  }
  return streak;
}

export interface NewlyUnlocked {
  key: string;
  title: string;
}

export async function maybeAward(
  db: import('expo-sqlite').SQLiteDatabase,
  todayISODate: string,
): Promise<NewlyUnlocked[]> {
  const { unlockedAchievements, unlockAchievements, totalDoneCount, frogDoneTotal, distinctDoneDates, completedGoalsCount } =
    await import('@/db/repo');
  const have = new Set(await unlockedAchievements(db));
  const out: NewlyUnlocked[] = [];
  const total = await totalDoneCount(db);
  const frogs = await frogDoneTotal(db);
  const streak = streakFromDates(await distinctDoneDates(db), todayISODate);
  const goalsDone = await completedGoalsCount(db);
  const test = (key: string, cond: boolean) => {
    if (!cond || have.has(key)) return;
    const def = ACHIEVEMENTS.find((a) => a.key === key);
    if (def) out.push({ key: def.key, title: def.title });
  };
  test('first_step', total >= 1);
  test('frog_hunter', frogs >= 10);
  test('consistent', streak >= 7);
  test('finisher', goalsDone >= 1);
  if (out.length > 0) {
    await unlockAchievements(db, out.map((o) => o.key));
  }
  return out;
}

