import type { CompanyPropertyKey, DocKey, DocState, FormState, Grade, OrgGroup, Position, RailItem, SafetyKey, Shift } from './EmployeeForm.types';

export const POSITIONS: readonly Position[] = [
  'Assistant',
  'Operator',
  'Supervisor',
  'Base Manager',
  'Tool Man',
  'Gauge Engineer',
  'Mechanic',
  'HSE Advisor',
];
export const PROJECTS = ['OQ', 'Oxy Oman'] as const;

/** The field runs 8 operational units (per the site org sheet): each unit
 *  fields a DAY crew and a NIGHT crew on 6–6 twelve-hour shifts, an
 *  Operator leading two Assistants. Unit membership is OPTIONAL on the
 *  employee record — base/support roles carry none. */
export const UNITS: ReadonlyArray<string> = Array.from({ length: 8 }, (_, i) => `Unit ${i + 1}`);

/** The base runs two 12-hour shifts on a 6–6 rotation (mirrors Team.logic's
 *  SHIFT_WINDOW). OPTIONAL on the employee record — every role can carry one. */
export const SHIFTS: ReadonlyArray<{ key: Shift; label: string; window: string; glyph: string }> = [
  { key: 'day', label: 'Day', window: '06:00 – 18:00', glyph: '☀' },
  { key: 'night', label: 'Night', window: '18:00 – 06:00', glyph: '☾' },
];

/** Site org grouping, independent of unit membership — the base's other two
 *  arms alongside the field units. OPTIONAL on the employee record. */
export const ORG_GROUPS: ReadonlyArray<{ value: OrgGroup; hint: string }> = [
  { value: 'Field Operations', hint: 'Staffs one of the 8 operational units.' },
  { value: 'Base', hint: 'Base team — run by the supervisors.' },
  { value: 'Support', hint: 'Support pool — Tool Man · Mechanic · Welder.' },
];

/** Only these field-operations roles carry the C → B → A promotion ladder;
 *  every other position is recorded without a grade. */
export const GRADED_POSITIONS = ['Assistant', 'Operator', 'Supervisor'] as const;
export const GRADE_LADDER = ['C', 'B', 'A'] as const; // entry → advanced, left to right
export const GRADE_TIER: Record<Grade, string> = { C: 'Entry', B: 'Intermediate', A: 'Advanced' };

export const OFFICIAL_DOCS: ReadonlyArray<{ key: DocKey; label: string; placeholder: string }> = [
  { key: 'nationalId', label: 'National ID', placeholder: 'id-card.pdf' },
];

// FTW (Fit To Work) leads the mandatory safety block — it's the medical
// clearance every field-operations cert sits behind.
export const SAFETY_CERTS: ReadonlyArray<{ key: SafetyKey; label: string; hint?: string; placeholder: string }> = [
  { key: 'ftw', label: 'FTW (Fit To Work)', hint: 'Fitness-to-work medical', placeholder: 'ftw.pdf' },
  { key: 'hse', label: 'HSE', placeholder: 'hse.pdf' },
  { key: 'h2s', label: 'H2S', placeholder: 'h2s.pdf' },
  { key: 'ddLight', label: 'DD — Light', hint: 'Defensive Driving', placeholder: 'dd-light.pdf' },
  { key: 'ddHeavy', label: 'DD — Heavy', hint: 'Defensive Driving', placeholder: 'dd-heavy.pdf' },
  { key: 'ifr', label: 'IFR', placeholder: 'ifr.pdf' },
  { key: 'fa', label: 'FA', hint: 'First Aid', placeholder: 'fa.pdf' },
];

export const COMPANY_PROPERTIES: ReadonlyArray<{ key: CompanyPropertyKey; label: string }> = [
  { key: 'car', label: 'Car' },
  { key: 'fuelCard', label: 'Fuel Card' },
  { key: 'blueKey', label: 'Blue Key' },
  { key: 'companyMobile', label: 'Company Mobile' },
  { key: 'companyLaptop', label: 'Company Laptop' },
];

