import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { EmployeeShell } from './EmployeeChrome';
import { EMPLOYEES } from './Competency.data';
import { photoOf } from './avatar';
import type { Employee, Grade } from './Competency.types';
import { empNo, hrOf } from './EmployeeDirectory.data';
import { complianceOf, DOC_STATUS_LABEL } from './EmployeeDirectory.logic';
import type { Compliance, DocStatus } from './EmployeeDirectory.logic';

/**
 * EmployeeDirectory — the Employees roster (the wireframe's الموظفون page,
 * rebuilt in English to production grade).
 *
 * Every row is a live projection: the grade and the document verdict are
 * computed by the shared Competency engine (EmployeeDirectory.logic →
 * Competency.logic), never stored, so the directory can never drift from the
 * Training & Competency page. Search + three facet filters narrow the roster;
 * each row opens the full employee profile.
 *
 * Demo roster. Production streams rows from Supabase (RLS-scoped) and parses
 * them with Zod at the trust boundary (charter §2/§3).
 */

type Row = { emp: Employee; c: Compliance; no: string; email: string };

type GradeFilter = 'all' | Grade;
type DocFilter = 'all' | DocStatus;

const DOC_META: Record<DocStatus, { cls: string; dot: string }> = {
  complete: { cls: 'bg-[color:var(--color-sgs)]/12 text-[color:var(--color-sgs-ink)]', dot: 'bg-[color:var(--color-sgs)]' },
  expiring: { cls: 'bg-[oklch(0.68_0.13_70)]/16 text-[oklch(0.5_0.12_70)]', dot: 'bg-[oklch(0.68_0.13_70)]' },
  expired: { cls: 'bg-[oklch(0.55_0.17_28)]/12 text-[oklch(0.55_0.17_28)]', dot: 'bg-[oklch(0.55_0.17_28)]' },
  incomplete: { cls: 'bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-3)]', dot: 'bg-[color:var(--color-ink-4)]' },
};

