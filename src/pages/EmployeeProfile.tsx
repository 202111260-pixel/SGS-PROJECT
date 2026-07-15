import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { EmployeeShell } from './EmployeeChrome';
import { EMPLOYEES, EXP_YEARS_FOR, GRADE_ORDER, ROLE_MATRIX, START_GRADE, TIER_LABEL, TIERS_FOR } from './Competency.data';
import {
  computeGrade,
  daysUntil,
  experienceLevel,
  fmtDate,
  gi,
  initialsOf,
  isHeld,
  plainViews,
  trainingLevel,
  yearsSince,
} from './Competency.logic';
import type { CertStatus, CertView, Grade } from './Competency.types';
import { empNo, hrOf } from './EmployeeDirectory.data';

/**
 * EmployeeProfile — the full record for one employee (/employees/:id).
 *
 * A single, quiet, editorial page: an identity hero on a copper mesh, then a
 * two-column body — competency + certificates + document standing on the left,
 * contact / employment / assets on the right — closed by a certificate history
 * timeline. Every grade, axis and status is computed by the shared Competency
 * engine, so the profile can never disagree with the roster or the engine page.
 *
 * Demo record. In production the employee is fetched by id from Supabase under
 * RLS and parsed with Zod before any of this renders (charter §2/§3).
 */

const STATUS_META: Record<CertStatus, { label: string; cls: string; dot: string; stroke: string }> = {
  valid: { label: 'Valid', cls: 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]', dot: 'bg-[color:var(--color-sgs)]', stroke: 'var(--color-sgs)' },
  expiring: { label: 'Expiring', cls: 'bg-[oklch(0.68_0.13_70)]/16 text-[oklch(0.5_0.12_70)]', dot: 'bg-[oklch(0.68_0.13_70)]', stroke: 'oklch(0.68 0.13 70)' },
  expired: { label: 'Expired', cls: 'bg-[oklch(0.55_0.17_28)]/12 text-[oklch(0.55_0.17_28)]', dot: 'bg-[oklch(0.55_0.17_28)]', stroke: 'oklch(0.55 0.17 28)' },
  missing: { label: 'Missing', cls: 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-3)]', dot: 'bg-[color:var(--color-ink-4)]', stroke: 'var(--color-ink-4)' },
};

