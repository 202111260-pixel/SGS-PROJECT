import { z } from 'zod';
import { SHIFT_META } from './Roster.data';
import type { ShiftCode, ShiftFamily } from './Roster.data';
import { csvField, daysInMonth } from './Roster.logic';
import type { CertStatus } from './Competency.types';

/**
 * Team.logic — pure, tested helpers for the supervisor's one-place team
 * timesheet: the calendar shape of a month, the alert rule for documents,
 * field shifts and worked hours, the stored crew/shift trust boundaries,
 * and the per-member exportable sheet.
 */

/* ── field shifts: two fixed 12-hour windows, morning or night ── */

export type ShiftKind = 'day' | 'night';

export const HOURS_PER_SHIFT = 12;

export const SHIFT_WINDOW: Record<ShiftKind, { label: string; span: string }> = {
  day: { label: 'Day', span: '06:00 – 18:00' },
  night: { label: 'Night', span: '18:00 – 06:00' },
};

/** The default punch times each shift implies. */
export const SHIFT_TIMES: Record<ShiftKind, DayHours> = {
  day: { start: '06:00', end: '18:00' },
  night: { start: '18:00', end: '06:00' },
};

/** Is this a worked day (duty or extra effort)? */
export function isWorked(code: ShiftCode): boolean {
  const family = SHIFT_META[code].family;
  return family === 'duty' || family === 'extra';
}

/** Worked hours for a month row: every worked day is one 12-hour shift. */
export function hoursOf(row: ReadonlyArray<ShiftCode>): number {
  return row.filter(isWorked).length * HOURS_PER_SHIFT;
}

/* ── per-day working hours: precise start/end, overnight-aware ── */

/** One day's exact working window, `HH:MM` both ends. */
export type DayHours = { start: string; end: string };

/** 'HH:MM' → minutes since midnight; null when malformed. */
export function toMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** Minutes between start and end; an end at or before the start rolls past
 *  midnight (night shift). Equal times are a mistake, not a 24-hour day. */
export function spanMinutes(start: string, end: string): number | null {
  const a = toMinutes(start);
  const b = toMinutes(end);
  if (a === null || b === null) return null;
  const diff = b - a;
  if (diff === 0) return null;
  return diff > 0 ? diff : diff + 24 * 60;
}

/** `12h` / `7h 30m` — a duration in human form. */
export function spanLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** The minutes one day contributes: nothing unless worked; the override
 *  when one is set and valid; the standard 12-hour shift otherwise. */
export function dayMinutes(code: ShiftCode, override: DayHours | undefined): number {
  if (!isWorked(code)) return 0;
  if (override) {
    const span = spanMinutes(override.start, override.end);
    if (span !== null) return span;
  }
  return HOURS_PER_SHIFT * 60;
}

/** The whole month in minutes, overrides included (keys are day numbers). */
export function monthMinutes(
  row: ReadonlyArray<ShiftCode>,
  overrides: Record<string, DayHours> | undefined,
): number {
  let total = 0;
  row.forEach((code, i) => {
    total += dayMinutes(code, overrides?.[String(i + 1)]);
  });
  return total;
}

/* ── duty derivations: the facts a manager actually asks ── */

/** The consecutive worked run containing dayIdx: its length and where the
 *  day sits inside it (1-based). Null when that day is not worked. */
export function dutyRun(
  row: ReadonlyArray<ShiftCode>,
  dayIdx: number,
): { len: number; pos: number } | null {
  const code = row[dayIdx];
  if (code === undefined || !isWorked(code)) return null;
  let start = dayIdx;
  while (start > 0 && isWorked(row[start - 1] ?? 'OFF')) start -= 1;
  let end = dayIdx;
  while (end < row.length - 1 && isWorked(row[end + 1] ?? 'OFF')) end += 1;
  return { len: end - start + 1, pos: dayIdx - start + 1 };
}

/** First index at or after `from` whose family is in `families`; null when
 *  the month has none left. */
export function nextOfFamily(
  row: ReadonlyArray<ShiftCode>,
  from: number,
  families: ReadonlyArray<ShiftFamily>,
): number | null {
  for (let i = Math.max(from, 0); i < row.length; i += 1) {
    const code = row[i];
    if (code !== undefined && families.includes(SHIFT_META[code].family)) return i;
  }
  return null;
}

/** How many consecutive days from `from` keep the same code (leave spans). */
export function sameCodeRun(row: ReadonlyArray<ShiftCode>, from: number): number {
  const code = row[from];
  if (code === undefined) return 0;
  let n = 1;
  while (from + n < row.length && row[from + n] === code) n += 1;
  return n;
}

/* ── the schedule composer: a work pattern becomes a month ── */

export type WorkPattern = { label: string; on: number; off: number };

/** The rotations the field actually runs. */
export const PATTERNS: ReadonlyArray<WorkPattern> = [
  { label: '5 on · 2 off', on: 5, off: 2 },
  { label: '6 on · 1 off', on: 6, off: 1 },
  { label: '4 on · 3 off', on: 4, off: 3 },
  { label: '14 on · 7 off', on: 14, off: 7 },
  { label: '21 on · 7 off', on: 21, off: 7 },
];

/** Generate a month from a rotation: `on` duty days then `off` rest days,
 *  cycling from day 1. Nonsense inputs degrade safely. */
