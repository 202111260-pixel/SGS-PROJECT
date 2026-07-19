import { describe, expect, it } from 'vitest';
import {
  buildPattern,
  dayMinutes,
  dutyRun,
  hasAlert,
  hoursOf,
  hoursStoreKey,
  isWorked,
  memberCsv,
  monthMatrix,
  monthMinutes,
  monthSpans,
  nextOfFamily,
  parseStoredAssignments,
  parseStoredCrew,
  parseStoredHours,
  parseStoredShifts,
  sameCodeRun,
  shiftStoreKey,
  spanLabel,
  spanMinutes,
  toMinutes,
} from './Team.logic';
import { loadRosterGrid, rosterStoreKey } from './Roster.logic';
import { defaultRoster } from './Roster.logic';
import type { ShiftCode } from './Roster.data';

describe('monthMatrix', () => {
  it('lays July 2026 out Sunday-first (the 1st is a Wednesday)', () => {
    const weeks = monthMatrix(2026, 6);
    expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const days = weeks.flat().filter((d) => d !== null);
    expect(days).toHaveLength(31);
    expect(days[0]).toBe(1);
    expect(days[30]).toBe(31);
  });

  it('handles a month that starts on Sunday and a short February', () => {
    const nov = monthMatrix(2026, 10); // 1 Nov 2026 is a Sunday
    expect(nov[0]?.[0]).toBe(1);
    const feb = monthMatrix(2027, 1); // 28 days
    expect(feb.flat().filter((d) => d !== null)).toHaveLength(28);
  });
});

describe('hasAlert', () => {
  it('fires on expired or missing, not on expiring', () => {
    expect(hasAlert(['valid', 'valid', 'expiring'])).toBe(false);
    expect(hasAlert(['valid', 'expired'])).toBe(true);
    expect(hasAlert(['missing'])).toBe(true);
    expect(hasAlert([])).toBe(false);
  });
});

describe('shifts and hours', () => {
  it('counts every worked day as one 12-hour shift by default', () => {
    expect(isWorked('F')).toBe(true);
    expect(isWorked('Ex')).toBe(true);
    expect(isWorked('T')).toBe(true);
    expect(isWorked('OFF')).toBe(false);
    expect(isWorked('V')).toBe(false);
    expect(hoursOf(['F', 'F', 'OFF', 'V', 'T'])).toBe(36);
    expect(hoursOf([])).toBe(0);
  });

  it('parses times and measures spans, overnight included', () => {
    expect(toMinutes('06:00')).toBe(360);
    expect(toMinutes('6:00')).toBeNull();
    expect(spanMinutes('06:00', '18:00')).toBe(720);
    expect(spanMinutes('18:00', '06:00')).toBe(720); // night rolls past midnight
    expect(spanMinutes('07:30', '15:00')).toBe(450);
    expect(spanMinutes('07:00', '07:00')).toBeNull(); // equal = a mistake
    expect(spanMinutes('junk', '18:00')).toBeNull();
    expect(spanLabel(720)).toBe('12h');
    expect(spanLabel(450)).toBe('7h 30m');
  });

  it('lets a valid per-day override replace the 12-hour default', () => {
    expect(dayMinutes('F', undefined)).toBe(720);
    expect(dayMinutes('F', { start: '07:30', end: '15:00' })).toBe(450);
    expect(dayMinutes('F', { start: 'bad', end: '15:00' })).toBe(720); // invalid → default
    expect(dayMinutes('OFF', { start: '07:30', end: '15:00' })).toBe(0); // rest never counts
    expect(monthMinutes(['F', 'F', 'OFF'], { '2': { start: '06:00', end: '12:00' } })).toBe(720 + 360);
  });
});

describe('memberCsv', () => {
  it('writes one dated line per day with times, hours and a total', () => {
    const row = Array<ShiftCode>(31).fill('F');
    row[3] = 'OFF';
    const csv = memberCsv('Ahmed Al-Harthy', '10247', 2026, 6, row, 'day');
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Employee,Ahmed Al-Harthy');
    expect(lines[2]).toBe('Shift,Day (06:00 – 18:00)');
    expect(lines[3]).toBe('Date,Code,Meaning,From,To,Hours');
    expect(lines[4]).toBe('2026-07-01,F,On duty,06:00,18:00,12');
    expect(lines[7]).toBe('2026-07-04,OFF,Rest day (off),,,0');
    expect(lines.at(-1)).toBe('Total,,,,,360'); // 30 worked days × 12h
    expect(lines).toHaveLength(4 + 31 + 1);
  });

  it('lets per-day overrides change the times and the total', () => {
    const row = Array<ShiftCode>(31).fill('F');
    const csv = memberCsv('A', '1', 2026, 6, row, 'day', { '1': { start: '07:30', end: '15:00' } });
    const lines = csv.split('\r\n');
    expect(lines[4]).toBe('2026-07-01,F,On duty,07:30,15:00,7.5');
    expect(lines.at(-1)).toBe(`Total,,,,,${(30 * 12 + 7.5).toString()}`);
  });
});

