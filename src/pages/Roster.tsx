import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { EmployeeShell } from './EmployeeChrome';
import { EMPLOYEES } from './Competency.data';
import { empNo, hrOf } from './EmployeeDirectory.data';
import { POSITIONS, PROJECTS } from './EmployeeForm.data';
import { FAMILY_LABEL, POSITION_TAG, SHIFT_CODES, SHIFT_META } from './Roster.data';
import type { ShiftCode, ShiftFamily } from './Roster.data';
import type { Employee } from './Competency.types';
import {
  ASSIGN_KEY,
  PATTERNS,
  SHIFT_TIMES,
  SHIFT_WINDOW,
  buildPattern,
  hoursStoreKey,
  isWorked,
  monthMatrix,
  parseStoredAssignments,
  parseStoredCrew,
  parseStoredHours,
  parseStoredShifts,
  shiftStoreKey,
  spanLabel,
  spanMinutes,
} from './Team.logic';
import type { AssignMap, DayHours, HoursMap, ShiftKind, ShiftMap, WorkPattern } from './Team.logic';
import { photoOf } from './avatar';
import './team.css';

/** Per-day hour overrides for a generated row: only stored when the
 *  window differs from the shift's own 12-hour default. */
function windowOverrides(
  row: ReadonlyArray<ShiftCode>,
  shift: ShiftKind,
  start: string,
  end: string,
): Record<string, DayHours> {
  const def = SHIFT_TIMES[shift];
  if (start === def.start && end === def.end) return {};
  const out: Record<string, DayHours> = {};
  row.forEach((c, i) => {
    if (isWorked(c)) out[String(i + 1)] = { start, end };
  });
  return out;
}

/** Management-created supervisors persist here (a plain validated name
 *  list — parseStoredCrew's schema fits it exactly). */
const SUPS_KEY = 'sgs-sups-v1';
import {
  applyCode,
  coverage,
  daysInMonth,
  dowLetter,
  isWeekend,
  loadRosterGrid,
  monthLabel,
  rosterStoreKey,
  tally,
  toCsv,
  weekdayOf,
} from './Roster.logic';
import type { RosterGrid } from './Roster.logic';
import './roster.css';

/**
 * Roster — management's monthly duty sheet (/roster), laid out like the
 * site's paper shift sheet: pick a code from the tray, then click or drag
 * across days to stamp it. No cards, no rules — the grid separates by air
 * (border-spacing), every cell is a stamped chip in its family hue.
 *
 *   · Header: month stepper · project · Export (real CSV) · Save.
 *   · The page LANDS on the sheet: every employee's month at once, one
 *     flat list — no fold-away grouping. Rows are ordered so the
 *     structure reads itself: each supervisor (ink Sup chip, "N in team")
 *     leads and their team sits right under them, every member's sub-line
 *     naming their team. Filters (search · team · position) narrow it.
 *   · THE AUTOMATIC RULE — the team follows its supervisor: stamping a
 *     day on a supervisor's row stamps the same day for their whole team,
 *     setting the supervisor's shift sets the team's, and Build month
 *     builds the whole team's month. Member rows stay individually
 *     editable for exceptions afterwards.
 *   · Smart filter: one box that matches names, numbers, positions and
 *     supervisors, beside supervisor / position narrowing and a live
 *     "showing X of Y" count.
 *   · Grid: employees × days, weekend columns marked, today's column
 *     highlighted and scrolled into view on open, per-row totals on the
 *     right, and the on-duty coverage count under each day.
 *   · Two more rooms behind the switch: the TEAM BUILDER (management
 *     picks or promotes a supervisor, then hand-picks who works under
 *     them — the supervisor's own team timesheet reads the same record)
 *     and the flat PEOPLE roster.
 *
 * Demo persistence is localStorage parsed through Zod schemas (charter
 * §2 — JSON.parse is a trust boundary); production replaces load/save
 * with Supabase reads and writes under RLS.
 */

type Ym = { year: number; month: number }; // month is 0-based

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const DOW3 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function initialGrid(project: string, ym: Ym, empIds: ReadonlyArray<string>): RosterGrid {
  return loadRosterGrid(project, ym.year, ym.month, empIds, (k) => localStorage.getItem(k));
}

