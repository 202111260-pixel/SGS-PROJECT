import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import Wordmark from '../components/Wordmark';
import './dashboard.css';
import './employee-form.css';

/**
 * EmployeeForm — Add / Edit an SGS employee.
 *
 * One page, two modes:
 *   • /employees/new        → empty form, title "Add New Employee"
 *   • /employees/:id/edit   → pre-filled form, title "Edit Employee"
 *
 * Identity is inherited wholesale from the dashboard/landing: the page is
 * wrapped in `.sgs-registry`, so every token (paper, ink, copper `--color-sgs`,
 * `.surface`, `.display`, `.mono`) and the warm dark theme come for free.
 *
 * Layout mirrors the reference dashboards: persistent top bar + left rail, a
 * two-column body — form sections on the left, a live "Summary" panel on the
 * right that reacts as the form is filled.
 */

/* ── domain ─────────────────────────────────────────────────────────── */

const POSITIONS = [
  'Assistant',
  'Operator',
  'Supervisor',
  'Base Manager',
  'Tool Man',
  'Gauge Engineer',
  'Mechanic',
  'HSE Advisor',
] as const;
const GRADES = ['A', 'B', 'C'] as const;
const PROJECTS = ['OQ', 'Oxy Oman'] as const;

type Position = (typeof POSITIONS)[number];
type Grade = (typeof GRADES)[number];

type DocKey = 'nationalId' | 'ftw';
type SafetyKey = 'hse' | 'h2s' | 'ddLight' | 'ddHeavy' | 'ifr' | 'fa';

const OFFICIAL_DOCS: ReadonlyArray<{ key: DocKey; label: string; placeholder: string }> = [
  { key: 'nationalId', label: 'National ID', placeholder: 'id-card.pdf' },
  { key: 'ftw', label: 'FTW (Fit To Work)', placeholder: 'ftw.pdf' },
];

const SAFETY_CERTS: ReadonlyArray<{ key: SafetyKey; label: string; hint?: string; placeholder: string }> = [
  { key: 'hse', label: 'HSE', placeholder: 'hse.pdf' },
  { key: 'h2s', label: 'H2S', placeholder: 'h2s.pdf' },
  { key: 'ddLight', label: 'DD — Light', hint: 'Defensive Driving', placeholder: 'dd-light.pdf' },
  { key: 'ddHeavy', label: 'DD — Heavy', hint: 'Defensive Driving', placeholder: 'dd-heavy.pdf' },
  { key: 'ifr', label: 'IFR', placeholder: 'ifr.pdf' },
  { key: 'fa', label: 'FA', hint: 'First Aid', placeholder: 'fa.pdf' },
];

type DocState = { name: string; expiry: string };

type FormState = {
  fullName: string;
  employeeNo: string;
  email: string;
  mobile: string;
  position: Position | '';
  project: string;
  grade: Grade | '';
  hireDate: string;
  cv: string;
  docs: Record<DocKey, DocState>;
  safety: Record<SafetyKey, DocState>;
};

const emptyDocs = (): Record<DocKey, DocState> => ({
  nationalId: { name: '', expiry: '' },
  ftw: { name: '', expiry: '' },
});

const emptySafety = (): Record<SafetyKey, DocState> => ({
  hse: { name: '', expiry: '' },
  h2s: { name: '', expiry: '' },
  ddLight: { name: '', expiry: '' },
  ddHeavy: { name: '', expiry: '' },
  ifr: { name: '', expiry: '' },
  fa: { name: '', expiry: '' },
});

const blankForm = (): FormState => ({
  fullName: '',
  employeeNo: '',
  email: '',
  mobile: '',
  position: '',
  project: '',
  grade: '',
  hireDate: '',
  cv: '',
  docs: emptyDocs(),
  safety: emptySafety(),
});

// Pre-filled record used when the page is opened in edit mode. In production
// this is fetched by id and Zod-parsed at the trust boundary (§2/§3); here it
// stands in for that shape so the edit experience is real.
const SAMPLE_EMPLOYEE: FormState = {
  fullName: 'Madelyn Philips',
  employeeNo: '10241',
  email: 'madelyn@sgs.com',
  mobile: '9123 4567',
  position: 'Operator',
  project: 'OQ',
  grade: 'B',
  hireDate: '2022-01-24',
  cv: 'CV.pdf',
  docs: {
    nationalId: { name: 'id-card.pdf', expiry: '2027-03-10' },
    ftw: { name: 'ftw.pdf', expiry: '2026-07-20' },
  },
  safety: {
    hse: { name: 'hse.pdf', expiry: '2027-02-11' },
    h2s: { name: 'h2s.pdf', expiry: '2026-09-30' },
    ddLight: { name: 'dd-light.pdf', expiry: '2026-12-05' },
    ddHeavy: { name: '', expiry: '' },
    ifr: { name: 'ifr.pdf', expiry: '2026-08-18' },
    fa: { name: '', expiry: '' },
  },
};

