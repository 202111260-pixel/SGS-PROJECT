// Domain types for the Training & Competency page. Pure shapes — no runtime imports.

export type Grade = 'C' | 'B' | 'A';

export type Tier = 'basic' | 'intermediate' | 'advanced';

/** The official mandatory safety block, exactly as the Add Employee form
 *  defines it (EmployeeForm.data → SAFETY_CERTS). No invented courses. */
export type TrainingCode = 'FTW' | 'HSE' | 'H2S' | 'FA' | 'DDL' | 'IFR' | 'DDH';

export type Training = {
  code: TrainingCode;
  name: string;
  tier: Tier;
  validityYears: number;
};

export type Position =
  | 'Assistant'
  | 'Operator'
  | 'Supervisor'
  | 'Base Manager'
  | 'Tool Man'
  | 'Gauge Engineer'
  | 'Mechanic'
  | 'HSE Advisor';

export type CertRecord = { issued: string; expiry: string };

export type Employee = {
  id: string;
  name: string;
  position: Position;
  project: string;
  hired: string;
  certs: Partial<Record<TrainingCode, CertRecord>>;
};

export type CertStatus = 'valid' | 'expiring' | 'expired' | 'missing';

/** One required training resolved against the (possibly simulated) record. */
export type CertView = {
  code: TrainingCode;
  training: Training;
  status: CertStatus;
  rec: CertRecord | null;
  simulated: boolean;
};

export type RailItem = { id: string; label: string; to?: string; active?: boolean };

export type SimState = { years: number; overrides: Partial<Record<TrainingCode, boolean>> };

export type WalletFilter = 'all' | CertStatus;
