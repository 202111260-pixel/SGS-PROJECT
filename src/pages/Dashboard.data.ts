import type { Event, Kpi } from './Dashboard.types';
import { gen } from './Dashboard.utils';

export const kpis: Kpi[] = [
  { label: 'Active trainees',     value: '1,284', delta: 12.4,  series: gen(20, 1140, 1290, 7),  ctx: 'enrolled · in-country' },
  { label: 'New enrolments, 30 d', value: '418',  delta: 8.1,   series: gen(30, 80, 220, 6),     ctx: 'across 27 courses' },
  { label: 'Avg. progress',       value: '88.7',  unit: '%', delta: 0.6, series: gen(30, 84, 92, 5), ctx: 'course completion' },
  { label: 'Pass rate',           value: '94.3',  unit: '%', delta: -1.2, series: gen(30, 92, 97, 4), ctx: '7-day rolling' },
  { label: 'Deployed to operators', value: '486', delta: 8.0,  series: gen(30, 300, 520, 3),    ctx: 'on oil & gas sites' },
  { label: 'In monitoring · 30 d', value: '218',  delta: 14.0,  series: gen(30, 130, 230, 9),    ctx: 'post-deployment' },
];

export const OMAN_MINI =
  'M260 90 L320 70 L380 80 L430 100 L470 130 L500 170 L515 220 ' +
  'L515 280 L495 330 L475 380 L445 425 L405 460 L350 480 L300 478 ' +
  'L268 460 L250 430 L246 395 L256 360 L280 330 L305 305 L322 270 ' +
  'L308 240 L278 220 L250 200 L232 170 L226 140 L242 110 Z';
export const MUSANDAM_MINI = 'M335 35 L375 30 L395 55 L370 70 L342 64 Z';

export const omanHubs = [
  { name: 'Muscat',  x: 410, y: 158, hq: true,  staff: 612, sector: 'SGS HQ' },
  { name: 'Sohar',   x: 365, y: 110,            staff: 184, sector: 'OQ'      },
  { name: 'Sur',     x: 470, y: 200,            staff: 96,  sector: 'bp LNG'  },
  { name: 'Nizwa',   x: 350, y: 220,            staff: 64,  sector: 'Daleel'  },
  { name: 'Duqm',    x: 420, y: 340,            staff: 188, sector: 'OQ Ref.' },
  { name: 'Salalah', x: 310, y: 460,            staff: 96,  sector: 'Shell'   },
];

export const eventTemplates: Array<Omit<Event, 'id' | 'ts'>> = [
  { type: 'pass',   who: 'F. Al-Balushi',  what: 'Well Control · M02',        hub: 'PDO'     },
  { type: 'enrol',  who: 'H. Al-Maskari',  what: 'HSE & H2S · M01',           hub: 'Sohar'   },
  { type: 'pass',   who: 'M. Al-Riyami',   what: 'CompEx E&I · M11',          hub: 'OQ'      },
  { type: 'cert',   who: 'N. Al-Hinai',    what: 'PDO well-control site',     hub: 'PDO'     },
  { type: 'retake', who: 'R. Al-Habsi',    what: 'Process Safety · M03',      hub: 'Salalah' },
  { type: 'audit',  who: 'K. Al-Maamari',  what: 'Duqm site · week 9',        hub: 'OQ'      },
  { type: 'pass',   who: 'S. Al-Lawati',   what: 'Rigging & Lifting · M07',   hub: 'bp'      },
  { type: 'enrol',  who: 'A. Al-Saadi',    what: 'Operations Readiness · M05', hub: 'Muscat' },
  { type: 'cert',   who: 'K. Al-Zadjali',  what: 'Shell HSE site',            hub: 'Shell'   },
];

export const activityRows: Array<[string, string, string, string, string, string, 'Pass' | 'Retake' | 'New']> = [
  ['12.07.2026', '14:08:22Z', 'N. Al-Hinai',     'ISO 17025 · M14',  'Muscat',   '96.4%', 'Pass'],
  ['12.07.2026', '13:51:04Z', 'F. Al-Balushi',   'API 510 · M02',    'Sohar',    '92.1%', 'Pass'],
  ['12.07.2026', '13:18:39Z', 'M. Al-Riyami',    'IATF 16949 · M11', 'Muscat',   '94.2%', 'Pass'],
  ['12.07.2026', '12:46:11Z', 'S. Al-Lawati',    'ISO 17020 · M07',  'Duqm',     '91.6%', 'Pass'],
  ['11.07.2026', '11:30:55Z', 'R. Al-Habsi',     'NACE CIP-2 · M03', 'Salalah',  '64.0%', 'Retake'],
  ['11.07.2026', '10:14:08Z', 'A. Al-Saadi',     'GSO PVoC · M05',   'Muscat',   '89.3%', 'Pass'],
  ['11.07.2026', '09:02:43Z', 'K. Al-Zadjali',   'PDO HSE · M02',    'Sohar',    '92.1%', 'Pass'],
  ['11.07.2026', '08:38:17Z', 'H. Al-Maskari',   'API 570 · M01',    'Duqm',     '—',      'New'],
];

export const paletteItems = [
  { kind: 'Action',  label: 'New programme',        hint: 'Create · ⌘N' },
  { kind: 'Action',  label: 'Export country PDF',   hint: 'Export · ⌘E' },
  { kind: 'Action',  label: 'Share with auditor',   hint: 'Share · ⌘⇧S' },
  { kind: 'Action',  label: 'Open compliance log',  hint: 'Navigate' },
  { kind: 'Person',  label: 'Nasser Al-Hinai',      hint: 'Country Manager · Muscat' },
  { kind: 'Person',  label: 'Faisal Al-Balushi',    hint: 'Sohar HSE Lead' },
  { kind: 'Person',  label: 'Reem Al-Habsi',        hint: 'Salalah Lab Coordinator' },
  { kind: 'Programme', label: 'API 510 — Pressure Vessel Inspector', hint: 'EN-201 · 80 h' },
  { kind: 'Programme', label: 'NACE CIP-2 — Coatings',                hint: 'EN-214 · 64 h' },
  { kind: 'Programme', label: 'Marine Cargo Surveying',                hint: 'MR-118 · 56 h' },
  { kind: 'Hub',     label: 'Muscat HQ',            hint: 'Way 4505 · Madinat Al Sultan Qaboos' },
  { kind: 'Hub',     label: 'Sohar industrial port',hint: '184 personnel' },
  { kind: 'Hub',     label: 'Duqm SEZAD refinery',  hint: '188 personnel' },
];