type Errors = Partial<Record<'fullName' | 'employeeNo' | 'email' | 'position' | 'project', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.fullName.trim()) e.fullName = 'Full name is required.';
  if (!f.employeeNo.trim()) e.employeeNo = 'Employee number is required.';
  if (!f.email.trim()) e.email = 'Email is required.';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (!f.position) e.position = 'Select a position.';
  if (!f.project) e.project = 'Select a project.';
  return e;
}

const TOTAL_DOCS = OFFICIAL_DOCS.length + SAFETY_CERTS.length;

/* ── shared class fragments ─────────────────────────────────────────── */

const inputBase =
  'w-full rounded-[0.85rem] border bg-[color:var(--color-paper)] px-4 py-3 text-[14px] ' +
  'text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-4)] transition-all ' +
  'focus:outline-none focus:border-[color:var(--color-sgs)] focus:ring-4 focus:ring-[color:var(--color-sgs)]/12';
const inputOk = 'border-[color:var(--color-rule-soft)]';
const inputBad = 'border-[oklch(0.6_0.18_28)]';

type RailItem = { id: string; label: string; to?: string; active?: boolean };
const RAIL_ITEMS: RailItem[] = [
  { id: 'home', label: 'Dashboard', to: '/dashboard' },
  { id: 'people', label: 'Employees', to: '/employees/new', active: true },
  { id: 'book', label: 'Training' },
  { id: 'shield', label: 'Compliance' },
  { id: 'chart', label: 'Analytics', to: '/dashboard/analytics' },
  { id: 'cog', label: 'Settings' },
];

/* ════════════════════════════════════════════════════════════════════ */

