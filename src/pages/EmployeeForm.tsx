import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import NavDock from '../components/NavDock';
import RotatingText from '../components/RotatingText';
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

/* ── domain: types, data, and pure logic live in sibling modules ─────── */
import type { DocState, Errors, FormState, Position } from './EmployeeForm.types';
import {
  COMPANY_PROPERTIES,
  EMAIL_RE,
  GRADE_LADDER,
  GRADE_TIER,
  OFFICIAL_DOCS,
  POSITIONS,
  PROJECTS,
  RAIL_ITEMS,
  REQUIRED_KEYS,
  SAFETY_CERTS,
  SAMPLE_EMPLOYEE,
  TOTAL_DOCS,
  blankForm,
  inputBad,
  inputBase,
  inputOk,
} from './EmployeeForm.data';
import { calculateServiceYears, hasGradeLadder, initialsOf, validate } from './EmployeeForm.logic';
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
  const [companyPropertiesOpen, setCompanyPropertiesOpen] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setHireDate = (hireDate: string) => {
    setForm((f) => ({
      ...f,
      hireDate,
      experienceYears: calculateServiceYears(hireDate),
    }));
    setSaved(false);
  };

  const toggleCompanyProperty = (key: 'car' | 'fuelCard' | 'blueKey' | 'companyMobile' | 'companyLaptop') => {
    setForm((f) => ({
      ...f,
      companyProps: { ...f.companyProps, [key]: !f.companyProps[key] },
    }));
    setSaved(false);
  };

  const setDoc = (group: 'docs' | 'safety', key: string, patch: Partial<DocState>) => {
    setForm((f) => ({
      ...f,
      [group]: { ...f[group], [key]: { ...(f[group] as Record<string, DocState>)[key], ...patch } },
    }));
    setSaved(false);
  };

  const docsDone = Object.values(form.docs).filter((x) => x.name !== '').length;
  const safetyDone = Object.values(form.safety).filter((x) => x.name !== '').length;
  const attachedCount = docsDone + safetyDone;

  const requiredComplete = validate(form);
  const isReady = Object.keys(requiredComplete).length === 0;
  const receivedCompanyProps = COMPANY_PROPERTIES.filter((item) => form.companyProps[item.key]).map((item) => item.label);
  const calculatedExperienceYears = calculateServiceYears(form.hireDate);

  // Live completion for the preview card: 5 required basics + every document.
  const basicsDone = REQUIRED_KEYS.filter((k) => !requiredComplete[k]).length;
  const completion = Math.round(
    ((basicsDone + attachedCount) / (REQUIRED_KEYS.length + TOTAL_DOCS)) * 100,
  );

  // ── horizontal stepper ────────────────────────────────────────────
  const STEPS = [
    { eyebrow: 'Section A', title: 'Basic Information' },
    { eyebrow: 'Section B', title: 'Official Documents' },
    { eyebrow: 'Section B-2', title: 'Safety Trainings' },
    { eyebrow: 'Review', title: 'Review & Save' },
  ] as const;
  const LAST = STEPS.length - 1;

  const [step, setStep] = useState(0);
  const go = useCallback((n: number) => setStep(Math.max(0, Math.min(LAST, n))), [LAST]);

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
  }, [step, go]);

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
  }, [step, go]);

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
  };

  // geometry for the stepper's connector line (aligned to circle centres)
  const railLeft = `${100 / (2 * STEPS.length)}%`;
  const railWidth = `${(100 * LAST) / STEPS.length}%`;

  return (
    <div
      data-theme={dark ? 'dark' : undefined}
      className="sgs-registry emp-form min-h-screen bg-[color:var(--color-paper-2)] text-[color:var(--color-ink)]"
    >
      {/* ── the nav dock ── */}
      <NavDock active="Employees" dark={dark} onToggleTheme={toggleTheme} />

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
        <main className="mx-auto min-w-0 flex-1 max-w-[1480px] px-5 pb-24 pt-6 lg:px-8">
          {/* page header */}
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mono flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                <Link to="/dashboard" className="hover:text-[color:var(--color-ink)]">Employees</Link>
                <span aria-hidden>›</span>
                <span className="text-[color:var(--color-ink)]">{isEdit ? 'Edit' : 'Add New Employee'}</span>
              </div>
              <h1 className="display mt-3 text-[clamp(1.9rem,3.2vw,2.7rem)] leading-[1.1] text-[color:var(--color-ink)]">
                {isEdit ? (
                  'Edit Employee'
                ) : (
                  <>
                    Add New{' '}
                    <RotatingText
                      texts={['Employee', 'Operator', 'Supervisor', 'Technician', 'Driller']}
                      mainClassName="serif-italic align-baseline text-[color:var(--color-sgs-ink)]"
                      splitLevelClassName="overflow-hidden pb-[0.14em]"
                      staggerFrom="last"
                      staggerDuration={0.02}
                      rotationInterval={2400}
                      splitBy="characters"
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '-120%' }}
                      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                      auto
                      loop
                    />
                  </>
                )}
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
                        <motion.svg
                          initial={{ scale: 0, rotate: -30 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <path d="M4 12l5 5L20 7" />
                        </motion.svg>
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

          <div className="mt-8 overflow-x-auto pb-3">
            <div className="flex min-w-[56rem] items-start gap-7">
              {/* ── wizard column ── */}
              <div className="min-w-0 flex-1">
          {/* ── carousel viewport — each section is its own screen ── */}
          <div ref={viewportRef} className="relative overflow-hidden">
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
              <motion.div
                ref={(el) => { panelRefs.current[0] = el; }}
                style={{ width: panelW || '100%' }}
                animate={{ opacity: step === 0 ? 1 : 0.4, scale: step === 0 ? 1 : 0.985 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <Section idx="01" eyebrow="Section A" title="Basic Information" icon="user">
                <div className="mb-7 flex items-center gap-5 border-b border-[color:var(--color-rule-soft)] pb-7">
                  <PhotoUpload
                    photo={form.photo}
                    initials={initialsOf(form.fullName)}
                    onPick={(dataUrl) => set('photo', dataUrl)}
                    onClear={() => set('photo', '')}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[color:var(--color-ink)]">Profile Photo</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-ink-3)]">
                      JPG or PNG, up to 5MB. Appears on the employee card and the review step.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Full Name" icon="user" required error={errors.fullName} valid={form.fullName.trim() !== ''}>
                    <input
                      value={form.fullName}
                      onChange={(e) => set('fullName', e.target.value)}
                      placeholder="e.g. Madelyn Philips"
                      data-invalid={errors.fullName ? 'true' : undefined}
                      className={`${inputBase} ${errors.fullName ? inputBad : inputOk}`}
                    />
                  </Field>

                  <Field label="Employee Number" icon="id" required error={errors.employeeNo} valid={form.employeeNo.trim() !== ''}>
                    <input
                      value={form.employeeNo}
                      onChange={(e) => set('employeeNo', e.target.value)}
                      placeholder="e.g. 10246"
                      inputMode="numeric"
                      data-invalid={errors.employeeNo ? 'true' : undefined}
                      className={`${inputBase} tabular ${errors.employeeNo ? inputBad : inputOk}`}
                    />
                  </Field>

                  <Field label="Email" icon="mail" required error={errors.email} valid={EMAIL_RE.test(form.email.trim())}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="name@sgs.com"
                      data-invalid={errors.email ? 'true' : undefined}
                      className={`${inputBase} ${errors.email ? inputBad : inputOk}`}
                    />
                  </Field>

                  <Field label="Mobile Number" icon="phone">
                    <div className={`emp-fieldgroup flex items-stretch overflow-hidden rounded-[0.7rem] border ${inputOk} focus-within:border-[color:var(--color-sgs)]`}>
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

                  <Field label="Position" icon="tag" required error={errors.position} valid={form.position !== ''}>
                    <Select
                      value={form.position}
                      onChange={(v) => {
                        const pos = v as Position;
                        set('position', pos);
                        // Non-ladder roles carry no grade — clear any stale value.
                        if (!hasGradeLadder(pos)) set('grade', '');
                      }}
                      placeholder="Select position…"
                      options={POSITIONS}
                      invalid={!!errors.position}
                    />
                  </Field>

                  <Field label="Project" icon="briefcase" required error={errors.project} valid={form.project !== ''}>
                    <Select
                      value={form.project}
                      onChange={(v) => set('project', v)}
                      placeholder="Select project…"
                      options={PROJECTS}
                      invalid={!!errors.project}
                    />
                  </Field>

                  {hasGradeLadder(form.position) && (
                    <Field label="Current Grade" icon="award" valid={form.grade !== ''}>
                      <div className="emp-fieldgroup flex rounded-[0.85rem] border p-1">
                        {GRADE_LADDER.map((g) => {
                          const on = form.grade === g;
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => set('grade', on ? '' : g)}
                              className="mono relative isolate flex h-[46px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[0.65rem]"
                            >
                              {on && (
                                <motion.span
                                  layoutId="grade-pill"
                                  className="emp-btn-primary absolute inset-0 -z-10 rounded-[0.65rem]"
                                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                />
                              )}
                              <span className={`text-[14px] font-semibold leading-none transition-colors ${on ? 'text-white' : 'text-[color:var(--color-ink)]'}`}>
                                {g}
                              </span>
                              <span className={`text-[8px] tracking-[0.1em] uppercase leading-none transition-colors ${on ? 'text-white/85' : 'text-[color:var(--color-ink-4)]'}`}>
                                {GRADE_TIER[g]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-4)]">
                        {form.position} ladder · C → B → A. Confirmed automatically by the Competency engine from
                        training + experience.
                      </p>
                    </Field>
                  )}

                  <div className="sm:col-span-2 lg:col-span-3">
                    <div className="rounded-[1rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]/70 p-4">
                      <button
                        type="button"
                        aria-expanded={companyPropertiesOpen}
                        aria-controls="company-property-options"
                        onClick={() => setCompanyPropertiesOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-3 rounded-[0.65rem] text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--color-sgs)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-paper)]"
                      >
                        <span className="text-[13px] font-medium text-[color:var(--color-ink)]">Company Property Issuance</span>
                        <span
                          aria-hidden="true"
                          className={`text-[18px] leading-none text-[color:var(--color-ink-4)] transition-transform duration-300 motion-reduce:transition-none ${
                            companyPropertiesOpen ? 'rotate-180' : ''
                          }`}
                        >
                          ⌄
                        </span>
                      </button>
                      <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-ink-3)]">
                        Click the title to reveal the items the employee receives.
                      </p>
                      <motion.div
                        id="company-property-options"
                        inert={!companyPropertiesOpen}
                        initial={false}
                        animate={{
                          height: companyPropertiesOpen ? 'auto' : 0,
                          opacity: companyPropertiesOpen ? 1 : 0,
                        }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4">
                          <p className="mono mb-3 text-[10px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">
                            {receivedCompanyProps.length} selected
                          </p>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {COMPANY_PROPERTIES.map((item) => {
                              const active = form.companyProps[item.key];
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => toggleCompanyProperty(item.key)}
                                  className={`flex items-center justify-between rounded-[0.85rem] border px-3.5 py-3 text-left transition-all ${
                                    active
                                      ? 'border-[color:var(--color-sgs)] bg-[color:var(--color-sgs)]/10 text-[color:var(--color-sgs-ink)]'
                                      : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink)] hover:border-[color:var(--color-ink)]'
                                  }`}
                                >
                                  <span className="text-[13px] font-medium">{item.label}</span>
                                  <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
                                    active
                                      ? 'border-[color:var(--color-sgs)] bg-[color:var(--color-sgs)] text-white'
                                      : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink-4)]'
                                  }`}>
                                    {active ? '✓' : '○'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <Field label="Join Date" icon="calendar">
                    <div>
                      <input
                        type="date"
                        value={form.hireDate}
                        onChange={(e) => setHireDate(e.target.value)}
                        className={`${inputBase} tabular ${inputOk}`}
                      />
                      {calculatedExperienceYears && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-4)]">
                          Service time: {calculatedExperienceYears} years, calculated automatically.
                        </p>
                      )}
                    </div>
                  </Field>

                  <Field label="CV (PDF)" icon="file">
                    <FileButton
                      name={form.cv}
                      placeholder="Upload CV"
                      onPick={(n) => set('cv', n)}
                      onClear={() => set('cv', '')}
                    />
                  </Field>
                </div>
              </Section>
              </motion.div>

              {/* ── panel 1 · Official Documents ── */}
              <motion.div
                ref={(el) => { panelRefs.current[1] = el; }}
                style={{ width: panelW || '100%' }}
                animate={{ opacity: step === 1 ? 1 : 0.4, scale: step === 1 ? 1 : 0.985 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <Section idx="02" eyebrow="Section B" title="Official Documents" subtitle="A file and an expiry date for each." icon="doc">
                {OFFICIAL_DOCS.map((d) => (
                  <DocRow
                    key={d.key}
                    label={d.label}
                    value={form.docs[d.key]}
                    placeholder={d.placeholder}
                    onFile={(n) => setDoc('docs', d.key, { name: n })}
                    onClear={() => setDoc('docs', d.key, { name: '' })}
                    onExpiry={(v) => setDoc('docs', d.key, { issueDate: v })}
                  />
                ))}
              </Section>
              </motion.div>

              {/* ── panel 2 · Mandatory Safety Trainings ── */}
              <motion.div
                ref={(el) => { panelRefs.current[2] = el; }}
                style={{ width: panelW || '100%' }}
                animate={{ opacity: step === 2 ? 1 : 0.4, scale: step === 2 ? 1 : 0.985 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <Section idx="03" eyebrow="Section B-2" title="Mandatory Safety Trainings" subtitle="Certificate file + expiry for each course." icon="shield">
                {SAFETY_CERTS.map((c) => (
                  <DocRow
                    key={c.key}
                    label={c.label}
                    hint={c.hint}
                    value={form.safety[c.key]}
                    placeholder={c.placeholder}
                    onFile={(n) => setDoc('safety', c.key, { name: n })}
                    onClear={() => setDoc('safety', c.key, { name: '' })}
                    onExpiry={(v) => setDoc('safety', c.key, { issueDate: v })}
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
            </motion.div>

              {/* ── panel 3 · Review & Save ── */}
              <motion.div
                ref={(el) => { panelRefs.current[3] = el; }}
                style={{ width: panelW || '100%' }}
                animate={{ opacity: step === 3 ? 1 : 0.4, scale: step === 3 ? 1 : 0.985 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="shrink-0 self-start px-1 pb-4 pt-1"
              >
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className="surface rounded-[3px] p-7 lg:p-9"
              >
                <header className="mb-7 flex items-start justify-between gap-3 border-b border-[color:var(--color-rule-soft)] pb-5">
                  <div className="flex items-start gap-3.5">
                    <span className="emp-avatar grid h-11 w-11 shrink-0 place-items-center rounded-[0.8rem]">
                      <FieldIcon id="clipboard" size={20} />
                    </span>
                    <div>
                      <div className="eyebrow">Review</div>
                      <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">Review &amp; Save</h2>
                      <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">Confirm the details, then save the record.</p>
                    </div>
                  </div>
                  <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">04</span>
                </header>
                <div className="flex items-center gap-4">
                  <div className="emp-avatar grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full">
                    {form.photo ? (
                      <img src={form.photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="serif text-[16px] leading-none">{initialsOf(form.fullName)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="display truncate text-[20px] text-[color:var(--color-ink)]">
                      {form.fullName || 'New employee'}
                    </h3>
                    <p className="mt-0.5 truncate text-[12.5px] text-[color:var(--color-ink-3)]">
                      {form.position || '—'} · {form.project || '—'}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-2.5 text-[13px]">
                  <SummaryRow k="Employee No." v={form.employeeNo || '—'} mono />
                  <SummaryRow k="Position" v={form.position || '—'} />
                  <SummaryRow k="Project" v={form.project || '—'} />
                  <SummaryRow
                    k="Company properties"
                    v={receivedCompanyProps.length ? receivedCompanyProps.join(' · ') : 'None selected'}
                  />
                  <SummaryRow k="Experience" v={calculatedExperienceYears ? `${calculatedExperienceYears} yrs` : '—'} />
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
              </motion.div>
            </motion.div>
          </div>

          {/* ── floating glass action bar ── */}
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
                onClick={onSave}
                className="emp-btn-primary group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white"
              >
                {isEdit ? 'Save changes' : 'Save employee'}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                  ✓
                </span>
              </button>
            )}
          </div>
            </div>

            {/* ── live employee preview ── */}
            <motion.aside
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="sticky top-[4.75rem] w-[330px] shrink-0"
            >
              <PreviewCard
                form={form}
                basicsDone={basicsDone}
                docsDone={docsDone}
                safetyDone={safetyDone}
                completion={completion}
                isReady={isReady}
              />
            </motion.aside>
          </div>
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
  icon,
  children,
}: {
  idx: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: string;
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
        <div className="flex items-start gap-3.5">
          {icon && (
            <span className="emp-avatar grid h-11 w-11 shrink-0 place-items-center rounded-[0.8rem]">
              <FieldIcon id={icon} size={20} />
            </span>
          )}
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="display mt-2 text-[22px] text-[color:var(--color-ink)]">{title}</h2>
            {subtitle && <p className="mt-1.5 text-[13px] text-[color:var(--color-ink-3)]">{subtitle}</p>}
          </div>
        </div>
        <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">{idx}</span>
      </header>
      {children}
    </motion.section>
  );
}

/** A small stroked glyph that leads a field label or badges a section header,
 *  so every input and section reads at a glance. */
function FieldIcon({ id, size = 14 }: { id: string; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'shrink-0',
  };
  switch (id) {
    case 'user':
      return (<svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>);
    case 'id':
      return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 16c.4-1.4 1.6-2.2 3-2.2s2.6.8 3 2.2M14 9.5h4M14 13h4" /></svg>);
    case 'mail':
      return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
    case 'phone':
      return (<svg {...p}><path d="M15.5 13.4l-2 .8a9 9 0 0 1-4.7-4.7l.8-2L8 4H5a1 1 0 0 0-1 1 15 15 0 0 0 15 15 1 1 0 0 0 1-1v-3z" /></svg>);
    case 'tag':
      return (<svg {...p}><path d="M3 12l8.5-8.5H20V12l-8.5 8.5z" /><circle cx="15.5" cy="8.5" r="1.3" /></svg>);
    case 'briefcase':
      return (<svg {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></svg>);
    case 'award':
      return (<svg {...p}><circle cx="12" cy="9" r="6" /><path d="M9 13.4 7.4 22l4.6-2.7 4.6 2.7L15 13.4" /></svg>);
    case 'calendar':
      return (<svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>);
    case 'file':
      return (<svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>);
    case 'doc':
      return (<svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>);
    case 'shield':
      return (<svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>);
    case 'clipboard':
      return (<svg {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v2H9z" /><path d="M9 13l2 2 4-4" /></svg>);
    default:
      return null;
  }
}

function Field({
  label,
  icon,
  required = false,
  error,
  valid = false,
  children,
}: {
  label: string;
  icon?: string;
  required?: boolean;
  error?: string | undefined;
  /** Shows a small copper check next to the label once the value passes. */
  valid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center text-[12.5px] font-medium text-[color:var(--color-ink)]">
        {icon && <span className="mr-1.5 inline-flex text-[color:var(--color-ink-3)]"><FieldIcon id={icon} /></span>}
        {label}
        {required && <span className="ml-0.5 text-[color:var(--color-sgs)]">*</span>}
        {valid && !error && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            className="ml-auto grid h-4 w-4 place-items-center rounded-full bg-[color:var(--color-sgs)]/14 text-[color:var(--color-sgs-ink)]"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l5 5L20 7" />
            </svg>
          </motion.span>
        )}
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

/** Circular profile-photo picker — click or drag an image, previewed instantly
 *  via FileReader (frontend-only; production wiring uploads to Supabase
 *  Storage and stores the resulting signed URL, per §3). Falls back to the
 *  employee's initials until a photo is chosen. */
function PhotoUpload({
  photo,
  initials,
  onPick,
  onClear,
}: {
  photo: string;
  initials: string;
  onPick: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const open = () => ref.current?.click();

  const readFile = (f: File) => {
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onPick(reader.result);
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="group relative shrink-0">
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) readFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={open}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) readFile(f);
        }}
        aria-label={photo ? 'Replace profile photo' : 'Upload profile photo'}
        className={`emp-avatar relative grid h-[76px] w-[76px] place-items-center overflow-hidden rounded-full border-2 transition-all ${
          dragging
            ? 'border-[color:var(--color-sgs)] ring-4 ring-[color:var(--color-sgs)]/16'
            : photo
              ? 'border-[color:var(--color-paper)]'
              : 'border-dashed border-[color:var(--color-rule)] bg-[color:var(--color-paper-3)]'
        }`}
        style={!photo ? { background: 'var(--color-paper-3)', boxShadow: 'none' } : undefined}
      >
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="serif text-[22px] leading-none text-[color:var(--color-ink-3)]">{initials}</span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-[oklch(0.15_0.01_55)]/55 text-white group-hover:flex">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h3l2-2h6l2 2h3v13H4z" />
            <circle cx="12" cy="13.5" r="3.5" />
          </svg>
        </span>
      </button>
      {photo && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove profile photo"
          className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink-3)] shadow-[var(--shadow-1)] transition-colors hover:text-[oklch(0.55_0.17_28)]"
        >
          ×
        </button>
      )}
    </div>
  );
}

/** A file drop-zone that also reads as a clean button: click anywhere or drag
 *  a file onto it. Shows an attached-file chip with Replace / Remove once set. */
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
  const [dragging, setDragging] = useState(false);
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

  if (name) {
    return (
      <div className="emp-filebox flex items-center gap-2.5 rounded-[0.85rem] border border-[color:var(--color-rule-soft)] px-3 py-2">
        {input}
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-[color:var(--color-ink)]">{name}</span>
          <span className="mono block text-[9px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">Attached</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
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
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={open}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onPick(f.name);
      }}
      className={`emp-filebox group flex cursor-pointer items-center gap-2.5 rounded-[0.85rem] border border-dashed px-3 py-2 transition-colors ${
        dragging ? 'is-dragging' : 'border-[color:var(--color-rule)] hover:border-[color:var(--color-sgs)]/60'
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
        <span className="block truncate text-[12.5px] text-[color:var(--color-ink-2)]">{placeholder}</span>
        <span className="mono block text-[9px] tracking-[0.12em] text-[color:var(--color-ink-4)] uppercase">
          Click or drop · PDF JPG PNG
        </span>
      </span>
      <span className="shrink-0 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-ink)] transition-colors group-hover:border-[color:var(--color-ink)]">
        Browse
      </span>
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
          value={value.issueDate}
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

/** Sticky right column: a live "employee card" that assembles itself as the
 *  form is filled — avatar monogram, completion ring, per-section checklist. */
function PreviewCard({
  form,
  basicsDone,
  docsDone,
  safetyDone,
  completion,
  isReady,
}: {
  form: FormState;
  basicsDone: number;
  docsDone: number;
  safetyDone: number;
  completion: number;
  isReady: boolean;
}) {
  const rows = [
    { label: 'Basic information', done: basicsDone, total: REQUIRED_KEYS.length },
    { label: 'Official documents', done: docsDone, total: OFFICIAL_DOCS.length },
    { label: 'Safety certificates', done: safetyDone, total: SAFETY_CERTS.length },
  ];
  return (
    <div className="surface overflow-hidden rounded-[3px]">
      {/* copper mesh band */}
      <div className="emp-preview-band relative h-[88px]">
        <span className="mono absolute left-6 top-4 text-[9.5px] tracking-[0.24em] text-[color:var(--color-sgs-ink)] uppercase">
          Live preview
        </span>
      </div>

      <div className="px-6 pb-6">
        {/* `relative` lifts this row above the positioned band so the avatar
            overlaps it instead of being painted underneath. */}
        <div className="relative -mt-9 flex items-end justify-between">
          <div className="emp-avatar grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full">
            {form.photo ? (
              <img src={form.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="serif text-[24px] leading-none">{initialsOf(form.fullName)}</span>
            )}
          </div>
          <span
            className={`mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] tracking-[0.14em] uppercase ${
              isReady
                ? 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]'
                : 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-3)]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isReady ? 'bg-[color:var(--color-sgs)]' : 'bg-[color:var(--color-ink-4)]'}`} />
            {isReady ? 'Ready' : 'Draft'}
          </span>
        </div>

        <h3 className="display mt-4 truncate text-[19px] leading-tight text-[color:var(--color-ink)]">
          {form.fullName || 'New Employee'}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-3)]">
          <span className="truncate">{form.position || 'Position'}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{form.project || 'Project'}</span>
          {form.grade && (
            <span className="mono ml-auto inline-grid h-5 w-5 shrink-0 place-items-center rounded-[0.35rem] bg-[color:var(--color-ink)] text-[10px] font-bold text-[color:var(--color-paper)]">
              {form.grade}
            </span>
          )}
        </p>

        {/* completion ring */}
        <div className="mt-5 flex items-center gap-4 rounded-[1.1rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/60 p-4">
          <CompletionRing pct={completion} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[color:var(--color-ink)]">Profile completion</div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-[color:var(--color-ink-3)]">
              Documents flow into the Alerts page automatically.
            </p>
          </div>
        </div>

        {/* per-section checklist */}
        <ul className="mt-5 space-y-3.5">
          {rows.map((r) => {
            const full = r.done === r.total;
            return (
              <li key={r.label}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-[color:var(--color-ink-2)]">
                    {full && (
                      <motion.span
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                        className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[color:var(--color-sgs)] text-white"
                      >
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12l5 5L20 7" />
                        </svg>
                      </motion.span>
                    )}
                    {r.label}
                  </span>
                  <span className="tabular text-[color:var(--color-ink)]">
                    {r.done}/{r.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[color:var(--color-paper-3)]">
                  <motion.div
                    className="h-full rounded-full bg-[color:var(--color-sgs)]"
                    animate={{ width: `${(r.done / r.total) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-[color:var(--color-rule-soft)] pt-4">
          <span className="mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">Employee No.</span>
          <span className="tabular text-[13px] font-medium text-[color:var(--color-ink)]">{form.employeeNo || '—'}</span>
        </div>
      </div>
    </div>
  );
}

/** Animated copper donut showing overall form completeness. */
function CompletionRing({ pct }: { pct: number }) {
  const R = 28;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative grid h-[72px] w-[72px] shrink-0 place-items-center">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={R} fill="none" stroke="var(--color-paper-3)" strokeWidth="6" />
        <motion.circle
          cx="36"
          cy="36"
          r={R}
          fill="none"
          stroke="var(--color-sgs)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - pct / 100) }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
        />
      </svg>
      <span className="tabular absolute text-[14px] font-semibold text-[color:var(--color-ink)]">{pct}%</span>
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
