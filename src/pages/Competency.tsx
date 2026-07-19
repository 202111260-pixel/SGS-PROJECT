import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import NavDock from '../components/NavDock';
import './dashboard.css';
import './employee-form.css';
import './competency.css';

/**
 * Competency — the SGS Grade Engine.
 *
 * The page answers one question, live: “what grade is this employee, and
 * why?” Grades C → B → A are never typed by hand — they are *computed* from
 * the mandatory safety certificates:
 *
 *   Training — the seven mandatory safety certificates that apply to EVERY
 *              position (FTW, HSE, H2S, FA, DD — Light, IFR, DD — Heavy —
 *              the same block the Add Employee form records), grouped in
 *              tiers basic → intermediate → advanced. A tier only counts
 *              while its certificates are in date.
 *
 *   Grade = the highest tier held in date, floored at the role's entry grade
 *   (a Supervisor enters at B). Time in position is tracked for context but no
 *   longer caps the grade.
 *
 * The Certificate Wallet below the engine files all seven certificates by
 * live status — every role carries the same block, so every employee has the
 * same seven to keep in date. Everything reacts instantly, including a
 * “what-if” simulator that lets a supervisor flip certificates to see exactly
 * which ones unlock the next grade.
 *
 * Demo data only — production loads employees + certificates from Supabase
 * (RLS-scoped) and persists grade snapshots server-side; this engine is pure
 * and moves there unchanged.
 */

/* ── domain: types, data, and the grade engine live in sibling modules ─ */
import type {
  CertRecord,
  CertStatus,
  CertView,
  Employee,
  Grade,
  SimState,
  TrainingCode,
  WalletFilter,
} from './Competency.types';
import {
  EMPLOYEES,
  GRADE_ORDER,
  MS_YEAR,
  RAIL_ITEMS,
  ROLE_MATRIX,
  START_GRADE,
  TIER_LABEL,
  TIERS_FOR,
} from './Competency.data';
import {
  addYearsISO,
  computeGrade,
  daysUntil,
  experienceLevel,
  fmtDate,
  gi,
  gradeFromCerts,
  isHeld,
  statusOf,
  todayISO,
  trainingLevel,
  trainingOf,
  yearsSince,
} from './Competency.logic';
import { photoOf } from './avatar';