export default function EmployeeForm({ mode = 'new' }: { mode?: 'new' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';

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

  const [form, setForm] = useState<FormState>(() => (isEdit ? SAMPLE_EMPLOYEE : blankForm()));
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setDoc = (group: 'docs' | 'safety', key: string, patch: Partial<DocState>) => {
    setForm((f) => ({
      ...f,
      [group]: { ...f[group], [key]: { ...(f[group] as Record<string, DocState>)[key], ...patch } },
    }));
    setSaved(false);
  };

  const attachedCount = useMemo(() => {
    const d = Object.values(form.docs).filter((x) => x.name).length;
    const s = Object.values(form.safety).filter((x) => x.name).length;
    return d + s;
  }, [form.docs, form.safety]);

  const requiredComplete = validate(form);
  const isReady = Object.keys(requiredComplete).length === 0;

  // ── horizontal stepper ────────────────────────────────────────────
  const STEPS = [
    { eyebrow: 'Section A', title: 'Basic Information' },
    { eyebrow: 'Section B', title: 'Official Documents' },
    { eyebrow: 'Section B-2', title: 'Safety Trainings' },
    { eyebrow: 'Review', title: 'Review & Save' },
  ] as const;
  const LAST = STEPS.length - 1;

  const [step, setStep] = useState(0);
  const go = (n: number) => setStep(Math.max(0, Math.min(LAST, n)));

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [panelW, setPanelW] = useState(0);
  const [panelH, setPanelH] = useState<number | undefined>(undefined);

  // Measure the viewport width so the track can translate in exact pixels
  // (keeps drag, wheel and button navigation on one consistent unit).
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const measure = () => setPanelW(vp.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  // Grow / shrink the viewport to the ACTIVE panel's height (re-measured live
  // as files are attached), so each step reads as its own clean screen.
  useLayoutEffect(() => {
    const el = panelRefs.current[step];
    if (!el) return;
    const measure = () => setPanelH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step, panelW]);

  // Arrow keys move between steps — but never while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      if (e.key === 'ArrowRight') go(step + 1);
      else if (e.key === 'ArrowLeft') go(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // Horizontal trackpad wheel → step (throttled, non-passive so it can claim
  // the gesture instead of scrolling the page sideways).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let lock = false;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 24 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (lock) return;
      lock = true;
      window.setTimeout(() => (lock = false), 550);
      go(step + (e.deltaX > 0 ? 1 : -1));
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [step]);

  const onSave = () => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // every required field lives on step 1 — take the user there, then focus it.
      setStep(0);
      window.setTimeout(() => {
        const first = document.querySelector<HTMLElement>('[data-invalid="true"]');
        first?.focus?.();
      }, 380);
      return;
    }
    // Frontend-only: no backend wired yet. In production this POSTs to a
    // Zod-validated route (§2). Here we surface a truthful confirmation.
    setSaved(true);
    // eslint-disable-next-line no-console
    console.info('[EmployeeForm] validated payload', form);
  };

  // geometry for the stepper's connector line (aligned to circle centres)
  const railLeft = `${100 / (2 * STEPS.length)}%`;
  const railWidth = `${(100 * LAST) / STEPS.length}%`;

  return (
    <div
      data-theme={dark ? 'dark' : undefined}
      className="sgs-registry emp-form min-h-screen bg-[color:var(--color-paper-2)] text-[color:var(--color-ink)]"
    >
      {/* ── top bar ── */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-5 px-5 lg:px-7">
          <a href="/" aria-label="Back to site" className="flex items-center gap-2.5">
            <Wordmark tone="light" />
          </a>
          <span className="hidden h-5 w-px bg-[color:var(--color-rule-soft)] md:block" />
          <nav className="mono hidden items-center gap-1 text-[11px] tracking-[0.18em] uppercase md:flex">
            <Link to="/dashboard" className="rounded-[2px] px-2.5 py-1.5 text-[color:var(--color-ink-2)] hover:bg-[color:var(--color-paper-3)]">
              Overview
            </Link>
            <span className="rounded-[2px] bg-[color:var(--color-ink)] px-2.5 py-1.5 text-[color:var(--color-paper)]">
              Employees
            </span>
            <span className="rounded-[2px] px-2.5 py-1.5 text-[color:var(--color-ink-2)]">Training</span>
            <span className="rounded-[2px] px-2.5 py-1.5 text-[color:var(--color-ink-2)]">Alerts</span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
            >
              {dark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--color-ink)] text-[11px] font-semibold text-[color:var(--color-paper)]">
              NA
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── left rail ── */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-14 shrink-0 flex-col items-center gap-1 border-r border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] py-3 md:flex">
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
        <main className="mx-auto min-w-0 flex-1 max-w-[1480px] px-5 pb-24 pt-6 lg:px-8">
          {/* page header */}
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mono flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                <Link to="/dashboard" className="hover:text-[color:var(--color-ink)]">Employees</Link>
                <span aria-hidden>›</span>
                <span className="text-[color:var(--color-ink)]">{isEdit ? 'Edit' : 'Add New Employee'}</span>
              </div>
              <h1 className="display mt-3 text-[clamp(1.9rem,3.2vw,2.7rem)] text-[color:var(--color-ink)]">
                {isEdit ? 'Edit Employee' : 'Add New '}
                {!isEdit && <span className="serif-italic text-[color:var(--color-sgs-ink)]">Employee</span>}
              </h1>
              <p className="mt-1.5 text-[13.5px] text-[color:var(--color-ink-2)]">
                {isEdit
                  ? `Updating record ${id ?? SAMPLE_EMPLOYEE.employeeNo} — files already on record can be replaced.`
                  : 'Fill in the details below. Fields marked with a copper asterisk are required.'}
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="rounded-[0.7rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
            >
              Cancel
            </button>
          </div>

          {/* ── stepper ── */}
          <nav className="mt-8 select-none" aria-label="Form steps">
            <div className="relative flex items-start justify-between">
              <div className="absolute top-[15px] h-px bg-[color:var(--color-rule-soft)]" style={{ left: railLeft, width: railWidth }} />
              <motion.div
                className="absolute top-[15px] h-px bg-[color:var(--color-sgs)]"
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
                    className="relative z-10 flex flex-1 flex-col items-center gap-2 text-center"
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full border text-[12px] font-semibold transition-colors ${
                        active
                          ? 'border-[color:var(--color-sgs)] bg-[color:var(--color-sgs)] text-white'
                          : done
                            ? 'border-[color:var(--color-sgs)] bg-[color:var(--color-paper)] text-[color:var(--color-sgs-ink)]'
                            : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink-3)]'
                      }`}
                    >
                      {done ? '✓' : i + 1}
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

          {/* ── carousel viewport — each section is its own screen ── */}
          <div ref={viewportRef} className="relative mt-8 overflow-hidden">
            <motion.div
              className="flex"
              style={{ touchAction: 'pan-y' }}
              animate={{ x: -step * panelW, height: panelH ?? 'auto' }}
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 34 },
                height: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] },
              }}
              drag="x"
              dragElastic={0.12}
              dragConstraints={{ left: -LAST * panelW, right: 0 }}
              onDragEnd={(_, info) => {
                const threshold = Math.min(120, panelW * 0.18);
                if (info.offset.x < -threshold || info.velocity.x < -500) go(step + 1);
                else if (info.offset.x > threshold || info.velocity.x > 500) go(step - 1);
              }}
            >
              {/* ── panel 0 · Basic Information ── */}
              <div
                ref={(el) => { panelRefs.current[0] = el; }}
                style={{ width: panelW || '100%' }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <Section idx="01" eyebrow="Section A" title="Basic Information">
                <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Full Name" required error={errors.fullName}>
                    <input
                      value={form.fullName}
                      onChange={(e) => set('fullName', e.target.value)}
                      placeholder="e.g. Madelyn Philips"
                      data-invalid={errors.fullName ? 'true' : undefined}
                      className={`${inputBase} ${errors.fullName ? inputBad : inputOk}`}
                    />
                  </Field>

                  <Field label="Employee Number" required error={errors.employeeNo}>
                    <input
                      value={form.employeeNo}
                      onChange={(e) => set('employeeNo', e.target.value)}
                      placeholder="e.g. 10246"
                      inputMode="numeric"
                      data-invalid={errors.employeeNo ? 'true' : undefined}
                      className={`${inputBase} tabular ${errors.employeeNo ? inputBad : inputOk}`}
                    />
                  </Field>

                  <Field label="Email" required error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="name@sgs.com"
                      data-invalid={errors.email ? 'true' : undefined}
                      className={`${inputBase} ${errors.email ? inputBad : inputOk}`}
                    />
                  </Field>

                  <Field label="Mobile Number">
                    <div className={`flex items-stretch overflow-hidden rounded-[0.7rem] border ${inputOk} focus-within:border-[color:var(--color-sgs)]`}>
                      <span className="mono grid place-items-center border-r border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-3)] px-3 text-[12.5px] text-[color:var(--color-ink-2)]">
                        +968
                      </span>
                      <input
                        value={form.mobile}
                        onChange={(e) => set('mobile', e.target.value)}
                        placeholder="9123 4567"
                        inputMode="tel"
                        className="w-full bg-[color:var(--color-paper)] px-3.5 py-2.5 text-[13.5px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-4)] focus:outline-none"
                      />
                    </div>
                  </Field>

                  <Field label="Position" required error={errors.position}>
                    <Select
                      value={form.position}
                      onChange={(v) => set('position', v as Position)}
                      placeholder="Select position…"
                      options={POSITIONS}
                      invalid={!!errors.position}
                    />
                  </Field>

                  <Field label="Project" required error={errors.project}>
                    <Select
                      value={form.project}
                      onChange={(v) => set('project', v)}
                      placeholder="Select project…"
                      options={PROJECTS}
                      invalid={!!errors.project}
                    />
                  </Field>

                  <Field label="Current Grade">
                    <div className="flex gap-2">
                      {GRADES.map((g) => {
                        const on = form.grade === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => set('grade', on ? '' : g)}
                            className={`mono h-[42px] flex-1 rounded-[0.7rem] border text-[13px] font-semibold transition-colors ${
                              on
                                ? 'border-[color:var(--color-sgs)] bg-[color:var(--color-sgs)] text-white'
                                : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink-2)] hover:border-[color:var(--color-ink)]'
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Hire Date">
                    <input
                      type="date"
                      value={form.hireDate}
                      onChange={(e) => set('hireDate', e.target.value)}
                      className={`${inputBase} tabular ${inputOk}`}
                    />
                  </Field>

                  <Field label="CV (PDF)">
                    <FileButton
                      name={form.cv}
                      placeholder="Upload CV"
                      onPick={(n) => set('cv', n)}
                      onClear={() => set('cv', '')}
                    />
                  </Field>
                </div>
              </Section>
              </div>

              {/* ── panel 1 · Official Documents ── */}
              <div
                ref={(el) => { panelRefs.current[1] = el; }}
                style={{ width: panelW || '100%' }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <Section idx="02" eyebrow="Section B" title="Official Documents" subtitle="A file and an expiry date for each.">
                {OFFICIAL_DOCS.map((d) => (
                  <DocRow
                    key={d.key}
                    label={d.label}
                    value={form.docs[d.key]}
                    placeholder={d.placeholder}
                    onFile={(n) => setDoc('docs', d.key, { name: n })}
                    onClear={() => setDoc('docs', d.key, { name: '' })}
                    onExpiry={(v) => setDoc('docs', d.key, { expiry: v })}
                  />
                ))}
              </Section>
              </div>

              {/* ── panel 2 · Mandatory Safety Trainings ── */}
              <div
                ref={(el) => { panelRefs.current[2] = el; }}
                style={{ width: panelW || '100%' }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <Section idx="03" eyebrow="Section B-2" title="Mandatory Safety Trainings" subtitle="Certificate file + expiry for each course.">
                {SAFETY_CERTS.map((c) => (
                  <DocRow
                    key={c.key}
                    label={c.label}
                    hint={c.hint}
                    value={form.safety[c.key]}
                    placeholder={c.placeholder}
                    onFile={(n) => setDoc('safety', c.key, { name: n })}
                    onClear={() => setDoc('safety', c.key, { name: '' })}
                    onExpiry={(v) => setDoc('safety', c.key, { expiry: v })}
                  />
                ))}
                <p className="mt-4 flex items-start gap-2.5 rounded-[0.7rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-3)]/50 px-3.5 py-3 text-[12.5px] leading-relaxed text-[color:var(--color-ink-2)]">
                  <span aria-hidden className="mono mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-[color:var(--color-ink-3)] text-[10px] text-[color:var(--color-ink-2)]">
                    i
                  </span>
                  These certificates are mandatory for field-operations roles. The supervisor can upload and edit
                  them, and their expiry dates flow automatically into the Alerts page.
                </p>
              </Section>
            </div>

              {/* ── panel 3 · Review & Save ── */}
              <div
                ref={(el) => { panelRefs.current[3] = el; }}
                style={{ width: panelW || '100%' }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className="surface rounded-[3px] p-7 lg:p-9"
              >
                <header className="mb-7 flex items-start justify-between gap-3 border-b border-[color:var(--color-rule-soft)] pb-5">
                  <div>
                    <div className="eyebrow">Review</div>
                    <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">Review &amp; Save</h2>
                    <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">Confirm the details, then save the record.</p>
                  </div>
                  <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">04</span>
                </header>
                <h3 className="display text-[20px] text-[color:var(--color-ink)]">
                  {form.fullName || 'New employee'}
                </h3>

                <dl className="mt-4 space-y-2.5 text-[13px]">
                  <SummaryRow k="Employee No." v={form.employeeNo || '—'} mono />
                  <SummaryRow k="Position" v={form.position || '—'} />
                  <SummaryRow k="Project" v={form.project || '—'} />
                  <SummaryRow
                    k="Grade"
                    v={
                      form.grade ? (
                        <span className="mono inline-grid h-6 w-6 place-items-center rounded-[0.4rem] bg-[color:var(--color-ink)] text-[11px] font-bold text-[color:var(--color-paper)]">
                          {form.grade}
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />
                </dl>

                <div className="mt-5 border-t border-[color:var(--color-rule-soft)] pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                      Documents attached
                    </span>
                    <span className="tabular text-[13px] font-medium text-[color:var(--color-ink)]">
                      {attachedCount} / {TOTAL_DOCS}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--color-paper-3)]">
                    <motion.div
                      className="h-full rounded-full bg-[color:var(--color-sgs)]"
                      animate={{ width: `${(attachedCount / TOTAL_DOCS) * 100}%` }}
                      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                    Status
                  </span>
                  <span
                    className={`mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] tracking-[0.14em] uppercase ${
                      isReady
                        ? 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]'
                        : 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-3)]'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isReady ? 'bg-[color:var(--color-sgs)]' : 'bg-[color:var(--color-ink-4)]'}`} />
                    {isReady ? 'Ready to save' : 'Draft'}
                  </span>
                </div>

                {saved && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-[0.7rem] border border-[color:var(--color-sgs)]/30 bg-[color:var(--color-sgs)]/10 px-3 py-2 text-[12px] text-[color:var(--color-sgs-ink)]"
                  >
                    Validated — record ready. Backend save is not wired yet (frontend only).
                  </motion.p>
                )}

                <p className="mt-4 text-[11.5px] leading-relaxed text-[color:var(--color-ink-3)]">
                  Tip: the same page opens in edit mode from an employee profile, pre-filled and ready to update.
                </p>
              </motion.section>
              </div>
            </motion.div>
          </div>

          {/* ── wizard nav ── */}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[color:var(--color-rule-soft)] pt-5">
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-[0.7rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)] disabled:pointer-events-none disabled:opacity-40"
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
                className="inline-flex items-center gap-2 rounded-[0.7rem] bg-[color:var(--color-sgs)] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--color-sgs-bright)]"
              >
                Next <span aria-hidden>→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSave}
                className="inline-flex items-center gap-2 rounded-[0.7rem] bg-[color:var(--color-sgs)] px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--color-sgs-bright)]"
              >
                {isEdit ? 'Save changes' : 'Save employee'}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── building blocks ────────────────────────────────────────────────── */

