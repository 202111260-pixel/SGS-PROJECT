import type { Errors, FormState, Position } from './EmployeeForm.types';
import { EMAIL_RE, GRADED_POSITIONS } from './EmployeeForm.data';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const CERT_VALIDITY_YEARS = 2;

export function hasGradeLadder(p: Position | ''): boolean {
  return (GRADED_POSITIONS as readonly string[]).includes(p);
}

function parseIsoDate(date: string): Date | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) return null;

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const utcTime = Date.UTC(year, month - 1, day);
  const parsed = new Date(utcTime);

  if (
    !Number.isFinite(utcTime) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addYearsToDate(date: Date, years: number): Date {
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTargetMonth)));
}

export function calculateCertificateExpiry(issueDate: string): string {
  const parsed = parseIsoDate(issueDate);
  if (!parsed) return '';
  return formatIsoDate(addYearsToDate(parsed, CERT_VALIDITY_YEARS));
}

export function calculateCertificateRemainingDays(issueDate: string, currentDate: Date = new Date()): string {
  const expiryDate = parseIsoDate(calculateCertificateExpiry(issueDate));
  if (!expiryDate) return '';

  const today = Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );
  const remainingDays = Math.ceil((expiryDate.getTime() - today) / MILLIS_PER_DAY);

  if (remainingDays < 0) {
    const daysAgo = Math.abs(remainingDays);
    return `${daysAgo} day${daysAgo === 1 ? '' : 's'} overdue`;
  }

  if (remainingDays === 0) {
    return 'Expires today';
  }

  return `${remainingDays} day${remainingDays === 1 ? '' : 's'} left`;
}

export function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.fullName.trim()) e.fullName = 'Full name is required.';
  if (!f.employeeNo.trim()) e.employeeNo = 'Employee number is required.';
  if (!f.email.trim()) e.email = 'Email is required.';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (!f.position) e.position = 'Select a position.';
  if (!f.project) e.project = 'Select a project.';
  return e;
}

/** Calculates completed service time from an ISO join date, rounded to one decimal year. */
export function calculateServiceYears(hireDate: string, currentDate: Date = new Date()): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hireDate);
  const yearPart = parts?.[1];
  const monthPart = parts?.[2];
  const dayPart = parts?.[3];

  if (!yearPart || !monthPart || !dayPart) return '';

  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const start = Date.UTC(year, month - 1, day);
  const startDate = new Date(start);
  const today = Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(today) ||
    startDate.getUTCFullYear() !== year ||
    startDate.getUTCMonth() !== month - 1 ||
    startDate.getUTCDate() !== day ||
    start > today
  ) {
    return '';
  }

  const millisecondsPerYear = 365.2425 * 24 * 60 * 60 * 1000;
  const years = (today - start) / millisecondsPerYear;
  return (Math.round(years * 10) / 10).toFixed(1);
}

/** "MP" from "Madelyn Philips" — the preview card's avatar monogram. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const s = parts.map((w) => w.charAt(0)).join('').toUpperCase();
  return s === '' ? '—' : s;
}
