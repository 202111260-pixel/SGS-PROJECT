import type {
  CertRecord,
  CertStatus,
  CertView,
  Employee,
  Grade,
  Position,
  Tier,
  Training,
  TrainingCode,
} from './Competency.types';
import {
  EXPIRING_DAYS,
  GRADE_ORDER,
  MS_YEAR,
  ROLE_MATRIX,
  START_GRADE,
  TRAININGS,
} from './Competency.data';

export function trainingOf(code: TrainingCode): Training {
  const t = TRAININGS.find((x) => x.code === code);
  if (!t) throw new Error(`Unknown training code: ${code}`);
  return t;
}

/* ── the engine (pure functions — move to the server unchanged) ─────── */

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
export function daysUntil(iso: string, now: Date): number {
  return Math.floor((parseISO(iso).getTime() - now.getTime()) / 86_400_000);
}
export function yearsSince(iso: string, now: Date): number {
  return (now.getTime() - parseISO(iso).getTime()) / MS_YEAR;
}
export function fmtDate(iso: string): string {
  return parseISO(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function todayISO(now: Date): string {
  return now.toISOString().slice(0, 10);
}
/** Certificate expiry = issue date + the course's validity window. */
export function addYearsISO(iso: string, years: number): string {
  const d = parseISO(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function statusOf(rec: CertRecord | undefined, now: Date): CertStatus {
  if (!rec) return 'missing';
  const d = daysUntil(rec.expiry, now);
  if (d < 0) return 'expired';
  if (d <= EXPIRING_DAYS) return 'expiring';
  return 'valid';
}

export const isHeld = (s: CertStatus): boolean => s === 'valid' || s === 'expiring';

export function tierComplete(views: ReadonlyArray<CertView>, tier: Tier): boolean {
  return views.filter((v) => v.training.tier === tier).every((v) => isHeld(v.status));
}

/** Training axis: C when required basics are in date, B adds intermediates,
 *  A means every required certificate is in date. null = basics still open. */
export function trainingLevel(views: ReadonlyArray<CertView>): Grade | null {
  if (!tierComplete(views, 'basic')) return null;
  if (!tierComplete(views, 'intermediate')) return 'C';
  return tierComplete(views, 'advanced') ? 'A' : 'B';
}

export function experienceLevel(years: number): Grade {
  return years >= 3 ? 'A' : years >= 1 ? 'B' : 'C';
}

export const gi = (g: Grade): number => GRADE_ORDER.indexOf(g);

/** Grade is certificate-driven: it rises with the training tiers held, floored
 *  at the role's entry grade. Time in position is tracked for context elsewhere
 *  but no longer caps the grade. */
export function computeGrade(training: Grade | null, start: Grade): Grade | null {
  if (training === null) return null;
  const floor = Math.max(gi(training), gi(start));
  return GRADE_ORDER[floor] ?? null;
}

/** Non-simulated resolution of a role's required certs. Used by the recorder's
 *  live grade preview (the engine section builds its own views with sim overrides). */
export function plainViews(
  position: Position,
  certs: Partial<Record<TrainingCode, CertRecord>>,
  now: Date,
): CertView[] {
  return ROLE_MATRIX[position].map((code) => {
    const training = trainingOf(code);
    const rec = certs[code] ?? null;
    return { code, training, status: statusOf(rec ?? undefined, now), rec, simulated: false };
  });
}
export function gradeFromCerts(
  emp: Employee,
  certs: Partial<Record<TrainingCode, CertRecord>>,
  now: Date,
): Grade | null {
  return computeGrade(
    trainingLevel(plainViews(emp.position, certs, now)),
    START_GRADE[emp.position],
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const s = parts.map((w) => w.charAt(0)).join('').toUpperCase();
  return s === '' ? '—' : s;
}