describe('duty derivations', () => {
  const row: ShiftCode[] = ['F', 'F', 'F', 'OFF', 'OFF', 'F', 'F', 'V', 'V', 'V', 'F'];

  it('finds the worked run around a day', () => {
    expect(dutyRun(row, 1)).toEqual({ len: 3, pos: 2 }); // day 2 of the 3-day run
    expect(dutyRun(row, 6)).toEqual({ len: 2, pos: 2 });
    expect(dutyRun(row, 3)).toBeNull(); // rest day
    expect(dutyRun(row, 99)).toBeNull();
  });

  it('finds the next day of a family and the span of same-code leave', () => {
    expect(nextOfFamily(row, 0, ['rest'])).toBe(3);
    expect(nextOfFamily(row, 4, ['planned', 'unplanned', 'special'])).toBe(7);
    expect(nextOfFamily(row, 0, ['special'])).toBeNull();
    expect(sameCodeRun(row, 7)).toBe(3); // V V V
    expect(sameCodeRun(row, 99)).toBe(0);
  });

  it('builds a month from a work rotation', () => {
    const r = buildPattern(31, 5, 2);
    expect(r).toHaveLength(31);
    expect(r.slice(0, 7)).toEqual(['F', 'F', 'F', 'F', 'F', 'OFF', 'OFF']);
    expect(r[7]).toBe('F'); // the cycle restarts
    expect(r.filter((c) => c === 'F')).toHaveLength(23);
    expect(buildPattern(28, 14, 7).slice(13, 15)).toEqual(['F', 'OFF']);
    expect(buildPattern(5, 7, 0)).toEqual(['F', 'F', 'F', 'F', 'F']);
    expect(buildPattern(3, 0, 0)).toEqual(['F', 'F', 'F']); // degenerate → all duty
    expect(buildPattern(-2, 5, 2)).toEqual([]);
  });

  it('compresses the month into spans that account for every day', () => {
    expect(monthSpans(row)).toEqual([
      { from: 1, to: 3, code: 'F', days: 3 },
      { from: 4, to: 5, code: 'OFF', days: 2 },
      { from: 6, to: 7, code: 'F', days: 2 },
      { from: 8, to: 10, code: 'V', days: 3 },
      { from: 11, to: 11, code: 'F', days: 1 },
    ]);
    expect(monthSpans([])).toEqual([]);
  });

  it('exposes the shared storage keys', () => {
    expect(shiftStoreKey(2026, 6)).toBe('sgs-shift-v1:2026-07');
    expect(hoursStoreKey(2026, 6)).toBe('sgs-hours-v1:2026-07');
  });
});

describe('stored supervisor assignments (trust boundary)', () => {
  it('round-trips valid assignments and rejects junk', () => {
    const map = { 'e-10247': 'Maryam Al-Zadjali' };
    expect(parseStoredAssignments(JSON.stringify(map))).toEqual(map);
    expect(parseStoredAssignments(null)).toBeNull();
    expect(parseStoredAssignments('{oops')).toBeNull();
    expect(parseStoredAssignments(JSON.stringify(['e-1']))).toBeNull();
    expect(parseStoredAssignments(JSON.stringify({ 'e-1': 42 }))).toBeNull();
  });
});

describe('stored hour overrides (trust boundary)', () => {
  it('round-trips valid overrides and rejects junk', () => {
    const map = { 'e-1': { '17': { start: '07:30', end: '15:00' } } };
    expect(parseStoredHours(JSON.stringify(map))).toEqual(map);
    expect(parseStoredHours(null)).toBeNull();
    expect(parseStoredHours('{nope')).toBeNull();
    expect(parseStoredHours(JSON.stringify({ 'e-1': { day17: { start: '07:30', end: '15:00' } } }))).toBeNull();
    expect(parseStoredHours(JSON.stringify({ 'e-1': { '17': { start: '7am', end: '15:00' } } }))).toBeNull();
  });
});

describe('stored crew and shifts (trust boundaries)', () => {
  it('round-trips valid data', () => {
    expect(parseStoredCrew(JSON.stringify(['e-1', 'e-2']))).toEqual(['e-1', 'e-2']);
    expect(parseStoredShifts(JSON.stringify({ 'e-1': 'night' }))).toEqual({ 'e-1': 'night' });
  });

  it('rejects junk', () => {
    expect(parseStoredCrew(null)).toBeNull();
    expect(parseStoredCrew('nope{')).toBeNull();
    expect(parseStoredCrew(JSON.stringify('e-1'))).toBeNull();
    expect(parseStoredShifts(JSON.stringify({ 'e-1': 'lunar' }))).toBeNull();
    expect(parseStoredShifts('{broken')).toBeNull();
  });
});

describe('loadRosterGrid (shared by roster · team pages)', () => {
  it('lets a stored month override the default, per employee', () => {
    const stored = Array<ShiftCode>(31).fill('HL');
    const read = (key: string) =>
      key === rosterStoreKey('OQ', 2026, 6) ? JSON.stringify({ 'e-a': stored }) : null;
    const grid = loadRosterGrid('OQ', 2026, 6, ['e-a', 'e-b'], read);
    expect(grid['e-a']).toEqual(stored);
    expect(grid['e-b']).toEqual(defaultRoster(['e-b'], 2026, 6)['e-b']);
  });

  it('ignores stored rows that do not cover the month', () => {
    const read = () => JSON.stringify({ 'e-a': ['F', 'F'] });
    const grid = loadRosterGrid('OQ', 2026, 6, ['e-a'], read);
    expect(grid['e-a']).toEqual(defaultRoster(['e-a'], 2026, 6)['e-a']);
  });
});
