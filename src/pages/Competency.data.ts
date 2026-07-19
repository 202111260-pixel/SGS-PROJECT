import type {
  CertRecord,
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

/** The official mandatory safety block, exactly as the Add Employee form
 *  defines it (EmployeeForm.data → SAFETY_CERTS): FTW, HSE, H2S, FA,
 *  DD — Light, IFR, DD — Heavy. Tiers drive the C → B → A ladder. */
export const TRAININGS = [
  { code: 'FTW', name: 'FTW (Fit To Work)', tier: 'basic', validityYears: 2 },
  { code: 'HSE', name: 'HSE', tier: 'basic', validityYears: 2 },
  { code: 'H2S', name: 'H2S', tier: 'basic', validityYears: 2 },
  { code: 'FA', name: 'FA (First Aid)', tier: 'basic', validityYears: 2 },
  { code: 'DDL', name: 'DD — Light (Defensive Driving)', tier: 'intermediate', validityYears: 3 },
  { code: 'IFR', name: 'IFR', tier: 'intermediate', validityYears: 2 },
  { code: 'DDH', name: 'DD — Heavy (Defensive Driving)', tier: 'advanced', validityYears: 3 },
] as const satisfies ReadonlyArray<Training>;

/** The mandatory safety block applies to every position — the Add Employee
 *  form records the same block for all roles. */
const MANDATORY_SAFETY: ReadonlyArray<TrainingCode> = ['FTW', 'HSE', 'H2S', 'FA', 'DDL', 'IFR', 'DDH'];
export const ROLE_MATRIX: Record<Position, ReadonlyArray<TrainingCode>> = {
  Assistant: MANDATORY_SAFETY,
  Operator: MANDATORY_SAFETY,
  Supervisor: MANDATORY_SAFETY,
  'Base Manager': MANDATORY_SAFETY,
  'Tool Man': MANDATORY_SAFETY,
  'Gauge Engineer': MANDATORY_SAFETY,
  Mechanic: MANDATORY_SAFETY,
  'HSE Advisor': MANDATORY_SAFETY,
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

/** Hand-picked records covering the notable edge cases (a one-cert-from-A
 *  operator, a still-forming grade, an expired advanced cert). The rest of the
 *  98-strong workforce is generated below. */
const CURATED_EMPLOYEES: ReadonlyArray<Employee> = [
  {
    id: 'e-10247',
    name: 'Ahmed Al-Harthy',
    position: 'Operator',
    project: 'OQ',
    hired: '2024-10-01',
    certs: {
      FTW: { issued: '2025-06-10', expiry: '2027-06-10' },
      HSE: { issued: '2025-06-12', expiry: '2027-06-12' },
      H2S: { issued: '2024-11-02', expiry: '2026-11-02' },
      FA: { issued: '2025-01-15', expiry: '2027-01-15' },
      DDL: { issued: '2024-10-20', expiry: '2027-10-20' },
      IFR: { issued: '2024-09-05', expiry: '2026-09-05' }, // expiring within 90 days
      // DD — Heavy not on file — the one certificate between Ahmed and grade A.
    },
  },
  {
    id: 'e-10118',
    name: 'Fatima Al-Balushi',
    position: 'Supervisor',
    project: 'Oxy Oman',
    hired: '2019-05-20',
    certs: {
      FTW: { issued: '2025-02-11', expiry: '2027-02-11' },
      HSE: { issued: '2025-04-02', expiry: '2027-04-02' },
      H2S: { issued: '2024-08-20', expiry: '2026-08-20' },
      FA: { issued: '2025-06-15', expiry: '2027-06-15' },
    },
  },
  {
    id: 'e-10391',
    name: 'Khalid Al-Saadi',
    position: 'Assistant',
    project: 'OQ',
    hired: '2026-03-15',
    certs: {
      FTW: { issued: '2026-03-18', expiry: '2028-03-18' },
      HSE: { issued: '2026-03-19', expiry: '2028-03-19' },
      H2S: { issued: '2026-04-02', expiry: '2028-04-02' },
      DDL: { issued: '2026-05-06', expiry: '2029-05-06' },
      // FA missing → the basic tier is open, so the grade is still forming.
    },
  },
  {
    id: 'e-10052',
    name: 'Salim Al-Rashdi',
    position: 'Base Manager',
    project: 'OQ',
    hired: '2016-02-10',
    certs: {
      FTW: { issued: '2025-05-01', expiry: '2027-05-01' },
      HSE: { issued: '2025-05-02', expiry: '2027-05-02' },
      FA: { issued: '2025-06-15', expiry: '2027-06-15' },
      DDL: { issued: '2024-10-01', expiry: '2027-10-01' },
    },
  },
  {
    id: 'e-10176',
    name: 'Yusuf Al-Amri',
    position: 'Tool Man',
    project: 'Oxy Oman',
    hired: '2021-03-20',
    certs: {
      FTW: { issued: '2025-03-01', expiry: '2027-03-01' },
      HSE: { issued: '2025-03-02', expiry: '2027-03-02' },
      FA: { issued: '2024-08-10', expiry: '2026-08-10' }, // expiring within 90 days
      DDL: { issued: '2024-07-20', expiry: '2027-07-20' },
    },
  },
  {
    id: 'e-10233',
    name: 'Nasser Al-Hinai',
    position: 'Gauge Engineer',
    project: 'OQ',
    hired: '2024-01-15',
    certs: {
      FTW: { issued: '2025-02-01', expiry: '2027-02-01' },
      HSE: { issued: '2025-02-02', expiry: '2027-02-02' },
      H2S: { issued: '2025-01-10', expiry: '2027-01-10' },
      FA: { issued: '2025-03-05', expiry: '2027-03-05' },
      DDL: { issued: '2024-06-01', expiry: '2027-06-01' },
    },
  },
  {
    id: 'e-10299',
    name: 'Maryam Al-Zadjali',
    position: 'HSE Advisor',
    project: 'Oxy Oman',
    hired: '2020-11-01',
    certs: {
      FTW: { issued: '2025-04-01', expiry: '2027-04-01' },
      HSE: { issued: '2025-04-02', expiry: '2027-04-02' },
      H2S: { issued: '2025-05-01', expiry: '2027-05-01' },
      FA: { issued: '2025-04-10', expiry: '2027-04-10' },
      IFR: { issued: '2023-01-01', expiry: '2025-01-01' }, // expired intermediate cert
      DDL: { issued: '2024-08-01', expiry: '2027-08-01' },
    },
  },
  {
    id: 'e-10405',
    name: 'Omar Al-Farsi',
    position: 'Mechanic',
    project: 'OQ',
    hired: '2025-09-01',
    certs: {
      FTW: { issued: '2025-10-01', expiry: '2027-10-01' },
      HSE: { issued: '2025-10-02', expiry: '2027-10-02' },
      H2S: { issued: '2025-11-01', expiry: '2027-11-01' },
      FA: { issued: '2025-10-15', expiry: '2027-10-15' },
      DDL: { issued: '2025-09-20', expiry: '2028-09-20' },
    },
  },
  {
    id: 'e-10087',
    name: 'Aisha Al-Harthy',
    position: 'Operator',
    project: 'Oxy Oman',
    hired: '2020-06-01',
    certs: {
      FTW: { issued: '2025-06-01', expiry: '2027-06-01' },
      HSE: { issued: '2025-06-02', expiry: '2027-06-02' },
      H2S: { issued: '2025-05-20', expiry: '2027-05-20' },
      FA: { issued: '2025-04-01', expiry: '2027-04-01' },
      DDL: { issued: '2024-08-01', expiry: '2027-08-01' },
      IFR: { issued: '2025-01-01', expiry: '2027-01-01' },
      DDH: { issued: '2024-10-01', expiry: '2027-10-01' },
    },
  },
];

/* ── extended demo roster ────────────────────────────────────────────────
 * The nine curated records above cover the hand-picked edge cases; the block
 * below deterministically generates the rest of a 98-strong field workforce so
 * the directory, the grade rollups and the "expiring within two weeks" segment
 * have a realistic population to work against. A fixed PRNG seed keeps the
 * roster — and therefore every derived statistic — stable across reloads.
 *
 * Production deletes this generator wholesale: the roster streams from Supabase
 * (RLS-scoped) and is parsed by Zod at the trust boundary (charter §2/§3). */

/** Demo "today" the generated certificate dates are anchored to, matching the
 *  curated records. Kept in one place so the whole roster shifts together. */
const DEMO_TODAY = '2026-07-15';

function isoAddDays(baseIso: string, days: number): string {
  const d = new Date(`${baseIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Small self-contained PRNG (mulberry32) — deterministic, so the generated
 *  roster is byte-for-byte stable across renders and machines. Never Math.random
 *  here: it would jitter the grade distribution and the rollups between paints. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rint(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
function pick<T>(pool: readonly T[], rng: () => number): T {
  const val = pool[Math.floor(rng() * pool.length)];
  if (val === undefined) throw new Error('cannot pick from an empty pool');
  return val;
}

const FIRST_NAMES = [
  'Sultan', 'Hamad', 'Said', 'Ali', 'Rashid', 'Talib', 'Majid', 'Hilal',
  'Badar', 'Zayid', 'Qais', 'Tariq', 'Saif', 'Marwan', 'Hamoud', 'Juma',
  'Aisha', 'Muna', 'Zainab', 'Halima', 'Amal', 'Salma', 'Buthaina', 'Nawal',
] as const;
const FAMILY_NAMES = [
  'Al-Rawahi', 'Al-Kindi', 'Al-Habsi', 'Al-Wahaibi', 'Al-Ghafri', 'Al-Busaidi',
  'Al-Maskari', 'Al-Rashdi', 'Al-Hinai', 'Al-Amri', 'Al-Farsi', 'Al-Lawati',
  'Al-Maamari', 'Al-Riyami', 'Al-Saadi', 'Al-Balushi', 'Al-Harthy', 'Al-Zadjali',
  'Al-Nabhani', 'Al-Siyabi', 'Al-Mahrouqi', 'Al-Aufi',
] as const;
const POSITION_POOL: readonly Position[] = [
  'Operator', 'Operator', 'Assistant', 'Assistant', 'Supervisor', 'Tool Man',
  'Gauge Engineer', 'Mechanic', 'HSE Advisor', 'Base Manager',
];
const PROJECT_POOL = ['OQ', 'Oxy Oman'] as const;

const TRAINING_BY_CODE: ReadonlyMap<TrainingCode, Training> = new Map(
  TRAININGS.map((t) => [t.code, t]),
);
function validityOf(code: TrainingCode): number {
  const t = TRAINING_BY_CODE.get(code);
  if (!t) throw new Error(`Unknown training code: ${code}`);
  return t.validityYears;
}

/** A generated certificate whose expiry lands in the requested window relative
 *  to DEMO_TODAY, with the issue date back-dated by the course's validity. */
type CertKind = 'valid' | 'urgent' | 'soon' | 'expired';
function makeCert(code: TrainingCode, kind: CertKind, rng: () => number): CertRecord {
  const span = validityOf(code) * 365;
  const offset =
    kind === 'urgent'
      ? rint(rng, 2, 13) //           lapses inside two weeks
      : kind === 'soon'
        ? rint(rng, 20, 85) //        expiring, but not yet urgent (< 90 days)
        : kind === 'expired'
          ? -rint(rng, 10, 400) //    already lapsed
          : rint(rng, 160, span - 40); // 'valid' — comfortably beyond the window
  const expiry = isoAddDays(DEMO_TODAY, offset);
  const issued = isoAddDays(expiry, -span);
  return { issued, expiry };
}

function generateRoster(count: number): Employee[] {
  const rng = mulberry32(0x5c50a11);
  const used = new Set<string>();
  const out: Employee[] = [];
  for (let i = 0; i < count; i++) {
    let name = `${pick(FIRST_NAMES, rng)} ${pick(FAMILY_NAMES, rng)}`;
    while (used.has(name)) name = `${pick(FIRST_NAMES, rng)} ${pick(FAMILY_NAMES, rng)}`;
    used.add(name);

    const position = pick(POSITION_POOL, rng);
    const project = pick(PROJECT_POOL, rng);
    const hired = isoAddDays(DEMO_TODAY, -rint(rng, 60, 3200));
    const required = ROLE_MATRIX[position];

    const certs: Partial<Record<TrainingCode, CertRecord>> = {};
    for (const code of required) certs[code] = makeCert(code, 'valid', rng);

    // Nudge one required certificate off "valid" so the roster carries a
    // realistic spread of urgent / expiring / expired / incomplete documents.
    const target = pick(required, rng);
    const roll = rng();
    if (roll < 0.14) certs[target] = makeCert(target, 'urgent', rng);
    else if (roll < 0.26) certs[target] = makeCert(target, 'soon', rng);
    else if (roll < 0.34) certs[target] = makeCert(target, 'expired', rng);
    else if (roll < 0.4) delete certs[target];

    out.push({ id: `e-2${String(i + 1).padStart(4, '0')}`, name, position, project, hired, certs });
  }
  return out;
}

/** The full demo workforce: 9 curated edge cases + 89 generated = 98. */
export const EMPLOYEES: ReadonlyArray<Employee> = [...CURATED_EMPLOYEES, ...generateRoster(89)];

export const MS_YEAR = 365.25 * 24 * 60 * 60 * 1000;
export const EXPIRING_DAYS = 90;
/** A held certificate this close to expiry (days) is flagged urgent — the
 *  "expiring within two weeks" segment on the directory. */
export const URGENT_DAYS = 14;

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
