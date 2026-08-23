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
