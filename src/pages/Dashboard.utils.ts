import type { Event } from './Dashboard.types';

/** Deterministic pseudo-random series for demo charts — stable across renders
 *  for a given seed, so the UI doesn't jitter between paints. */
export function gen(n: number, lo: number, hi: number, seed = 7) {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const trend = (i / n) * (hi - lo) * 0.4;
    const base = lo + (hi - lo) * 0.4 + trend;
    const wob = Math.sin(i / 4 + seed) * (hi - lo) * 0.18;
    const noise = (r - 0.5) * (hi - lo) * 0.25;
    out.push(Math.max(lo, Math.min(hi, +(base + wob + noise).toFixed(2))));
  }
  return out;
}

/** Wall-clock in Gulf Standard Time (UTC+4), formatted HH:MM:SS. */
export function formatGST(d: Date) {
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const m = new Date(utc + 4 * 60 * 60_000);
  const hh = String(m.getHours()).padStart(2, '0');
  const mm = String(m.getMinutes()).padStart(2, '0');
  const ss = String(m.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function relTime(secs: number) {
  if (secs < 60) return `${secs} s ago`;
  return `${Math.floor(secs / 60)} m ago`;
}

export function verbFor(t: Event['type']) {
  switch (t) {
    case 'pass':   return 'passed';
    case 'retake': return 'requested retake of';
    case 'enrol':  return 'enrolled in';
    case 'cert':   return 'deployed to';
    case 'audit':  return 'flagged for review at';
  }
}