export function buildPattern(days: number, on: number, off: number): ShiftCode[] {
  const safeOn = Math.max(0, Math.floor(on));
  const safeOff = Math.max(0, Math.floor(off));
  const cycle = safeOn + safeOff;
  const row: ShiftCode[] = [];
  for (let i = 0; i < Math.max(0, days); i += 1) {
    row.push(cycle === 0 || i % cycle < safeOn ? 'F' : 'OFF');
  }
  return row;
}

/** The month compressed to its true shape: consecutive same-code spans,
 *  every day accounted for (`from`/`to` are 1-based day numbers). */
export type MonthSpan = { from: number; to: number; code: ShiftCode; days: number };

export function monthSpans(row: ReadonlyArray<ShiftCode>): MonthSpan[] {
  const out: MonthSpan[] = [];
  let i = 0;
  while (i < row.length) {
    const code = row[i];
    if (code === undefined) break;
    const days = sameCodeRun(row, i);
    out.push({ from: i + 1, to: i + days, code, days });
    i += days;
  }
  return out;
}

/**
 * The month as calendar weeks, Sunday-first (Oman week): each week is
 * seven slots, day numbers where the month covers them, null padding
 * elsewhere. The UI renders this directly as the member's month.
 */
export function monthMatrix(year: number, month0: number): ReadonlyArray<ReadonlyArray<number | null>> {
  const days = daysInMonth(year, month0);
  const firstDow = new Date(year, month0, 1).getDay(); // 0 = Sunday
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array.from({ length: firstDow }, () => null);
  for (let d = 1; d <= days; d += 1) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

/** A member needs attention when any required document lapsed or is
 *  absent — expiring is a warning, not yet an alert. */
export function hasAlert(statuses: ReadonlyArray<CertStatus>): boolean {
  return statuses.some((s) => s === 'expired' || s === 'missing');
}

/** Decimal hours for a CSV cell: `12` or `7.5`. */
function csvHours(mins: number): string {
  const h = mins / 60;
  return Number.isInteger(h) ? String(h) : String(Math.round(h * 100) / 100);
}

/** The member's month as a sheet: one dated line per day with the exact
 *  working window and hours; per-day overrides win over the shift. */
export function memberCsv(
  name: string,
  no: string,
  year: number,
  month0: number,
  row: ReadonlyArray<ShiftCode>,
  shift: ShiftKind,
  overrides: Record<string, DayHours> = {},
): string {
  const window = SHIFT_WINDOW[shift];
  const lines = [
    `Employee,${csvField(name)}`,
    `No,${no}`,
    `Shift,${window.label} (${window.span})`,
    'Date,Code,Meaning,From,To,Hours',
  ];
  const days = daysInMonth(year, month0);
  for (let d = 1; d <= days; d += 1) {
    const code = row[d - 1];
    if (code === undefined) continue;
    const date = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const worked = isWorked(code);
    const times = worked ? overrides[String(d)] ?? SHIFT_TIMES[shift] : null;
    const mins = dayMinutes(code, overrides[String(d)]);
    lines.push(
      `${date},${code},${csvField(SHIFT_META[code].label)},${times?.start ?? ''},${times?.end ?? ''},${csvHours(mins)}`,
    );
  }
  lines.push(`Total,,,,,${csvHours(monthMinutes(row.slice(0, days), overrides))}`);
  return lines.join('\r\n');
}

/* ── trust boundaries: stored crews and shifts are unknown until parsed ── */

export const CrewStoreSchema = z.array(z.string().min(1)).max(500);

export function parseStoredCrew(raw: string | null): string[] | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null; // handled: corrupt crew list → fall back to the default crew
  }
  const res = CrewStoreSchema.safeParse(json);
  return res.success ? res.data : null;
}

/** Storage keys for the month's shifts and per-day hour overrides —
 *  shared by every page that reads the duty record. */
export function shiftStoreKey(year: number, month0: number): string {
  return `sgs-shift-v1:${year}-${String(month0 + 1).padStart(2, '0')}`;
}
export function hoursStoreKey(year: number, month0: number): string {
  return `sgs-hours-v1:${year}-${String(month0 + 1).padStart(2, '0')}`;
}

export const ShiftStoreSchema = z.record(z.string().min(1), z.enum(['day', 'night']));
export type ShiftMap = Record<string, ShiftKind>;

export function parseStoredShifts(raw: string | null): ShiftMap | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null; // handled: corrupt shift map → everyone defaults to day shift
  }
  const res = ShiftStoreSchema.safeParse(json);
  return res.success ? res.data : null;
}

/** Management's supervisor assignments: employee id → supervisor name.
 *  Written on the management sheet, read by the supervisor's team page —
 *  one record drives both. */
export const AssignStoreSchema = z.record(z.string().min(1), z.string().min(1).max(80));
export type AssignMap = Record<string, string>;

export function parseStoredAssignments(raw: string | null): AssignMap | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null; // handled: corrupt assignments → HR's line managers stand
  }
  const res = AssignStoreSchema.safeParse(json);
  return res.success ? res.data : null;
}

export const ASSIGN_KEY = 'sgs-assign-v1';

const HHMM = /^\d{2}:\d{2}$/;
export const HoursStoreSchema = z.record(
  z.string().min(1), // employee id
  z.record(
    z.string().regex(/^\d{1,2}$/), // day number, 1-based
    z.object({ start: z.string().regex(HHMM), end: z.string().regex(HHMM) }),
  ),
);
export type HoursMap = Record<string, Record<string, DayHours>>;

export function parseStoredHours(raw: string | null): HoursMap | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null; // handled: corrupt hour overrides → shifts alone decide hours
  }
  const res = HoursStoreSchema.safeParse(json);
  return res.success ? res.data : null;
}