function Section({
  idx,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  idx: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="surface rounded-[3px] p-7 lg:p-9"
    >
      <header className="mb-7 flex items-start justify-between gap-3 border-b border-[color:var(--color-rule-soft)] pb-5">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">{title}</h2>
          {subtitle && <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">{subtitle}</p>}
        </div>
        <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">{idx}</span>
      </header>
      {children}
    </motion.section>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12.5px] font-medium text-[color:var(--color-ink)]">
        {label}
        {required && <span className="ml-0.5 text-[color:var(--color-sgs)]">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11.5px] text-[oklch(0.55_0.17_28)]">{error}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  invalid = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<string>;
  placeholder: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-invalid={invalid ? 'true' : undefined}
        className={`${inputBase} ${invalid ? inputBad : inputOk} appearance-none pr-9 ${
          value ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-4)]'
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="text-[color:var(--color-ink)]">
            {o}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-3)]"
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

/** A file "input" that reads as a clean button. Shows the file name once
 *  chosen, with Replace / Remove affordances. No native file-input chrome. */
function FileButton({
  name,
  placeholder,
  onPick,
  onClear,
}: {
  name: string;
  placeholder: string;
  onPick: (fileName: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => ref.current?.click();

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-[0.7rem] border px-3 py-2 ${
        name ? 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]' : 'border-dashed border-[color:var(--color-rule)] bg-[color:var(--color-paper-3)]/40'
      }`}
    >
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
      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${name ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-4)]'}`}>
        {name || placeholder}
      </span>
      {name ? (
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={open} className="rounded-[0.4rem] px-2 py-1 text-[11px] text-[color:var(--color-ink-2)] hover:bg-[color:var(--color-paper-3)]">
            Replace
          </button>
          <button type="button" onClick={onClear} aria-label="Remove file" className="grid h-6 w-6 place-items-center rounded-full text-[color:var(--color-ink-3)] hover:bg-[color:var(--color-paper-3)] hover:text-[oklch(0.55_0.17_28)]">
            ×
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={open}
          className="shrink-0 rounded-[0.4rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-2.5 py-1 text-[11.5px] font-medium text-[color:var(--color-ink)] hover:border-[color:var(--color-ink)]"
        >
          Upload
        </button>
      )}
    </div>
  );
}

