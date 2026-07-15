import type {
  Employee,
  Grade,
  Position,
  RailItem,
  Tier,
  Training,
  TrainingCode,
} from './Competency.types';

export const GRADE_ORDER: readonly Grade[] = ['C', 'B', 'A'];

export const TIER_LABEL: Record<Tier, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const TRAININGS = [
  { code: 'HSEI', name: 'OPAL HSE Induction', tier: 'basic', validityYears: 2 },
  { code: 'H2SI', name: 'H2S & SO2 Awareness and Escape', tier: 'basic', validityYears: 2 },
  { code: 'AHA', name: 'AHA Heartsaver / First Aid', tier: 'basic', validityYears: 2 },
  { code: 'FWI', name: 'Fire Warden & Fire Extinguisher', tier: 'basic', validityYears: 2 },
  { code: 'PTWS', name: 'Permit to Work Signatories', tier: 'intermediate', validityYears: 2 },
  { code: 'LV', name: 'Defensive Driving — Light Vehicle', tier: 'intermediate', validityYears: 3 },
  { code: 'HV', name: 'Defensive Driving — Heavy Goods Vehicle', tier: 'intermediate', validityYears: 3 },
  { code: 'AGT', name: 'Authorised Gas Tester', tier: 'advanced', validityYears: 2 },
  { code: 'RNB', name: 'Riggers & Banksmen', tier: 'advanced', validityYears: 3 },
  { code: 'OPAL', name: 'Mobile Crane Operator', tier: 'advanced', validityYears: 3 },
  { code: 'IWCF', name: 'IWCF — Well Control', tier: 'advanced', validityYears: 2 },
] as const satisfies ReadonlyArray<Training>;

/** Mandatory Training Matrix — transcribed 1:1 from the approved wireframe. */
export const ROLE_MATRIX: Record<Position, ReadonlyArray<TrainingCode>> = {
  Assistant: ['HSEI', 'H2SI', 'AHA', 'FWI', 'LV', 'HV', 'RNB', 'OPAL'],
  Operator: ['HSEI', 'H2SI', 'AHA', 'FWI', 'PTWS', 'AGT', 'LV', 'RNB', 'OPAL', 'IWCF'],
  Supervisor: ['HSEI', 'H2SI', 'AHA', 'LV'],
  'Base Manager': ['HSEI', 'H2SI', 'AHA', 'LV'],
  'Tool Man': ['HSEI', 'H2SI', 'AHA', 'LV'],
  'Gauge Engineer': ['HSEI', 'H2SI', 'AHA', 'FWI', 'LV'],
  Mechanic: ['HSEI', 'H2SI', 'AHA', 'FWI', 'LV'],
  'HSE Advisor': ['HSEI', 'H2SI', 'AHA', 'FWI', 'AGT', 'LV'],
};

/** Entry grade per the promotion ladders. Assistant, Operator and Supervisor
 *  each span the full C → B → A ladder (entry at C). */
export const START_GRADE: Record<Position, Grade> = {
  Assistant: 'C',
  Operator: 'C',
  Supervisor: 'C',
  'Base Manager': 'B',
  'Tool Man': 'C',
  'Gauge Engineer': 'C',
  Mechanic: 'C',
  'HSE Advisor': 'C',
};

/* ── demo employees (production: fetched + validated at the trust boundary) ── */