export default function EmployeeDirectory() {
  const [now] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [project, setProject] = useState<string>('all');
  const [grade, setGrade] = useState<GradeFilter>('all');
  const [doc, setDoc] = useState<DocFilter>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);

  const rows = useMemo<Row[]>(
    () =>
      EMPLOYEES.map((emp) => ({
        emp,
        c: complianceOf(emp, now),
        no: empNo(emp.id),
        email: hrOf(emp.id)?.email ?? '',
      })).sort((a, b) => a.emp.name.localeCompare(b.emp.name)),
    [now],
  );

  const projects = useMemo(() => Array.from(new Set(EMPLOYEES.map((e) => e.project))).sort(), []);

  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (q !== '' && !(`${r.emp.name} ${r.no} ${r.email} ${r.emp.position}`.toLowerCase().includes(q))) return false;
    if (project !== 'all' && r.emp.project !== project) return false;
    if (grade !== 'all' && r.c.grade !== grade) return false;
    if (doc !== 'all' && r.c.docStatus !== doc) return false;
    if (urgentOnly && !r.c.urgent) return false;
    return true;
  });

  // ── roster-wide rollups for the summary strip ──
  const gradeCount = (g: Grade) => rows.filter((r) => r.c.grade === g).length;
  const inDate = rows.filter((r) => r.c.docStatus === 'complete').length;
  const attention = rows.filter((r) => r.c.docStatus === 'expired' || r.c.docStatus === 'incomplete').length;
  const urgentCount = rows.filter((r) => r.c.urgent).length;
  const compliancePct = rows.length ? Math.round((inDate / rows.length) * 100) : 0;

  const filtersActive = q !== '' || project !== 'all' || grade !== 'all' || doc !== 'all' || urgentOnly;
  const clearFilters = () => {
    setQuery('');
    setProject('all');
    setGrade('all');
    setDoc('all');
    setUrgentOnly(false);
  };

  return (
    <EmployeeShell active="Employees">
      {/* ── page header ── */}
      <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mono flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
            <span>SGS Oman</span>
            <span aria-hidden>›</span>
            <span className="text-[color:var(--color-ink)]">Employees</span>
          </div>
          <h1 className="display mt-3 text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.06] text-[color:var(--color-ink)]">
            Employees
          </h1>
          <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-[color:var(--color-ink-2)]">
            The full Upstream field workforce, with each person's grade and document standing computed live from
            the Competency engine. Open any row for the complete record.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2.5 text-[13px] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]">
            <span aria-hidden className="mono">⤓</span> Export roster
          </button>
          <Link
            to="/employees/new"
            className="emp-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            <span aria-hidden className="text-[15px] leading-none">＋</span> Add employee
          </Link>
        </div>
      </div>

      {/* ── summary strip ── */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="Total employees" value={String(rows.length)} sub={`${projects.length} projects`} idx={0} />
        <SummaryCard
          label="Grade distribution"
          value={`${gradeCount('A')} · ${gradeCount('B')} · ${gradeCount('C')}`}
          sub="A · B · C on ladder"
          idx={1}
        />
        <SummaryCard label="Documents in date" value={`${compliancePct}%`} sub={`${inDate} of ${rows.length} clear`} idx={2} accent />
        <SummaryCard label="Need attention" value={String(attention)} sub="expired or incomplete" idx={3} warn={attention > 0} />
        <SummaryCard
          label="Expiring ≤ 2 weeks"
          value={String(urgentCount)}
          sub={urgentOnly ? 'filtering · click to clear' : 'within 14 days · click to filter'}
          idx={4}
          warn={urgentCount > 0}
          active={urgentOnly}
          onClick={urgentCount > 0 || urgentOnly ? () => setUrgentOnly((v) => !v) : undefined}
        />
      </div>

      {/* ── toolbar ── */}
      <div className="mt-5 flex flex-col gap-3 rounded-[1.4rem] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] p-3.5 shadow-[var(--shadow-1)] lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-3)]">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, employee number or email…"
            className="w-full rounded-full border border-[color:var(--color-rule-soft)] py-2.5 pl-10 pr-4 text-[13.5px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-4)] focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center">
          <Facet label="Project" value={project} onChange={setProject} options={[['all', 'All projects'], ...projects.map((p) => [p, p] as const)]} />
          <Facet
            label="Grade"
            value={grade}
            onChange={(v) => setGrade(v as GradeFilter)}
            options={[['all', 'All grades'], ['A', 'Grade A'], ['B', 'Grade B'], ['C', 'Grade C']]}
          />
          <Facet
            label="Documents"
            value={doc}
            onChange={(v) => setDoc(v as DocFilter)}
            options={[['all', 'All documents'], ['complete', 'In date'], ['expiring', 'Expiring'], ['expired', 'Action needed'], ['incomplete', 'Incomplete']]}
          />
        </div>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="shrink-0 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-3.5 py-2 text-[12.5px] text-[color:var(--color-ink-2)] transition-colors hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── table ── */}
      <section className="surface mt-4 overflow-hidden rounded-[1.4rem]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <thead className="dir-head">
              <tr className="border-b border-[color:var(--color-rule-soft)]">
                <Th>Employee</Th>
                <Th>No.</Th>
                <Th>Email</Th>
                <Th>Position</Th>
                <Th>Project</Th>
                <Th center>Grade</Th>
                <Th>Documents</Th>
                <Th right>{''}</Th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {shown.map((r, i) => (
                  <motion.tr
                    key={r.emp.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.015, 0.2) }}
                    className="dir-row border-b border-[color:var(--color-rule-soft)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/employees/${r.emp.id}`} className="flex items-center gap-3 group">
                        <span className="emp-avatar grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-[12px] font-semibold">
                          <img src={photoOf(r.emp.name)} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-medium text-[color:var(--color-ink)] group-hover:text-[color:var(--color-sgs-ink)]">
                            {r.emp.name}
                          </span>
                          <span className="mono block text-[9px] tracking-[0.14em] text-[color:var(--color-ink-4)] uppercase">
                            {hrOf(r.emp.id)?.base ?? 'SGS Oman'}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3 text-[13px] text-[color:var(--color-ink-2)]">{r.no}</td>
                    <td className="px-4 py-3 text-[12.5px] text-[color:var(--color-ink-2)]">{r.email}</td>
                    <td className="px-4 py-3 text-[13px] text-[color:var(--color-ink)]">{r.emp.position}</td>
                    <td className="px-4 py-3">
                      <span className="mono rounded-full border border-[color:var(--color-rule-soft)] px-2.5 py-1 text-[10px] tracking-[0.12em] text-[color:var(--color-ink-2)] uppercase">
                        {r.emp.project}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <GradeBadge grade={r.c.grade} />
                    </td>
                    <td className="px-4 py-3">
                      <DocChip status={r.c.docStatus} held={r.c.held} required={r.c.required} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/employees/${r.emp.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-3.5 py-1.5 text-[12px] font-medium text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
                      >
                        View
                        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {shown.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--color-paper-3)] text-[color:var(--color-ink-3)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
            <p className="mt-4 text-[14px] font-medium text-[color:var(--color-ink)]">No employees match these filters</p>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-3)]">Try a different search, or clear the filters to see the whole roster.</p>
            {filtersActive && (
              <button onClick={clearFilters} className="mt-4 rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-4 py-2 text-[12.5px] text-[color:var(--color-ink)] hover:border-[color:var(--color-ink)]">
                Clear filters
              </button>
            )}
          </div>
        )}

        {shown.length > 0 && (
          <div className="mono flex items-center justify-between border-t border-[color:var(--color-rule-soft)] px-4 py-3 text-[10px] tracking-[0.14em] text-[color:var(--color-ink-4)] uppercase">
            <span>
              Showing {shown.length} of {rows.length}
            </span>
            <span>Grades &amp; documents computed live · demo roster</span>
          </div>
        )}
      </section>
    </EmployeeShell>
  );
}

