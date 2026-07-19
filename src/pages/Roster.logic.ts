import { z } from 'zod';
import { SHIFT_CODES, SHIFT_META } from './Roster.data';
import type { ShiftCode } from './Roster.data';

/**
 * Roster.logic — pure, tested helpers for the monthly duty roster.
 * Everything here is deterministic: same inputs, same roster, so the demo
 * data never flickers between renders and the tests can pin behaviour.
 */

/** One month of codes per employee id — index 0 is day 1. */
export type RosterGrid = Record<string, ShiftCode[]>;

/** Days in a month; `month0` is 0-based (0 = January). */
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** `July 2026` — the roster's masthead. */
export function monthLabel(year: number, month0: number): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    new Date(year, month0, 1),
  );
}

/** Day of week for a date, 0 = Sunday … 6 = Saturday. */
export function weekdayOf(year: number, month0: number, day: number): number {
  return new Date(year, month0, day).getDay();
}

/** Oman weekend: Friday (5) and Saturday (6). */
export function isWeekend(dow: number): boolean {
  return dow === 5 || dow === 6;
}

/** Single-letter column header for a weekday. */
const DOW_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export function dowLetter(dow: number): string {
  return DOW_LETTER[((dow % 7) + 7) % 7] ?? '';
}

/** Cheap deterministic hash so each employee gets a stable cycle offset. */
function hashOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

/**
 * The demo month: a rotating 5-on / 2-off duty cycle offset per employee,
 * with deterministic sprinkles of leave so every family appears —
 * production reads the saved roster from Supabase under RLS instead.
 */
export function defaultRoster(empIds: ReadonlyArray<string>, year: number, month0: number): RosterGrid {
  const days = daysInMonth(year, month0);
  const grid: RosterGrid = {};
  for (const id of empIds) {
    const h = hashOf(id);
    const row: ShiftCode[] = [];
    for (let day = 1; day <= days; day += 1) {
      const cyc = (day + h) % 7;
      row.push(cyc === 5 || cyc === 6 ? 'OFF' : 'F');
    }
    // A block of planned leave for some of the crew.
    if (h % 5 === 0) {
      const start = (h % 16) + 3;
      const code: ShiftCode = h % 2 === 0 ? 'AI' : 'V';
      for (let d = start; d < Math.min(start + 5, days); d += 1) row[d] = code;
    }
    // One sick day on a duty day for a few.
    if (h % 7 === 3) {
      const at = (h % 20) + 2;
      if (row[at] === 'F') row[at] = 'S';
    }
    // Training on a rest day for a few — the extra-effort code.
    if (h % 9 === 4) {
      const idx = row.indexOf('OFF');
      if (idx >= 0) row[idx] = 'T';
    }
    grid[id] = row;
  }
  return grid;
}

/** Row totals: worked (duty + extra), rest days, and leave of any kind. */
export function tally(row: ReadonlyArray<ShiftCode>): { duty: number; rest: number; leave: number } {
  let duty = 0;
  let rest = 0;
  let leave = 0;
  for (const code of row) {
    const family = SHIFT_META[code].family;
    if (family === 'duty' || family === 'extra') duty += 1;
    else if (family === 'rest') rest += 1;
    else leave += 1;
  }
  return { duty, rest, leave };
}

/**
 * Stamp one day with one code across several rows at once — the painted
 * person first, then everyone who follows their schedule (a supervisor's
 * team). Returns the SAME grid object when nothing changed, so React
 * state updates stay cheap and memoised rows stay put.
 */
export function applyCode(
  grid: RosterGrid,
  ids: ReadonlyArray<string>,
  dayIdx: number,
  code: ShiftCode,
): RosterGrid {
  let next: RosterGrid | null = null;
  for (const id of ids) {
    const row = (next ?? grid)[id];
    if (!row || dayIdx < 0 || dayIdx >= row.length || row[dayIdx] === code) continue;
    const stamped = row.slice();
    stamped[dayIdx] = code;
    next = next ?? { ...grid };
    next[id] = stamped;
  }
  return next ?? grid;
}

/** How many of the crew are working on a given day (0-based index). */
export function coverage(grid: RosterGrid, empIds: ReadonlyArray<string>, dayIdx: number): number {
  let n = 0;
  for (const id of empIds) {
    const code = grid[id]?.[dayIdx];
    if (code === undefined) continue;
    const family = SHIFT_META[code].family;
    if (family === 'duty' || family === 'extra') n += 1;
  }
  return n;
}

/** CSV escaping per RFC 4180 — quote when the field needs it. */
export function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The exportable sheet: one header row, one row per employee. */
export function toCsv(
  rows: ReadonlyArray<{ name: string; no: string; codes: ReadonlyArray<ShiftCode> }>,
  year: number,
  month0: number,
): string {
  const days = daysInMonth(year, month0);
  const header = ['Employee', 'No', ...Array.from({ length: days }, (_, i) => String(i + 1))];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([csvField(r.name), csvField(r.no), ...r.codes.slice(0, days)].join(','));
  }
  return lines.join('\r\n');
}

/** The canonical storage key one month of one project's roster lives under. */
export function rosterStoreKey(project: string, year: number, month0: number): string {
  return `sgs-roster-v1:${project}:${year}-${String(month0 + 1).padStart(2, '0')}`;
}

/**
 * The month's grid as every page must see it: stored rows win when they
 * cover the exact month, the deterministic default fills the rest.
 * `read` is injected so tests never touch storage.
 */
export function loadRosterGrid(
  project: string,
  year: number,
  month0: number,
  empIds: ReadonlyArray<string>,
  read: (key: string) => string | null,
): RosterGrid {
  const base = defaultRoster(empIds, year, month0);
  const stored = parseStoredRoster(read(rosterStoreKey(project, year, month0)));
  if (!stored) return base;
  const days = daysInMonth(year, month0);
  const merged: RosterGrid = { ...base };
  for (const id of empIds) {
    const row = stored[id];
    if (row && row.length === days) merged[id] = [...row];
  }
  return merged;
}

/** Stored rosters cross a trust boundary (localStorage → JSON.parse), so
 *  they are `unknown` until this schema accepts them (charter §2). */
export const RosterStoreSchema = z.record(z.string().min(1), z.array(z.enum(SHIFT_CODES)).max(31));

/** Parse a stored roster; anything unexpected → null (caller falls back to
 *  the default roster — a corrupt entry is a handled case, not a crash). */
export function parseStoredRoster(raw: string | null): RosterGrid | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null; // handled: not JSON → treat as no saved roster
  }
  const res = RosterStoreSchema.safeParse(json);
  return res.success ? res.data : null;
}