export const EMPLOYEES: ReadonlyArray<Employee> = [
  {
    id: 'e-10247',
    name: 'Ahmed Al-Harthy',
    position: 'Operator',
    project: 'OQ',
    hired: '2024-10-01',
    certs: {
      HSEI: { issued: '2025-06-10', expiry: '2027-06-10' },
      H2SI: { issued: '2025-06-12', expiry: '2027-06-12' },
      AHA: { issued: '2024-11-02', expiry: '2026-11-02' },
      FWI: { issued: '2025-01-15', expiry: '2027-01-15' },
      PTWS: { issued: '2025-03-20', expiry: '2027-03-20' },
      LV: { issued: '2024-10-20', expiry: '2027-10-20' },
      AGT: { issued: '2025-08-01', expiry: '2027-08-01' },
      RNB: { issued: '2024-12-01', expiry: '2027-12-01' },
      IWCF: { issued: '2024-09-05', expiry: '2026-09-05' },
      // OPAL not on file — the one certificate between Ahmed and grade A.
    },
  },
  {
    id: 'e-10118',
    name: 'Fatima Al-Balushi',
    position: 'Supervisor',
    project: 'Oxy Oman',
    hired: '2019-05-20',
    certs: {
      HSEI: { issued: '2025-02-11', expiry: '2027-02-11' },
      H2SI: { issued: '2025-04-02', expiry: '2027-04-02' },
      AHA: { issued: '2024-08-20', expiry: '2026-08-20' },
      LV: { issued: '2024-06-15', expiry: '2027-06-15' },
    },
  },
  {
    id: 'e-10391',
    name: 'Khalid Al-Saadi',
    position: 'Assistant',
    project: 'OQ',
    hired: '2026-03-15',
    certs: {
      HSEI: { issued: '2026-03-18', expiry: '2028-03-18' },
      H2SI: { issued: '2026-03-19', expiry: '2028-03-19' },
      FWI: { issued: '2026-04-02', expiry: '2028-04-02' },
      LV: { issued: '2026-05-06', expiry: '2029-05-06' },
      // AHA missing → the basic tier is open, so the grade is still forming.
    },
  },
  {
    id: 'e-10052',
    name: 'Salim Al-Rashdi',
    position: 'Base Manager',
    project: 'OQ',
    hired: '2016-02-10',
    certs: {
      HSEI: { issued: '2025-05-01', expiry: '2027-05-01' },
      H2SI: { issued: '2025-05-02', expiry: '2027-05-02' },
      AHA: { issued: '2025-06-15', expiry: '2027-06-15' },
      LV: { issued: '2024-10-01', expiry: '2027-10-01' },
    },
  },
  {
    id: 'e-10176',
    name: 'Yusuf Al-Amri',
    position: 'Tool Man',
    project: 'Oxy Oman',
    hired: '2021-03-20',
    certs: {
      HSEI: { issued: '2025-03-01', expiry: '2027-03-01' },
      H2SI: { issued: '2025-03-02', expiry: '2027-03-02' },
      AHA: { issued: '2024-08-10', expiry: '2026-08-10' }, // expiring within 90 days
      LV: { issued: '2024-07-20', expiry: '2027-07-20' },
    },
  },
  {
    id: 'e-10233',
    name: 'Nasser Al-Hinai',
    position: 'Gauge Engineer',
    project: 'OQ',
    hired: '2024-01-15',
    certs: {
      HSEI: { issued: '2025-02-01', expiry: '2027-02-01' },
      H2SI: { issued: '2025-02-02', expiry: '2027-02-02' },
      AHA: { issued: '2025-01-10', expiry: '2027-01-10' },
      FWI: { issued: '2025-03-05', expiry: '2027-03-05' },
      LV: { issued: '2024-06-01', expiry: '2027-06-01' },
    },
  },
  {
    id: 'e-10299',
    name: 'Maryam Al-Zadjali',
    position: 'HSE Advisor',
    project: 'Oxy Oman',
    hired: '2020-11-01',
    certs: {
      HSEI: { issued: '2025-04-01', expiry: '2027-04-01' },
      H2SI: { issued: '2025-04-02', expiry: '2027-04-02' },
      AHA: { issued: '2025-05-01', expiry: '2027-05-01' },
      FWI: { issued: '2025-04-10', expiry: '2027-04-10' },
      AGT: { issued: '2023-01-01', expiry: '2025-01-01' }, // expired advanced cert
      LV: { issued: '2024-08-01', expiry: '2027-08-01' },
    },
  },
  {
    id: 'e-10405',
    name: 'Omar Al-Farsi',
    position: 'Mechanic',
    project: 'OQ',
    hired: '2025-09-01',
    certs: {
      HSEI: { issued: '2025-10-01', expiry: '2027-10-01' },
      H2SI: { issued: '2025-10-02', expiry: '2027-10-02' },
      AHA: { issued: '2025-11-01', expiry: '2027-11-01' },
      FWI: { issued: '2025-10-15', expiry: '2027-10-15' },
      LV: { issued: '2025-09-20', expiry: '2028-09-20' },
    },
  },
  {
    id: 'e-10087',
    name: 'Aisha Al-Harthy',
    position: 'Operator',
    project: 'Oxy Oman',
    hired: '2020-06-01',
    certs: {
      HSEI: { issued: '2025-06-01', expiry: '2027-06-01' },
      H2SI: { issued: '2025-06-02', expiry: '2027-06-02' },
      AHA: { issued: '2025-05-20', expiry: '2027-05-20' },
      FWI: { issued: '2025-04-01', expiry: '2027-04-01' },
      PTWS: { issued: '2025-03-01', expiry: '2027-03-01' },
      AGT: { issued: '2025-02-01', expiry: '2027-02-01' },
      LV: { issued: '2024-08-01', expiry: '2027-08-01' },
      RNB: { issued: '2024-09-01', expiry: '2027-09-01' },
      OPAL: { issued: '2024-10-01', expiry: '2027-10-01' },
      IWCF: { issued: '2025-01-01', expiry: '2027-01-01' },
    },
  },
];

export const MS_YEAR = 365.25 * 24 * 60 * 60 * 1000;
export const EXPIRING_DAYS = 90;

export const EXP_YEARS_FOR: Record<Grade, number> = { C: 0, B: 1, A: 3 };
/** Tiers that must be in date to hold a given grade on the training axis. */
export const TIERS_FOR: Record<Grade, ReadonlyArray<Tier>> = {
  C: ['basic'],
  B: ['basic', 'intermediate'],
  A: ['basic', 'intermediate', 'advanced'],
};

export const RAIL_ITEMS: RailItem[] = [
  { id: 'home', label: 'Dashboard', to: '/dashboard' },
  { id: 'people', label: 'Employees', to: '/employees' },
  { id: 'book', label: 'Training & Competency', to: '/training', active: true },
  { id: 'shield', label: 'Compliance' },
  { id: 'chart', label: 'Analytics', to: '/dashboard/analytics' },
  { id: 'cog', label: 'Settings' },
];