export default function Competency() {
  const [dark, setDark] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('sgs-theme-v2') === 'dark',
  );
  const toggleTheme = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem('sgs-theme-v2', next ? 'dark' : 'light');
      return next;
    });
  };

  const [now] = useState(() => new Date());
  // Certificates live in state so the Record form can write into them and the
  // engine recomputes instantly (seeded from the demo roster).
  const [certsByEmp, setCertsByEmp] = useState<Record<string, Partial<Record<TrainingCode, CertRecord>>>>(
    () => Object.fromEntries(EMPLOYEES.map((e) => [e.id, { ...e.certs }])),
  );
  const [empId, setEmpId] = useState<string>(EMPLOYEES[0]?.id ?? '');
  const [sim, setSim] = useState<SimState | null>(null);
  const [filter, setFilter] = useState<WalletFilter>('all');
  const [step, setStep] = useState(0);
  // Manual grade overrides, keyed by employee id. An entry pins the grade by
  // hand and wins over the computed value until it's reset (see §Grade Engine).
  const [overrideByEmp, setOverrideByEmp] = useState<Record<string, Grade>>({});

  const emp = EMPLOYEES.find((e) => e.id === empId) ?? EMPLOYEES[0];
  if (!emp) return null; // demo roster is never empty; satisfies the type-level check

  const empCerts = certsByEmp[emp.id] ?? emp.certs;
  const required = ROLE_MATRIX[emp.position];
  const actualYears = yearsSince(emp.hired, now);
  const years = sim ? sim.years : actualYears;

  // Resolve every required training against the record + simulator overrides.
  const views: CertView[] = required.map((code) => {
    const training = trainingOf(code);
    const override = sim?.overrides[code];
    if (override === true) {
      const expiry = new Date(now.getTime() + training.validityYears * MS_YEAR);
      const iso = expiry.toISOString().slice(0, 10);
      const today = now.toISOString().slice(0, 10);
      return { code, training, status: 'valid', rec: { issued: today, expiry: iso }, simulated: true };
    }
    if (override === false) {
      return { code, training, status: 'missing', rec: null, simulated: true };
    }
    const rec = empCerts[code];
    return { code, training, status: statusOf(rec, now), rec: rec ?? null, simulated: false };
  });

  const trainingLv = trainingLevel(views);
  const expLv = experienceLevel(years);
  const startGrade = START_GRADE[emp.position];
  const computedGrade = computeGrade(trainingLv, startGrade);
  // A supervisor may pin the grade by hand; that override wins over the engine
  // until it's reset. The computed value is kept alongside so the UI can show
  // both and reset cleanly — nothing is hidden.
  const override = overrideByEmp[emp.id];
  const overridden = override !== undefined;
  const grade = override ?? computedGrade;

  const heldCount = views.filter((v) => isHeld(v.status)).length;

  // ── path to the next grade (certificate-driven) ──
  const next: Grade | null = grade === null ? 'C' : GRADE_ORDER[gi(grade) + 1] ?? null;
  const gapCerts = next
    ? views.filter((v) => TIERS_FOR[next].includes(v.training.tier) && !isHeld(v.status))
    : [];
  const eligible = next !== null && gapCerts.length === 0;

  const shown = filter === 'all' ? views : views.filter((v) => v.status === filter);

  // Grade for every employee (for the search picker's badges).
  const gradeByEmp: Record<string, Grade | null> = Object.fromEntries(
    EMPLOYEES.map((e) => [
      e.id,
      overrideByEmp[e.id] ?? gradeFromCerts(e, certsByEmp[e.id] ?? e.certs, now),
    ]),
  );

  const pickEmployee = (id: string) => {
    setEmpId(id);
    setSim(null);
    setFilter('all');
  };

  const registerCert = (targetId: string, code: TrainingCode, issued: string, expiry: string) => {
    setCertsByEmp((prev) => ({
      ...prev,
      [targetId]: { ...(prev[targetId] ?? {}), [code]: { issued, expiry } },
    }));
  };

  const toggleCert = (code: TrainingCode) => {
    setSim((s) => {
      if (!s) return s;
      const view = views.find((v) => v.code === code);
      if (!view) return s;
      return { ...s, overrides: { ...s.overrides, [code]: !isHeld(view.status) } };
    });
  };

  const setOverride = (g: Grade) => {
    setOverrideByEmp((prev) => ({ ...prev, [emp.id]: g }));
  };
  const clearOverride = () => {
    setOverrideByEmp((prev) => {
      const next = { ...prev };
      delete next[emp.id];
      return next;
    });
  };

  const simActive = sim !== null;

  // ── section wizard (mirrors the Add Employee page) ──
  const STEPS = [
    { eyebrow: 'Step 1', title: 'Record' },
    { eyebrow: 'Step 2', title: 'Grade' },
    { eyebrow: 'Step 3', title: 'Certificates' },
    { eyebrow: 'Step 4', title: 'Runway' },
  ] as const;
  const LAST = STEPS.length - 1;
  const go = (n: number) => setStep(Math.max(0, Math.min(LAST, n)));
  const railLeft = `${100 / (2 * STEPS.length)}%`;
  const railWidth = `${(100 * LAST) / STEPS.length}%`;

  return (
    <div
      data-theme={dark ? 'dark' : undefined}
      className="sgs-registry emp-form comp-page min-h-screen bg-[color:var(--color-paper-2)] text-[color:var(--color-ink)]"
    >
      {/* ── the nav dock ── */}
      <NavDock active="Training" dark={dark} onToggleTheme={toggleTheme} />

      <div className="flex">
        {/* ── left rail ── */}
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-14 shrink-0 flex-col items-center gap-1 border-r border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] py-3 md:flex">
          {RAIL_ITEMS.map((it) => {
            const cls = `grid h-9 w-9 place-items-center rounded-[3px] transition-colors ${
              it.active
                ? 'bg-[color:var(--color-ink)] text-white'
                : 'text-[color:var(--color-ink-3)] hover:bg-[color:var(--color-paper-3)] hover:text-[color:var(--color-ink)]'
            }`;
            return it.to ? (
              <Link key={it.id} to={it.to} aria-label={it.label} title={it.label} className={cls}>
                <RailIcon id={it.id} />
              </Link>
            ) : (
              <button key={it.id} aria-label={it.label} title={it.label} className={cls}>
                <RailIcon id={it.id} />
              </button>
            );
          })}
        </aside>

        {/* ── main ── */}
        <main className="mx-auto min-w-0 max-w-[1480px] flex-1 px-5 pb-24 pt-6 lg:px-8">
          {/* page header */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mono flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                <span>Training</span>
                <span aria-hidden>›</span>
                <span className="text-[color:var(--color-ink)]">Competency Engine</span>
              </div>
              <h1 className="display mt-3 text-[clamp(1.9rem,3.2vw,2.7rem)] leading-[1.1] text-[color:var(--color-ink)]">
                Competency
              </h1>
              <p className="mt-1.5 max-w-[620px] text-[13.5px] leading-relaxed text-[color:var(--color-ink-2)]">
                Add the employee once — the C · B · A grade resolves itself from live certificates and time in
                position. The seven mandatory safety certificates apply to every position.
              </p>
            </div>

            {/* employee search + picker */}
            <div className="flex items-center gap-2">
              <span className="mono hidden shrink-0 rounded-full border border-dashed border-[color:var(--color-rule)] px-2.5 py-1 text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase lg:block">
                Demo data
              </span>
              <EmployeePicker roster={EMPLOYEES} current={emp} gradeByEmp={gradeByEmp} onPick={pickEmployee} />
            </div>
          </div>

          {/* ── section stepper ── */}
          <nav className="mt-8 select-none" aria-label="Competency sections">
            <div className="relative flex items-start justify-between">
              <div className="absolute top-[17px] h-[2px] rounded-full bg-[color:var(--color-rule-soft)]" style={{ left: railLeft, width: railWidth }} />
              <motion.div
                className="emp-progress-glow absolute top-[17px] h-[2px] rounded-full bg-[color:var(--color-sgs)]"
                style={{ left: railLeft }}
                animate={{ width: `calc(${railWidth} * ${LAST ? step / LAST : 0})` }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              />
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => go(i)}
                    className="group relative z-10 flex flex-1 flex-col items-center gap-2 text-center"
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full border text-[12px] font-semibold transition-all ${
                        active
                          ? 'emp-step-on border-[color:var(--color-sgs)] bg-[color:var(--color-sgs)] text-white'
                          : done
                            ? 'border-[color:var(--color-sgs)] bg-[color:var(--color-paper)] text-[color:var(--color-sgs-ink)]'
                            : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink-3)] group-hover:border-[color:var(--color-rule)]'
                      }`}
                    >
                      {done ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12l5 5L20 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="hidden min-w-0 flex-col sm:flex">
                      <span className="mono text-[9px] tracking-[0.16em] text-[color:var(--color-ink-3)] uppercase">{s.eyebrow}</span>
                      <span className={`text-[12px] ${active ? 'font-semibold text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-2)]'}`}>{s.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ══ ⓪ RECORD CERTIFICATE ══ */}
          {step === 0 && (
            <RecordCertificate
              roster={EMPLOYEES}
              currentEmpId={emp.id}
              certsByEmp={certsByEmp}
              now={now}
              onRegister={registerCert}
              onFocusEmployee={pickEmployee}
            />
          )}

          {/* ══ ① THE GRADE ENGINE ══ */}
          {step === 1 && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="surface mt-8 rounded-[3px] p-7 lg:p-9"
          >
            <header className="mb-7 flex items-start justify-between gap-3 border-b border-[color:var(--color-rule-soft)] pb-5">
              <div>
                <div className="eyebrow">Grade Engine</div>
                <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">Live grade — certificates decide it</h2>
                <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">
                  Grade = the training tiers held in date, floored at the role's entry grade. Time in position is
                  shown for context but no longer caps the grade.
                </p>
              </div>
              <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">01</span>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(280px,1fr)_minmax(300px,1.1fr)] lg:gap-10">
              {/* identity */}
              <div>
                <div className="flex items-center gap-4">
                  <div className="emp-avatar grid h-16 w-16 place-items-center overflow-hidden rounded-full">
                    <img src={photoOf(emp.name)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="display truncate text-[19px] text-[color:var(--color-ink)]">{emp.name}</h3>
                    <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-3)]">
                      {emp.position} · {emp.project}
                    </p>
                  </div>
                </div>
                <dl className="mt-5 space-y-2.5 border-t border-[color:var(--color-rule-soft)] pt-4 text-[12.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[color:var(--color-ink-3)]">Hired</dt>
                    <dd className="tabular text-[color:var(--color-ink)]">{fmtDate(emp.hired)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[color:var(--color-ink-3)]">Time in position</dt>
                    <dd className="tabular font-medium text-[color:var(--color-ink)]">
                      {years.toFixed(1)} yrs{simActive && <span className="text-[color:var(--color-sgs-ink)]"> · sim</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[color:var(--color-ink-3)]">Entry grade</dt>
                    <dd>
                      <span className="mono inline-grid h-5 w-5 place-items-center rounded-[0.35rem] bg-[color:var(--color-paper-3)] text-[10px] font-bold text-[color:var(--color-ink-2)]">
                        {startGrade}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[color:var(--color-ink-3)]">Certificates in date</dt>
                    <dd className="tabular text-[color:var(--color-ink)]">
                      {heldCount} / {required.length}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* the dial */}
              <div className="flex flex-col items-center justify-center">
                <GradeDial grade={grade} overridden={overridden} />
                <p className="mt-3 max-w-[300px] text-center text-[12.5px] leading-relaxed text-[color:var(--color-ink-2)]">
                  {overridden ? (
                    <>
                      Set to <b>{grade}</b> by hand — overriding the engine's{' '}
                      <b>{computedGrade ?? 'forming'}</b>. Reset below to hand control back.
                    </>
                  ) : grade === null ? (
                    <>Grade still forming — complete the basic tier to enter at {startGrade}.</>
                  ) : gi(grade) === 2 ? (
                    <>Peak grade. Keep certificates in date to hold it.</>
                  ) : (
                    <>
                      Held at <b>{grade}</b> by the certificates in date — clearing the next tier moves it up.
                    </>
                  )}
                </p>
              </div>

              {/* the two axes */}
              <div className="space-y-5">
                <AxisMeter
                  label="Training — sets the grade"
                  value={trainingLv}
                  detail={
                    trainingLv === null
                      ? 'Basic tier incomplete'
                      : `${TIER_LABEL[TIERS_FOR[trainingLv][TIERS_FOR[trainingLv].length - 1] ?? 'basic']} tier held`
                  }
                  pct={(heldCount / Math.max(1, required.length)) * 100}
                  sub={`${heldCount}/${required.length} required certificates in date · ${Math.round((heldCount / Math.max(1, required.length)) * 100)}% complete`}
                />
                <AxisMeter
                  label="Experience — context only"
                  value={expLv}
                  detail={`${years.toFixed(1)} yrs in position`}
                  pct={Math.min(100, (years / 3) * 100)}
                  sub="Tracked for reference — no longer affects the grade"
                  markers
                />
              </div>
            </div>

            {/* manual grade override */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[1.2rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/50 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[color:var(--color-ink)]">Manual grade</span>
                <span className="mono text-[9.5px] tracking-[0.16em] text-[color:var(--color-ink-3)] uppercase">
                  Supervisor override
                </span>
              </div>
              <div className="emp-fieldgroup flex rounded-[0.7rem] border p-1">
                {GRADE_ORDER.map((g) => {
                  const on = grade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setOverride(g)}
                      aria-pressed={on}
                      className="mono relative isolate h-[38px] w-14 rounded-[0.55rem] text-[13px] font-semibold"
                    >
                      {on && (
                        <motion.span
                          layoutId="override-pill"
                          className="emp-btn-primary absolute inset-0 -z-10 rounded-[0.55rem]"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                      <span className={on ? 'text-white' : 'text-[color:var(--color-ink-2)]'}>{g}</span>
                    </button>
                  );
                })}
              </div>
              {overridden ? (
                <div className="flex items-center gap-3">
                  <span className="mono rounded-full bg-[color:var(--color-sgs)]/12 px-3 py-1.5 text-[9.5px] tracking-[0.16em] text-[color:var(--color-sgs-ink)] uppercase">
                    Overridden · computed {computedGrade ?? '—'}
                  </span>
                  <button
                    type="button"
                    onClick={clearOverride}
                    className="rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-3.5 py-1.5 text-[12px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
                  >
                    Reset to computed
                  </button>
                </div>
              ) : (
                <span className="text-[12px] text-[color:var(--color-ink-3)]">
                  Pin a grade to override the engine — it holds until you reset.
                </span>
              )}
            </div>

            {/* simulator strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[1.2rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/50 px-5 py-4">
              <button
                type="button"
                role="switch"
                aria-checked={simActive}
                aria-label="Toggle what-if simulator"
                onClick={() => setSim(simActive ? null : { years: actualYears, overrides: {} })}
                className="flex items-center gap-3"
              >
                <span
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    simActive ? 'bg-[color:var(--color-sgs)]' : 'bg-[color:var(--color-paper-3)]'
                  }`}
                >
                  <motion.span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_oklch(0_0_0/0.3)]"
                    animate={{ left: simActive ? 22 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                </span>
                <span className="text-[13px] font-medium text-[color:var(--color-ink)]">What-if simulator</span>
              </button>

              {simActive && sim ? (
                <>
                  <div className="flex min-w-[240px] flex-1 items-center gap-3">
                    <span className="mono shrink-0 text-[9.5px] tracking-[0.16em] text-[color:var(--color-ink-3)] uppercase">
                      Tenure
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={72}
                      step={1}
                      value={Math.round(sim.years * 12)}
                      onChange={(e) => {
                        const months = Number(e.target.value);
                        setSim((s) => (s ? { ...s, years: months / 12 } : s));
                      }}
                      style={{ ['--fill' as string]: `${(Math.round(sim.years * 12) / 72) * 100}%` }}
                      aria-label="Simulated years in position"
                    />
                    <span className="tabular w-14 shrink-0 text-right text-[13px] font-medium text-[color:var(--color-ink)]">
                      {sim.years.toFixed(1)} y
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSim({ years: actualYears, overrides: {} })}
                    className="rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-3.5 py-1.5 text-[12px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
                  >
                    Reset
                  </button>
                  <span className="mono rounded-full bg-[oklch(0.68_0.13_70)]/15 px-3 py-1.5 text-[9.5px] tracking-[0.18em] text-[oklch(0.5_0.12_70)] uppercase [data-theme='dark']_&:text-[oklch(0.78_0.13_75)]">
                    Simulation — nothing is saved
                  </span>
                </>
              ) : null}
            </div>
          </motion.section>
          )}

          {/* ══ ② CERTIFICATE WALLET — filed into status folders ══ */}
          {step === 2 && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="surface mt-7 rounded-[3px] p-7 lg:p-9"
          >
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--color-rule-soft)] pb-5">
              <div>
                <div className="eyebrow">Certificate Wallet</div>
                <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">
                  {emp.position} — {required.length} required
                </h2>
                <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">
                  Every certificate is filed by live status — open a folder to pull its cards. All {required.length}{' '}
                  mandatory safety certificates apply to every role, so each employee carries the same block.
                </p>
              </div>
              <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">02</span>
            </header>

            {/* the four folders */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {(['valid', 'expiring', 'expired', 'missing'] as const).map((s) => (
                <CertFolder
                  key={s}
                  status={s}
                  certs={views.filter((v) => v.status === s)}
                  open={filter === s}
                  onToggle={() => setFilter(filter === s ? 'all' : s)}
                />
              ))}
            </div>

            {/* the opened folder's shelf */}
            <AnimatePresence initial={false}>
              {filter !== 'all' && (
                <motion.div
                  key="wallet-shelf"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    id="wallet-shelf"
                    className="wallet-shelf mt-7 rounded-[1.2rem] p-5"
                    style={{ ['--cf-shelf' as string]: FOLDER_META[filter].hue }}
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: FOLDER_META[filter].hue }} />
                      <span className="mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-2)] uppercase">
                        {STATUS_META[filter].label} — {shown.length} certificate{shown.length === 1 ? '' : 's'}
                      </span>
                      {simActive && (
                        <span className="mono rounded-full bg-[color:var(--color-sgs)]/12 px-2.5 py-1 text-[9px] tracking-[0.14em] text-[color:var(--color-sgs-ink)] uppercase">
                          Click a card to simulate
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setFilter('all')}
                        aria-label="Close folder"
                        className="ml-auto grid h-7 w-7 place-items-center rounded-full text-[color:var(--color-ink-3)] transition-colors hover:bg-[color:var(--color-paper-3)] hover:text-[color:var(--color-ink)]"
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      <AnimatePresence mode="popLayout">
                        {shown.map((v, i) => (
                          <CertCard
                            key={v.code}
                            view={v}
                            now={now}
                            interactive={simActive}
                            onToggle={() => toggleCert(v.code)}
                            {...(i < 3 ? { flightId: `fly-${v.code}` } : { dealIndex: i - 3 })}
                          />
                        ))}
                      </AnimatePresence>
                      {shown.length === 0 && (
                        <p className="col-span-full rounded-[1rem] border border-dashed border-[color:var(--color-rule)] px-5 py-8 text-center text-[13px] text-[color:var(--color-ink-3)]">
                          This folder is empty — a clean bill.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
          )}

          {/* ══ ③ PROMOTION RUNWAY ══ */}
          {step === 3 && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="surface mt-7 rounded-[3px] p-7 lg:p-9"
          >
            <header className="mb-7 flex items-start justify-between gap-3 border-b border-[color:var(--color-rule-soft)] pb-5">
              <div>
                <div className="eyebrow">Promotion Runway</div>
                <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">
                  {next ? `Path to grade ${next}` : 'Top of the ladder'}
                </h2>
                <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">
                  Requirements are derived automatically — nothing on this list is typed by hand.
                </p>
              </div>
              <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">03</span>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(320px,0.9fr)]">
              {/* ladder */}
              <div>
                <div className="flex items-center">
                  {GRADE_ORDER.map((g, i) => {
                    const reached = grade !== null && gi(grade) >= i;
                    const isNext = next === g;
                    const below = gi(startGrade) > i;
                    return (
                      <div key={g} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
                        {i > 0 && (
                          <div className="relative mx-3 h-[2px] flex-1 overflow-hidden rounded-full bg-[color:var(--color-rule-soft)]">
                            <motion.div
                              className="absolute inset-y-0 left-0 bg-[color:var(--color-sgs)]"
                              animate={{ width: reached ? '100%' : isNext ? '45%' : '0%' }}
                              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-2">
                          <span
                            className={`grid h-12 w-12 place-items-center rounded-full border text-[17px] font-semibold transition-colors ${
                              reached
                                ? 'emp-btn-primary border-transparent text-white'
                                : isNext
                                  ? 'comp-next-pulse border-[color:var(--color-sgs)] bg-[color:var(--color-paper)] text-[color:var(--color-sgs-ink)]'
                                  : below
                                    ? 'border-dashed border-[color:var(--color-rule-soft)] bg-transparent text-[color:var(--color-ink-4)]'
                                    : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink-3)]'
                            }`}
                          >
                            <span className="serif">{g}</span>
                          </span>
                          <span className="mono text-[8.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                            {reached ? (gi(grade ?? 'C') === i ? 'Current' : 'Held') : isNext ? 'Next' : below ? 'N/A' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {eligible && next && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-7 flex items-center gap-3 rounded-[1.1rem] border border-[color:var(--color-sgs)]/35 bg-[color:var(--color-sgs)]/10 px-5 py-4"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--color-sgs)] text-white">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12l5 5L20 7" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-[color:var(--color-ink)]">
                        Eligible for promotion to {next}
                      </div>
                      <p className="text-[12px] text-[color:var(--color-ink-3)]">
                        Certificates complete — ready for supervisor sign-off.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* auto-derived checklist */}
              <div>
                {next === null ? (
                  <p className="rounded-[1rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/60 px-5 py-6 text-[13px] leading-relaxed text-[color:var(--color-ink-2)]">
                    Grade A is the top of the {emp.position} ladder. The engine now watches expiry dates — the
                    Alerts page takes over from here.
                  </p>
                ) : (
                  <>
                    <div className="mono mb-3 text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                      To reach {next} — {gapCerts.length} item{gapCerts.length === 1 ? '' : 's'}
                    </div>
                    <ul className="space-y-2.5">
                      {gapCerts.map((v) => (
                        <li
                          key={v.code}
                          className="flex items-center gap-3 rounded-[0.9rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-3"
                        >
                          <span
                            className={`mono grid h-8 w-11 shrink-0 place-items-center rounded-[0.5rem] text-[10px] font-bold tracking-wide ${
                              v.status === 'expired'
                                ? 'bg-[oklch(0.55_0.17_28)]/12 text-[oklch(0.55_0.17_28)]'
                                : 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]'
                            }`}
                          >
                            {v.code}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium text-[color:var(--color-ink)]">
                              {v.training.name}
                            </span>
                            <span className="text-[11px] text-[color:var(--color-ink-3)]">
                              {v.status === 'expired' ? 'Expired — renewal required' : 'Not on file'}
                            </span>
                          </span>
                          <Link
                            to={`/employees/${emp.id}/edit`}
                            className="shrink-0 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-3 py-1.5 text-[11.5px] font-medium text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
                          >
                            {v.status === 'expired' ? 'Renew' : 'Upload'}
                          </Link>
                        </li>
                      ))}
                      {gapCerts.length === 0 && (
                        <li className="rounded-[0.9rem] border border-dashed border-[color:var(--color-rule)] px-4 py-4 text-[12.5px] text-[color:var(--color-ink-3)]">
                          Nothing outstanding.
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </motion.section>
          )}

          {/* ── wizard nav ── */}
          <div className="emp-glassbar sticky bottom-5 z-30 mt-7 flex items-center justify-between gap-4 rounded-full px-3.5 py-3">
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)] disabled:pointer-events-none disabled:opacity-40"
            >
              <span aria-hidden>←</span> Back
            </button>
            <div className="mono hidden text-[11px] tracking-[0.14em] text-[color:var(--color-ink-3)] uppercase sm:block">
              Step {step + 1} / {STEPS.length} · <span className="text-[color:var(--color-ink)]">{STEPS[step]?.title}</span>
            </div>
            {step < LAST ? (
              <button
                type="button"
                onClick={() => go(step + 1)}
                className="emp-btn-primary group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white"
              >
                Next{' '}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(0)}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-5 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
              >
                <span aria-hidden>↺</span> Start over
              </button>
            )}
          </div>

          <p className="mono mt-6 text-[10px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">
            Demo data · engine runs client-side — production persists employees, certificates and grade snapshots in
            Supabase under RLS
          </p>
        </main>
      </div>
    </div>
  );
}

/* ── building blocks ────────────────────────────────────────────────── */

const CTL =
  'w-full appearance-none rounded-[0.7rem] border px-3.5 py-2.5 text-[13.5px] text-[color:var(--color-ink)] transition-colors focus:outline-none';

/** Small muted glyph that leads a field label in the Record Certificate form,
 *  so each input reads at a glance (who · role · course · dates · file). */
function FieldIcon({ id }: { id: string }) {
  const p = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'shrink-0 text-[color:var(--color-ink-3)]',
  };
  switch (id) {
    case 'user':
      return (<svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>);
    case 'tag':
      return (<svg {...p}><path d="M3 12l8.5-8.5H20V12l-8.5 8.5z" /><circle cx="15.5" cy="8.5" r="1.3" /></svg>);
    case 'book':
      return (<svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 4v13" /></svg>);
    case 'calendar':
      return (<svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>);
    case 'clock':
      return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>);
    case 'file':
      return (<svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>);
    default:
      return null;
  }
}

/** Record a course result and issue its certificate — the wireframe's primary
 *  Training action, wired live. A Pass writes the certificate into the record
 *  and the engine below recomputes instantly; a Fail is logged with no
 *  certificate issued. Frontend demo — production POSTs to a Zod-validated
 *  route and uploads the file to Supabase Storage (§2/§3). */
function RecordCertificate({
  roster,
  currentEmpId,
  certsByEmp,
  now,
  onRegister,
  onFocusEmployee,
}: {
  roster: ReadonlyArray<Employee>;
  currentEmpId: string;
  certsByEmp: Record<string, Partial<Record<TrainingCode, CertRecord>>>;
  now: Date;
  onRegister: (empId: string, code: TrainingCode, issued: string, expiry: string) => void;
  onFocusEmployee: (empId: string) => void;
}) {
  const [empId, setEmpId] = useState<string>(currentEmpId);
  const [code, setCode] = useState<TrainingCode | ''>('');
  const [issued, setIssued] = useState<string>(todayISO(now));
  const [fileName, setFileName] = useState<string>('');
  const [done, setDone] = useState<{ code: TrainingCode; grade: Grade | null; passed: boolean; renewed: boolean } | null>(null);
  const result = 'pass' as const;

  const emp = roster.find((e) => e.id === empId) ?? roster.find((e) => e.id === currentEmpId) ?? roster[0];
  if (!emp) return null;

  const certs = certsByEmp[emp.id] ?? emp.certs;
  const required = ROLE_MATRIX[emp.position];
  const course = code ? trainingOf(code) : null;
  const expiry = course && issued ? addYearsISO(issued, course.validityYears) : '';
  const alreadyOnFile = code ? certs[code] : undefined;
  // Status of the certificate already on file (if any), so a renewal of an
  // expired/expiring certificate is recognised and framed as an update rather
  // than a plain "replace".
  const alreadyStatus = alreadyOnFile ? statusOf(alreadyOnFile, now) : undefined;
  const isRenewal = alreadyStatus === 'expired' || alreadyStatus === 'expiring';

  const before = gradeFromCerts(emp, certs, now);
  const projected =
    code && expiry
      ? gradeFromCerts(emp, { ...certs, [code]: { issued, expiry } }, now)
      : before;
  const promotes = before !== projected;

  const canSubmit = code !== '' && issued !== '' && fileName !== '';

  const resetFields = () => {
    setCode('');
    setIssued(todayISO(now));
    setFileName('');
  };

  const submit = () => {
    if (!canSubmit) return; // canSubmit already narrows `code` to TrainingCode
    if (expiry !== '') {
      onRegister(emp.id, code, issued, expiry);
      onFocusEmployee(emp.id);
      setDone({ code, grade: projected, passed: true, renewed: isRenewal });
    } else {
      setDone({ code, grade: before, passed: false, renewed: false });
    }
    resetFields();
  };

  const changeEmp = (id: string) => {
    setEmpId(id);
    setCode('');
    setDone(null);
    onFocusEmployee(id);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="surface mt-8 rounded-[3px] p-7 lg:p-9"
    >
      <header className="mb-7 flex items-start justify-between gap-3 border-b border-[color:var(--color-rule-soft)] pb-5">
        <div>
          <div className="eyebrow">Record Certificate</div>
          <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">Log a result — issue the certificate</h2>
          <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">
            A pass writes the certificate into the record — an expired one is renewed in place — and the grade below
            recomputes at once.
          </p>
        </div>
        <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">00</span>
      </header>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* employee */}
        <label className="block">
          <span className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-ink)]">
            <FieldIcon id="user" />
            Employee <span className="text-[color:var(--color-sgs)]">*</span>
          </span>
          <div className="relative">
            <select value={emp.id} onChange={(e) => changeEmp(e.target.value)} className={`${CTL} border-[color:var(--color-rule-soft)] pr-9`}>
              {roster.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.position}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </label>

        {/* position (derived) */}
        <div className="block">
          <span className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-ink)]">
            <FieldIcon id="tag" />
            Position
          </span>
          <div className="flex items-center justify-between rounded-[0.7rem] border border-dashed border-[color:var(--color-rule)] px-3.5 py-2.5">
            <span className="text-[13.5px] text-[color:var(--color-ink)]">{emp.position}</span>
            <span className="mono text-[9px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">from record</span>
          </div>
        </div>

        {/* course */}
        <label className="block">
          <span className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-ink)]">
            <FieldIcon id="book" />
            Training / Course <span className="text-[color:var(--color-sgs)]">*</span>
          </span>
          <div className="relative">
            <select
              value={code}
              onChange={(e) => setCode(e.target.value as TrainingCode | '')}
              className={`${CTL} border-[color:var(--color-rule-soft)] pr-9 ${code === '' ? 'text-[color:var(--color-ink-4)]' : ''}`}
            >
              <option value="" disabled>
                Select a required course…
              </option>
              {required.map((c) => {
                const t = trainingOf(c);
                return (
                  <option key={c} value={c}>
                    {t.code} — {t.name} ({TIER_LABEL[t.tier]})
                  </option>
                );
              })}
            </select>
            <Chevron />
          </div>
        </label>

        {/* issue date */}
        <label className="block">
          <span className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-ink)]">
            <FieldIcon id="calendar" />
            Issue date
          </span>
          <input
            type="date"
            value={issued}
            onChange={(e) => setIssued(e.target.value)}
            className={`${CTL} tabular border-[color:var(--color-rule-soft)]`}
          />
        </label>

        {/* expiry (auto) */}
        <div className="block">
          <span className="mb-2 flex items-center justify-between text-[12.5px] font-medium text-[color:var(--color-ink)]">
            <span className="flex items-center gap-1.5">
              <FieldIcon id="clock" />
              Expiry date
            </span>
            <span className="mono text-[9px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">auto</span>
          </span>
          <div className="flex items-center justify-between rounded-[0.7rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/50 px-3.5 py-2.5">
            <span className={`tabular text-[13.5px] ${expiry ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-4)]'}`}>
              {expiry ? fmtDate(expiry) : 'Pick course + issue date'}
            </span>
            {course && <span className="mono text-[9px] tracking-[0.14em] text-[color:var(--color-ink-3)] uppercase">+{course.validityYears} yr</span>}
          </div>
        </div>
      </div>

      {/* file drop */}
      <div className="mt-5">
        <span className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-ink)]">
          <FieldIcon id="file" />
          Certificate file <span className="ml-0.5 text-[color:var(--color-sgs)]">*</span>
        </span>
        <MiniDrop fileName={fileName} onPick={setFileName} onClear={() => setFileName('')} />
      </div>

      {alreadyOnFile && code !== '' && (
        <p className={`mt-3 text-[11.5px] ${isRenewal ? 'font-medium text-[oklch(0.55_0.17_28)]' : 'text-[color:var(--color-ink-3)]'}`}>
          {alreadyStatus === 'expired' ? (
            <>
              {emp.name}’s {code} expired on {fmtDate(alreadyOnFile.expiry)} — recording the new pass renews it and
              updates the record.
            </>
          ) : alreadyStatus === 'expiring' ? (
            <>
              {emp.name}’s {code} expires {fmtDate(alreadyOnFile.expiry)} — recording a fresh pass renews it and
              updates the record.
            </>
          ) : (
            <>
              {emp.name} already holds {code} (expires {fmtDate(alreadyOnFile.expiry)}) — registering updates it.
            </>
          )}
        </p>
      )}

      {/* footer: live grade preview + actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--color-rule-soft)] pt-5">
        <div className="flex items-center gap-3">
          <span className="mono text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">Grade after</span>
          <span className="flex items-center gap-2">
            <GradeChip grade={before} muted />
            <span aria-hidden className="text-[color:var(--color-ink-4)]">→</span>
            <GradeChip grade={projected} />
          </span>
          {promotes && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="mono rounded-full bg-[color:var(--color-sgs)]/12 px-2.5 py-1 text-[9.5px] tracking-[0.14em] text-[color:var(--color-sgs-ink)] uppercase"
            >
              Promotes to {projected}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={resetFields}
            className="rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="emp-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            {result === 'pass' ? (isRenewal ? 'Renew & update' : alreadyOnFile ? 'Update certificate' : 'Register & issue') : 'Log result'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            key={`${done.code}-${done.passed}`}
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className={`mt-4 flex items-center gap-3 rounded-[1.1rem] border px-5 py-3.5 ${
                done.passed
                  ? 'border-[color:var(--color-sgs)]/35 bg-[color:var(--color-sgs)]/10'
                  : 'border-[oklch(0.55_0.17_28)]/35 bg-[oklch(0.55_0.17_28)]/8'
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${
                  done.passed ? 'bg-[color:var(--color-sgs)]' : 'bg-[oklch(0.55_0.17_28)]'
                }`}
              >
                {done.passed ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 7" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                )}
              </span>
              <p className="text-[12.5px] text-[color:var(--color-ink)]">
                {done.passed ? (
                  <>
                    Certificate <b>{done.code}</b> {done.renewed ? 'renewed for' : 'issued to'} <b>{emp.name}</b> —
                    computed grade is now <b>{done.grade ?? '—'}</b>. It flows into the wallet and the Alerts page
                    automatically.
                  </>
                ) : (
                  <>
                    <b>{done.code}</b> logged as a fail for <b>{emp.name}</b> — no certificate issued, grade
                    unchanged at <b>{done.grade ?? '—'}</b>.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setDone(null)}
                aria-label="Dismiss"
                className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full text-[color:var(--color-ink-3)] transition-colors hover:bg-[color:var(--color-paper-3)]"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function GradeChip({ grade, muted = false }: { grade: Grade | null; muted?: boolean }) {
  return (
    <span
      className={`mono inline-grid h-7 w-7 place-items-center rounded-[0.45rem] text-[13px] font-bold ${
        grade === null
          ? 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-4)]'
          : muted
            ? 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-2)]'
            : 'emp-btn-primary text-white'
      }`}
    >
      {grade ?? '—'}
    </span>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-3)]"
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Compact drag-and-drop file field for the recorder (shares the form skin). */
function MiniDrop({ fileName, onPick, onClear }: { fileName: string; onPick: (n: string) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const open = () => ref.current?.click();

  const input = (
    <input
      ref={ref}
      type="file"
      accept=".pdf,image/png,image/jpeg"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPick(f.name);
        e.target.value = '';
      }}
    />
  );

  if (fileName) {
    return (
      <div className="emp-filebox flex items-center gap-2.5 rounded-[0.85rem] border border-[color:var(--color-rule-soft)] px-3 py-2.5">
        {input}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[color:var(--color-ink)]">{fileName}</span>
        <button type="button" onClick={open} className="rounded-full px-2.5 py-1 text-[11px] text-[color:var(--color-ink-2)] transition-colors hover:bg-[color:var(--color-paper-3)]">
          Replace
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove file"
          className="grid h-6 w-6 place-items-center rounded-full text-[color:var(--color-ink-3)] transition-colors hover:bg-[color:var(--color-paper-3)] hover:text-[oklch(0.55_0.17_28)]"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={open}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onPick(f.name);
      }}
      className={`emp-filebox group flex cursor-pointer items-center gap-2.5 rounded-[0.85rem] border border-dashed px-3 py-2.5 transition-colors ${
        drag ? 'is-dragging' : 'border-[color:var(--color-rule)] hover:border-[color:var(--color-sgs)]/60'
      }`}
    >
      {input}
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] border border-dashed border-[color:var(--color-rule)] text-[color:var(--color-ink-3)] transition-colors group-hover:border-[color:var(--color-sgs)]/60 group-hover:text-[color:var(--color-sgs-ink)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M4 20h16" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-[color:var(--color-ink-2)]">Drag the certificate here or click to browse</span>
        <span className="mono block text-[9px] tracking-[0.12em] text-[color:var(--color-ink-4)] uppercase">PDF · JPG · PNG</span>
      </span>
      <span className="shrink-0 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-ink)] transition-colors group-hover:border-[color:var(--color-ink)]">
        Browse
      </span>
    </div>
  );
}

