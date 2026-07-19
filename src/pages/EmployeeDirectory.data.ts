// Directory + profile HR enrichment for the roster shared with the Competency
// engine (Competency.data → EMPLOYEES). The grade/certificate truth lives there;
// this module adds the human-resources facets a directory and a profile need —
// contact details, base, line manager, contract and issued company property.
//
// Demo data only. In production these rows are fetched by id from Supabase and
// validated at the trust boundary with Zod (charter §2), read under RLS (§3).

import { EMPLOYEES } from './Competency.data';

export type ContractType = 'Permanent' | 'Fixed-term' | 'Secondment';

export type HrInfo = {
  email: string;
  mobile: string;
  nationality: string;
  base: string;
  manager: string;
  contract: ContractType;
  /** Company property currently issued to the employee. */
  assets: ReadonlyArray<string>;
};

/** Hand-written HR facts for the curated employees (Competency.data → EMPLOYEES[].id). */
const CURATED_HR: Record<string, HrInfo> = {
  'e-10247': {
    email: 'ahmed.al-harthy@sgs.com',
    mobile: '+968 9123 4567',
    nationality: 'Omani',
    base: 'Fahud Operations Base',
    manager: 'Salim Al-Rashdi',
    contract: 'Permanent',
    assets: ['Car · Hilux 4821 MU', 'Fuel Card', 'Company Mobile', 'Blue Key'],
  },
  'e-10118': {
    email: 'fatima.al-balushi@sgs.com',
    mobile: '+968 9234 1876',
    nationality: 'Omani',
    base: 'Nimr Field Camp',
    manager: 'Maryam Al-Zadjali',
    contract: 'Permanent',
    assets: ['Company Mobile', 'Company Laptop'],
  },
  'e-10391': {
    email: 'khalid.al-saadi@sgs.com',
    mobile: '+968 9345 2210',
    nationality: 'Omani',
    base: 'Fahud Operations Base',
    manager: 'Ahmed Al-Harthy',
    contract: 'Fixed-term',
    assets: ['Company Mobile'],
  },
  'e-10052': {
    email: 'salim.al-rashdi@sgs.com',
    mobile: '+968 9456 8890',
    nationality: 'Omani',
    base: 'Fahud Operations Base',
    manager: 'Country Operations',
    contract: 'Permanent',
    assets: ['Car · Land Cruiser 1190 MU', 'Fuel Card', 'Company Mobile', 'Company Laptop', 'Blue Key'],
  },
  'e-10176': {
    email: 'yusuf.al-amri@sgs.com',
    mobile: '+968 9567 3341',
    nationality: 'Omani',
    base: 'Nimr Field Camp',
    manager: 'Fatima Al-Balushi',
    contract: 'Permanent',
    assets: ['Fuel Card', 'Company Mobile'],
  },
  'e-10233': {
    email: 'nasser.al-hinai@sgs.com',
    mobile: '+968 9678 5522',
    nationality: 'Omani',
    base: 'Fahud Operations Base',
    manager: 'Salim Al-Rashdi',
    contract: 'Permanent',
    assets: ['Company Mobile', 'Company Laptop'],
  },
  'e-10299': {
    email: 'maryam.al-zadjali@sgs.com',
    mobile: '+968 9789 4413',
    nationality: 'Omani',
    base: 'Nimr Field Camp',
    manager: 'Country HSE',
    contract: 'Permanent',
    assets: ['Car · Hilux 3307 MU', 'Fuel Card', 'Company Mobile', 'Company Laptop'],
  },
  'e-10405': {
    email: 'omar.al-farsi@sgs.com',
    mobile: '+968 9890 1167',
    nationality: 'Omani',
    base: 'Fahud Operations Base',
    manager: 'Salim Al-Rashdi',
    contract: 'Fixed-term',
    assets: ['Company Mobile'],
  },
  'e-10087': {
    email: 'aisha.al-harthy@sgs.com',
    mobile: '+968 9901 7788',
    nationality: 'Omani',
    base: 'Nimr Field Camp',
    manager: 'Fatima Al-Balushi',
    contract: 'Permanent',
    assets: ['Car · Hilux 2245 MU', 'Fuel Card', 'Company Mobile', 'Blue Key'],
  },
};

/* ── HR enrichment for the generated roster ───────────────────────────────
 * The curated people above keep their hand-written details; everyone in the
 * generated roster gets deterministic, on-brand HR facts derived from their id
 * so the directory and profile never render blanks. Production replaces this
 * with the real HR record fetched from Supabase and Zod-parsed (§2/§3). */

const BASE_POOL = [
  'Fahud Operations Base', 'Nimr Field Camp', 'Marmul Base', 'Qarn Alam Camp', 'Yibal Camp',
] as const;
/** Line managers for the generated roster are always PEOPLE on the roster
 *  (Competency.data → EMPLOYEES) — an org unit is never someone's manager
 *  here, so the duty roster only ever shows employee names. */
const MANAGER_POOL = [
  'Salim Al-Rashdi', 'Maryam Al-Zadjali', 'Fatima Al-Balushi', 'Ahmed Al-Harthy',
] as const;
const CONTRACT_POOL: readonly ContractType[] = ['Permanent', 'Permanent', 'Permanent', 'Fixed-term', 'Secondment'];
/** Official company property labels from the Add Employee form
 *  (EmployeeForm.data → COMPANY_PROPERTIES). */
const ASSET_POOL: ReadonlyArray<ReadonlyArray<string>> = [
  ['Company Mobile'],
  ['Fuel Card', 'Company Mobile'],
  ['Company Mobile', 'Company Laptop'],
  ['Car', 'Fuel Card', 'Company Mobile', 'Blue Key'],
];

/** FNV-1a — a stable, well-mixed hash so each id maps to the same HR facts on
 *  every run without pulling in a dependency. */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function fromPool<T>(pool: readonly T[], h: number): T {
  const val = pool[h % pool.length];
  if (val === undefined) throw new Error('cannot select from an empty pool');
  return val;
}
function emailOf(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@sgs.com`;
}

/** Keyed by the roster employee id: curated facts where we have them, otherwise
 *  deterministically derived from the id. */
export const HR_INFO: Record<string, HrInfo> = (() => {
  const map: Record<string, HrInfo> = { ...CURATED_HR };
  for (const emp of EMPLOYEES) {
    if (map[emp.id] !== undefined) continue;
    const h = fnv1a(emp.id);
    map[emp.id] = {
      email: emailOf(emp.name),
      mobile: `+968 9${100 + (h % 900)} ${1000 + (h % 9000)}`,
      nationality: 'Omani',
      base: fromPool(BASE_POOL, h),
      manager: fromPool(MANAGER_POOL, h >>> 3),
      contract: fromPool(CONTRACT_POOL, h >>> 5),
      assets: fromPool(ASSET_POOL, h >>> 7),
    };
  }
  return map;
})();

export function hrOf(id: string): HrInfo | null {
  return HR_INFO[id] ?? null;
}

/** Display employee number — the roster ids embed it (e-10247 → 10247). */
export function empNo(id: string): string {
  return id.replace(/^e-/, '');
}
