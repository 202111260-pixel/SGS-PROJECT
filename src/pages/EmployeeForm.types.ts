// Domain types for the Employee form. Pure shapes — no runtime imports.

export type Position =
  | 'Assistant'
  | 'Operator'
  | 'Supervisor'
  | 'Base Manager'
  | 'Tool Man'
  | 'Gauge Engineer'
  | 'Mechanic'
  | 'HSE Advisor';

export type Grade = 'A' | 'B' | 'C';

/** The base runs two 12-hour shifts on a 6–6 clock. Mirrors Team.logic's
 *  `ShiftKind` — day = 06:00–18:00, night = 18:00–06:00. */
export type Shift = 'day' | 'night';

/** Where the employee sits in the site org sheet, independent of unit:
 *  Field Operations staff the 8 units, Base is run by the supervisors, and
 *  Support is the Tool Man / Mechanic / Welder pool. */
export type OrgGroup = 'Field Operations' | 'Base' | 'Support';

export type DocKey = 'nationalId';
export type SafetyKey = 'ftw' | 'hse' | 'h2s' | 'ddLight' | 'ddHeavy' | 'ifr' | 'fa';
export type CompanyPropertyKey = 'car' | 'fuelCard' | 'blueKey' | 'companyMobile' | 'companyLaptop';

export type DocState = { name: string; issueDate: string };

export type FormState = {
  fullName: string;
  employeeNo: string;
  email: string;
  mobile: string;
  position: Position | '';
  project: string;
  /** Operational unit (the base runs 8) — OPTIONAL; '' = unassigned. */
  unit: string;
  /** Duty shift — OPTIONAL; '' = unset. Day 06:00–18:00 / Night 18:00–06:00. */
  shift: Shift | '';
  /** Site org-sheet grouping — OPTIONAL; '' = unset. */
  orgGroup: OrgGroup | '';
  grade: Grade | '';
  hireDate: string;
  experienceYears: string;
  cv: string;
 
  photo: string;
  companyProps: Record<CompanyPropertyKey, boolean>;
  docs: Record<DocKey, DocState>;
  safety: Record<SafetyKey, DocState>;
};

export type Errors = Partial<Record<'fullName' | 'employeeNo' | 'email' | 'position' | 'project', string>>;

export type RailItem = { id: string; label: string; to?: string; active?: boolean };