/** Searchable employee combobox — type a name to filter, arrow keys + Enter to
 *  choose. Each row shows the employee's computed grade so the roster reads at
 *  a glance. Replaces the fixed pill row so the picker scales with the roster. */
function EmployeePicker({
  roster,
  current,
  gradeByEmp,
  onPick,
}: {
  roster: ReadonlyArray<Employee>;
  current: Employee;
  gradeByEmp: Record<string, Grade | null>;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const q = query.trim().toLowerCase();
  const results =
    q === ''
      ? roster
      : roster.filter((e) => e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q));

  // Close when clicking outside the picker.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (ev: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Reset + focus the field each time the popover opens.
  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  // Keep the highlighted row within the (shrinking) result set.
  useEffect(() => {
    setActive((a) => Math.max(0, Math.min(a, results.length - 1)));
  }, [results.length]);

  const choose = (id: string) => {
    onPick(id);
    setOpen(false);
  };

  const onKey = (ev: ReactKeyboardEvent) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const pick = results[active];
      if (pick) choose(pick.id);
    } else if (ev.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-[248px] items-center gap-2.5 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] py-1.5 pl-1.5 pr-3 text-left shadow-[var(--shadow-1)] transition-colors hover:border-[color:var(--color-rule)]"
      >
        <span className="emp-avatar grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-semibold">
          <img src={photoOf(current.name)} alt="" loading="lazy" className="h-full w-full object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-tight text-[color:var(--color-ink)]">{current.name}</span>
          <span className="mono block text-[8.5px] tracking-[0.14em] text-[color:var(--color-ink-4)] uppercase">{current.position}</span>
        </span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-[color:var(--color-ink-3)] transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 w-[300px] overflow-hidden rounded-[1.1rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] shadow-[var(--shadow-2)]"
          >
            <div className="flex items-center gap-2 border-b border-[color:var(--color-rule-soft)] px-3.5 py-2.5">
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[color:var(--color-ink-3)]">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search employee by name…"
                className="w-full bg-transparent text-[13px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-4)] focus:outline-none"
              />
              {query !== '' && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="shrink-0 text-[15px] leading-none text-[color:var(--color-ink-4)] hover:text-[color:var(--color-ink)]">
                  ×
                </button>
              )}
            </div>

            <ul role="listbox" className="no-scrollbar max-h-[300px] overflow-y-auto py-1.5">
              {results.map((e, i) => {
                const on = e.id === current.id;
                const act = i === active;
                return (
                  <li key={e.id} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(e.id)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${act ? 'bg-[color:var(--color-paper-3)]' : ''}`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-semibold ${on ? 'emp-avatar' : 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-2)]'}`}>
                        <img src={photoOf(e.name)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-[color:var(--color-ink)]">{highlight(e.name, q)}</span>
                        <span className="mono block text-[8.5px] tracking-[0.14em] text-[color:var(--color-ink-4)] uppercase">
                          {e.position} · {e.project}
                        </span>
                      </span>
                      <GradeChip grade={gradeByEmp[e.id] ?? null} muted={!on} />
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="px-4 py-6 text-center text-[12.5px] text-[color:var(--color-ink-3)]">
                  No employee matches “{query}”.
                </li>
              )}
            </ul>

            <div className="mono border-t border-[color:var(--color-rule-soft)] px-3.5 py-2 text-[9px] tracking-[0.14em] text-[color:var(--color-ink-4)] uppercase">
              {results.length} of {roster.length} · ↑↓ move · ↵ select
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function highlight(name: string, q: string): ReactNode {
  if (q === '') return name;
  const idx = name.toLowerCase().indexOf(q);
  if (idx < 0) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-[color:var(--color-sgs-ink)]">{name.slice(idx, idx + q.length)}</mark>
      {name.slice(idx + q.length)}
    </>
  );
}

/** Semicircular C → B → A dial with a sprung needle and a flip-in grade. */
function GradeDial({ grade, overridden = false }: { grade: Grade | null; overridden?: boolean }) {
  const CX = 130;
  const CY = 128;
  const R = 100;
  const SEGMENTS: ReadonlyArray<{ g: Grade; from: number; to: number }> = [
    { g: 'C', from: 180, to: 124 },
    { g: 'B', from: 118, to: 62 },
    { g: 'A', from: 56, to: 0 },
  ];
  const CENTER_DEG: Record<Grade, number> = { C: 152, B: 90, A: 28 };
  const needleDeg = grade === null ? 172 : CENTER_DEG[grade];

  const polar = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
  };
  const arc = (from: number, to: number, r: number) => {
    const p1 = polar(from, r);
    const p2 = polar(to, r);
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  };

  const reachedIdx = grade === null ? -1 : gi(grade);

  return (
    <div className="relative">
      <svg width="260" height="150" viewBox="0 0 260 150" aria-hidden>
        {SEGMENTS.map((s, i) => (
          <path
            key={s.g}
            d={arc(s.from, s.to, R)}
            fill="none"
            stroke={i <= reachedIdx ? 'var(--color-sgs)' : 'var(--color-rule-soft)'}
            strokeWidth={i <= reachedIdx ? 10 : 8}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.5s ease, stroke-width 0.5s ease' }}
          />
        ))}
        {SEGMENTS.map((s) => {
          const mid = polar((s.from + s.to) / 2, R + 16);
          return (
            <text
              key={`t-${s.g}`}
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[color:var(--color-ink-3)]"
              style={{ font: '600 11px var(--font-mono)', letterSpacing: '0.1em' }}
            >
              {s.g}
            </text>
          );
        })}
        {/* needle — drawn pointing left (180°), sprung by CSS rotate */}
        <motion.g
          animate={{ rotate: 180 - needleDeg }}
          transition={{ type: 'spring', stiffness: 110, damping: 13 }}
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
        >
          <line
            x1={CX}
            y1={CY}
            x2={CX - R + 26}
            y2={CY}
            stroke="var(--color-ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={CX - R + 26} cy={CY} r="3.5" fill="var(--color-sgs)" />
        </motion.g>
        <circle cx={CX} cy={CY} r="6" fill="var(--color-ink)" />
        <circle cx={CX} cy={CY} r="2.4" fill="var(--color-paper)" />
      </svg>

      {/* grade letter */}
      <div className="pointer-events-none absolute inset-x-0 top-[54px] flex flex-col items-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={grade ?? 'none'}
            initial={{ opacity: 0, y: 14, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="display text-[46px] leading-none text-[color:var(--color-sgs-ink)]"
          >
            {grade ?? '—'}
          </motion.span>
        </AnimatePresence>
        <span className="mono mt-1 text-[8.5px] tracking-[0.24em] text-[color:var(--color-ink-3)] uppercase">
          {grade === null ? 'Forming' : overridden ? 'Manual grade' : 'Computed grade'}
        </span>
      </div>
    </div>
  );
}

/** One engine axis: reached level chip + progress bar (+ band markers). */
function AxisMeter({
  label,
  value,
  detail,
  pct,
  sub,
  markers = false,
}: {
  label: string;
  value: Grade | null;
  detail: string;
  pct: number;
  sub: string;
  markers?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[color:var(--color-ink)]">{label}</span>
        <span className="flex items-center gap-2">
          <span className="text-[11.5px] text-[color:var(--color-ink-3)]">{detail}</span>
          <span
            className={`mono inline-grid h-6 w-6 place-items-center rounded-[0.4rem] text-[11px] font-bold ${
              value === null
                ? 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-4)]'
                : 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)]'
            }`}
          >
            {value ?? '—'}
          </span>
        </span>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--color-paper-3)]">
        <motion.div
          className="h-full rounded-full bg-[color:var(--color-sgs)]"
          animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {markers && (
          <>
            <span className="absolute inset-y-0 left-1/3 w-px bg-[color:var(--color-paper)]" />
            <span className="absolute inset-y-0 left-full -ml-px w-px bg-[color:var(--color-paper)]" />
          </>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-[color:var(--color-ink-4)]">{sub}</p>
    </div>
  );
}

const STATUS_META: Record<CertStatus, { label: string; cls: string; dot: string }> = {
  valid: {
    label: 'Valid',
    cls: 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]',
    dot: 'bg-[color:var(--color-sgs)]',
  },
  expiring: {
    label: 'Expiring',
    cls: 'bg-[oklch(0.68_0.13_70)]/14 text-[oklch(0.52_0.12_70)]',
    dot: 'bg-[oklch(0.68_0.13_70)]',
  },
  expired: {
    label: 'Expired',
    cls: 'bg-[oklch(0.55_0.17_28)]/12 text-[oklch(0.55_0.17_28)]',
    dot: 'bg-[oklch(0.55_0.17_28)]',
  },
  missing: {
    label: 'Missing',
    cls: 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-3)]',
    dot: 'bg-[color:var(--color-ink-4)]',
  },
};

