/**
 * Roster.data — the official duty codes for the monthly shift roster,
 * exactly as the site HR sheet defines them. Color never carries meaning
 * alone: the code letter is the fact, the family hue only groups it
 * (duty / rest / planned / unplanned / special / extra).
 */

export const SHIFT_CODES = ['F', 'OFF', 'V', 'AI', 'EM', 'S', 'PT', 'MT', 'Mr', 'HL', 'Ex', 'T'] as const;
export type ShiftCode = (typeof SHIFT_CODES)[number];

export type ShiftFamily = 'duty' | 'rest' | 'planned' | 'unplanned' | 'special' | 'extra';

export const SHIFT_META: Record<ShiftCode, { label: string; family: ShiftFamily }> = {
  F: { label: 'On duty', family: 'duty' },
  OFF: { label: 'Rest day (off)', family: 'rest' },
  V: { label: 'Vacation', family: 'planned' },
  AI: { label: 'Annual leave', family: 'planned' },
  EM: { label: 'Emergency leave', family: 'unplanned' },
  S: { label: 'Sick leave', family: 'unplanned' },
  PT: { label: 'Paternity leave', family: 'special' },
  MT: { label: 'Maternity leave', family: 'special' },
  Mr: { label: 'Marriage leave', family: 'special' },
  HL: { label: 'Hajj leave', family: 'special' },
  Ex: { label: 'Extra day', family: 'extra' },
  T: { label: 'Training on off day', family: 'extra' },
};

export const FAMILY_LABEL: Record<ShiftFamily, string> = {
  duty: 'Duty',
  rest: 'Rest',
  planned: 'Planned leave',
  unplanned: 'Unplanned leave',
  special: 'Special leave',
  extra: 'Extra effort',
};

/** Short position tags for the roster's name column — the official
 *  positions only (EmployeeForm.data → POSITIONS). */
export const POSITION_TAG: Record<string, string> = {
  Assistant: 'As',
  Operator: 'Op',
  Supervisor: 'Sup',
  'Base Manager': 'BM',
  'Tool Man': 'TM',
  'Gauge Engineer': 'GE',
  Mechanic: 'Mec',
  'HSE Advisor': 'HSE',
};