export default function Roster() {
  const [now] = useState(() => new Date());
  const [ym, setYm] = useState<Ym>({ year: now.getFullYear(), month: now.getMonth() });
  const [project, setProject] = useState<string>(PROJECTS[0]);
  const [brush, setBrush] = useState<ShiftCode>('F');
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const crew = useMemo(() => EMPLOYEES.filter((e) => e.project === project), [project]);
  const empIds = useMemo(() => crew.map((e) => e.id), [crew]);
  const days = daysInMonth(ym.year, ym.month);

  /* ── teams: management's assignments over HR's line managers ── */
  const [assignments, setAssignments] = useState<AssignMap>(
    () => parseStoredAssignments(localStorage.getItem(ASSIGN_KEY)) ?? {},
  );
  /** The page's three rooms — management lands on the sheet itself:
   *  everyone's shifts at once, filters at hand. The team builder and the
   *  flat People roster are each one tap away. */
  const [view, setView] = useState<'sheet' | 'teams' | 'people'>('sheet');
  const [selSup, setSelSup] = useState<string | null>(null);
  const [newSupOpen, setNewSupOpen] = useState(false);
  const [newSupQ, setNewSupQ] = useState('');
  const [addQ, setAddQ] = useState('');
  /** Supervisors management created here, on top of HR's line managers. */
  const [customSups, setCustomSups] = useState<string[]>(
    () => parseStoredCrew(localStorage.getItem(SUPS_KEY)) ?? [],
  );
  /** Supervisors are PEOPLE on the roster — an HR reporting line that
   *  names an org unit (e.g. a country office) is a profile fact, never a
   *  duty-roster team. */
  const supervisors = useMemo(() => {
    const onRoster = new Set(EMPLOYEES.map((e) => e.name));
    const names = new Set<string>();
    for (const e of EMPLOYEES) {
      const m = hrOf(e.id)?.manager;
      if (m && onRoster.has(m)) names.add(m);
    }
    for (const s of customSups) names.add(s);
    for (const s of Object.values(assignments)) names.add(s);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [customSups, assignments]);
  const supOf = useCallback(
    (id: string) => assignments[id] ?? hrOf(id)?.manager ?? 'Unassigned',
    [assignments],
  );
  /** A supervisor heads their OWN team — everyone else follows their
   *  assigned supervisor. The sheet reads "supervisor + members". */
  const teamOf = useCallback(
    (e: Employee) => (supervisors.includes(e.name) ? e.name : supOf(e.id)),
    [supervisors, supOf],
  );

  /** THE AUTOMATIC RULE — the team follows its supervisor. Everything
   *  stamped on a supervisor's row (a day code, the shift, a built month)
   *  applies to every member of their team in the same stroke; member
   *  rows can still be adjusted individually afterwards. */
  const followers = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const head of crew) {
      if (!supervisors.includes(head.name)) continue;
      const ids = crew.filter((e) => e.id !== head.id && teamOf(e) === head.name).map((e) => e.id);
      if (ids.length > 0) map.set(head.id, ids);
    }
    return map;
  }, [crew, supervisors, teamOf]);
  const followersRef = useRef(followers);
  followersRef.current = followers;

  /** Everyone's shift for this month — management sets the supervisor's,
   *  and syncing hands it down to the team. */
  const [shifts, setShifts] = useState<ShiftMap>(
    () => parseStoredShifts(localStorage.getItem(shiftStoreKey(ym.year, ym.month))) ?? {},
  );
  const [hoursMap, setHoursMap] = useState<HoursMap>(
    () => parseStoredHours(localStorage.getItem(hoursStoreKey(ym.year, ym.month))) ?? {},
  );
  useEffect(() => {
    setShifts(parseStoredShifts(localStorage.getItem(shiftStoreKey(ym.year, ym.month))) ?? {});
    setHoursMap(parseStoredHours(localStorage.getItem(hoursStoreKey(ym.year, ym.month))) ?? {});
  }, [ym]);

  /* ── the smart filter: one box + two narrows, all live ── */
  const [query, setQuery] = useState('');
  const [supFilter, setSupFilter] = useState('all');
  const [posFilter, setPosFilter] = useState('all');
  /* ── the People roster's own filters: a search, one team/supervisor
   *    narrow, and a role toggle (everyone / supervisors / members) ── */
  const [pplQuery, setPplQuery] = useState('');
  const [pplTeam, setPplTeam] = useState('all');
  const [pplRole, setPplRole] = useState<'all' | 'sup' | 'member'>('all');
  /** Exceptions mode: routine fades, anomalies glow. */
  const [exceptions, setExceptions] = useState(false);
  /** The day lens: click a day column, read its whole muster. */
  const [lensDay, setLensDay] = useState<number | null>(null);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return crew.filter((e) => {
      // a supervisor belongs to their OWN team, so filtering by a team
      // shows its head together with the members
      const team = teamOf(e);
      if (supFilter !== 'all' && team !== supFilter) return false;
      if (posFilter !== 'all' && e.position !== posFilter) return false;
      if (!q) return true;
      return `${e.name} ${empNo(e.id)} ${e.position} ${POSITION_TAG[e.position] ?? ''} ${team}`
        .toLowerCase()
        .includes(q);
    });
  }, [crew, query, supFilter, posFilter, teamOf]);
  const visibleIds = useMemo(() => visible.map((e) => e.id), [visible]);
  /** The sheet's rows: everyone who passes the filters, one flat list —
   *  nothing folded away. Ordered so the structure reads itself: each
   *  supervisor leads, their team follows right under them. */
  const sheetRows = useMemo(
    () =>
      [...visible].sort((a, b) => {
        const ta = teamOf(a);
        const tb = teamOf(b);
        if (ta !== tb) return ta.localeCompare(tb);
        const lead = Number(b.name === tb) - Number(a.name === ta);
        return lead !== 0 ? lead : a.name.localeCompare(b.name);
      }),
    [visible, teamOf],
  );

  /* ── the People roster: every employee on the project as one flat,
   *    professional table row, narrowed by team and by role. It reads the
   *    same team assignments as the sheet but keeps its own filters. ── */
  const teamNames = useMemo(() => {
    const names = new Set<string>();
    for (const e of crew) names.add(teamOf(e));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [crew, teamOf]);
  const people = useMemo(() => {
    const q = pplQuery.trim().toLowerCase();
    return crew
      .map((e) => ({ emp: e, team: teamOf(e), isSup: supervisors.includes(e.name) }))
      .filter(({ emp, team, isSup }) => {
        if (pplTeam !== 'all' && team !== pplTeam) return false;
        if (pplRole === 'sup' && !isSup) return false;
        if (pplRole === 'member' && isSup) return false;
        if (!q) return true;
        return `${emp.name} ${empNo(emp.id)} ${emp.position} ${POSITION_TAG[emp.position] ?? ''} ${team}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (a.team !== b.team) return a.team.localeCompare(b.team);
        const byRole = Number(b.isSup) - Number(a.isSup);
        return byRole !== 0 ? byRole : a.emp.name.localeCompare(b.emp.name);
      });
  }, [crew, teamOf, supervisors, pplQuery, pplTeam, pplRole]);
  const pplTeamCount = useMemo(() => new Set(people.map((p) => p.team)).size, [people]);

  const [grid, setGrid] = useState<RosterGrid>(() => initialGrid(project, ym, empIds));
  useEffect(() => {
    setGrid(initialGrid(project, ym, empIds));
    setDirty(false);
    setSavedAt(null);
  }, [project, ym, empIds]);

  /* Painting: refs, so cells stay memoised and drag stays cheap. */
  const brushRef = useRef<ShiftCode>(brush);
  brushRef.current = brush;
  const paintingRef = useRef(false);
  useEffect(() => {
    const stop = () => {
      paintingRef.current = false;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const paint = useCallback((id: string, dayIdx: number) => {
    setGrid((g) =>
      applyCode(g, [id, ...(followersRef.current.get(id) ?? [])], dayIdx, brushRef.current),
    );
    setDirty(true);
    setSavedAt(null);
  }, []);

  const startPaint = useCallback(
    (id: string, dayIdx: number) => {
      paintingRef.current = true;
      paint(id, dayIdx);
    },
    [paint],
  );
  const dragPaint = useCallback(
    (id: string, dayIdx: number) => {
      if (paintingRef.current) paint(id, dayIdx);
    },
    [paint],
  );

  function step(delta: number) {
    setYm((cur) => {
      const m = cur.month + delta;
      if (m < 0) return { year: cur.year - 1, month: 11 };
      if (m > 11) return { year: cur.year + 1, month: 0 };
      return { year: cur.year, month: m };
    });
  }

  const onAssign = useCallback((id: string, sup: string) => {
    setAssignments((a) => ({ ...a, [id]: sup }));
    setDirty(true);
    setSavedAt(null);
  }, []);

  /** The team follows the supervisor: copy the head's month and shift to
   *  every member — same days, same shift, same hours. */
  const syncTeam = useCallback(
    (sup: string) => {
      const head = crew.find((e) => e.name === sup);
      if (!head) return;
      const headRow = grid[head.id];
      if (!headRow) return;
      const memberIds = crew.filter((e) => teamOf(e) === sup && e.id !== head.id).map((e) => e.id);
      if (memberIds.length === 0) return;
      setGrid((g) => {
        const next = { ...g };
        for (const id of memberIds) next[id] = [...headRow];
        return next;
      });
      setShifts((s) => {
        const headShift = s[head.id] ?? 'day';
        const next = { ...s };
        for (const id of memberIds) next[id] = headShift;
        return next;
      });
      setHoursMap((m) => {
        const headOv = m[head.id];
        const next = { ...m };
        for (const id of memberIds) {
          if (headOv && Object.keys(headOv).length > 0) next[id] = { ...headOv };
          else delete next[id];
        }
        return next;
      });
      setDirty(true);
      setSavedAt(null);
    },
    [crew, grid, teamOf],
  );

  /** Management sets the supervisor's shift here — the team takes the
   *  same shift automatically (the follow rule). */
  const setSupShift = useCallback((id: string, kind: ShiftKind) => {
    setShifts((s) => {
      const next = { ...s, [id]: kind };
      for (const mid of followersRef.current.get(id) ?? []) next[mid] = kind;
      return next;
    });
    setDirty(true);
    setSavedAt(null);
  }, []);

  /** The composer's Build: rotation → the supervisor's month, custom
   *  hours stored as per-day overrides when they differ from the shift.
   *  The whole team gets the same month in the same stroke (follow rule). */
  const buildFor = useCallback(
    (head: Employee, start: string, end: string, p: WorkPattern) => {
      const row = buildPattern(days, p.on, p.off);
      const cur = shifts[head.id] ?? 'day';
      const ids = [head.id, ...(followersRef.current.get(head.id) ?? [])];
      setGrid((g) => {
        const next = { ...g };
        for (const id of ids) next[id] = [...row];
        return next;
      });
      setHoursMap((m) => {
        const ov = windowOverrides(row, cur, start, end);
        const next = { ...m };
        for (const id of ids) {
          if (Object.keys(ov).length > 0) next[id] = { ...ov };
          else delete next[id];
        }
        return next;
      });
      setDirty(true);
      setSavedAt(null);
    },
    [days, shifts],
  );

  /** Undo a management override — the person returns to HR's line manager. */
  const unassign = useCallback((id: string) => {
    setAssignments((a) => {
      const next = { ...a };
      delete next[id];
      return next;
    });
    setDirty(true);
    setSavedAt(null);
  }, []);

  /** The builder's view of the project: every team with its members,
   *  independent of the sheet's filters. */
  const teams = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const s of supervisors) map.set(s, []);
    for (const e of crew) {
      const s = teamOf(e);
      const list = map.get(s);
      if (list) list.push(e);
      else map.set(s, [e]);
    }
    return [...map.entries()]
      .filter(([s, m]) => m.length > 0 || customSups.includes(s))
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [supervisors, crew, teamOf, customSups]);
  const sel = selSup ?? teams[0]?.[0] ?? null;
  const selMembers = useMemo(() => teams.find(([s]) => s === sel)?.[1] ?? [], [teams, sel]);
  /** The selected supervisor as a person on this project, when they are one. */
  const headEmp = useMemo(() => (sel ? crew.find((e) => e.name === sel) ?? null : null), [sel, crew]);
  const selCrew = useMemo(() => selMembers.filter((e) => e.name !== sel), [selMembers, sel]);

  function save() {
    localStorage.setItem(rosterStoreKey(project, ym.year, ym.month), JSON.stringify(grid));
    localStorage.setItem(shiftStoreKey(ym.year, ym.month), JSON.stringify(shifts));
    localStorage.setItem(hoursStoreKey(ym.year, ym.month), JSON.stringify(hoursMap));
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(assignments));
    localStorage.setItem(SUPS_KEY, JSON.stringify(customSups));
    setDirty(false);
    setSavedAt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
  }

  function promote(name: string) {
    if (!name || supervisors.includes(name)) return;
    setCustomSups((s) => [...s, name]);
    setSelSup(name);
    setNewSupOpen(false);
    setNewSupQ('');
    setDirty(true);
    setSavedAt(null);
  }

  function exportCsv() {
    const csv = toCsv(
      crew.map((e) => ({ name: e.name, no: empNo(e.id), codes: grid[e.id] ?? [] })),
      ym.year,
      ym.month,
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgs-roster-${project.replace(/\s+/g, '-').toLowerCase()}-${ym.year}-${String(ym.month + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isThisMonth = ym.year === now.getFullYear() && ym.month === now.getMonth();
  const today = isThisMonth ? now.getDate() : 0;

  /** Opening the sheet on the current month brings TODAY to the reader:
   *  the column is highlighted and scrolled to the centre of the view. */
  const sheetScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (view !== 'sheet' || today <= 0) return;
    const box = sheetScrollRef.current;
    const cell = box?.querySelector<HTMLElement>('[data-today]');
    if (!box || !cell) return;
    const delta = cell.getBoundingClientRect().left - box.getBoundingClientRect().left;
    box.scrollLeft += delta - (box.clientWidth - cell.clientWidth) / 2;
  }, [view, today, ym, project]);

  /** One employee's standing today, for the People roster: the family hue
   *  and a plain verdict (on duty · rest · the exact leave). Null when the
   *  shown month isn't the current one, so no "today" applies. */
  function standing(id: string): { family: ShiftFamily; text: string } | null {
    if (today <= 0) return null;
    const code = grid[id]?.[today - 1] ?? 'F';
    const family = SHIFT_META[code].family;
    const text =
      family === 'duty' || family === 'extra'
        ? 'On duty'
        : family === 'rest'
          ? 'Rest day'
          : SHIFT_META[code].label;
    return { family, text };
  }
  const dayMeta = useMemo(
    () =>
      Array.from({ length: days }, (_, i) => {
        const dow = weekdayOf(ym.year, ym.month, i + 1);
        return { day: i + 1, letter: DOW3[dow] ?? dowLetter(dow), weekend: isWeekend(dow) };
      }),
    [days, ym],
  );

  /** The day under the lens, mustered: who works, who rests, who is away. */
  const lens = useMemo(() => {
    if (lensDay === null) return null;
    const duty: Employee[] = [];
    const rest: Employee[] = [];
    const away: Array<{ emp: Employee; code: ShiftCode }> = [];
    for (const e of visible) {
      const code = grid[e.id]?.[lensDay - 1] ?? 'F';
      const family = SHIFT_META[code].family;
      if (family === 'duty' || family === 'extra') duty.push(e);
      else if (family === 'rest') rest.push(e);
      else away.push({ emp: e, code });
    }
    return { duty, rest, away };
  }, [lensDay, visible, grid]);

  /** The management glance: the sheet in four honest numbers. */
  const stats = useMemo(() => {
    const covs = Array.from({ length: days }, (_, i) => coverage(grid, visibleIds, i));
    let minIdx = 0;
    covs.forEach((c, i) => {
      if (c < (covs[minIdx] ?? Infinity)) minIdx = i;
    });
    let worked = 0;
    let leave = 0;
    for (const id of visibleIds) {
      const t = tally(grid[id] ?? []);
      worked += t.duty;
      leave += t.leave;
    }
    return {
      todayCov: today > 0 ? covs[today - 1] ?? 0 : null,
      minVal: covs[minIdx] ?? 0,
      minDay: minIdx + 1,
      worked,
      leave,
    };
  }, [grid, visibleIds, days, today]);

  return (
    <EmployeeShell active="Roster">
      <div className="rst mx-auto max-w-[1480px]">
        {/* ── masthead: title · month · project · actions ── */}
        <motion.div
          className="pf-sec-head pf-sec-head--split"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <div className="pf-sec-lead">
            <span className="pf-sec-ic" aria-hidden>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2.5" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            </span>
            <div>
              <h1 className="pf-sec-title display">Duty roster</h1>
              <p className="pf-sec-sub mono">
                Management sheet · {crew.length} on roster · {project} · {days} days
              </p>
            </div>
          </div>

          <div className="rst-controls">
            <span className="rst-view" role="tablist" aria-label="View">
              {(['sheet', 'teams', 'people'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  className={view === v ? 'is-on' : ''}
                  onClick={() => setView(v)}
                >
                  {v === 'sheet' ? 'Sheet' : v === 'teams' ? 'Teams' : 'People'}
                </button>
              ))}
            </span>

            {view === 'sheet' && (
              <span className="rst-month" role="group" aria-label="Month">
                <button type="button" className="rst-step" aria-label="Previous month" onClick={() => step(-1)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
                </button>
                <span className="rst-month-label display">{monthLabel(ym.year, ym.month)}</span>
                <button type="button" className="rst-step" aria-label="Next month" onClick={() => step(1)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
                </button>
              </span>
            )}

            <label className="rst-project">
              <span className="sr-only">Project / site</span>
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                {PROJECTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            {view === 'sheet' && (
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></svg>
                Export
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="emp-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white disabled:cursor-default disabled:opacity-45"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
              Save
            </button>
            <span className={`rst-state mono ${dirty ? 'is-dirty' : ''}`} role="status">
              {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt}` : ''}
            </span>
          </div>
        </motion.div>

        {view === 'teams' ? (
          /* ── the team builder: pick a supervisor, choose their crew ── */
          <motion.div
            className="rst-teams"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <aside className="rst-tb-side">
              <div className="rst-tb-top">
                <p className="rst-tb-h mono">Teams · {teams.length}</p>
                <button
                  type="button"
                  className={`rst-assignbtn mono ${newSupOpen ? 'is-on' : ''}`}
                  aria-expanded={newSupOpen}
                  onClick={() => setNewSupOpen((o) => !o)}
                >
                  + New supervisor
                </button>
              </div>
              {newSupOpen && (
                <div className="rst-tb-new">
                  <input
                    type="search"
                    className="rst-search"
                    placeholder="Search a name to promote…"
                    value={newSupQ}
                    onChange={(e) => setNewSupQ(e.target.value)}
                  />
                  <ul>
                    {crew
                      .filter((e) => !supervisors.includes(e.name))
                      .filter(
                        (e) =>
                          !newSupQ.trim() ||
                          `${e.name} ${empNo(e.id)} ${e.position}`.toLowerCase().includes(newSupQ.trim().toLowerCase()),
                      )
                      .slice(0, 6)
                      .map((e) => (
                        <li key={e.id}>
                          <img src={photoOf(e.name)} alt="" className="rst-tb-ava" />
                          <span className="min-w-0 flex-1">
                            <span className="rst-tb-pname">{e.name}</span>
                            <span className="rst-tb-psub mono">
                              {e.position} · No. {empNo(e.id)}
                            </span>
                          </span>
                          <button type="button" className="rst-tb-move mono" onClick={() => promote(e.name)}>
                            Make supervisor
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <ul className="rst-tb-list">
                {teams.map(([sup, members]) => {
                  const onT =
                    today > 0 ? members.filter((m) => isWorked(grid[m.id]?.[today - 1] ?? 'F')).length : null;
                  return (
                    <li key={sup}>
                      <button
                        type="button"
                        className={`rst-tb-team ${sel === sup ? 'is-on' : ''}`}
                        onClick={() => setSelSup(sup)}
                      >
                        <span className="rst-tb-name">{sup}</span>
                        <span className="rst-tb-psub mono">
                          {members.length} crew
                          {onT !== null && members.length > 0 ? ` · ${onT} on duty today` : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Link to="/employees/new" className="rst-assignbtn rst-tb-addlink mono">
                + Add a new employee
              </Link>
            </aside>

            <section className="rst-tb-main">
              {sel ? (
                <>
                  <header className="rst-tb-suphead">
                    {headEmp ? (
                      <img src={photoOf(headEmp.name)} alt="" className="rst-tb-supava" />
                    ) : (
                      <span className="rst-tb-supava rst-tb-supava--org serif" aria-hidden>
                        {sel.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="display">
                        {sel} <i className="rst-supchip mono">Supervisor</i>
                      </h2>
                      <p className="mono">
                        {headEmp ? `${headEmp.position} · No. ${empNo(headEmp.id)} · ` : ''}
                        {selCrew.length} in the team · you choose exactly who works under them
                      </p>
                    </div>
                  </header>

                  {headEmp && (
                    <SupComposer
                      key={`${headEmp.id}:${ym.year}-${ym.month}`}
                      shift={shifts[headEmp.id] ?? 'day'}
                      initial={
                        Object.values(hoursMap[headEmp.id] ?? {})[0] ??
                        SHIFT_TIMES[shifts[headEmp.id] ?? 'day']
                      }
                      canFollow={selCrew.length > 0}
                      onShift={(k) => setSupShift(headEmp.id, k)}
                      onBuild={(s, e, p) => buildFor(headEmp, s, e, p)}
                      onFollow={() => syncTeam(sel)}
                    />
                  )}

                  {headEmp && (
                    <div className="tm rst-supcal">
                      <div className="rst-supcal-top">
                        <p className="rst-tb-colh mono">The supervisor's month — pick a code, tap days</p>
                        <span className="rst-supcal-cur mono">
                          {brush} · {SHIFT_META[brush].label}
                        </span>
                      </div>
                      <div className="rst-chips rst-chips--mini">
                        {SHIFT_CODES.map((code) => {
                          const meta = SHIFT_META[code];
                          return (
                            <button
                              key={code}
                              type="button"
                              className={`rst-chip is-${meta.family} ${brush === code ? 'is-on' : ''}`}
                              aria-pressed={brush === code}
                              title={meta.label}
                              onClick={() => setBrush(code)}
                            >
                              {code}
                              <small>{meta.label}</small>
                            </button>
                          );
                        })}
                      </div>
                      <div className="tm-cal">
                        <div className="tm-cal-head mono" aria-hidden>
                          {DOW3.map((l, i) => (
                            <span key={l} className={i >= 5 ? 'is-we' : ''}>
                              {l}
                            </span>
                          ))}
                        </div>
                        {monthMatrix(ym.year, ym.month).map((week, wi) => (
                          <div key={wi} className="tm-cal-week">
                            {week.map((day, di) => {
                              if (day === null) return <span key={di} aria-hidden />;
                              const code = grid[headEmp.id]?.[day - 1] ?? 'F';
                              return (
                                <button
                                  key={di}
                                  type="button"
                                  className={`tm-day is-${SHIFT_META[code].family} ${day === today ? 'is-today' : ''}`}
                                  aria-label={`${day}: ${SHIFT_META[code].label} — set to ${SHIFT_META[brush].label}`}
                                  onClick={() => paint(headEmp.id, day - 1)}
                                >
                                  <span className="tm-day-no mono tabular">{day}</span>
                                  <span className="tm-day-code mono">{code}</span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rst-tb-cols">
                    <div>
                      <p className="rst-tb-colh mono">In this team</p>
                      <ul className="rst-tb-people">
                        {selCrew.map((e) => (
                          <li key={e.id}>
                            <img src={photoOf(e.name)} alt="" className="rst-tb-ava" />
                            <span className="min-w-0 flex-1">
                              <span className="rst-tb-pname">{e.name}</span>
                              <span className="rst-tb-psub mono">
                                {e.position} · No. {empNo(e.id)}
                              </span>
                            </span>
                            {assignments[e.id] === sel && (
                              <button
                                type="button"
                                className="rst-tb-move mono"
                                title={`Return to ${hrOf(e.id)?.manager ?? 'their line manager'}`}
                                onClick={() => unassign(e.id)}
                              >
                                ✕
                              </button>
                            )}
                          </li>
                        ))}
                        {selCrew.length === 0 && (
                          <p className="rst-tb-none">No one yet — pick people from the right.</p>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="rst-tb-colh mono">Add people — you pick who joins</p>
                      <input
                        type="search"
                        className="rst-search"
                        placeholder="Search the project crew…"
                        value={addQ}
                        onChange={(e) => setAddQ(e.target.value)}
                      />
                      <ul className="rst-tb-people">
                        {crew
                          .filter((e) => teamOf(e) !== sel && !supervisors.includes(e.name))
                          .filter(
                            (e) =>
                              !addQ.trim() ||
                              `${e.name} ${empNo(e.id)} ${e.position} ${supOf(e.id)}`
                                .toLowerCase()
                                .includes(addQ.trim().toLowerCase()),
                          )
                          .slice(0, 9)
                          .map((e) => (
                            <li key={e.id}>
                              <img src={photoOf(e.name)} alt="" className="rst-tb-ava" />
                              <span className="min-w-0 flex-1">
                                <span className="rst-tb-pname">{e.name}</span>
                                <span className="rst-tb-psub mono">
                                  {e.position} · now with {teamOf(e)}
                                </span>
                              </span>
                              <button type="button" className="rst-tb-move is-add mono" onClick={() => onAssign(e.id, sel)}>
                                ← Add
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <p className="rst-tb-none">Create a supervisor to start building teams.</p>
              )}
            </section>
          </motion.div>
        ) : view === 'people' ? (
          /* ── the People roster: one flat, professional table of everyone ── */
          <motion.div
            className="rst-ppl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="rst-filter">
              <label className="rst-searchwrap">
                <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <span className="sr-only">Search employees</span>
                <input
                  type="search"
                  className="rst-search"
                  placeholder="Name, number, position, team…"
                  value={pplQuery}
                  onChange={(e) => setPplQuery(e.target.value)}
                />
              </label>
              <label className="rst-project">
                <span className="sr-only">Supervisor / team</span>
                <select value={pplTeam} onChange={(e) => setPplTeam(e.target.value)}>
                  <option value="all">All supervisors</option>
                  {teamNames.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rst-project">
                <span className="sr-only">Role</span>
                <select
                  value={pplRole}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPplRole(v === 'sup' ? 'sup' : v === 'member' ? 'member' : 'all');
                  }}
                >
                  <option value="all">Everyone</option>
                  <option value="sup">Supervisors</option>
                  <option value="member">Team members</option>
                </select>
              </label>
              <span className="rst-count mono" role="status">
                Showing {people.length} of {crew.length} · {pplTeamCount} team{pplTeamCount === 1 ? '' : 's'}
              </span>
            </div>

            <div className="rst-ppl-scroll">
              <table className="rst-ppl-table">
                <caption className="sr-only">
                  All employees on {project} — {people.length} shown
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Position</th>
                    <th scope="col">No.</th>
                    <th scope="col">Team · supervisor</th>
                    <th scope="col">Shift</th>
                    <th scope="col">Today</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map(({ emp, team, isSup }) => {
                    const st = standing(emp.id);
                    const kind = shifts[emp.id] ?? 'day';
                    return (
                      <tr key={emp.id}>
                        <td className="rst-ppl-emp">
                          <Link to={`/employees/${emp.id}`} className="rst-ppl-id">
                            <img src={photoOf(emp.name)} alt="" loading="lazy" />
                            <span className="rst-ppl-name">{emp.name}</span>
                            {isSup && <i className="rst-supchip mono">Sup</i>}
                          </Link>
                        </td>
                        <td className="rst-ppl-pos">{emp.position}</td>
                        <td className="rst-ppl-no mono tabular">{empNo(emp.id)}</td>
                        <td className="rst-ppl-team">{team}</td>
                        <td className="rst-ppl-shift">
                          <span className="rst-ppl-kind mono">{SHIFT_WINDOW[kind].label}</span>
                        </td>
                        <td className="rst-ppl-today">
                          {st ? (
                            <span className={`rst-ppl-stat is-${st.family}`}>
                              <i aria-hidden />
                              {st.text}
                            </span>
                          ) : (
                            <span className="rst-ppl-stat is-none mono">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {people.length === 0 && (
                    <tr>
                      <td colSpan={6} className="rst-none">
                        No one matches these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <>
        {/* ── the month in four numbers — management's glance ── */}
        <motion.div
          className="rst-nums"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.02, ease: EASE }}
        >
          <span>
            <b className="display tabular">{visible.length}</b>
            <span className="mono">crew shown</span>
          </span>
          {stats.todayCov !== null && (
            <span>
              <b className="display tabular">{stats.todayCov}</b>
              <span className="mono">on duty today</span>
            </span>
          )}
          <span>
            <b className="display tabular">{stats.minVal}</b>
            <span className="mono">lowest coverage · {DOW3[weekdayOf(ym.year, ym.month, stats.minDay)]?.toLowerCase()} {stats.minDay}</span>
          </span>
          <span>
            <b className="display tabular">{stats.leave}</b>
            <span className="mono">leave days this month</span>
          </span>
        </motion.div>

        {/* ── the day lens: click a day column, read its whole muster ── */}
        {lensDay !== null && lens && (
          <motion.div
            className="rst-lens"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="rst-lens-head">
              <b className="display">
                {DOW3[weekdayOf(ym.year, ym.month, lensDay)]} {lensDay}
              </b>
              <span className="mono">
                {monthLabel(ym.year, ym.month)} · {lens.duty.length} of {visible.length} on duty
              </span>
              <button type="button" className="rst-lens-x" aria-label="Close the day" onClick={() => setLensDay(null)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="rst-lens-groups">
              <div>
                <p className="rst-tb-colh mono">On duty · {lens.duty.length}</p>
                <ul>
                  {lens.duty.map((e) => (
                    <li key={e.id} className="rst-p">
                      <img src={photoOf(e.name)} alt="" loading="lazy" />
                      <span>{e.name}</span>
                    </li>
                  ))}
                  {lens.duty.length === 0 && <p className="rst-lens-none mono">Nobody — check this day.</p>}
                </ul>
              </div>
              <div>
                <p className="rst-tb-colh mono">Resting · {lens.rest.length}</p>
                <ul>
                  {lens.rest.map((e) => (
                    <li key={e.id} className="rst-p">
                      <img src={photoOf(e.name)} alt="" loading="lazy" />
                      <span>{e.name}</span>
                    </li>
                  ))}
                  {lens.rest.length === 0 && <p className="rst-lens-none mono">No one rests this day.</p>}
                </ul>
              </div>
              <div>
                <p className="rst-tb-colh mono">Away · {lens.away.length}</p>
                <ul>
                  {lens.away.map(({ emp, code }) => (
                    <li key={emp.id} className="rst-p">
                      <img src={photoOf(emp.name)} alt="" loading="lazy" />
                      <span>{emp.name}</span>
                      <i className={`rst-p-code is-${SHIFT_META[code].family} mono`} title={SHIFT_META[code].label}>
                        {code}
                      </i>
                    </li>
                  ))}
                  {lens.away.length === 0 && <p className="rst-lens-none mono">No leave on this day.</p>}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── the smart filter: one box, two narrows, assign mode ── */}
        <motion.div
          className="rst-filter"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.03, ease: EASE }}
        >
          <label className="rst-searchwrap">
            <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="sr-only">Filter the sheet</span>
            <input
              type="search"
              className="rst-search"
              placeholder="Name, number, position, supervisor…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="rst-project">
            <span className="sr-only">Team</span>
            <select value={supFilter} onChange={(e) => setSupFilter(e.target.value)}>
              <option value="all">All teams</option>
              {supervisors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="rst-project">
            <span className="sr-only">Position</span>
            <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
              <option value="all">All positions</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`rst-assignbtn mono ${exceptions ? 'is-on' : ''}`}
            aria-pressed={exceptions}
            title="Fade the routine — only leave, sickness and training glow"
            onClick={() => setExceptions((v) => !v)}
          >
            Exceptions
          </button>
          <span className="rst-count mono" role="status">
            Showing {visible.length} of {crew.length} employees
          </span>
        </motion.div>

        {/* ── the code tray: pick a stamp, then fill cells ── */}
        <motion.div
          className="rst-tray"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: EASE }}
        >
          <p className="rst-tray-h mono">
            Fill code — pick one, then click or drag across days · stamping a supervisor stamps their whole team
            <b>
              {brush} · {SHIFT_META[brush].label}
            </b>
          </p>
          <div role="toolbar" aria-label="Fill codes" className="rst-chips">
            {SHIFT_CODES.map((code) => {
              const meta = SHIFT_META[code];
              const on = brush === code;
              return (
                <button
                  key={code}
                  type="button"
                  className={`rst-chip is-${meta.family} ${on ? 'is-on' : ''}`}
                  aria-pressed={on}
                  title={`${meta.label} · ${FAMILY_LABEL[meta.family]}`}
                  onClick={() => setBrush(code)}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── the sheet ── */}
        <motion.div
          ref={sheetScrollRef}
          className={`rst-scroll ${exceptions ? 'is-exc' : ''}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
        >
          <table className="rst-table">
            <caption className="sr-only">
              Monthly duty roster for {project}, {monthLabel(ym.year, ym.month)}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="rst-name-h mono">
                  Employee
                </th>
                {dayMeta.map((d) => (
                  <th
                    key={d.day}
                    scope="col"
                    className={`rst-day ${d.weekend ? 'is-we' : ''} ${d.day === today ? 'is-tdy' : ''} ${lensDay === d.day ? 'is-lens' : ''}`}
                    {...(d.day === today ? { 'data-today': true } : {})}
                  >
                    <button
                      type="button"
                      className="rst-day-btn"
                      aria-pressed={lensDay === d.day}
                      title={`${d.letter} ${d.day} — open the day's muster`}
                      onClick={() => setLensDay((cur) => (cur === d.day ? null : d.day))}
                    >
                      <span className="rst-day-dow mono">{d.letter}</span>
                      <span className={`rst-day-no mono tabular ${d.day === today ? 'is-today' : ''}`}>{d.day}</span>
                      <i
                        className="rst-day-cov"
                        aria-hidden
                        style={{
                          opacity:
                            visible.length > 0
                              ? 0.15 + 0.85 * (coverage(grid, visibleIds, d.day - 1) / visible.length)
                              : 0.15,
                        }}
                      />
                    </button>
                  </th>
                ))}
                <th scope="col" className="rst-sum-h mono">
                  Days
                </th>
              </tr>
            </thead>
            <tbody>
              {sheetRows.map((e) => {
                const isSup = supervisors.includes(e.name);
                const team = teamOf(e);
                return (
                  <RosterRow
                    key={e.id}
                    id={e.id}
                    name={e.name}
                    sub={
                      isSup
                        ? `${e.position} · No. ${empNo(e.id)} · ${followers.get(e.id)?.length ?? 0} in team`
                        : `${e.position} · No. ${empNo(e.id)} · Team ${team.split(' ')[0] ?? team}`
                    }
                    month={monthLabel(ym.year, ym.month)}
                    codes={grid[e.id] ?? []}
                    todayIdx={today - 1}
                    isSup={isSup}
                    onStart={startPaint}
                    onDrag={dragPaint}
                    onTap={paint}
                  />
                );
              })}
              {sheetRows.length === 0 && (
                <tr>
                  <td colSpan={days + 2} className="rst-none">
                    No one matches these filters.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="rst-cover-h mono">
                  On duty
                </th>
                {dayMeta.map((d, i) => (
                  <td
                    key={d.day}
                    className={`rst-cover mono tabular ${d.weekend ? 'is-we' : ''} ${d.day === today ? 'is-tdy' : ''}`}
                  >
                    {coverage(grid, visibleIds, i)}
                  </td>
                ))}
                <td className="rst-cover" aria-hidden />
              </tr>
            </tfoot>
          </table>
        </motion.div>

        {/* ── codes & meanings ── */}
        <motion.div
          className="rst-legend"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.2, ease: EASE }}
        >
          <p className="rst-legend-h mono">Codes &amp; meanings</p>
          <ul>
            {SHIFT_CODES.map((code) => (
              <li key={code}>
                <span className={`rst-key is-${SHIFT_META[code].family} mono`}>{code}</span>
                {SHIFT_META[code].label}
              </li>
            ))}
          </ul>
        </motion.div>
          </>
        )}

        <p className="mono mt-8 text-[10px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">
          Demo roster · teams and edits save to this browser only — production writes them to Supabase under RLS
        </p>
      </div>
    </EmployeeShell>
  );
}

/* ── the schedule composer: management writes the supervisor's contract
      with the month — shift, exact hours, rotation — then builds it ── */

function SupComposer({
  shift,
  initial,
  canFollow,
  onShift,
  onBuild,
  onFollow,
}: {
  shift: ShiftKind;
  initial: DayHours;
  canFollow: boolean;
  onShift: (k: ShiftKind) => void;
  onBuild: (start: string, end: string, p: WorkPattern) => void;
  onFollow: () => void;
}) {
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [patternIdx, setPatternIdx] = useState(0);
  const mins = spanMinutes(start, end);
  const pattern = PATTERNS[patternIdx] ?? PATTERNS[0];

  return (
    <div className="rst-composer">
      <span className="rst-shift" role="group" aria-label="Shift">
        {(['day', 'night'] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={shift === k}
            className={shift === k ? 'is-on' : ''}
            title={`${SHIFT_WINDOW[k].label} shift · ${SHIFT_WINDOW[k].span}`}
            onClick={() => {
              onShift(k);
              setStart(SHIFT_TIMES[k].start);
              setEnd(SHIFT_TIMES[k].end);
            }}
          >
            {k === 'day' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
            )}
            {SHIFT_WINDOW[k].label}
          </button>
        ))}
      </span>

      <label className="rst-comp-field">
        <span className="mono">From</span>
        <input
          type="time"
          className="tm-time mono tabular"
          value={start}
          onChange={(e) => {
            if (e.target.value !== '') setStart(e.target.value);
          }}
        />
      </label>
      <label className="rst-comp-field">
        <span className="mono">To</span>
        <input
          type="time"
          className="tm-time mono tabular"
          value={end}
          onChange={(e) => {
            if (e.target.value !== '') setEnd(e.target.value);
          }}
        />
      </label>
      <span className="rst-hpd">
        <b className="display tabular">{mins === null ? '—' : spanLabel(mins)}</b>
        <span className="mono">per worked day</span>
      </span>

      <label className="rst-project rst-comp-field">
        <span className="mono">Rotation</span>
        <select value={patternIdx} onChange={(e) => setPatternIdx(Number(e.target.value))}>
          {PATTERNS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="rst-sync mono"
        disabled={mins === null || !pattern}
        title="Generate the supervisor's month from this shift, these hours and this rotation"
        onClick={() => {
          if (pattern) onBuild(start, end, pattern);
        }}
      >
        Build month
      </button>
      <button
        type="button"
        className="rst-sync rst-sync--strong mono"
        disabled={!canFollow}
        title="Copy the supervisor's month, shift and hours to every member"
        onClick={onFollow}
      >
        Team follows the supervisor
      </button>
      <span className="rst-tb-note mono">same days · same shift · same hours</span>
    </div>
  );
}

/* ── one crew row: sticky name cell, a stamp per day, totals at the end ── */

const RosterRow = memo(function RosterRow({
  id,
  name,
  sub,
  month,
  codes,
  todayIdx,
  isSup,
  onStart,
  onDrag,
  onTap,
}: {
  id: string;
  name: string;
  sub: string;
  month: string;
  codes: ReadonlyArray<ShiftCode>;
  todayIdx: number;
  isSup: boolean;
  onStart: (id: string, dayIdx: number) => void;
  onDrag: (id: string, dayIdx: number) => void;
  onTap: (id: string, dayIdx: number) => void;
}) {
  const t = tally(codes);
  return (
    <tr>
      <th scope="row" className={`rst-name ${isSup ? 'is-sup' : ''}`}>
        <span className="rst-name-main">
          {name}
          {isSup && <i className="rst-supchip mono">Sup</i>}
        </span>
        <span className="rst-name-sub mono">{sub}</span>
      </th>
      {codes.map((code, i) => (
        <td key={i}>
          <button
            type="button"
            className={`rst-cell is-${SHIFT_META[code].family} mono ${i === todayIdx ? 'is-tdy' : ''}`}
            aria-label={`${name} · ${i + 1} ${month}: ${SHIFT_META[code].label}`}
            onPointerDown={(ev) => {
              ev.preventDefault();
              onStart(id, i);
            }}
            onPointerEnter={() => onDrag(id, i)}
            onClick={(ev) => {
              // keyboard activation only — pointer clicks already painted
              if (ev.detail === 0) onTap(id, i);
            }}
          >
            {code}
          </button>
        </td>
      ))}
      <td className="rst-sum">
        <span className="rst-mix" aria-hidden>
          <i className="is-d" style={{ width: `${(t.duty / Math.max(codes.length, 1)) * 100}%` }} />
          <i className="is-l" style={{ width: `${(t.leave / Math.max(codes.length, 1)) * 100}%` }} />
          <i className="is-r" style={{ width: `${(t.rest / Math.max(codes.length, 1)) * 100}%` }} />
        </span>
        <span className="tabular">{t.duty} F</span>
        <span className="mono tabular">{t.leave} LV · {t.rest} OFF</span>
      </td>
    </tr>
  );
});