/** Folder hue + front-pocket caption per status. The hue feeds the `--cf`
 *  custom property that tints the folder back, fan, disc and opened shelf.
 *  Traffic-light vocabulary: palm green (DESIGN.md's certified/active color)
 *  for valid, amber for expiring, red for expired, warm grey for missing. */
const FOLDER_META: Record<CertStatus, { hue: string; caption: string }> = {
  valid: { hue: 'oklch(0.53 0.08 160)', caption: 'In date' },
  expiring: { hue: 'oklch(0.68 0.13 70)', caption: 'Renew soon' },
  expired: { hue: 'oklch(0.55 0.17 28)', caption: 'Lapsed' },
  missing: { hue: 'var(--color-ink-4)', caption: 'Not on file' },
};

/** Spring shared by every certificate "flight" — the shared-element journey a
 *  card makes between its folder's fan and its full card on the shelf. */
const FLIGHT = { type: 'spring', stiffness: 290, damping: 28 } as const;

/** Fan poses for 1–3 peeking cards — offsets are % of the card's own size,
 *  tilt in degrees. Hover/open modify these via --lift / --spread only. */
const FAN_POSES: ReadonlyArray<ReadonlyArray<{ tx: number; ty: number; r: number; z: number }>> = [
  [{ tx: -50, ty: -18, r: 2, z: 2 }],
  [
    { tx: -72, ty: -14, r: -9, z: 1 },
    { tx: -30, ty: -21, r: 8, z: 2 },
  ],
  [
    { tx: -86, ty: -11, r: -12, z: 1 },
    { tx: -50, ty: -24, r: 1, z: 2 },
    { tx: -14, ty: -10, r: 11, z: 1 },
  ],
];

