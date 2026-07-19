import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { EmployeeShell } from './EmployeeChrome';
import { EMPLOYEES, ROLE_MATRIX, START_GRADE } from './Competency.data';
import { computeGrade, isHeld, plainViews, trainingLevel } from './Competency.logic';
import type { CertStatus, CertView, Employee, Grade } from './Competency.types';
import { empNo, hrOf } from './EmployeeDirectory.data';
import { GRADED_POSITIONS } from './EmployeeForm.data';
import { photoOf } from './avatar';
import { POSITION_TAG, SHIFT_CODES, SHIFT_META } from './Roster.data';
import type { ShiftCode } from './Roster.data';
import { loadRosterGrid, monthLabel, rosterStoreKey, tally } from './Roster.logic';
import type { RosterGrid } from './Roster.logic';
import {
  ASSIGN_KEY,
  HOURS_PER_SHIFT,
  SHIFT_TIMES,
  SHIFT_WINDOW,
  dayMinutes,
  hasAlert,
  hoursStoreKey,
  isWorked,
  memberCsv,
  monthMatrix,
  monthMinutes,
  parseStoredAssignments,
  parseStoredCrew,
  parseStoredHours,
  parseStoredShifts,
  shiftStoreKey,
  spanLabel,
  spanMinutes,
} from './Team.logic';
import type { DayHours, HoursMap, ShiftKind, ShiftMap } from './Team.logic';
import './roster.css';
import './team.css';

/**
 * Team timesheet — everything a field supervisor needs, in ONE place
 * (/team). Built for thick gloves and thin patience: no navigation, no
 * typing, nothing to memorise.
 *
 *   · Left — the team. Big rows, each showing the member and their
 *     standing TODAY. Add members (only people this supervisor manages)
 *     and remove them — the sheet is theirs to keep current.
 *   · Right — the selected member's month. One tap picks the member;
 *     the pane shows their shift (Day ☀ 06–18 / Night ☾ 18–06), the
 *     worked-days / hours / leave numbers, the code tray, and the month
 *     as a big tappable calendar. Pick a code, tap days. Done.
 *   · One Save writes it all — month sheets, shifts, team list — and the
 *     duty roster page reads the same record, so management always sees
 *     the full picture.
 *
 * Viewing is open to everyone; edits are supervisor-only (demo persona is
 * the supervisor; production enforces the role in RLS, charter §3). Demo
 * persistence is localStorage parsed through Zod schemas (charter §2).
 */

const SUPERVISOR = 'Salim Al-Rashdi';
const CREW_KEY = 'sgs-crew-v1:salim-al-rashdi';
/** Demo role — production reads the signed-in user's role from Supabase
 *  Auth and RLS enforces it; this flag only shapes the demo UI. */
const ROLE: 'supervisor' | 'viewer' = 'supervisor';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Ym = { year: number; month: number };

const DOC_HUE: Record<CertStatus, string> = {
  valid: 'oklch(0.53 0.1 162)',
  expiring: 'oklch(0.72 0.12 82)',
  expired: 'oklch(0.55 0.16 28)',
  missing: 'oklch(0.55 0.02 70)',
};


type MemberFacts = {
  views: CertView[];
  counts: Record<CertStatus, number>;
  held: number;
  required: number;
  grade: Grade | null;
  graded: boolean;
  alert: boolean;
};

function factsOf(emp: Employee, now: Date): MemberFacts {
  const views = plainViews(emp.position, emp.certs, now);
  const counts: Record<CertStatus, number> = { valid: 0, expiring: 0, expired: 0, missing: 0 };
  for (const v of views) counts[v.status] += 1;
  const graded = (GRADED_POSITIONS as ReadonlyArray<string>).includes(emp.position);
  return {
    views,
    counts,
    held: views.filter((v) => isHeld(v.status)).length,
    required: ROLE_MATRIX[emp.position].length,
    grade: graded ? computeGrade(trainingLevel(views), START_GRADE[emp.position]) : null,
    graded,
    alert: hasAlert(views.map((v) => v.status)),
  };
}

