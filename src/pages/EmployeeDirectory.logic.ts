// Derived, read-only projections over the roster for the directory table and
// the employee profile. Pure functions — they compose the Competency grade
// engine (Competency.logic) with the role's Mandatory Training Matrix so the
// directory and profile always agree with the Competency page, byte-for-byte.

import type { CertStatus, CertView, Employee, Grade } from './Competency.types';
import { gradeFromCerts, plainViews, yearsSince } from './Competency.logic';

/** A single at-a-glance verdict for the "Documents" column / profile badge. */
export type DocStatus = 'complete' | 'expiring' | 'expired' | 'incomplete';

export type Compliance = {
  grade: Grade | null;
  views: CertView[];
  counts: Record<CertStatus, number>;
  /** Certificates in date (valid + expiring). */
  held: number;
  required: number;
  docStatus: DocStatus;
  years: number;
};

/**
 * Resolve an employee's certificates against the role matrix, count each
 * status, and reduce them to one document verdict. Precedence is worst-first:
 * an expired cert outranks a missing one, which outranks an expiring one.
 */
export function complianceOf(emp: Employee, now: Date): Compliance {
  const views = plainViews(emp.position, emp.certs, now);
  const counts: Record<CertStatus, number> = { valid: 0, expiring: 0, expired: 0, missing: 0 };
  for (const v of views) counts[v.status] += 1;

  const held = counts.valid + counts.expiring;
  const required = views.length;
  const years = yearsSince(emp.hired, now);
  const grade = gradeFromCerts(emp, emp.certs, years, now);

  const docStatus: DocStatus =
    counts.expired > 0
      ? 'expired'
      : counts.missing > 0
        ? 'incomplete'
        : counts.expiring > 0
          ? 'expiring'
          : 'complete';

  return { grade, views, counts, held, required, docStatus, years };
}

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  complete: 'In date',
  expiring: 'Expiring',
  expired: 'Action needed',
  incomplete: 'Incomplete',
};
