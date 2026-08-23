import { fmtMin, parseHHMM } from '@/core/util';
import type { EventItem } from '@/core/types';

export interface DayWindow {
  startMin: number;
  endMin: number;
}

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function parseDayList(raw: string): number[] | null {
  const s = raw.trim().toLowerCase();
  if (s === 'daily' || s === 'everyday') return [0, 1, 2, 3, 4, 5, 6];
  if (s === 'weekends') return [0, 6];
  if (s === 'weekdays') return [1, 2, 3, 4, 5];
  const out = new Set<number>();
  for (const part of s.split(',')) {
    const piece = part.trim();
    const range = /^([a-z]{3})-([a-z]{3})$/.exec(piece);
    if (range) {
      const from = DAY_NAMES.indexOf(range[1] ?? '');
      const to = DAY_NAMES.indexOf(range[2] ?? '');
      if (from < 0 || to < 0) return null;
      let i = from;
      for (;;) {
        out.add(i);
        if (i === to) break;
        i = (i + 1) % 7;
      }
    } else if (/^[a-z]{3}$/.test(piece)) {
      const idx = DAY_NAMES.indexOf(piece);
      if (idx < 0) return null;
      out.add(idx);
    } else {
      return null;
    }
  }
  return out.size > 0 ? [...out].sort() : null;
}

export function parsePattern(raw: string): { days: number[]; startMin: number; endMin: number } | null {
  const m = /^(.+?)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const days = parseDayList(m[1] ?? '');
  if (!days || days.length === 0) return null;
  const startMin = parseHHMM(m[2] ?? '');
  const endMin = parseHHMM(m[3] ?? '');
  if (startMin === null || endMin === null || endMin <= startMin) return null;
  return { days, startMin, endMin };
}

function mergeBusy(busy: DayWindow[]): DayWindow[] {
  const sorted = [...busy].sort((a, b) => a.startMin - b.startMin);
  const merged: DayWindow[] = [];
  for (const w of sorted) {
    const last = merged[merged.length - 1];
    if (last && w.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, w.endMin);
    } else {
      merged.push({ ...w });
    }
  }
  return merged;
}

export function findSlots(
  availability: DayWindow[],
  busy: DayWindow[],
  durationMin: number,
): DayWindow[] {
  const blocked = mergeBusy(busy);
  const slots: DayWindow[] = [];
  for (const win of [...availability].sort((a, b) => a.startMin - b.startMin)) {
    let cursor = win.startMin;
    for (const b of blocked) {
      if (b.endMin <= cursor || b.startMin >= win.endMin) continue;
      if (b.startMin - cursor >= durationMin) {
        slots.push({ startMin: cursor, endMin: cursor + durationMin });
      }
      cursor = Math.max(cursor, b.endMin);
    }
    if (win.endMin - cursor >= durationMin) {
      slots.push({ startMin: cursor, endMin: cursor + durationMin });
    }
  }
  return slots;
}

export function eventsAsBusy(events: EventItem[]): DayWindow[] {
  return events.map((e) => ({ startMin: e.startMin, endMin: e.endMin }));
}

export function describeSlot(slot: DayWindow): string {
  return `${fmtMin(slot.startMin)}–${fmtMin(slot.endMin)}`;
}