function DocRow({
  label,
  hint,
  value,
  placeholder,
  onFile,
  onClear,
  onExpiry,
}: {
  label: string;
  hint?: string | undefined;
  value: DocState;
  placeholder: string;
  onFile: (fileName: string) => void;
  onClear: () => void;
  onExpiry: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 items-end gap-5 border-b border-[color:var(--color-rule-soft)] py-5 last:border-b-0 sm:grid-cols-[190px_1fr] lg:grid-cols-[210px_1fr_200px]">
      <div className="pb-1">
        <span className="text-[13px] font-medium text-[color:var(--color-ink)]">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-[color:var(--color-ink-3)]">{hint}</span>}
      </div>
      <div>
        <span className="mb-1.5 block text-[11px] text-[color:var(--color-ink-3)] lg:hidden">Certificate file</span>
        <FileButton name={value.name} placeholder={placeholder} onPick={onFile} onClear={onClear} />
      </div>
      <div>
        <span className="mb-1.5 block text-[11px] text-[color:var(--color-ink-3)]">Expiry date</span>
        <input
          type="date"
          value={value.expiry}
          onChange={(e) => onExpiry(e.target.value)}
          className={`${inputBase} tabular ${inputOk}`}
        />
      </div>
    </div>
  );
}

function SummaryRow({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[color:var(--color-ink-3)]">{k}</dt>
      <dd className={`text-right text-[color:var(--color-ink)] ${mono ? 'mono tabular' : ''}`}>{v}</dd>
    </div>
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