/* ── building blocks ─────────────────────────────────────────────────── */

function Th({ children, center = false, right = false }: { children: React.ReactNode; center?: boolean; right?: boolean }) {
  return (
    <th
      className={`mono px-4 py-3 text-[9.5px] font-medium tracking-[0.16em] text-[color:var(--color-ink-3)] uppercase ${
        center ? 'text-center' : right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function GradeBadge({ grade }: { grade: Grade | null }) {
  return (
    <span
      className={`grade-coin mono inline-grid h-8 w-8 place-items-center rounded-[0.6rem] text-[14px] font-bold ${
        grade === null ? 'is-forming' : ''
      }`}
      title={grade === null ? 'Grade forming' : `Grade ${grade}`}
    >
      {grade ?? '—'}
    </span>
  );
}

function DocChip({ status, held, required }: { status: DocStatus; held: number; required: number }) {
  const meta = DOC_META[status];
  return (
    <span className={`mono inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase ${meta.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {DOC_STATUS_LABEL[status]}
      <span className="tabular opacity-70">
        {held}/{required}
      </span>
    </span>
  );
}

function Facet({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-full border border-[color:var(--color-rule-soft)] py-2.5 pl-3.5 pr-9 text-[12.5px] text-[color:var(--color-ink)] focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-3)]">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  idx,
  accent = false,
  warn = false,
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  idx: number;
  accent?: boolean;
  warn?: boolean;
  active?: boolean;
  onClick?: (() => void) | undefined;
}) {
  const anim = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] },
  } as const;
  const body = (
    <>
      <p className="mono text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{label}</p>
      <p
        className={`display mt-1.5 text-[clamp(1.4rem,2vw,1.9rem)] leading-none ${
          warn ? 'text-[oklch(0.55_0.17_28)]' : accent ? 'text-[color:var(--color-sgs-ink)]' : 'text-[color:var(--color-ink)]'
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-[color:var(--color-ink-3)]">{sub}</p>
    </>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        {...anim}
        className={`surface block w-full rounded-[1.1rem] px-4 py-3.5 text-left transition-shadow hover:shadow-[var(--shadow-1)] ${
          active ? 'ring-2 ring-[color:var(--color-sgs)]' : ''
        }`}
      >
        {body}
      </motion.button>
    );
  }

  return (
    <motion.div {...anim} className="surface rounded-[1.1rem] px-4 py-3.5">
      {body}
    </motion.div>
  );
}