export default function EmployeeProfile() {
  const { id } = useParams();
  const [now] = useState(() => new Date());

  const emp = useMemo(() => {
    if (!id) return undefined;
    return EMPLOYEES.find((e) => e.id === id || e.id === `e-${id}` || empNo(e.id) === id);
  }, [id]);

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
  const views: CertView[] = plainViews(emp.position, emp.certs, now);

  const counts: Record<CertStatus, number> = { valid: 0, expiring: 0, expired: 0, missing: 0 };
  for (const v of views) counts[v.status] += 1;
  const held = counts.valid + counts.expiring;
  const heldPct = required.length ? held / required.length : 0;

  const trainingLv = trainingLevel(views);
  const expLv = experienceLevel(years);
  const startGrade = START_GRADE[emp.position];
  const grade = computeGrade(trainingLv, expLv, startGrade);

  const next: Grade | null = grade === null ? 'C' : GRADE_ORDER[gi(grade) + 1] ?? null;
  const gapCerts = next ? views.filter((v) => TIERS_FOR[next].includes(v.training.tier) && !isHeld(v.status)) : [];
  const needYears = next ? EXP_YEARS_FOR[next] : 0;
  const monthsRemaining = next ? Math.max(0, Math.ceil((needYears - years) * 12)) : 0;
  const eligible = next !== null && gapCerts.length === 0 && monthsRemaining === 0;

  const limiting: 'training' | 'experience' | 'balanced' =
    trainingLv === null ? 'training' : gi(trainingLv) < gi(expLv) ? 'training' : gi(expLv) < gi(trainingLv) ? 'experience' : 'balanced';

  const timeline = views
    .filter((v): v is CertView & { rec: NonNullable<CertView['rec']> } => v.rec !== null)
    .sort((a, b) => b.rec.issued.localeCompare(a.rec.issued));

  const nextExpiry = views
    .filter((v): v is CertView & { rec: NonNullable<CertView['rec']> } => v.rec !== null && v.status !== 'expired')
    .sort((a, b) => a.rec.expiry.localeCompare(b.rec.expiry))[0];

  return (
    <EmployeeShell active="Employees">
      {/* breadcrumb */}
      <div className="mono flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
        <Link to="/employees" className="transition-colors hover:text-[color:var(--color-ink)]">
          Employees
        </Link>
        <span aria-hidden>›</span>
        <span className="text-[color:var(--color-ink)]">{emp.name}</span>
      </div>

      {/* ══ HERO ══ */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="profile-hero mt-4 rounded-[1.6rem] p-6 sm:p-8 lg:p-10"
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* identity */}
          <div className="flex items-start gap-5 sm:gap-6">
            <div className="profile-avatar grid h-20 w-20 shrink-0 place-items-center rounded-full sm:h-24 sm:w-24">
              <span className="serif text-[30px] leading-none sm:text-[36px]">{initialsOf(emp.name)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-sgs)]/12 px-2.5 py-1 text-[9.5px] tracking-[0.16em] text-[color:var(--color-sgs-ink)] uppercase">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-sgs)]" />
                  Active
                </span>
                <span className="mono rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]/60 px-2.5 py-1 text-[9.5px] tracking-[0.14em] text-[color:var(--color-ink-2)] uppercase">
                  No. {empNo(emp.id)}
                </span>
              </div>
              <h1 className="display mt-3 text-[clamp(1.9rem,3.4vw,2.8rem)] leading-[1.04] text-[color:var(--color-ink)]">
                {emp.name}
              </h1>
              <p className="mt-1.5 text-[14px] text-[color:var(--color-ink-2)]">
                {emp.position} <span className="text-[color:var(--color-ink-4)]">·</span> {emp.project}
                {hr && (
                  <>
                    {' '}
                    <span className="text-[color:var(--color-ink-4)]">·</span> {hr.base}
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <HeroFact label="Nationality" value={hr?.nationality ?? '—'} />
                <HeroFact label="Contract" value={hr?.contract ?? '—'} />
                <HeroFact label="Time in position" value={`${years.toFixed(1)} yrs`} />
                <HeroFact label="Entry grade" value={startGrade} />
              </div>
            </div>
          </div>

          {/* grade + compliance */}
          <div className="flex items-center gap-6 lg:flex-col lg:items-end">
            <GradeEmblem grade={grade} pct={heldPct} />
            <div className="text-left lg:text-right">
              <p className="mono text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">Documents in date</p>
              <p className="display mt-1 text-[1.7rem] leading-none text-[color:var(--color-ink)]">
                {held}
                <span className="text-[color:var(--color-ink-4)]">/{required.length}</span>
              </p>
              {nextExpiry ? (
                <p className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-3)]">
                  Next renewal {fmtDate(nextExpiry.rec.expiry)}
                </p>
              ) : (
                <p className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-3)]">No certificates on file</p>
              )}
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="mt-8 flex flex-wrap items-center gap-2.5 border-t border-[color:var(--color-rule-soft)] pt-6">
          <Link
            to={`/employees/${emp.id}/edit`}
            className="emp-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Edit record
          </Link>
          <Link
            to="/training"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
            Competency engine
          </Link>
          <a
            href={hr ? `mailto:${hr.email}` : '#'}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16v14H4z" />
              <path d="m4 6 8 6 8-6" />
            </svg>
            Message
          </a>
          <button className="ml-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]">
            <span aria-hidden className="mono">⤓</span> Export profile
          </button>
        </div>
      </motion.section>

      {/* ══ BODY ══ */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── left column ── */}
        <div className="flex flex-col gap-4">
          {/* competency */}
          <Card eyebrow="Competency" title="Grade — two axes, one rule" idx="01">
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="flex flex-col items-center gap-3">
                <GradeEmblem grade={grade} pct={heldPct} large />
                <span className="mono text-[9px] tracking-[0.2em] text-[color:var(--color-ink-3)] uppercase">
                  {grade === null ? 'Forming' : 'Computed grade'}
                </span>
              </div>
              <div className="space-y-5">
                <AxisBar
                  label="① Training"
                  value={trainingLv}
                  detail={`${held}/${required.length} in date`}
                  pct={heldPct * 100}
                />
                <AxisBar
                  label="② Experience"
                  value={expLv}
                  detail={`${years.toFixed(1)} yrs`}
                  pct={Math.min(100, (years / 3) * 100)}
                  markers
                />
                <p className="text-[12.5px] leading-relaxed text-[color:var(--color-ink-2)]">
                  {grade === null ? (
                    <>Grade still forming — the basic training tier must be complete to enter at {startGrade}.</>
                  ) : limiting === 'training' ? (
                    <>
                      Held at <b>{grade}</b> by the <b>training</b> axis — certificates decide the next move.
                    </>
                  ) : limiting === 'experience' ? (
                    <>
                      Held at <b>{grade}</b> by <b>time in position</b> — the certificates are already ahead.
                    </>
                  ) : gi(grade) === 2 ? (
                    <>Peak grade for this role. Keeping certificates in date holds it.</>
                  ) : (
                    <>
                      Both axes agree on <b>{grade}</b> — advancing either one moves the grade up.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* runway */}
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.1rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/50 px-4 py-3.5">
              {eligible && next ? (
                <>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--color-sgs)] text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12l5 5L20 7" />
                    </svg>
                  </span>
                  <span className="text-[12.5px] text-[color:var(--color-ink)]">
                    <b>Eligible for promotion to {next}</b> — both axes met, ready for supervisor sign-off.
                  </span>
                </>
              ) : next === null ? (
                <span className="text-[12.5px] text-[color:var(--color-ink-2)]">Top of the ladder — the engine now watches expiry dates.</span>
              ) : (
                <span className="text-[12.5px] text-[color:var(--color-ink-2)]">
                  To reach <b>{next}</b>:{' '}
                  {gapCerts.length > 0 && (
                    <>
                      {gapCerts.length} certificate{gapCerts.length === 1 ? '' : 's'}
                      {monthsRemaining > 0 ? ' and ' : ''}
                    </>
                  )}
                  {monthsRemaining > 0 && (
                    <>
                      {monthsRemaining} more month{monthsRemaining === 1 ? '' : 's'} in position
                    </>
                  )}
                  .
                </span>
              )}
            </div>
          </Card>

          {/* certificates */}
          <Card
            eyebrow="Certificates & training"
            title={`${required.length} required for ${emp.position}`}
            idx="02"
            action={
              <div className="flex flex-wrap items-center gap-1.5">
                {(['valid', 'expiring', 'expired', 'missing'] as const).map((s) =>
                  counts[s] > 0 ? (
                    <span key={s} className={`mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase ${STATUS_META[s].cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
                      {counts[s]} {STATUS_META[s].label}
                    </span>
                  ) : null,
                )}
              </div>
            }
          >
            <ul className="divide-y divide-[color:var(--color-rule-soft)]">
              {views.map((v) => (
                <CertRow key={v.code} view={v} now={now} />
              ))}
            </ul>
          </Card>

          {/* documents */}
          <Card eyebrow="Documents & compliance" title="Standing at a glance" idx="03">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['valid', 'expiring', 'expired', 'missing'] as const).map((s) => (
                <div key={s} className="rounded-[1rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/40 px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                    <span className="mono text-[9px] tracking-[0.14em] text-[color:var(--color-ink-3)] uppercase">{STATUS_META[s].label}</span>
                  </div>
                  <p className="display mt-1.5 text-[1.6rem] leading-none text-[color:var(--color-ink)]">{counts[s]}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <OfficialDoc label="National ID" meta="On file · verified" ok />
              <OfficialDoc label="Curriculum Vitae" meta="On file" ok />
              <OfficialDoc label="Fit-to-work medical" meta={counts.expired > 0 ? 'Renewal recommended' : 'Current'} ok={counts.expired === 0} />
            </div>
            <p className="mono mt-4 text-[9.5px] tracking-[0.14em] text-[color:var(--color-ink-4)] uppercase">
              Compliance rolls up from the certificate records above · demo data
            </p>
          </Card>
        </div>

        {/* ── right column ── */}
        <div className="flex flex-col gap-4">
          <Card eyebrow="Contact" title="Reach" compact>
            <dl className="space-y-3.5">
              <InfoRow label="Email" value={hr?.email ?? '—'} mono />
              <InfoRow label="Mobile" value={hr?.mobile ?? '—'} mono />
              <InfoRow label="Nationality" value={hr?.nationality ?? '—'} />
              <InfoRow label="Base" value={hr?.base ?? '—'} />
            </dl>
          </Card>

          <Card eyebrow="Employment" title="Service" compact>
            <dl className="space-y-3.5">
              <InfoRow label="Hired" value={fmtDate(emp.hired)} />
              <InfoRow label="Time in position" value={`${years.toFixed(1)} years`} />
              <InfoRow label="Line manager" value={hr?.manager ?? '—'} />
              <InfoRow label="Contract" value={hr?.contract ?? '—'} />
              <InfoRow label="Project" value={emp.project} />
              <InfoRow label="Entry grade" value={startGrade} />
            </dl>
          </Card>

          <Card eyebrow="Company property" title="Issued assets" compact>
            {hr && hr.assets.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {hr.assets.map((a) => (
                  <li
                    key={a}
                    className="mono inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)]/50 px-3 py-1.5 text-[11px] tracking-[0.04em] text-[color:var(--color-ink-2)]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-sgs)]" />
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-[color:var(--color-ink-3)]">No company property issued.</p>
            )}
          </Card>
        </div>
      </div>

      {/* ══ TIMELINE ══ */}
      <Card eyebrow="History" title="Certificate timeline" idx="04" className="mt-4">
        {timeline.length === 0 ? (
          <p className="text-[13px] text-[color:var(--color-ink-3)]">No certificates recorded yet.</p>
        ) : (
          <ol className="relative ml-1.5 space-y-5 pl-6">
            <span aria-hidden className="tl-spine absolute inset-y-1 left-[3px] w-[2px] rounded-full" />
            {timeline.map((v, i) => {
              const meta = STATUS_META[v.status];
              const daysLeft = daysUntil(v.rec.expiry, now);
              return (
                <motion.li
                  key={v.code}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <span aria-hidden className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[color:var(--color-paper)] ${meta.dot}`} />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-[13px] font-medium text-[color:var(--color-ink)]">
                      <span className="mono mr-2 text-[color:var(--color-sgs-ink)]">{v.code}</span>
                      {v.training.name}
                    </span>
                    <span className={`mono inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] tracking-[0.12em] uppercase ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="tabular mt-1 text-[11.5px] text-[color:var(--color-ink-3)]">
                    Issued {fmtDate(v.rec.issued)} · Expires {fmtDate(v.rec.expiry)}
                    {v.status !== 'expired' && <> · {daysLeft}d remaining</>}
                    {v.status === 'expired' && <> · lapsed {Math.abs(daysLeft)}d ago</>}
                  </p>
                </motion.li>
              );
            })}
          </ol>
        )}
      </Card>

      <p className="mono mt-6 text-[10px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">
        Demo record · grades and standings computed client-side — production reads the employee from Supabase under RLS
      </p>
    </EmployeeShell>
  );
}

/* ── building blocks ─────────────────────────────────────────────────── */

function Card({
  eyebrow,
  title,
  idx,
  action,
  compact = false,
  className = '',
  children,
}: {
  eyebrow: string;
  title: string;
  idx?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`surface rounded-[1.6rem] ${compact ? 'p-5' : 'p-6 lg:p-7'} ${className}`}
    >
      <header className={`flex items-start justify-between gap-3 ${compact ? 'mb-4' : 'mb-5 border-b border-[color:var(--color-rule-soft)] pb-4'}`}>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          {!compact && <h2 className="display mt-2 text-[19px] text-[color:var(--color-ink)]">{title}</h2>}
          {compact && <h2 className="mt-1.5 text-[15px] font-semibold text-[color:var(--color-ink)]">{title}</h2>}
        </div>
        {action ? action : idx ? <span className="mono text-[11px] tracking-[0.18em] text-[color:var(--color-ink-4)]">{idx}</span> : null}
      </header>
      {children}
    </motion.section>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex flex-col rounded-[0.8rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]/60 px-3 py-1.5">
      <span className="mono text-[8.5px] tracking-[0.16em] text-[color:var(--color-ink-4)] uppercase">{label}</span>
      <span className="mt-0.5 text-[12.5px] font-medium text-[color:var(--color-ink)]">{value}</span>
    </span>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="mono shrink-0 text-[9.5px] tracking-[0.14em] text-[color:var(--color-ink-3)] uppercase">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[12.5px] text-[color:var(--color-ink)] ${mono ? 'mono tabular' : ''}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function OfficialDoc({ label, meta, ok }: { label: string; meta: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[0.9rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[0.55rem] ${ok ? 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]' : 'bg-[oklch(0.68_0.13_70)]/16 text-[oklch(0.5_0.12_70)]'}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium text-[color:var(--color-ink)]">{label}</span>
        <span className="text-[11px] text-[color:var(--color-ink-3)]">{meta}</span>
      </span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-[color:var(--color-sgs)]' : 'bg-[oklch(0.68_0.13_70)]'}`} />
    </div>
  );
}

function AxisBar({
  label,
  value,
  detail,
  pct,
  markers = false,
}: {
  label: string;
  value: Grade | null;
  detail: string;
  pct: number;
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
              value === null ? 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-4)]' : 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)]'
            }`}
          >
            {value ?? '—'}
          </span>
        </span>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--color-paper-3)]">
        <motion.div
          className="h-full rounded-full bg-[color:var(--color-sgs)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        {markers && (
          <>
            <span className="absolute inset-y-0 left-1/3 w-px bg-[color:var(--color-paper)]" />
            <span className="absolute inset-y-0 left-full -ml-px w-px bg-[color:var(--color-paper)]" />
          </>
        )}
      </div>
    </div>
  );
}

/** The copper grade coin the profile is built around — a compliance ring with
 *  the grade letter at its heart. */
function GradeEmblem({ grade, pct, large = false }: { grade: Grade | null; pct: number; large?: boolean }) {
  const size = large ? 132 : 92;
  const r = large ? 58 : 40;
  const sw = large ? 7 : 5.5;
  const c = 2 * Math.PI * r;
  const forming = grade === null;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-3)" strokeWidth={sw} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={forming ? 'var(--color-ink-4)' : 'var(--color-sgs)'}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, pct))) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span
          className={`grade-coin display grid place-items-center rounded-full ${forming ? 'is-forming' : ''}`}
          style={{ width: large ? 76 : 54, height: large ? 76 : 54, fontSize: large ? 36 : 26 }}
        >
          {grade ?? '—'}
        </span>
      </div>
    </div>
  );
}

function CertRow({ view, now }: { view: CertView; now: Date }) {
  const { training, status, rec } = view;
  const meta = STATUS_META[status];
  const daysLeft = rec ? daysUntil(rec.expiry, now) : 0;
  const validityDays = training.validityYears * 365.25;
  const lifePct = rec ? Math.max(0, Math.min(1, daysLeft / validityDays)) : 0;
  const R = 13;
  const C = 2 * Math.PI * R;

  return (
    <li className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <span
        className={`mono grid h-9 w-14 shrink-0 place-items-center rounded-[0.55rem] text-[11px] font-bold tracking-wide ${
          status === 'missing'
            ? 'border border-dashed border-[color:var(--color-rule)] text-[color:var(--color-ink-4)]'
            : status === 'expired'
              ? 'bg-[oklch(0.55_0.17_28)]/12 text-[oklch(0.55_0.17_28)]'
              : 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]'
        }`}
      >
        {training.code}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-[color:var(--color-ink)]">{training.name}</div>
        <div className="mono mt-0.5 text-[8.5px] tracking-[0.14em] text-[color:var(--color-ink-4)] uppercase">
          {TIER_LABEL[training.tier]} tier · {training.validityYears} yr validity
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        {rec ? (
          <>
            <div className="tabular text-[11.5px] text-[color:var(--color-ink-2)]">{fmtDate(rec.expiry)}</div>
            <div className="mono text-[8.5px] tracking-[0.12em] text-[color:var(--color-ink-4)] uppercase">
              {status === 'expired' ? `lapsed ${Math.abs(daysLeft)}d` : `${daysLeft}d left`}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-[color:var(--color-ink-4)]">Not on file</div>
        )}
      </div>
      <span className={`mono inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase ${meta.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      {rec && status !== 'expired' ? (
        <div className="relative hidden h-9 w-9 shrink-0 place-items-center sm:grid" title={`${Math.round(lifePct * 100)}% of validity left`}>
          <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
            <circle cx="18" cy="18" r={R} fill="none" stroke="var(--color-paper-3)" strokeWidth="3.5" />
            <circle
              cx="18"
              cy="18"
              r={R}
              fill="none"
              stroke={meta.stroke}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - lifePct)}
            />
          </svg>
          <span className="tabular absolute text-[8px] font-semibold text-[color:var(--color-ink-2)]">{Math.round(lifePct * 100)}%</span>
        </div>
      ) : (
        <span className="hidden h-9 w-9 shrink-0 sm:block" />
      )}
    </li>
  );
}
