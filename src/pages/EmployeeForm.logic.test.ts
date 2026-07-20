import { describe, expect, it } from 'vitest';
import {
  calculateCertificateExpiry,
  calculateCertificateRemainingDays,
  calculateServiceYears,
  isOrgGroup,
} from './EmployeeForm.logic';

describe('calculateServiceYears', () => {
  it('calculates service time to one decimal place', () => {
    expect(calculateServiceYears('2024-07-14', new Date('2026-07-14T12:00:00'))).toBe('2.0');
  });

  it('returns an empty value for invalid or future dates', () => {
    const currentDate = new Date('2026-07-14T12:00:00');

    expect(calculateServiceYears('2026-02-30', currentDate)).toBe('');
    expect(calculateServiceYears('2026-07-15', currentDate)).toBe('');
  });
});

describe('isOrgGroup', () => {
  it('accepts the three site org groups', () => {
    expect(isOrgGroup('Field Operations')).toBe(true);
    expect(isOrgGroup('Base')).toBe(true);
    expect(isOrgGroup('Support')).toBe(true);
  });

  it('rejects the empty placeholder and any unknown value', () => {
    expect(isOrgGroup('')).toBe(false);
    expect(isOrgGroup('Field')).toBe(false);
    expect(isOrgGroup('Admin')).toBe(false);
  });
});

describe('certificate validity helpers', () => {
  it('derives a two-year expiry from the issue date', () => {
    expect(calculateCertificateExpiry('2024-07-14')).toBe('2026-07-14');
  });

  it('reports remaining days or overdue status from the derived expiry', () => {
    const currentDate = new Date('2026-07-14T12:00:00');

    expect(calculateCertificateRemainingDays('2024-07-14', currentDate)).toBe('Expires today');
    expect(calculateCertificateRemainingDays('2024-07-15', currentDate)).toBe('1 day left');
    expect(calculateCertificateRemainingDays('2024-07-13', currentDate)).toBe('1 day overdue');
  });
});
