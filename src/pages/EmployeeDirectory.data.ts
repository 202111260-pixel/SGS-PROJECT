// Directory + profile HR enrichment for the roster shared with the Competency
// engine (Competency.data → EMPLOYEES). The grade/certificate truth lives there;
// this module adds the human-resources facets a directory and a profile need —
// contact details, base, line manager, contract and issued company property.
//
// Demo data only. In production these rows are fetched by id from Supabase and
// validated at the trust boundary with Zod (charter §2), read under RLS (§3).

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

/** Keyed by the roster employee id (Competency.data → EMPLOYEES[].id). */
export const HR_INFO: Record<string, HrInfo> = {
  'e-10247': {
    email: 'ahmed.al-harthy@sgs.com',
    mobile: '+968 9123 4567',
    nationality: 'Omani',
    base: 'Fahud Operations Base',
    manager: 'Salim Al-Rashdi',
    contract: 'Permanent',
    assets: ['Toyota Hilux · 4821 MU', 'Fuel Card', 'Company Mobile', 'Blue Key'],
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
    assets: ['Toyota Land Cruiser · 1190 MU', 'Fuel Card', 'Company Mobile', 'Company Laptop', 'Blue Key'],
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
    assets: ['Toyota Hilux · 3307 MU', 'Fuel Card', 'Company Mobile', 'Company Laptop'],
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
    assets: ['Toyota Hilux · 2245 MU', 'Fuel Card', 'Company Mobile', 'Blue Key'],
  },
};

export function hrOf(id: string): HrInfo | null {
  return HR_INFO[id] ?? null;
}

/** Display employee number — the roster ids embed it (e-10247 → 10247). */
export function empNo(id: string): string {
  return id.replace(/^e-/, '');
}