/** Status glyph inside the folder's disc (check / clock / bang / plus). */
function FolderGlyph({ status }: { status: CertStatus }) {
  const p = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (status) {
    case 'valid':
      return (<svg {...p}><path d="M4 12l5 5L20 7" /></svg>);
    case 'expiring':
      return (<svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3 2" /></svg>);
    case 'expired':
      return (<svg {...p}><path d="M12 5v9" /><circle cx="12" cy="18" r="0.4" fill="currentColor" /></svg>);
    case 'missing':
      return (<svg {...p}><path d="M12 6v12M6 12h12" /></svg>);
  }
}

/** One wallet category as a folder: up to three of its certificates fan out
 *  behind a frosted front pocket previewing the top courses. Clicking files
 *  it open — the front tips forward, the fanned cards leave the folder and
 *  fly into their real cards on the shelf (shared layoutId), and fly back in
 *  when it closes. Poses are pure CSS transforms; see competency.css. */
function CertFolder({
  status,
  certs,
  open,
  onToggle,
}: {
  status: CertStatus;
  certs: ReadonlyArray<CertView>;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = STATUS_META[status];
  const folder = FOLDER_META[status];
  const top = certs.slice(0, 3);
  const poses = FAN_POSES[top.length - 1] ?? [];

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="wallet-shelf"
      style={{ ['--cf' as string]: folder.hue }}
      className={`cert-folder mx-auto w-full max-w-[320px] sm:max-w-none ${open ? 'is-open' : ''} ${
        status === 'missing' ? 'is-missing' : ''
      } ${certs.length === 0 ? 'is-empty' : ''}`}
    >
      <span className="cf-stage">
        <span aria-hidden className="cf-back" />
        <span aria-hidden className="cf-fan">
          {!open &&
            top.map((v, i) => {
              const pose = poses[i];
              if (!pose) return null;
              return (
                <span
                  key={v.code}
                  className="cf-mini"
                  style={{
                    ['--tx' as string]: `${pose.tx}`,
                    ['--ty' as string]: `${pose.ty}`,
                    ['--r' as string]: `${pose.r}`,
                    ['--z' as string]: `${pose.z}`,
                  }}
                >
                  <motion.span layoutId={`fly-${v.code}`} transition={FLIGHT} className="cf-mini-card">
                    <span className="cf-mini-code">{v.code}</span>
                    <span className="cf-mini-line" />
                    <span className="cf-mini-line cf-mini-line--short" />
                    <span className="cf-mini-seal" />
                  </motion.span>
                </span>
              );
            })}
        </span>
        <span className="cf-front">
          <span className="cf-rows">
            {top.length === 0 ? (
              <span className="cf-row">
                <span>Empty — nothing filed</span>
              </span>
            ) : (
              top.map((v) => (
                <span key={v.code} className="cf-row">
                  <b>{v.code}</b>
                  <span>{v.training.name}</span>
                </span>
              ))
            )}
            {certs.length > 3 && <span className="cf-row-more">+{certs.length - 3} more</span>}
          </span>
          <span className="cf-foot">
            <span className="cf-hint">{folder.caption} · {open ? 'Close' : 'Open'}</span>
            <span className="cf-disc">
              <FolderGlyph status={status} />
            </span>
          </span>
        </span>
      </span>
      <span className="cf-label">
        <span className="cf-title">{meta.label}</span>
        <span className="cf-count">{certs.length}</span>
      </span>
    </button>
  );
}

/** A wallet pass for one required training. Clickable inside the simulator.
 *  With `flightId` the card is the landing half of a folder flight: it shares
 *  a layoutId with a fanned mini in the folder, so Motion flies it out of the
 *  folder on open and back in on close. Cards without a flight are "dealt"
 *  onto the shelf from above, staggered by `dealIndex`. */
function CertCard({
  view,
  now,
  interactive,
  onToggle,
  flightId,
  dealIndex = 0,
}: {
  view: CertView;
  now: Date;
  interactive: boolean;
  onToggle: () => void;
  flightId?: string;
  dealIndex?: number;
}) {
  const { training, status, rec } = view;
  const meta = STATUS_META[status];
  const missing = status === 'missing';
  const daysLeft = rec ? daysUntil(rec.expiry, now) : 0;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={`mono grid h-9 w-14 shrink-0 place-items-center rounded-[0.55rem] text-[11px] font-bold tracking-wide ${
            missing
              ? 'border border-dashed border-[color:var(--color-rule)] text-[color:var(--color-ink-4)]'
              : status === 'expired'
                ? 'bg-[oklch(0.55_0.17_28)]/12 text-[oklch(0.55_0.17_28)]'
                : 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]'
          }`}
        >
          {training.code}
        </span>
        <span className={`mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] tracking-[0.14em] uppercase ${meta.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="mt-3 min-h-[38px]">
        <div className="text-[13px] font-medium leading-snug text-[color:var(--color-ink)]">{training.name}</div>
        <div className="mono mt-1 text-[8.5px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">
          {TIER_LABEL[training.tier]} tier · {training.validityYears} yr validity
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-[color:var(--color-rule-soft)] pt-3">
        {rec ? (
          <div className="text-[11px] leading-relaxed text-[color:var(--color-ink-3)]">
            <div>
              Issued <span className="tabular text-[color:var(--color-ink-2)]">{fmtDate(rec.issued)}</span>
            </div>
            <div>
              Expires{' '}
              <span className={`tabular ${status === 'expired' ? 'font-medium text-[oklch(0.55_0.17_28)]' : 'text-[color:var(--color-ink-2)]'}`}>
                {fmtDate(rec.expiry)}
              </span>
              {status !== 'expired' && <span className="text-[color:var(--color-ink-4)]"> · {daysLeft}d</span>}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-[color:var(--color-ink-4)]">
            Not on file
            {interactive ? ' — click to simulate a pass' : ' — awaiting certificate'}
          </div>
        )}
        {rec && (
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[0.6rem] ${
              status === 'expired'
                ? 'bg-[oklch(0.55_0.17_28)]/12 text-[oklch(0.55_0.17_28)]'
                : status === 'expiring'
                  ? 'bg-[oklch(0.68_0.13_70)]/16 text-[oklch(0.5_0.12_70)]'
                  : 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]'
            }`}
            title="Certificate on file"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="9" r="6" />
              <path d="M9 13.4L7.4 22l4.6-2.7 4.6 2.7L15 13.4" />
            </svg>
          </span>
        )}
      </div>

      {view.simulated && (
        <span className="mono absolute -top-2 left-4 rounded-full bg-[color:var(--color-sgs)] px-2 py-0.5 text-[8px] font-semibold tracking-[0.18em] text-white uppercase">
          Sim
        </span>
      )}
    </>
  );

  const cls = `relative rounded-[1.1rem] border p-4 transition-colors ${
    missing
      ? 'comp-ghost border-dashed border-[color:var(--color-rule)]'
      : status === 'expired'
        ? 'border-[oklch(0.55_0.17_28)]/40 bg-[color:var(--color-paper)]'
        : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]'
  } ${view.simulated ? 'comp-simmed' : ''}`;

  // Flight cards enter via the shared-element journey (no exit — the folder's
  // remounting mini takes the snapshot over); dealt cards drop in from the
  // folder row above, one after another, and lift back out on close.
  const motionProps = flightId
    ? ({ layout: true, layoutId: flightId, initial: false, transition: FLIGHT } as const)
    : ({
        layout: true,
        initial: { opacity: 0, y: -30, scale: 0.9, rotate: dealIndex % 2 === 0 ? -2.5 : 2.5 },
        animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
        exit: { opacity: 0, y: -22, scale: 0.9 },
        transition: { type: 'spring', stiffness: 380, damping: 30, delay: 0.06 + dealIndex * 0.045 },
      } as const);

  return interactive ? (
    <motion.button
      {...motionProps}
      type="button"
      onClick={onToggle}
      className={`${cls} cursor-pointer text-left hover:border-[color:var(--color-sgs)]/60`}
    >
      {body}
    </motion.button>
  ) : (
    <motion.div {...motionProps} className={cls}>
      {body}
    </motion.div>
  );
}

function RailIcon({ id }: { id: string }) {
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'home':   return <svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 9v12h14V9" /></svg>;
    case 'people': return <svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M21 19c0-2.5-1.8-4.5-4-4.5" /></svg>;
    case 'book':   return <svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 4v13" /></svg>;
    case 'shield': return <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></svg>;
    case 'chart':  return <svg {...p}><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></svg>;
    default:       return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.8a7 7 0 0 0-1.7 1L5 6l-2 3.5L5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.4-.8a7 7 0 0 0 1.7 1L9.5 21h5l.4-2.8a7 7 0 0 0 1.7-1L19 18l2-3.5L19 13a7 7 0 0 0 0-1z" /></svg>;
  }
}
