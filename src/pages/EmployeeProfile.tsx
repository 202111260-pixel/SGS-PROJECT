import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { EmployeeShell } from './EmployeeChrome';
import { EMPLOYEES, GRADE_ORDER, ROLE_MATRIX, START_GRADE, TIER_LABEL, TIERS_FOR } from './Competency.data';
import {
  computeGrade,
  daysUntil,
  experienceLevel,
  fmtDate,
  gi,
  initialsOf,
  isHeld,
  parseISO,
  plainViews,
  trainingLevel,
  yearsSince,
} from './Competency.logic';
import type { CertStatus, CertView, Grade } from './Competency.types';
import { empNo, hrOf } from './EmployeeDirectory.data';
import { GRADED_POSITIONS } from './EmployeeForm.data';
import { photoOf } from './avatar';
import { FAMILY_LABEL, SHIFT_META } from './Roster.data';
import { loadRosterGrid, monthLabel, tally } from './Roster.logic';
import {
  SHIFT_TIMES,
  SHIFT_WINDOW,
  dayMinutes,
  dutyRun,
  hoursStoreKey,
  isWorked,
  monthMinutes,
  monthSpans,
  nextOfFamily,
  parseStoredHours,
  parseStoredShifts,
  sameCodeRun,
  shiftStoreKey,
  spanLabel,
} from './Team.logic';
import SgsLogo from '../components/SgsLogo';

/**
 * EmployeeProfile — the full record for one employee (/employees/:id),
 * filed as a personnel dossier. One complete summary; no fact repeats.
 *
 * Three ordered strata:
 *   1. The identity sheet — paper-clipped photo, name, the copper grade
 *      coin, and ALL the personal facts merged in one place: position /
 *      project / status / line manager / contract / nationality / base /
 *      hired / email / mobile, a small Property disclosure (click the icon
 *      row, the assets pop out as paper chips), and the footer barcode
 *      with the employee no beside the SGS mark.
 *   2. Certificates — an unwrapped section header (count line as the sub,
 *      next-renewal on the right) over the four status folders in the
 *      Competency page's traffic-light hues, resting straight on the page;
 *      clicking a folder unfolds its rows on the page ground. The FTW
 *      medical verdict is stamped at the section's foot (every employee
 *      must hold it — binary, never a percentage) with the document
 *      standings beside it.
 *   3. Duty — this month's shift, straight from the shared duty-roster
 *      record: the whole month as one tinted tape (a chip per day),
 *      today's standing called out, and worked/hours/leave totals — so
 *      management reads the shift here without opening the roster.
 *   4. Competency — full width: training / experience metrics, the next
 *      step spelled out as the section's statement, and the remaining
 *      certificates listed.
 *
 * All names come from the Add Employee form's official data; grades exist
 * only for GRADED_POSITIONS. Demo record — production fetches by id from
 * Supabase under RLS and parses with Zod before rendering (charter §2/§3).
 */

/** Folder colorways — the Competency page's traffic-light hues, solid.
 *  Face text is a fixed literal so it never flips in dark mode; expiring
 *  keeps an ink-dark label because white on amber cannot reach AA. */
const FOLDER_META: Record<
  CertStatus,
  { title: string; bright: string; deep: string; text: string; empty: string }
> = {
  valid: {
    title: 'Valid',
    bright: 'oklch(0.60 0.11 162)',
    deep: 'oklch(0.46 0.10 162)',
    text: 'oklch(0.985 0.008 85)',
    empty: 'Nothing in date yet; certificates land here as they are earned.',
  },
  expiring: {
    title: 'Expiring',
    bright: 'oklch(0.84 0.125 88)',
    deep: 'oklch(0.75 0.13 80)',
    text: 'oklch(0.28 0.05 70)',
    empty: 'Nothing entering its renewal window.',
  },
  expired: {
    title: 'Expired',
    bright: 'oklch(0.58 0.165 30)',
    deep: 'oklch(0.465 0.155 28)',
    text: 'oklch(0.985 0.008 85)',
    empty: 'Nothing lapsed. Every held certificate is in date.',
  },
  missing: {
    title: 'Missing',
    bright: 'oklch(0.62 0.02 70)',
    deep: 'oklch(0.465 0.018 70)',
    text: 'oklch(0.985 0.008 85)',
    empty: 'Every required certificate is on file.',
  },
};

/** Chip hues for the drawer rows, per status. */
const STATUS_HUE: Record<CertStatus, string> = {
  valid: 'oklch(0.46 0.10 162)',
  expiring: 'oklch(0.52 0.12 70)',
  expired: 'oklch(0.50 0.16 28)',
  missing: 'var(--color-ink-4)',
};

