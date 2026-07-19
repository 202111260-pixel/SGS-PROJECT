import { describe, expect, it } from 'vitest';
import {
  applyCode,
  coverage,
  daysInMonth,
  defaultRoster,
  dowLetter,
  isWeekend,
  monthLabel,
  parseStoredRoster,
  tally,
  toCsv,
  weekdayOf,
} from './Roster.logic';
import { SHIFT_CODES } from './Roster.data';
import type { ShiftCode } from './Roster.data';

describe('calendar helpers', () => {
  it('knows the length of every month, leap years included', () => {
    expect(daysInMonth(2026, 6)).toBe(31); // July 2026
    expect(daysInMonth(2027, 1)).toBe(28); // February 2027
    expect(daysInMonth(2028, 1)).toBe(29); // February 2028 (leap)
  });

  it('labels the month and resolves weekdays', () => {
    expect(monthLabel(2026, 6)).toBe('July 2026');
    expect(weekdayOf(2026, 6, 17)).toBe(5); // 17 July 2026 is a Friday
    expect(dowLetter(5)).toBe('F');
  });

  it('treats Friday and Saturday as the weekend', () => {
    expect(isWeekend(5)).toBe(true);
    expect(isWeekend(6)).toBe(true);
    expect(isWeekend(0)).toBe(false);
    expect(isWeekend(3)).toBe(false);
  });
});

describe('defaultRoster', () => {
  const ids = ['e-10247', 'e-10248', 'e-10249'];

  it('is deterministic and fills every day with a valid code', () => {
    const a = defaultRoster(ids, 2026, 6);
    const b = defaultRoster(ids, 2026, 6);
    expect(a).toEqual(b);
    for (const id of ids) {
      const row = a[id];
      expect(row).toBeDefined();
      expect(row?.length).toBe(31);
      for (const code of row ?? []) expect(SHIFT_CODES).toContain(code);
    }
  });
});

describe('tally and coverage', () => {
  const row: ShiftCode[] = ['F', 'F', 'OFF', 'V', 'S', 'T', 'Ex'];

  it('counts worked, rest and leave days per row', () => {
    // duty family = F + Ex + T (extra effort is worked time)
    expect(tally(row)).toEqual({ duty: 4, rest: 1, leave: 2 });
  });

  it('counts how many of the crew work a given day', () => {
    const grid = { a: row, b: ['OFF', 'F', 'F', 'F', 'F', 'F', 'F'] as ShiftCode[] };
    expect(coverage(grid, ['a', 'b'], 0)).toBe(1); // a works, b rests
    expect(coverage(grid, ['a', 'b'], 2)).toBe(1); // a rests, b works
    expect(coverage(grid, ['a', 'b', 'missing'], 1)).toBe(2); // unknown ids ignored
  });
});

describe('applyCode (supervisor paints, the team follows)', () => {
  const grid = {
    sup: ['F', 'OFF', 'F'] as ShiftCode[],
    m1: ['F', 'F', 'F'] as ShiftCode[],
    m2: ['OFF', 'OFF', 'OFF'] as ShiftCode[],
  };

  it('stamps the same day for the supervisor and every follower', () => {
    const next = applyCode(grid, ['sup', 'm1', 'm2'], 1, 'V');
    expect(next['sup']).toEqual(['F', 'V', 'F']);
    expect(next['m1']).toEqual(['F', 'V', 'F']);
    expect(next['m2']).toEqual(['OFF', 'V', 'OFF']);
    expect(grid['sup']).toEqual(['F', 'OFF', 'F']); // input untouched
  });

  it('returns the same object when every row already has the code', () => {
    expect(applyCode(grid, ['m1'], 0, 'F')).toBe(grid);
  });

  it('skips unknown ids and out-of-range days without crashing', () => {
    expect(applyCode(grid, ['ghost'], 0, 'V')).toBe(grid);
    expect(applyCode(grid, ['sup'], 31, 'V')).toBe(grid);
    expect(applyCode(grid, ['sup'], -1, 'V')).toBe(grid);
  });

  it('leaves rows that already match and changes only the rest', () => {
    const next = applyCode(grid, ['m1', 'm2'], 0, 'F');
    expect(next['m1']).toBe(grid['m1']); // untouched row keeps its identity
    expect(next['m2']).toEqual(['F', 'OFF', 'OFF']);
  });
});

describe('toCsv', () => {
  it('produces one header and one line per employee', () => {
    const csv = toCsv(
      [{ name: 'Ahmed Al-Harthy', no: '10247', codes: Array<ShiftCode>(31).fill('F') }],
      2026,
      6,
    );
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(`Employee,No,${Array.from({ length: 31 }, (_, i) => i + 1).join(',')}`);
    expect(lines[1]?.startsWith('Ahmed Al-Harthy,10247,F,')).toBe(true);
  });

  it('quotes fields containing commas or quotes', () => {
    const csv = toCsv([{ name: 'Al "Sam", Test', no: '1', codes: ['F'] as ShiftCode[] }], 2026, 0);
    expect(csv.split('\r\n')[1]?.startsWith('"Al ""Sam"", Test",1,F')).toBe(true);
  });
});

describe('parseStoredRoster (trust boundary)', () => {
  it('round-trips a valid stored roster', () => {
    const grid = { 'e-1': ['F', 'OFF', 'V'] as ShiftCode[] };
    expect(parseStoredRoster(JSON.stringify(grid))).toEqual(grid);
  });

  it('rejects everything that is not a valid roster', () => {
    expect(parseStoredRoster(null)).toBeNull();
    expect(parseStoredRoster('not json {')).toBeNull();
    expect(parseStoredRoster('42')).toBeNull();
    expect(parseStoredRoster(JSON.stringify({ 'e-1': ['NOPE'] }))).toBeNull();
    expect(parseStoredRoster(JSON.stringify({ 'e-1': 'F' }))).toBeNull();
  });
});