export const emptyDocs = (): Record<DocKey, DocState> => ({
  nationalId: { name: '', issueDate: '' },
});

export const emptySafety = (): Record<SafetyKey, DocState> => ({
  ftw: { name: '', issueDate: '' },
  hse: { name: '', issueDate: '' },
  h2s: { name: '', issueDate: '' },
  ddLight: { name: '', issueDate: '' },
  ddHeavy: { name: '', issueDate: '' },
  ifr: { name: '', issueDate: '' },
  fa: { name: '', issueDate: '' },
});

export const emptyCompanyProps = (): Record<CompanyPropertyKey, boolean> => ({
  car: false,
  fuelCard: false,
  blueKey: false,
  companyMobile: false,
  companyLaptop: false,
});

export const blankForm = (): FormState => ({
  fullName: '',
  employeeNo: '',
  email: '',
  mobile: '',
  position: '',
  project: '',
  unit: '',
  shift: '',
  orgGroup: '',
  grade: '',
  hireDate: '',
  experienceYears: '',
  cv: '',
  photo: '',
  companyProps: emptyCompanyProps(),
  docs: emptyDocs(),
  safety: emptySafety(),
});

// Pre-filled record used when the page is opened in edit mode. In production
// this is fetched by id and validated at the trust boundary (§2/§3); here it
// stands in for that shape so the edit experience is real.
export const SAMPLE_EMPLOYEE: FormState = {
  fullName: 'Madelyn Philips',
  employeeNo: '10241',
  email: 'madelyn@sgs.com',
  mobile: '9123 4567',
  position: 'Operator',
  project: 'OQ',
  unit: 'Unit 3',
  shift: 'day',
  orgGroup: 'Field Operations',
  grade: 'B',
  hireDate: '2022-01-24',
  experienceYears: '4.2',
  cv: 'CV.pdf',
  photo: '',
  companyProps: {
    car: true,
    fuelCard: true,
    blueKey: false,
    companyMobile: true,
    companyLaptop: true,
  },
  docs: {
    nationalId: { name: 'id-card.pdf', issueDate: '2025-03-10' },
  },
  safety: {
    ftw: { name: 'ftw.pdf', issueDate: '2024-07-20' },
    hse: { name: 'hse.pdf', issueDate: '2025-02-11' },
    h2s: { name: 'h2s.pdf', issueDate: '2024-09-30' },
    ddLight: { name: 'dd-light.pdf', issueDate: '2024-12-05' },
    ddHeavy: { name: '', issueDate: '' },
    ifr: { name: 'ifr.pdf', issueDate: '2024-08-18' },
    fa: { name: '', issueDate: '' },
  },
};

export const TOTAL_DOCS = OFFICIAL_DOCS.length + SAFETY_CERTS.length;

export const REQUIRED_KEYS = ['fullName', 'employeeNo', 'email', 'position', 'project'] as const;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── shared class fragments ─────────────────────────────────────────── */
  
export const inputBase =
  'w-full rounded-[0.85rem] border bg-[color:var(--color-paper)] px-4 py-3 text-[14px] ' +
  'text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-4)] transition-all ' +
  'focus:outline-none focus:border-[color:var(--color-sgs)] focus:ring-4 focus:ring-[color:var(--color-sgs)]/12';
export const inputOk = 'border-[color:var(--color-rule-soft)]';
export const inputBad = 'border-[oklch(0.6_0.18_28)]';

export const RAIL_ITEMS: RailItem[] = [
  { id: 'home', label: 'Dashboard', to: '/dashboard' },
  { id: 'people', label: 'Employees', to: '/employees', active: true },
  { id: 'book', label: 'Training & Competency', to: '/training' },
  { id: 'shield', label: 'Compliance' },
  { id: 'chart', label: 'Analytics', to: '/dashboard/analytics' },
  { id: 'cog', label: 'Settings' },
];
