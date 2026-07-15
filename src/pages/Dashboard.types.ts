// Domain types for the Dashboard. Pure shapes — no runtime imports.

export type Kpi = {
  label: string;
  value: string;
  unit?: string;
  delta: number;
  series: number[];
  ctx: string;
};

export type Event = {
  id: number;
  ts: string;
  type: 'pass' | 'retake' | 'enrol' | 'cert' | 'audit';
  who: string;
  what: string;
  hub: string;
};