const STATUSES: ReadonlyArray<CertStatus> = ['valid', 'expiring', 'expired', 'missing'];

const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/** Compact date for folder faces and the renewal chip: `5 SEP 26`. */
function shortDate(iso: string): string {
  const d = parseISO(iso);
  const mo = MON3[d.getMonth()] ?? '';
  return `${d.getDate()} ${mo} ${String(d.getFullYear() % 100).padStart(2, '0')}`;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ── the duty gauge's geometry: a donut of one arc segment per day ── */

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function segPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

/** `Sat 25` — the compact date the duty facts speak in. */
function fmtDayShort(year: number, month0: number, day: number): string {
  return `${new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(year, month0, day))} ${day}`;
}

export default function EmployeeProfile() {
  const { id } = useParams();
  const [now] = useState(() => new Date());
  const [openStatus, setOpenStatus] = useState<CertStatus | null>(null);
  const [propertyOpen, setPropertyOpen] = useState(false);
  /** The gauge's focus: a pinned day (click) and a hovered day (gauge or
   *  ledger) — the hub reads whichever is live. */
  const [dutyDay, setDutyDay] = useState<number | null>(null);
  const [dutyHover, setDutyHover] = useState<number | null>(null);

  const emp = useMemo(() => {
    if (!id) return undefined;
    return EMPLOYEES.find((e) => e.id === id || e.id === `e-${id}` || empNo(e.id) === id);
  }, [id]);

  const views: CertView[] = useMemo(
    () => (emp ? plainViews(emp.position, emp.certs, now) : []),
    [emp, now],
  );

  /** This month's duty, straight from the shared roster record — so
   *  management reads the shift here without opening another page. */
  const duty = useMemo(() => {
    if (!emp) return null;
    const y = now.getFullYear();
    const m = now.getMonth();
    const row = loadRosterGrid(emp.project, y, m, [emp.id], (k) => localStorage.getItem(k))[emp.id] ?? [];
    const shift = (parseStoredShifts(localStorage.getItem(shiftStoreKey(y, m))) ?? {})[emp.id] ?? 'day';
    const overrides = (parseStoredHours(localStorage.getItem(hoursStoreKey(y, m))) ?? {})[emp.id] ?? {};
    return { y, m, row, shift, overrides, mins: monthMinutes(row, overrides), t: tally(row) };
  }, [emp, now]);

  /** The duty facts a manager actually asks: today's standing, where the
   *  current run sits, and what leave is coming. */
  const dutyFacts = useMemo(() => {
    if (!duty) return null;
    const todayIdx = now.getDate() - 1;
    const todayCode = duty.row[todayIdx] ?? 'F';
    const run = dutyRun(duty.row, todayIdx);
    const leaveIdx = nextOfFamily(duty.row, todayIdx, ['planned', 'unplanned', 'special']);
    return {
      todayIdx,
      todayCode,
      run,
      nextRestIdx: nextOfFamily(duty.row, todayIdx + 1, ['rest']),
      backIdx: run ? null : nextOfFamily(duty.row, todayIdx + 1, ['duty', 'extra']),
      leaveIdx,
      leaveLen: leaveIdx !== null ? sameCodeRun(duty.row, leaveIdx) : 0,
      families: [...new Set(duty.row.map((c) => SHIFT_META[c].family))],
      spans: monthSpans(duty.row),
    };
  }, [duty, now]);

  const byStatus = useMemo(() => {
    const groups: Record<CertStatus, CertView[]> = { valid: [], expiring: [], expired: [], missing: [] };
    for (const v of views) groups[v.status].push(v);
    for (const s of ['valid', 'expiring', 'expired'] as const) {
      groups[s].sort((a, b) => (a.rec && b.rec ? a.rec.expiry.localeCompare(b.rec.expiry) : 0));
    }
    return groups;
  }, [views]);

  if (!emp) {
    return (
      <EmployeeShell active="Employees">
        <div className="mx-auto max-w-md py-24 text-center">
          <p className="mono text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">Not found</p>
          <h1 className="display mt-3 text-[1.9rem] text-[color:var(--color-ink)]">No such employee</h1>
          <p className="mt-2 text-[13.5px] text-[color:var(--color-ink-2)]">
            This record doesn’t exist or has been moved. Head back to the roster to find the right person.
          </p>
          <Link to="/employees" className="emp-btn-primary mt-6 inline-flex rounded-full px-5 py-2.5 text-[13px] font-semibold text-white">
            Back to Employees
          </Link>
        </div>
      </EmployeeShell>
    );
  }

  const hr = hrOf(emp.id);
  const required = ROLE_MATRIX[emp.position];
  const years = yearsSince(emp.hired, now);

  const held = byStatus.valid.length + byStatus.expiring.length;
  const trainingLv = trainingLevel(views);
  const expLv = experienceLevel(years);
  const startGrade = START_GRADE[emp.position];
  /** Only Assistant / Operator / Supervisor carry the C → B → A ladder —
   *  exactly as the Add Employee form records it (GRADED_POSITIONS). */
  const isGraded = (GRADED_POSITIONS as ReadonlyArray<string>).includes(emp.position);
  const grade: Grade | null = isGraded ? computeGrade(trainingLv, startGrade) : null;

  const next: Grade | null = !isGraded ? null : grade === null ? 'C' : GRADE_ORDER[gi(grade) + 1] ?? null;
  const gapCerts = next ? views.filter((v) => TIERS_FOR[next].includes(v.training.tier) && !isHeld(v.status)) : [];
  const eligible = next !== null && gapCerts.length === 0;

  /** Everything still owed: not held = missing or expired. */
  const remaining = views.filter((v) => !isHeld(v.status));

  const nextExpiry = views
    .filter((v): v is CertView & { rec: NonNullable<CertView['rec']> } => v.rec !== null && v.status !== 'expired')
    .sort((a, b) => a.rec.expiry.localeCompare(b.rec.expiry))[0];

  const nextStep = !isGraded
    ? 'This role is recorded without a grade; the safety block is tracked for compliance.'
    : eligible && next
      ? `Certificates complete for grade ${next}. Ready for supervisor sign-off.`
      : next
        ? `Promotion to ${next} needs ${gapCerts.length} certificate${gapCerts.length === 1 ? '' : 's'}: ${gapCerts
            .map((v) => v.training.name)
            .join(', ')}.`
        : 'Top of the ladder. The engine now watches expiry dates.';

  const assets = hr?.assets ?? [];
  const editTo = `/employees/${emp.id}/edit`;
  /** Fit To Work is the official FTW certificate from the safety block —
   *  a binary clearance: fit, or not cleared. Never a percentage. */
  const ftw = views.find((v) => v.code === 'FTW');
  const medicalOk = ftw !== undefined && ftw.rec !== null && isHeld(ftw.status);

  return (
    <EmployeeShell active="Employees">
      <div className="mx-auto max-w-[1120px]">
        {/* breadcrumb + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="mono flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
            <Link to="/employees" className="transition-colors hover:text-[color:var(--color-ink)]">
              Employees
            </Link>
            <span aria-hidden>›</span>
            <span className="text-[color:var(--color-ink)]">{emp.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={editTo}
              className="emp-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
              Edit record
            </Link>
            <a
              href={hr ? `mailto:${hr.email}` : '#'}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2 text-[12.5px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16v14H4z" />
                <path d="m4 6 8 6 8-6" />
              </svg>
              Message
            </a>
          </div>
        </div>

        {/* ══ 1 · IDENTITY — no card, straight on the page ══ */}
        <motion.section
          className="pf-hero mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
            {/* the paper-clipped photo */}
            <span className="pf-photo" aria-hidden>
              <Portrait emp={emp} className="pf-photo-img" />
              <svg className="pf-photo-clip" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </span>

            <div className="min-w-0 flex-[1_1_18rem]">
              <div className="flex items-start justify-between gap-5">
                <h1 className="pf-note-title pf-hero-name">{emp.name}</h1>
                {isGraded ? (
                  <span className="flex shrink-0 flex-col items-center gap-1.5">
                    <span
                      className={`grade-coin display grid h-14 w-14 place-items-center rounded-full text-[26px] ${grade === null ? 'is-forming' : ''}`}
                      role="img"
                      aria-label={grade === null ? 'Grade still forming' : `Grade ${grade}`}
                    >
                      {grade ?? '—'}
                    </span>
                    <span className="mono text-[8.5px] tracking-[0.2em] text-[color:var(--color-ink-4)] uppercase">
                      Grade
                    </span>
                  </span>
                ) : (
                  <span className="mono mt-1 shrink-0 rounded-full border border-[color:var(--color-rule)] px-3 py-1.5 text-[9px] tracking-[0.16em] text-[color:var(--color-ink-3)] uppercase">
                    Ungraded role
                  </span>
                )}
              </div>
              <div className="mt-5 grid gap-x-10 gap-y-2.5 sm:grid-cols-2">
                <Kv icon="briefcase" k="Position" v={emp.position} />
                <Kv icon="layers" k="Project" v={emp.project} />
                <Kv icon="shield" k="Status" v="Active" />
                <Kv icon="user" k="Line manager" v={hr?.manager ?? '—'} />
                <Kv icon="cv" k="Contract" v={hr?.contract ?? '—'} />
                <Kv icon="globe" k="Nationality" v={hr?.nationality ?? '—'} />
                <Kv icon="pin" k="Base" v={hr?.base ?? '—'} />
                <Kv icon="clock" k="Hired" v={fmtDate(emp.hired)} />
                <Kv icon="mail" k="Email" v={hr?.email ?? '—'} />
                <Kv icon="phone" k="Mobile" v={hr?.mobile ?? '—'} />
              </div>

              {/* company property — a small disclosure, not a section */}
              <button
                type="button"
                className="pf-prop-btn"
                aria-expanded={propertyOpen}
                aria-controls="pf-prop-pop"
                onClick={() => setPropertyOpen((o) => !o)}
              >
                <span className="pf-kv-ic" aria-hidden>
                  <MetricIcon id="box" />
                </span>
                <span className="pf-kv-label">Property:</span>
                <b className="tabular">{assets.length}</b>
                <svg
                  className="pf-prop-caret"
                  aria-hidden
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <AnimatePresence initial={false}>
                {propertyOpen && (
                  <motion.div
                    id="pf-prop-pop"
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    {assets.length > 0 ? (
                      <ul className="pf-prop-pop">
                        {assets.map((a) => (
                          <li key={a} className="pf-prop-chip mono">
                            {a}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="pf-prop-none">No company property issued.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <footer className="pf-hero-foot">
            <span className="flex items-center gap-3">
              <span className="pf-barcode" aria-hidden />
              <span>
                Employee no · <b className="tabular">{empNo(emp.id)}</b>
              </span>
            </span>
            <span className="flex items-center gap-3">
              <Link to={editTo} aria-label="Edit record" title="Edit record" className="pf-dots">
                <DotsIcon />
              </Link>
              <SgsLogo aria-label="SGS" className="pf-hero-logo" />
            </span>
          </footer>
        </motion.section>

        {/* ══ 2 · CERTIFICATES — status folders straight on the page ══ */}
        <motion.section
          className={`pf-dossier ${openStatus ? 'has-sel' : ''}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.07, ease: EASE }}
        >
          <div className="pf-sec-head pf-sec-head--split">
            <div className="pf-sec-lead">
              <span className="pf-sec-ic" aria-hidden>
                <MetricIcon id="folder" />
              </span>
              <div>
                <h2 className="pf-sec-title display">Certificates</h2>
                <p className="pf-sec-sub mono">
                  {required.length} required for {emp.position} · {held} in date
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              {nextExpiry && (
                <span className="pf-renew mono tabular">
                  Next renewal {shortDate(nextExpiry.rec.expiry)} · {daysUntil(nextExpiry.rec.expiry, now)}d
                </span>
              )}
              <Link to="/training" aria-label="Open the competency engine" title="Open the competency engine" className="pf-dots">
                <DotsIcon />
              </Link>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-4 lg:grid-cols-4 lg:gap-x-4">
              {STATUSES.map((kind) => {
                const meta = FOLDER_META[kind];
                const items = byStatus[kind];
                const open = openStatus === kind;
                const top = items[0];
                const dateLine =
                  top?.rec == null
                    ? null
                    : kind === 'valid'
                      ? `next ${shortDate(top.rec.expiry)}`
                      : kind === 'expiring'
                        ? `renew by ${shortDate(top.rec.expiry)}`
                        : kind === 'expired'
                          ? `lapsed ${shortDate(top.rec.expiry)}`
                          : null;
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`pf-sub ${open ? 'is-sel' : ''} ${items.length === 0 ? 'is-zero' : ''}`}
                    style={{
                      ['--pf-bright' as string]: meta.bright,
                      ['--pf-deep' as string]: meta.deep,
                      ['--pf-text' as string]: meta.text,
                    }}
                    aria-expanded={open}
                    aria-controls="pf-dossier-drawer"
                    aria-label={`${meta.title}: ${items.length} certificate${items.length === 1 ? '' : 's'}`}
                    onClick={() => setOpenStatus((cur) => (cur === kind ? null : kind))}
                  >
                    {top && (
                      <span className="pf-sub-sheet" aria-hidden>
                        <span>{top.code}</span>
                        <i />
                      </span>
                    )}
                    <span className="pf-sub-tab" aria-hidden />
                    <span className="pf-sub-body">
                      <span className="pf-sub-name">{meta.title}</span>
                      <span className="pf-sub-count tabular">{items.length}</span>
                      {dateLine && <span className="pf-sub-date mono tabular">{dateLine}</span>}
                    </span>
                  </button>
                );
              })}
          </div>

          <AnimatePresence initial={false}>
              {openStatus && (
                <motion.div
                  id="pf-dossier-drawer"
                  className="pf-drawer"
                  style={{ ['--pf-chip' as string]: STATUS_HUE[openStatus] }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <motion.div
                    key={openStatus}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    {byStatus[openStatus].length > 0 ? (
                      <ul className="pf-drawer-list">
                        {byStatus[openStatus].map((v) => (
                          <CertRow key={v.code} view={v} now={now} />
                        ))}
                      </ul>
                    ) : (
                      <p className="pf-drawer-empty">{FOLDER_META[openStatus].empty}</p>
                    )}
                  </motion.div>
                </motion.div>
              )}
          </AnimatePresence>

          {/* fit to work — the FTW certificate every employee must hold,
              stamped right on the certificate section; binary, never a % */}
          <div className="pf-cert-standing">
            <div
              className="pf-verdict"
              style={{ ['--vd' as string]: medicalOk ? 'oklch(0.53 0.09 160)' : 'oklch(0.62 0.12 75)' }}
            >
              <span className="pf-verdict-seal" aria-hidden>
                <MetricIcon id={medicalOk ? 'check' : 'clock'} />
              </span>
              <div className="min-w-0">
                <p className="pf-verdict-word display">{medicalOk ? 'Medically fit' : 'Clearance required'}</p>
                <p className="pf-verdict-sub mono">
                  {medicalOk && ftw?.rec
                    ? `FTW certificate · valid to ${fmtDate(ftw.rec.expiry)}`
                    : ftw?.rec
                      ? `FTW certificate expired ${fmtDate(ftw.rec.expiry)}`
                      : 'FTW certificate not on file'}
                </p>
              </div>
            </div>
            <div className="pf-docrow">
              <span className="pf-doc">
                <span className="pf-kv-ic" aria-hidden>
                  <MetricIcon id="id" />
                </span>
                National ID <b>Verified</b>
              </span>
              <span className="pf-doc">
                <span className="pf-kv-ic" aria-hidden>
                  <MetricIcon id="cv" />
                </span>
                Curriculum vitae <b>On file</b>
              </span>
            </div>
          </div>
        </motion.section>

        {/* ══ 3 · DUTY — the month on one tape; management reads the shift
            here, no other page needed ══ */}
        {duty && (
          <motion.section
            className="pf-duty mt-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.11, ease: EASE }}
          >
            <div className="pf-sec-head pf-sec-head--split">
              <div className="pf-sec-lead">
                <span className="pf-sec-ic" aria-hidden>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="16" rx="2.5" />
                    <path d="M8 3v4M16 3v4M3 10h18" />
                  </svg>
                </span>
                <div>
                  <h2 className="pf-sec-title display">Duty</h2>
                  <p className="pf-sec-sub mono">
                    {monthLabel(duty.y, duty.m)} · {SHIFT_WINDOW[duty.shift].label} shift{' '}
                    {SHIFT_WINDOW[duty.shift].span} · from the duty roster
                  </p>
                </div>
              </div>
              <Link to="/roster" aria-label="Open the duty roster" title="Open the duty roster" className="pf-dots">
                <DotsIcon />
              </Link>
            </div>

            {dutyFacts && (
              <div className="pf-duty-grid">
                {/* the gauge: the month as a dial, one segment per day */}
                <div
                  className="pf-dial"
                  role="img"
                  aria-label={`Duty gauge for ${monthLabel(duty.y, duty.m)}: ${duty.t.duty} days worked, ${spanLabel(duty.mins)}, ${duty.t.leave} leave days`}
                >
                  <svg viewBox="0 0 200 200">
                    {duty.row.map((code, i) => {
                      const span = 360 / duty.row.length;
                      const day = i + 1;
                      const active = (dutyHover ?? dutyDay) === day;
                      return (
                        <path
                          key={i}
                          className={`pf-seg is-${SHIFT_META[code].family} ${i === dutyFacts.todayIdx ? 'is-today' : ''} ${active ? 'is-active' : ''}`}
                          d={segPath(100, 100, 64, 88, i * span + 0.9, (i + 1) * span - 0.9)}
                          onMouseEnter={() => setDutyHover(day)}
                          onMouseLeave={() => setDutyHover(null)}
                          onClick={() => setDutyDay((d) => (d === day ? null : day))}
                        >
                          <title>{`${day} — ${SHIFT_META[code].label}`}</title>
                        </path>
                      );
                    })}
                    {[1, 5, 10, 15, 20, 25, 30]
                      .filter((d) => d <= duty.row.length)
                      .map((d) => {
                        const [x, y] = polar(100, 100, 96, (d - 0.5) * (360 / duty.row.length));
                        return (
                          <text key={d} x={x} y={y} className="pf-dial-tick mono">
                            {d}
                          </text>
                        );
                      })}
                    {(() => {
                      const mid = (dutyFacts.todayIdx + 0.5) * (360 / duty.row.length);
                      const [x0, y0] = polar(100, 100, 61, mid);
                      const [x1, y1] = polar(100, 100, 54, mid - 4);
                      const [x2, y2] = polar(100, 100, 54, mid + 4);
                      return <polygon className="pf-dial-pointer" points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`} />;
                    })()}
                  </svg>
                  <div className="pf-dial-core">
                    {(() => {
                      const active = dutyHover ?? dutyDay;
                      if (active === null) {
                        return (
                          <>
                            <b className="display tabular">{spanLabel(duty.mins)}</b>
                            <span className="mono">{SHIFT_WINDOW[duty.shift].label} shift</span>
                            <span className="mono tabular">{SHIFT_WINDOW[duty.shift].span}</span>
                          </>
                        );
                      }
                      const code = duty.row[active - 1] ?? 'F';
                      const ov = duty.overrides[String(active)];
                      const win = ov ?? SHIFT_TIMES[duty.shift];
                      return (
                        <>
                          <b className="display tabular">{active}</b>
                          <span className="mono">
                            {new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(
                              new Date(duty.y, duty.m, active),
                            )}
                          </span>
                          <span className="pf-dial-core-code mono">{SHIFT_META[code].label}</span>
                          {isWorked(code) && (
                            <span className="mono tabular">
                              {win.start} – {win.end} · {spanLabel(dayMinutes(code, ov))}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* the facts a manager asks first */}
                <div className="pf-duty-facts">
                  <p className={`pf-duty-stand display is-${SHIFT_META[dutyFacts.todayCode].family}`}>
                    <i aria-hidden />
                    {dutyFacts.run ? 'On duty today' : SHIFT_META[dutyFacts.todayCode].label}
                    {dutyFacts.run && <small className="mono tabular">{SHIFT_WINDOW[duty.shift].span}</small>}
                  </p>

                  {dutyFacts.run ? (
                    <p className="pf-duty-line">
                      Day <b className="tabular">{dutyFacts.run.pos}</b> of a{' '}
                      <b className="tabular">{dutyFacts.run.len}-day</b> run
                      {dutyFacts.nextRestIdx !== null
                        ? <> · next rest <b>{fmtDayShort(duty.y, duty.m, dutyFacts.nextRestIdx + 1)}</b></>
                        : <> · no rest left this month</>}
                    </p>
                  ) : (
                    <p className="pf-duty-line">
                      {dutyFacts.backIdx !== null
                        ? <>Back on duty <b>{fmtDayShort(duty.y, duty.m, dutyFacts.backIdx + 1)}</b></>
                        : <>No duty left this month</>}
                    </p>
                  )}

                  <p className="pf-duty-line">
                    {dutyFacts.leaveIdx !== null ? (
                      <>
                        {SHIFT_META[duty.row[dutyFacts.leaveIdx] ?? 'V'].label} · from{' '}
                        <b>{fmtDayShort(duty.y, duty.m, dutyFacts.leaveIdx + 1)}</b> ·{' '}
                        <b className="tabular">{dutyFacts.leaveLen}</b> day{dutyFacts.leaveLen === 1 ? '' : 's'}
                      </>
                    ) : (
                      <>No leave planned this month</>
                    )}
                  </p>

                  <p className="pf-duty-sum mono">
                    <b className="tabular">{duty.t.duty}</b> worked · <b className="tabular">{spanLabel(duty.mins)}</b>{' '}
                    · <b className="tabular">{duty.t.leave}</b> leave · <b className="tabular">{duty.t.rest}</b> rest
                  </p>

                  <p className="pf-duty-keys mono">
                    {dutyFacts.families.map((f) => (
                      <span key={f} className={`is-${f}`}>
                        <i aria-hidden />
                        {FAMILY_LABEL[f]}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            )}

            {/* the month, spelled out: every day accounted for, span by span */}
            {dutyFacts && (
              <div className="pf-duty-ledger">
                <p className="pf-duty-ledger-h mono">
                  The month, spelled out
                  <b className="tabular">
                    {duty.row.length} days · {dutyFacts.spans.length} spans
                  </b>
                </p>
                <ul>
                  {dutyFacts.spans.map((s) => {
                    const meta = SHIFT_META[s.code];
                    const worked = isWorked(s.code);
                    const mins = worked
                      ? Array.from({ length: s.days }, (_, k) =>
                          dayMinutes(s.code, duty.overrides[String(s.from + k)]),
                        ).reduce((a, b) => a + b, 0)
                      : 0;
                    const active = dutyHover ?? dutyDay;
                    const hot = active !== null && active >= s.from && active <= s.to;
                    return (
                      <li
                        key={s.from}
                        className={`is-${meta.family} ${hot ? 'is-hot' : ''}`}
                        onMouseEnter={() => setDutyHover(s.from)}
                        onMouseLeave={() => setDutyHover(null)}
                      >
                        <span className="pf-led-range mono tabular">
                          {s.from === s.to ? s.from : `${s.from}–${s.to}`}
                        </span>
                        <span className="pf-led-code mono">{s.code}</span>
                        <span className="pf-led-name">{meta.label}</span>
                        <span className="pf-led-days mono tabular">
                          {s.days}d
                        </span>
                        <span className="pf-led-hrs mono tabular">{worked ? spanLabel(mins) : '—'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </motion.section>
        )}

        {/* ══ 4 · COMPETENCY — full width, the grade logic spelled out ══ */}
        <motion.section
          className="pf-comp mt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
        >
          <header className="pf-sec-head">
            <span className="pf-sec-ic" aria-hidden>
              <MetricIcon id="training" />
            </span>
            <div>
              <h2 className="pf-sec-title display">Competency</h2>
              <p className="pf-sec-sub mono">Training · experience · next step</p>
            </div>
          </header>
          <div className="grid gap-x-14 gap-y-7 md:grid-cols-2 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,20rem)]">
            <ul className="pf-stats">
              <StatRow icon="training" label="Training" sub="sets the grade" value={`${held}/${required.length}`} unit="in date" />
              <StatRow icon="clock" label="Experience" sub={`reads ${expLv} · context only`} value={years.toFixed(1)} unit="yrs" />
            </ul>

            {/* the next step, spelled out as the section's statement */}
            <div
              className="pf-next"
              style={{
                ['--al' as string]: !isGraded
                  ? 'oklch(0.5 0.02 60)'
                  : eligible && next
                    ? 'oklch(0.53 0.09 160)'
                    : next
                      ? 'oklch(0.62 0.12 75)'
                      : 'oklch(0.53 0.09 160)',
              }}
            >
              <span className="pf-alert-ic" aria-hidden>
                <MetricIcon id={!isGraded ? 'shield' : eligible && next ? 'check' : next ? 'up' : 'shield'} />
              </span>
              <p className="pf-next-word display">{nextStep}</p>
            </div>

            {/* the certificates still owed — always spelled out, never hidden */}
            <div className="pf-remain">
              <p className="pf-remain-h">
                Remaining certificates
                <b className="tabular">{remaining.length}</b>
              </p>
              {remaining.length > 0 ? (
                <ul>
                  {remaining.map((v) => (
                    <li key={v.code} className="pf-remain-row">
                      <span className="pf-row-code pf-row-code--ghost">{v.code}</span>
                      <span className="pf-remain-name">{v.training.name}</span>
                      <span className={`pf-remain-tag mono ${v.status === 'expired' ? 'pf-remain-tag--due' : ''}`}>
                        {v.status === 'expired' ? 'Expired · renew' : 'Not on file'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pf-remain-none">None. Every required certificate is in date.</p>
              )}
            </div>
          </div>
        </motion.section>

        <p className="mono mt-8 text-[10px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">
          Demo record · grades and standings computed client-side — production reads the employee from Supabase under RLS
        </p>
      </div>
    </EmployeeShell>
  );
}

/* ── building blocks ─────────────────────────────────────────────────── */

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="4.2" cy="10" r="1.7" />
      <circle cx="10" cy="10" r="1.7" />
      <circle cx="15.8" cy="10" r="1.7" />
    </svg>
  );
}

function Kv({ icon, k, v }: { icon: MetricIconId; k: string; v: string }) {
  return (
    <p className="pf-kv pf-kv--icon">
      <span className="pf-kv-ic" aria-hidden>
        <MetricIcon id={icon} />
      </span>
      <span className="pf-kv-label">{k}:</span> {v}
    </p>
  );
}

/** The employee portrait — the supplied demo photo per gender (avatar.ts);
 *  degrades to initials on copper if the asset ever fails. Production
 *  replaces the source with a short-lived signed URL from Supabase Storage
 *  (charter §3 — private bucket). */
function Portrait({ emp, className }: { emp: { id: string; name: string }; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={`${className} serif grid place-items-center`}>{initialsOf(emp.name)}</span>;
  }
  return <img className={className} src={photoOf(emp.name)} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

type MetricIconId =
  | 'training'
  | 'clock'
  | 'pulse'
  | 'id'
  | 'cv'
  | 'check'
  | 'up'
  | 'shield'
  | 'briefcase'
  | 'layers'
  | 'user'
  | 'folder'
  | 'box'
  | 'globe'
  | 'pin'
  | 'mail'
  | 'phone';

function MetricIcon({ id }: { id: MetricIconId }) {
  const p = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'training':
      return (<svg {...p}><path d="M22 9.5 12 4.5 2 9.5l10 5 10-5z" /><path d="M6 11.8V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.2" /></svg>);
    case 'clock':
      return (<svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>);
    case 'pulse':
      return (<svg {...p}><path d="M20.4 12.6a5.5 5.5 0 0 0-8.4-7 5.5 5.5 0 0 0-8.4 7L12 21z" /><path d="M7 12h3l1.5-3 2 5 1.5-2h2" /></svg>);
    case 'id':
      return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="11" r="2" /><path d="M6 16c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5" /><path d="M15 9.5h4M15 13h4" /></svg>);
    case 'cv':
      return (<svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8.5 13h7M8.5 16.5h5" /></svg>);
    case 'check':
      return (<svg {...p} strokeWidth={2.4}><path d="M4 12.5l5 5L20 6.5" /></svg>);
    case 'up':
      return (<svg {...p} strokeWidth={2.2}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>);
    case 'shield':
      return (<svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></svg>);
    case 'briefcase':
      return (<svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
    case 'layers':
      return (<svg {...p}><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></svg>);
    case 'user':
      return (<svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>);
    case 'folder':
      return (<svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>);
    case 'box':
      return (<svg {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></svg>);
    case 'globe':
      return (<svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.4 2.3 3.8 5.3 3.8 8.5s-1.4 6.2-3.8 8.5c-2.4-2.3-3.8-5.3-3.8-8.5s1.4-6.2 3.8-8.5z" /></svg>);
    case 'pin':
      return (<svg {...p}><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="2.5" /></svg>);
    case 'mail':
      return (<svg {...p}><path d="M4 5h16v14H4z" /><path d="m4 6 8 6 8-6" /></svg>);
    case 'phone':
      return (<svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .35 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.05 9.9a16 16 0 0 0 6.05 6.05l1.3-1.3a2 2 0 0 1 2.1-.45c.9.35 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>);
  }
}

/** One metric row: quiet icon chip, label, value on the right. */
function StatRow({
  icon,
  label,
  sub,
  value,
  unit,
}: {
  icon: MetricIconId;
  label: string;
  sub?: string;
  value: string;
  unit?: string;
}) {
  return (
    <li className="pf-stat">
      <span className="pf-stat-chip" aria-hidden>
        <MetricIcon id={icon} />
      </span>
      <span className="pf-stat-main">
        <span className="pf-stat-label">{label}</span>
        {sub && <span className="pf-stat-sub mono">{sub}</span>}
      </span>
      <span className="pf-stat-value">
        {value}
        {unit && <small className="mono">{unit}</small>}
      </span>
    </li>
  );
}

/** One certificate inside an open folder drawer. */
function CertRow({ view, now }: { view: CertView; now: Date }) {
  const { training, status, rec } = view;
  const daysLeft = rec ? daysUntil(rec.expiry, now) : 0;
  return (
    <li className="pf-row">
      <span className={`pf-row-code ${status === 'missing' ? 'pf-row-code--ghost' : ''}`}>{training.code}</span>
      <span className="pf-row-main">
        <span className="pf-row-name">{training.name}</span>
        <span className="pf-row-sub">
          {TIER_LABEL[training.tier]} tier · {training.validityYears} yr validity
        </span>
      </span>
      <span className="pf-row-end">
        {rec ? (
          <>
            <span className="pf-row-date">{fmtDate(rec.expiry)}</span>
            <span className="pf-row-days">
              {status === 'expired' ? `lapsed ${Math.abs(daysLeft)}d` : `${daysLeft}d left`}
            </span>
          </>
        ) : (
          <span className="pf-row-days">not on file</span>
        )}
      </span>
    </li>
  );
}
