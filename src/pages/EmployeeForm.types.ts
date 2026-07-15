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
  grade: Grade | '';
  hireDate: string;
  experienceYears: string;
  cv: string;
  /** Data URL of the chosen profile photo, or '' for none (initials fallback). */
  photo: string;
  companyProps: Record<CompanyPropertyKey, boolean>;
  docs: Record<DocKey, DocState>;
  safety: Record<SafetyKey, DocState>;
};

export type Errors = Partial<Record<'fullName' | 'employeeNo' | 'email' | 'position' | 'project', string>>;

export type RailItem = { id: string; label: string; to?: string; active?: boolean };