export default function Team() {
  const { id } = useParams();
  const [now] = useState(() => new Date());
  const [ym, setYm] = useState<Ym>({ year: now.getFullYear(), month: now.getMonth() });
  const canEdit = ROLE === 'supervisor';

  /** Everyone this supervisor manages — management's assignments (set on
   *  the duty roster page) win over HR's original line manager. */
  const supervisees = useMemo(() => {
    const assigned = parseStoredAssignments(localStorage.getItem(ASSIGN_KEY)) ?? {};
    return EMPLOYEES.filter((e) => (assigned[e.id] ?? hrOf(e.id)?.manager) === SUPERVISOR);
  }, []);
  const byId = useMemo(() => new Map(supervisees.map((e) => [e.id, e])), [supervisees]);

  const [crewIds, setCrewIds] = useState<string[]>(() => {
    const stored = parseStoredCrew(localStorage.getItem(CREW_KEY));
    const valid = stored?.filter((cid) => supervisees.some((e) => e.id === cid));
    return valid && valid.length > 0 ? valid : supervisees.map((e) => e.id);
  });
  const crew = useMemo(
    () => crewIds.flatMap((cid) => (byId.get(cid) ? [byId.get(cid) as Employee] : [])),
    [crewIds, byId],
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (id) {
      const hit = supervisees.find((e) => e.id === id || empNo(e.id) === id);
      if (hit) return hit.id;
    }
    return null;
  });
  const selected = (selectedId ? byId.get(selectedId) : undefined) ?? crew[0];

  /** Month grids for every project the crew spans — saving writes whole
   *  project grids so nobody outside the team is ever clobbered. */
  const crewProjects = useMemo(() => [...new Set(crew.map((e) => e.project))], [crew]);
  const loadGrids = useCallback(
    (target: Ym) => {
      const out: Record<string, RosterGrid> = {};
      for (const p of crewProjects) {
        const ids = EMPLOYEES.filter((e) => e.project === p).map((e) => e.id);
        out[p] = loadRosterGrid(p, target.year, target.month, ids, (k) => localStorage.getItem(k));
      }
      return out;
    },
    [crewProjects],
  );
  const [grids, setGrids] = useState<Record<string, RosterGrid>>(() => loadGrids(ym));
  const [shifts, setShifts] = useState<ShiftMap>(
    () => parseStoredShifts(localStorage.getItem(shiftStoreKey(ym.year, ym.month))) ?? {},
  );
  const [hoursMap, setHoursMap] = useState<HoursMap>(
    () => parseStoredHours(localStorage.getItem(hoursStoreKey(ym.year, ym.month))) ?? {},
  );
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    setGrids(loadGrids(ym));
    setShifts(parseStoredShifts(localStorage.getItem(shiftStoreKey(ym.year, ym.month))) ?? {});
    setHoursMap(parseStoredHours(localStorage.getItem(hoursStoreKey(ym.year, ym.month))) ?? {});
    setDirty(false);
    setSavedAt(null);
  }, [ym, loadGrids]);

  /** The list's standing column is always about TODAY, whatever month is
   *  open — when the open month IS this month, it reads live edits. */
  const isThisMonth = ym.year === now.getFullYear() && ym.month === now.getMonth();
  const todayGrids = useMemo(
    () => (isThisMonth ? null : loadGrids({ year: now.getFullYear(), month: now.getMonth() })),
    [isThisMonth, loadGrids, now],
  );
  function todayCode(emp: Employee): ShiftCode {
    const source = isThisMonth ? grids : todayGrids;
    return source?.[emp.project]?.[emp.id]?.[now.getDate() - 1] ?? 'F';
  }

  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [editing, setEditing] = useState(false);

  const addable = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    return supervisees
      .filter((e) => !crewIds.includes(e.id))
      .filter((e) => !q || `${e.name} ${empNo(e.id)} ${e.position}`.toLowerCase().includes(q));
  }, [supervisees, crewIds, addQuery]);

  function markDirty() {
    setDirty(true);
    setSavedAt(null);
  }

  function setCode(emp: Employee, day: number, code: ShiftCode) {
    if (!canEdit) return;
    setGrids((g) => {
      const grid = g[emp.project];
      const row = grid?.[emp.id];
      if (!grid || !row || row[day - 1] === code) return g;
      const next = row.slice();
      next[day - 1] = code;
      return { ...g, [emp.project]: { ...grid, [emp.id]: next } };
    });
    markDirty();
  }

  function setShift(empId: string, kind: ShiftKind) {
    if (!canEdit) return;
    setShifts((s) => ({ ...s, [empId]: kind }));
    markDirty();
  }

  function setDayHours(empId: string, day: number, dh: DayHours | null) {
    if (!canEdit) return;
    setHoursMap((m) => {
      const forEmp = { ...(m[empId] ?? {}) };
      if (dh === null) delete forEmp[String(day)];
      else forEmp[String(day)] = dh;
      return { ...m, [empId]: forEmp };
    });
    markDirty();
  }

  function step(delta: number) {
    setYm((cur) => {
      const m = cur.month + delta;
      if (m < 0) return { year: cur.year - 1, month: 11 };
      if (m > 11) return { year: cur.year + 1, month: 0 };
      return { year: cur.year, month: m };
    });
  }

  function save() {
    for (const p of crewProjects) {
      const grid = grids[p];
      if (grid) localStorage.setItem(rosterStoreKey(p, ym.year, ym.month), JSON.stringify(grid));
    }
    localStorage.setItem(shiftStoreKey(ym.year, ym.month), JSON.stringify(shifts));
    localStorage.setItem(hoursStoreKey(ym.year, ym.month), JSON.stringify(hoursMap));
    localStorage.setItem(CREW_KEY, JSON.stringify(crewIds));
    setDirty(false);
    setSavedAt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
  }

  function exportCsv() {
    if (!selected) return;
    const row = grids[selected.project]?.[selected.id] ?? [];
    const csv = memberCsv(
      selected.name,
      empNo(selected.id),
      ym.year,
      ym.month,
      row,
      shifts[selected.id] ?? 'day',
      hoursMap[selected.id] ?? {},
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgs-sheet-${empNo(selected.id)}-${ym.year}-${String(ym.month + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <EmployeeShell active="My team">
      <div className="tm mx-auto max-w-[1280px]">
        {/* ── masthead: one title, one month, two actions ── */}
        <motion.div
          className="pf-sec-head pf-sec-head--split"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <div className="pf-sec-lead">
            <span className="pf-sec-ic" aria-hidden>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                <path d="m15.5 9.5 2 2 4-4.5" />
              </svg>
            </span>
            <div>
              <h1 className="pf-sec-title display">Team timesheet</h1>
              <p className="pf-sec-sub mono">
                Supervisor · {SUPERVISOR} · {crew.length} on sheet · view open to everyone
              </p>
            </div>
          </div>
          <div className="tm-controls">
            <span className="tm-month" role="group" aria-label="Month">
              <button type="button" className="tm-step" aria-label="Previous month" onClick={() => step(-1)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
              </button>
              <span className="tm-month-label display">{monthLabel(ym.year, ym.month)}</span>
              <button type="button" className="tm-step" aria-label="Next month" onClick={() => step(1)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
              </button>
            </span>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2 text-[12.5px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></svg>
              Export
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className="emp-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white disabled:cursor-default disabled:opacity-45"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
                Save
              </button>
            )}
            <span className={`tm-state mono ${dirty ? 'is-dirty' : ''}`} role="status">
              {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt}` : ''}
            </span>
          </div>
        </motion.div>

        <div className="tm-split">
          {/* ── the team ── */}
          <motion.aside
            className="tm-side"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06, ease: EASE }}
          >
            <div className="tm-side-top">
              <p className="tm-side-h mono">Team · standing today</p>
              {canEdit && (
                <span className="tm-side-actions">
                  <button
                    type="button"
                    className={`tm-mini mono ${addOpen ? 'is-on' : ''}`}
                    aria-expanded={addOpen}
                    aria-controls="tm-addpanel"
                    onClick={() => {
                      setAddOpen((o) => !o);
                      setEditing(false);
                    }}
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    className={`tm-mini mono ${editing ? 'is-on' : ''}`}
                    aria-pressed={editing}
                    onClick={() => {
                      setEditing((e) => !e);
                      setAddOpen(false);
                    }}
                  >
                    Edit
                  </button>
                </span>
              )}
            </div>

            <AnimatePresence initial={false}>
              {addOpen && (
                <motion.div
                  id="tm-addpanel"
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="tm-addbox">
                    <input
                      type="search"
                      className="tm-search"
                      placeholder={`Search your people (${addable.length})…`}
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                    />
                    {addable.length > 0 ? (
                      <ul className="tm-addlist">
                        {addable.slice(0, 6).map((e) => (
                          <li key={e.id}>
                            <span className="min-w-0">
                              <span className="tm-add-name">{e.name}</span>
                              <span className="tm-sub mono">
                                {POSITION_TAG[e.position] ?? e.position} · No. {empNo(e.id)}
                              </span>
                            </span>
                            <button
                              type="button"
                              className="tm-mini tm-mini--add mono"
                              onClick={() => {
                                setCrewIds((c) => [...c, e.id]);
                                setSelectedId(e.id);
                                markDirty();
                              }}
                            >
                              + Add
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tm-add-none">Everyone you supervise is on the sheet.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ul className="tm-list">
              {crew.map((e) => {
                const code = todayCode(e);
                const meta = SHIFT_META[code];
                const on = selected?.id === e.id;
                return (
                  <li key={e.id}>
                    <button type="button" className={`tm-person ${on ? 'is-on' : ''}`} onClick={() => setSelectedId(e.id)}>
                      <span className="tm-ava" aria-hidden>
                        <img src={photoOf(e.name)} alt="" loading="lazy" />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="tm-name">{e.name}</span>
                        <span className={`tm-today is-${meta.family}`}>
                          <i aria-hidden />
                          {meta.label}
                        </span>
                      </span>
                      {editing ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="tm-remove"
                          aria-label={`Remove ${e.name} from the sheet`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setCrewIds((c) => c.filter((cid) => cid !== e.id));
                            markDirty();
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setCrewIds((c) => c.filter((cid) => cid !== e.id));
                              markDirty();
                            }
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </span>
                      ) : (
                        <svg className="tm-chev" aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                      )}
                    </button>
                  </li>
                );
              })}
              {crew.length === 0 && <p className="tm-add-none">No one on the sheet yet — add your first member.</p>}
            </ul>
          </motion.aside>

          {/* ── the selected member's month ── */}
          <motion.section
            className="tm-pane"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
          >
            {selected ? (
              <MemberMonth
                key={`${selected.id}:${ym.year}-${ym.month}`}
                emp={selected}
                facts={factsOf(selected, now)}
                row={grids[selected.project]?.[selected.id] ?? []}
                shift={shifts[selected.id] ?? 'day'}
                overrides={hoursMap[selected.id] ?? {}}
                ym={ym}
                today={isThisMonth ? now.getDate() : 0}
                canEdit={canEdit}
                onCode={(day, code) => setCode(selected, day, code)}
                onShift={(k) => setShift(selected.id, k)}
                onHours={(day, dh) => setDayHours(selected.id, day, dh)}
              />
            ) : (
              <p className="tm-add-none">Add a member to open their month.</p>
            )}
          </motion.section>
        </div>

        <p className="mono mt-10 text-[10px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">
          One cell = one day · every worked day is one {HOURS_PER_SHIFT}-hour shift · this sheet and the duty
          roster share the same record — management sees the full picture · edits are supervisor-only, enforced in
          RLS in production
        </p>
      </div>
    </EmployeeShell>
  );
}

/* ── the member pane: identity · shift · numbers · calendar + inspector ── */

const DOW_HEAD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function MemberMonth({
  emp,
  facts,
  row,
  shift,
  overrides,
  ym,
  today,
  canEdit,
  onCode,
  onShift,
  onHours,
}: {
  emp: Employee;
  facts: MemberFacts;
  row: ReadonlyArray<ShiftCode>;
  shift: ShiftKind;
  overrides: Record<string, DayHours>;
  ym: Ym;
  today: number;
  canEdit: boolean;
  onCode: (day: number, code: ShiftCode) => void;
  onShift: (k: ShiftKind) => void;
  onHours: (day: number, dh: DayHours | null) => void;
}) {
  const weeks = useMemo(() => monthMatrix(ym.year, ym.month), [ym]);
  const days = row.length;
  const [selDay, setSelDay] = useState(() => (today > 0 ? today : 1));
  const t = tally(row);
  const totalMins = monthMinutes(row, overrides);

  return (
    <>
      <header className="tm-pane-head">
        <span className="tm-ava tm-ava--lg" aria-hidden>
          <img src={photoOf(emp.name)} alt="" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="tm-pane-name display">{emp.name}</h2>
          <p className="tm-pane-sub mono">
            {emp.position} · No. {empNo(emp.id)} · {emp.project}
            {facts.graded && ` · Grade ${facts.grade ?? '—'}`} · {facts.held}/{facts.required} in date
            {facts.alert && <b className="tm-alert-word"> · documents need action</b>}
          </p>
          <p className="tm-docsline mono">
            {(['valid', 'expiring', 'expired', 'missing'] as const).map((s) =>
              facts.counts[s] > 0 ? (
                <span key={s} style={{ ['--dc' as string]: DOC_HUE[s] }}>
                  <i aria-hidden />
                  {facts.counts[s]} {s}
                </span>
              ) : null,
            )}
          </p>
        </div>

        {/* the shift — morning sun or night moon, nothing to type */}
        <div className="tm-shift" role="group" aria-label="Shift">
          {(['day', 'night'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`${shift === k ? 'is-on' : ''} ${canEdit ? '' : 'is-readonly'}`}
              aria-pressed={shift === k}
              disabled={!canEdit}
              title={`${SHIFT_WINDOW[k].label} shift · ${SHIFT_WINDOW[k].span}`}
              onClick={() => onShift(k)}
            >
              {k === 'day' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              )}
              <span>
                {SHIFT_WINDOW[k].label}
                <small className="mono tabular">{SHIFT_WINDOW[k].span}</small>
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* the month in numbers — hours are exact, overrides included */}
      <div className="tm-nums">
        <span>
          <b className="display tabular">{t.duty}</b>
          <span className="mono">days worked</span>
        </span>
        <span>
          <b className="display tabular">{spanLabel(totalMins)}</b>
          <span className="mono">worked hours · {SHIFT_WINDOW[shift].label.toLowerCase()} shift {SHIFT_WINDOW[shift].span}</span>
        </span>
        <span>
          <b className="display tabular">{t.leave}</b>
          <span className="mono">leave days</span>
        </span>
        <span>
          <b className="display tabular">{t.rest}</b>
          <span className="mono">rest days</span>
        </span>
      </div>

      <div className="rst tm-cal-wrap">
        {/* the month — tap a day to open it */}
        <div className="tm-cal">
          <div className="tm-cal-head mono" aria-hidden>
            {DOW_HEAD.map((l, i) => (
              <span key={l} className={i >= 5 ? 'is-we' : ''}>
                {l}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="tm-cal-week">
              {week.map((day, di) => {
                if (day === null) return <span key={di} aria-hidden />;
                const code = row[day - 1] ?? 'F';
                const worked = isWorked(code);
                return (
                  <button
                    key={di}
                    type="button"
                    className={`tm-day is-${SHIFT_META[code].family} ${day === today ? 'is-today' : ''} ${day === selDay ? 'is-sel' : ''}`}
                    aria-pressed={day === selDay}
                    aria-label={`Open ${day} ${monthLabel(ym.year, ym.month)} — ${SHIFT_META[code].label}`}
                    onClick={() => setSelDay(day)}
                  >
                    <span className="tm-day-no mono tabular">{day}</span>
                    <span className="tm-day-code mono">{code}</span>
                    {worked && (
                      <span className="tm-day-hrs mono">
                        {spanLabel(dayMinutes(code, overrides[String(day)]))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="rst-legend">
            <p className="rst-legend-h mono">Codes &amp; meanings</p>
            <ul>
              {SHIFT_CODES.map((code) => (
                <li key={code}>
                  <span className={`rst-key is-${SHIFT_META[code].family} mono`}>{code}</span>
                  {SHIFT_META[code].label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* the day inspector — one day, spelled out and precise */}
        <DayInspector
          day={Math.min(selDay, Math.max(days, 1))}
          days={days}
          ym={ym}
          code={row[Math.min(selDay, Math.max(days, 1)) - 1] ?? 'F'}
          override={overrides[String(Math.min(selDay, Math.max(days, 1)))]}
          shift={shift}
          canEdit={canEdit}
          onPick={(d) => setSelDay(d)}
          onCode={onCode}
          onHours={onHours}
        />
      </div>
    </>
  );
}

/* ── the day inspector: date · what it is · exact working hours ── */

function DayInspector({
  day,
  days,
  ym,
  code,
  override,
  shift,
  canEdit,
  onPick,
  onCode,
  onHours,
}: {
  day: number;
  days: number;
  ym: Ym;
  code: ShiftCode;
  override: DayHours | undefined;
  shift: ShiftKind;
  canEdit: boolean;
  onPick: (day: number) => void;
  onCode: (day: number, code: ShiftCode) => void;
  onHours: (day: number, dh: DayHours | null) => void;
}) {
  const date = new Date(ym.year, ym.month, day);
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date);
  const worked = isWorked(code);
  const times = override ?? SHIFT_TIMES[shift];
  const mins = spanMinutes(times.start, times.end);

  function change(part: Partial<DayHours>) {
    const next = { ...times, ...part };
    if (next.start === '' || next.end === '') return; // cleared input — keep the last value
    onHours(day, next);
  }

  return (
    <aside className="tm-insp" aria-label={`${weekday} ${day} — day details`}>
      <div className="tm-insp-nav">
        <button type="button" className="tm-step" aria-label="Previous day" disabled={day <= 1} onClick={() => onPick(day - 1)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <div className="tm-insp-date">
          <b className="display">{weekday}</b>
          <span className="mono">
            {day} {monthLabel(ym.year, ym.month)}
          </span>
        </div>
        <button type="button" className="tm-step" aria-label="Next day" disabled={day >= days} onClick={() => onPick(day + 1)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </div>

      <p className="tm-insp-h mono">This day is</p>
      <div className="tm-insp-chips" role="radiogroup" aria-label="Day code">
        {SHIFT_CODES.map((c) => {
          const meta = SHIFT_META[c];
          const on = c === code;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!canEdit}
              className={`rst-chip is-${meta.family} ${on ? 'is-on' : ''}`}
              onClick={() => onCode(day, c)}
            >
              {c}
              <small>{meta.label}</small>
            </button>
          );
        })}
      </div>

      {worked ? (
        <div className="tm-insp-hours">
          <p className="tm-insp-h mono">
            Working hours
            {override && (
              <button type="button" className="tm-insp-reset mono" disabled={!canEdit} onClick={() => onHours(day, null)}>
                Reset to shift
              </button>
            )}
          </p>
          <div className="tm-times">
            <label>
              <span className="mono">From</span>
              <input
                type="time"
                className="tm-time mono tabular"
                value={times.start}
                disabled={!canEdit}
                onChange={(e) => change({ start: e.target.value })}
              />
            </label>
            <label>
              <span className="mono">To</span>
              <input
                type="time"
                className="tm-time mono tabular"
                value={times.end}
                disabled={!canEdit}
                onChange={(e) => change({ end: e.target.value })}
              />
            </label>
            <span className="tm-dur">
              <b className="display tabular">{mins === null ? '—' : spanLabel(mins)}</b>
              <span className="mono">{mins === null ? 'check the times' : override ? 'this day only' : `${SHIFT_WINDOW[shift].label.toLowerCase()} shift`}</span>
            </span>
          </div>
        </div>
      ) : (
        <p className="tm-insp-off mono">
          No working hours — {SHIFT_META[code].label.toLowerCase()}.
        </p>
      )}
    </aside>
  );
}
