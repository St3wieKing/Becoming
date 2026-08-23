import type { SQLiteDatabase } from 'expo-sqlite';

import { remoteChat } from '@/ai/remote';
import { coinBalance, listAvailability, listGoals, tasksForDate, upcomingEvents } from '@/db/repo';
import { eventsAsBusy, findSlots, describeSlot } from '@/core/schedule';
import { assessHealth } from '@/engine/health';
import { frogWhy, pickFrog } from '@/engine/frog';
import { todayISO } from '@/core/util';

interface CoachContext {
  frogLine: string | null;
  risky: string[];
  freeLine: string;
  coins: number;
  goalTitles: string[];
}

async function gather(db: SQLiteDatabase): Promise<CoachContext> {
  const today = todayISO();
  const goals = await listGoals(db);
  const active = goals.filter((g) => g.status !== 'completed' && g.status !== 'abandoned');
  let risky: string[] = [];
  for (const g of active.slice(0, 10)) {
    const a = assessHealth({
      status: g.status,
      deadline: g.deadline,
      todayISO: today,
      completedCount: 0,
      missedCount: 0,
    });
    if (a.status !== 'healthy') {
      risky.push(`${g.title}: ${a.status.replace(/_/g, ' ')}${g.deadline ? ` (deadline ${g.deadline})` : ''}`);
    }
  }
  const tasks = await tasksForDate(db, today);
  const frog = pickFrog(tasks);
  const dow = new Date().getDay();
  const windows = (await listAvailability(db))
    .filter((w) => w.days.includes(dow))
    .map((w) => ({ startMin: w.startMin, endMin: w.endMin }));
  const busy = eventsAsBusy((await upcomingEvents(db, today)).filter((e) => e.date === today));
  const slots = findSlots(windows, busy, Math.max(15, Math.min(60, frog?.estimateMin ?? 30)));
  return {
    frogLine: frog ? `${frog.title} — ${frogWhy(frog)}` : null,
    risky,
    freeLine:
      slots.length > 0
        ? `Next open slot today: ${describeSlot(slots[0])}`
        : windows.length > 0
          ? 'No open slot matches your availability today.'
          : 'No availability patterns saved yet.',
    coins: await coinBalance(db),
    goalTitles: active.map((g) => g.title),
  };
}

function ctxSummary(ctx: CoachContext): string {
  return [
    `Active goals: ${ctx.goalTitles.join('; ') || 'none'}`,
    `Today's Frog: ${ctx.frogLine ?? 'none scheduled'}`,
    `Schedule: ${ctx.freeLine}`,
    `Goal health concerns: ${ctx.risky.join('; ') || 'none'}`,
    `Coins: ${ctx.coins}`,
  ].join('\n');
}

const HELP_TEXT =
  'I can help with:\n· "What should my Frog be?"\n· "Which goals are at risk?"\n· "When do I have time today?"\n· "How many coins do I have?"\nSet an AI key in .env for full conversational coaching.';

export function heuristicAnswer(text: string, ctx: CoachContext): string {
  const t = text.toLowerCase();
  if (/frog|most important|first|priority/.test(t)) {
    return ctx.frogLine ? `Your Frog: ${ctx.frogLine}` : 'Nothing is scheduled for today yet. Add a goal with a first action.';
  }
  if (/risk|behind|worried|health|struggl/.test(t)) {
    return ctx.risky.length > 0 ? `At-risk goals:\n· ${ctx.risky.join('\n· ')}` : 'All active goals look healthy right now.';
  }
  if (/time|free|slot|schedule|when/.test(t)) {
    return ctx.freeLine;
  }
  if (/coin|reward|point/.test(t)) {
    return `You have ${ctx.coins} coins.`;
  }
  if (/smart|break|plan|milestone/.test(t)) {
    return 'Open a goal and tap "✨ Suggest SMART" — it drafts specific, measurable steps you can edit.';
  }
  if (/hi|hello|hey|help/.test(t)) {
    return HELP_TEXT;
  }
  return HELP_TEXT;
}

export async function askCoach(
  db: SQLiteDatabase,
  userText: string,
): Promise<{ text: string; source: 'offline-coach' | 'ai' }> {
  const ctx = await gather(db);
  if (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY) {
    try {
      const reply = await remoteChat(userText, ctxSummary(ctx));
      return { text: reply, source: 'ai' };
    } catch {}
  }
  return { text: heuristicAnswer(userText, ctx), source: 'offline-coach' };
}
