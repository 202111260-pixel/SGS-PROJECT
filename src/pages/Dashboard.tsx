import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Wordmark from '../components/Wordmark';
import './dashboard.css';

/**
 * Dashboard — operations cockpit for SGS Oman Learning Registry.
 * World-class density. Pure SVG visualisations, no chart libraries.
 *
 * Layout
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Top bar (sticky)                                        │
 *   ├────┬─────────────────────────────────────────────────────┤
 *   │ R  │  Sub-nav (hubs · ranges)                            │
 *   │ a  ├─────────────────────────────────────────────────────┤
 *   │ i  │  Page header                                        │
 *   │ l  ├─────────────────────────────────────────────────────┤
 *   │    │  KPI strip (6)                                      │
 *   │    │  Completions chart  │  Donut  │  Live stream        │
 *   │    │  Mini-map of Oman  │  Programme funnel              │
 *   │    │  Hubs · Radar · Renewals                            │
 *   │    │  Heatmap  ·  Activity ledger                        │
 *   │    │  Top programmes · Risk register                     │
 *   └────┴─────────────────────────────────────────────────────┘
 */

/**
 * RegistryShell — the persistent chrome shared by every registry page:
 * theme state, ⌘K palette, top bar, left rail and sub-nav. Each page renders
 * its own content as `children` inside the scroll area.
 *
 * `fill` turns the content area into a viewport-height flex column so a page
 * can lay itself out as a single non-scrolling "screen" (see DeepAnalytics).
 */
function RegistryShell({
  active = 'Overview',
  fill = false,
  children,
}: {
  active?: string;
  fill?: boolean;
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Default to the landing's warm light identity; honour an explicit choice.
    return localStorage.getItem('sgs-theme-v2') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('sgs-theme-v2', dark ? 'dark' : 'light');
  }, [dark]);

  // ⌘K opens the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((s) => !s);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      data-theme={dark ? 'dark' : undefined}
      className="sgs-registry min-h-screen bg-[color:var(--color-paper-2)] text-[color:var(--color-ink)]"
    >
      <TopBar active={active} onSearch={() => setPaletteOpen(true)} dark={dark} onToggleTheme={() => setDark((d) => !d)} />

      <div className="flex">
        <Rail />

        <div className={`flex min-w-0 flex-1 flex-col ${fill ? 'lg:h-[calc(100vh-3.5rem)]' : ''}`}>
          <SubNav />

          <main
            className={`mx-auto w-full max-w-[1480px] px-6 lg:px-8 ${
              fill ? 'flex min-h-0 flex-1 flex-col py-5' : 'pb-24 pt-6'
            }`}
          >
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <RegistryShell active="Overview">
      <PageHeader />
      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* KPI rail — left of the page */}
        <aside className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-1">
          {kpis.map((k, i) => (
            <KpiCard key={k.label} k={k} idx={i} />
          ))}
        </aside>

        {/* Charts — right of the page */}
        <div className="lg:col-span-9">
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <CompletionsChart />
            </div>
            <div className="lg:col-span-4">
              <ComplianceDonut />
            </div>

            <div className="lg:col-span-5">
              <SectorRadar />
            </div>
            <div className="lg:col-span-4">
              <LiveStream />
            </div>
            <div className="lg:col-span-3">
              <Gauge />
            </div>
          </section>
        </div>
      </div>

      <FooterStrip />
    </RegistryShell>
  );
}

/**
 * DeepAnalytics — its own route (/dashboard/analytics). The six analytical
 * views are laid out as a single non-scrolling screen on desktop (3×2 grid),
 * each chart scaling to fill its cell. Stacks and scrolls normally on mobile.
 */
export function DeepAnalytics() {
  return (
    <RegistryShell active="Analytics" fill>
      <GalleryHeader />
      {/*
        Each row gets a comfortable floor (20rem) so charts stay legible on
        laptops; on tall monitors the 1fr lets the two rows stretch to fill the
        screen. When the viewport is too short for both rows at their floor, the
        grid scrolls internally instead of crushing every chart.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-3 lg:auto-rows-[minmax(20rem,1fr)]">
        <VerticalBarChart />
        <MultiLineChart />
        <PolarBarChart />
        <ScatterChart />
        <CandleRange />
        <GroupedBarChart />
      </div>
    </RegistryShell>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TOP BAR
   ════════════════════════════════════════════════════════════════════ */

function TopBar({
  active = 'Overview',
  onSearch,
  dark,
  onToggleTheme,
}: {
  active?: string;
  onSearch: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const [time, setTime] = useState(formatGST(new Date()));
  useVisibleInterval(() => setTime(formatGST(new Date())), 1000);

  const nav: Array<{ label: string; to?: string }> = [
    { label: 'Overview', to: '/dashboard' },
    { label: 'Analytics', to: '/dashboard/analytics' },
    { label: 'Employees', to: '/employees/new' },
    { label: 'Courses' },
    { label: 'Trainees' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-6 px-5 lg:px-7">
        <a href="/" aria-label="Back to site" className="flex items-center gap-2.5">
          <Wordmark tone="light" />
        </a>
        <span className="hidden h-5 w-px bg-[color:var(--color-rule-soft)] md:block" />
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map(({ label, to }) => {
            const cls = `mono rounded-[2px] px-2.5 py-1.5 text-[11px] tracking-[0.18em] uppercase transition-colors ${
              label === active
                ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)]'
                : 'text-[color:var(--color-ink-2)] hover:bg-[color:var(--color-paper-3)]'
            }`;
            return to ? (
              <Link key={label} to={to} className={cls}>{label}</Link>
            ) : (
              <a key={label} href="#" className={cls}>{label}</a>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onSearch}
            className="hidden items-center gap-2 rounded-[2px] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-2.5 py-1.5 lg:flex hover:border-[color:var(--color-ink)]"
          >
            <span aria-hidden className="mono text-[12px] text-[color:var(--color-ink-3)]">⌕</span>
            <span className="w-[280px] text-left text-[12.5px] text-[color:var(--color-ink-3)]">
              Search trainees, courses, operators…
            </span>
            <span className="mono rounded-[2px] border border-[color:var(--color-rule-soft)] px-1 text-[9.5px] tracking-[0.1em] text-[color:var(--color-ink-3)]">
              ⌘K
            </span>
          </button>
          <span className="mono hidden items-center gap-2 rounded-[2px] border border-[color:var(--color-rule-soft)] px-2.5 py-1.5 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-2)] uppercase md:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-sgs)]" />
            Live · <span className="tabular text-[color:var(--color-ink)]">{time}</span> GST
          </span>
          <button
            onClick={onToggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
            className="grid h-8 w-8 place-items-center rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink)] transition-colors hover:border-[color:var(--color-ink)]"
          >
            {dark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
          <button className="relative grid h-8 w-8 place-items-center rounded-full border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] text-[color:var(--color-ink)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[color:var(--color-sgs)] mono text-[8px] text-white">3</span>
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--color-ink)] text-[11px] font-semibold text-[color:var(--color-paper)]">
            NA
          </div>
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LEFT RAIL
   ════════════════════════════════════════════════════════════════════ */

function Rail() {
  const items: Array<{ i: string; active?: boolean; to?: string; label: string }> = [
    { i: 'home',   active: true, to: '/dashboard', label: 'Dashboard' },
    { i: 'people', to: '/employees/new', label: 'Employees' },
    { i: 'book', label: 'Courses' },
    { i: 'shield', label: 'Compliance' },
    { i: 'chart', to: '/dashboard/analytics', label: 'Analytics' },
    { i: 'globe', label: 'Deployments' },
    { i: 'cog', label: 'Settings' },
  ];
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-14 shrink-0 flex-col items-center gap-1 border-r border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] py-3 md:flex">
      {items.map((it) => {
        const cls = `grid h-9 w-9 place-items-center rounded-[3px] transition-colors ${
          it.active
            ? 'bg-[color:var(--color-ink)] text-white'
            : 'text-[color:var(--color-ink-3)] hover:bg-[color:var(--color-paper-3)] hover:text-[color:var(--color-ink)]'
        }`;
        return it.to ? (
          <Link key={it.i} to={it.to} aria-label={it.label} title={it.label} className={cls}>
            <RailIcon id={it.i} />
          </Link>
        ) : (
          <button key={it.i} aria-label={it.label} title={it.label} className={cls}>
            <RailIcon id={it.i} />
          </button>
        );
      })}
      <div className="mt-auto">
        <button className="grid h-9 w-9 place-items-center rounded-[3px] text-[color:var(--color-ink-3)] hover:bg-[color:var(--color-paper-3)] hover:text-[color:var(--color-ink)]">
          <RailIcon id="help" />
        </button>
      </div>
    </aside>
  );
}

function RailIcon({ id }: { id: string }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'home':   return <svg {...props}><path d="M3 11l9-8 9 8" /><path d="M5 9v12h14V9" /></svg>;
    case 'people': return <svg {...props}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M21 19c0-2.5-1.8-4.5-4-4.5" /></svg>;
    case 'book':   return <svg {...props}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 4v13" /></svg>;
    case 'shield': return <svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></svg>;
    case 'chart':  return <svg {...props}><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></svg>;
    case 'globe':  return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>;
    case 'cog':    return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.8a7 7 0 0 0-1.7 1L5 6l-2 3.5L5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.4-.8a7 7 0 0 0 1.7 1L9.5 21h5l.4-2.8a7 7 0 0 0 1.7-1L19 18l2-3.5L19 13a7 7 0 0 0 0-1z" /></svg>;
    default:       return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 1 1 5.5 1.6c-.6 1-2.6 1.4-2.6 3.4M12 17h.01" /></svg>;
  }
}

/* ════════════════════════════════════════════════════════════════════
   SUB NAV  +  PAGE HEADER  +  INSIGHT BANNER
   ════════════════════════════════════════════════════════════════════ */

function SubNav() {
  const tabs = ['All trainees', 'In training', 'Deployed', 'In monitoring', 'Completed', 'At risk'];
  return (
    <div className="border-b border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]">
      <div className="mx-auto flex max-w-[1480px] items-center gap-1 overflow-x-auto px-6 lg:px-8">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={`relative whitespace-nowrap px-3 py-3 text-[12.5px] transition-colors ${
              i === 0 ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-3)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            {t}
            {i === 0 && <span className="absolute inset-x-3 bottom-0 block h-[2px] bg-[color:var(--color-sgs)]" />}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-2 py-2 md:flex">
          <RangeButton label="7 D" />
          <RangeButton label="30 D" active />
          <RangeButton label="QTD" />
          <RangeButton label="YTD" />
          <RangeButton label="Custom" />
        </div>
      </div>
    </div>
  );
}

function RangeButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`mono rounded-[2px] border px-2.5 py-1 text-[10.5px] tracking-[0.18em] uppercase transition-colors ${
        active
          ? 'border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]'
          : 'border-[color:var(--color-rule-soft)] text-[color:var(--color-ink-2)] hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]'
      }`}
    >
      {label}
    </button>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 pt-6 md:flex-row md:items-end">
      <div>
        <div className="mono flex items-center gap-2 text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
          <a href="/" className="hover:text-[color:var(--color-ink)]">SGS Training</a>
          <span aria-hidden>›</span>
          <a href="#" className="hover:text-[color:var(--color-ink)]">Operations</a>
          <span aria-hidden>›</span>
          <span className="text-[color:var(--color-ink)]">Overview</span>
        </div>
        <h1 className="display mt-3 text-[clamp(2.1rem,3.7vw,3.3rem)] text-[color:var(--color-ink)]">
          Workforce Training,{' '}
          <span className="serif-italic text-[color:var(--color-sgs-ink)]">Operations</span>
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[color:var(--color-ink-2)]">
          1,284 trainees · 27 courses · 12 oil &amp; gas operators · last sync <span className="tabular">12.06.2026 · 06:00 GST</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="inline-flex items-center gap-2 rounded-[2px] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-3 py-2 text-[12.5px] text-[color:var(--color-ink)] hover:border-[color:var(--color-ink)]">
          <span aria-hidden className="mono">⤓</span> Export PDF
        </button>
        <button className="inline-flex items-center gap-2 rounded-[2px] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-3 py-2 text-[12.5px] text-[color:var(--color-ink)] hover:border-[color:var(--color-ink)]">
          <span aria-hidden className="mono">↗</span> Share with auditor
        </button>
        <button className="inline-flex items-center gap-2 rounded-[2px] bg-[color:var(--color-sgs)] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[color:var(--color-sgs-bright)]">
          New programme
          <span aria-hidden className="mono">+</span>
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   KPI STRIP
   ════════════════════════════════════════════════════════════════════ */

type Kpi = {
  label: string;
  value: string;
  unit?: string;
  delta: number;
  series: number[];
  ctx: string;
};

const kpis: Kpi[] = [
  { label: 'Active trainees',     value: '1,284', delta: 12.4,  series: gen(20, 1140, 1290, 7),  ctx: 'enrolled · in-country' },
  { label: 'New enrolments, 30 d', value: '418',  delta: 8.1,   series: gen(30, 80, 220, 6),     ctx: 'across 27 courses' },
  { label: 'Avg. progress',       value: '88.7',  unit: '%', delta: 0.6, series: gen(30, 84, 92, 5), ctx: 'course completion' },
  { label: 'Pass rate',           value: '94.3',  unit: '%', delta: -1.2, series: gen(30, 92, 97, 4), ctx: '7-day rolling' },
  { label: 'Deployed to operators', value: '486', delta: 8.0,  series: gen(30, 300, 520, 3),    ctx: 'on oil & gas sites' },
  { label: 'In monitoring · 30 d', value: '218',  delta: 14.0,  series: gen(30, 130, 230, 9),    ctx: 'post-deployment' },
];

function KpiCard({ k, idx }: { k: Kpi; idx: number }) {
  const up = k.delta >= 0;
  return (
    <motion.article
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
      className="surface surface-hover group flex items-center gap-4 rounded-[3px] px-4 py-3.5"
    >
      <div className="min-w-0 flex-1">
        <p className="mono text-[9.5px] tracking-[0.2em] text-[color:var(--color-ink-3)] uppercase">
          {k.label}
        </p>
        <div className="mt-1 flex items-baseline gap-1">
          <CountUp target={parseFloat(k.value.replace(/,/g, ''))} display={k.value} />
          {k.unit && <span className="text-[13px] text-[color:var(--color-ink-2)]">{k.unit}</span>}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px]">
          <span
            className={`mono inline-flex items-center gap-0.5 rounded-[2px] px-1 py-0.5 tabular ${
              up
                ? 'bg-[color:var(--color-sgs)]/10 text-[color:var(--color-sgs-ink)]'
                : 'bg-[oklch(0.94_0.04_25)] text-[oklch(0.45_0.16_28)]'
            }`}
          >
            <span aria-hidden>{up ? '↑' : '↓'}</span>
            {Math.abs(k.delta).toFixed(k.delta % 1 === 0 ? 0 : 1)}%
          </span>
          <span className="truncate text-[color:var(--color-ink-3)]">{k.ctx}</span>
        </div>
      </div>
      <div className="w-20 shrink-0">
        <Sparkline data={k.series} positive={up} />
      </div>
    </motion.article>
  );
}

function CountUp({ target, display }: { target: number; display: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const dur = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // honour formatting in display
  let out: string;
  if (display.includes(',')) out = Math.round(v).toLocaleString('en-US');
  else if (display.includes('.')) out = v.toFixed(2);
  else out = Math.round(v).toString();

  return (
    <span
      style={{ fontFamily: 'var(--font-display)' }}
      className="tabular text-[clamp(1.8rem,2.4vw,2.3rem)] font-bold leading-none tracking-[-0.02em] text-[color:var(--color-ink)]"
    >
      {out}
    </span>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 200, h = 36, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = (pts.split(' ').at(-1) ?? '0,0').split(',');
  const stroke = positive ? 'var(--color-sgs)' : 'oklch(0.55 0.18 28)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block h-10 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={stroke} />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COMPLETIONS CHART  (with crosshair + tooltip)
   ════════════════════════════════════════════════════════════════════ */

function CompletionsChart() {
  const series = useMemo(() => gen(56, 60, 240, 11), []);
  const benchmark = useMemo(() => series.map((_, i) => 120 + Math.sin(i / 6) * 10), [series]);
  const w = 800, h = 280, pad = { l: 36, r: 16, t: 24, b: 28 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const max = 260, min = 0;

  const xy = (i: number, v: number): [number, number] => [
    pad.l + (i / (series.length - 1)) * innerW,
    pad.t + (1 - (v - min) / (max - min)) * innerH,
  ];

  const [hover, setHover] = useState<number | null>(null);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * w;
    const i = Math.round(((x - pad.l) / innerW) * (series.length - 1));
    if (i >= 0 && i < series.length) setHover(i);
  };

  const linePts = series.map((v, i) => xy(i, v).map((n) => n.toFixed(1)).join(',')).join(' ');
  const benchPts = benchmark.map((v, i) => xy(i, v).map((n) => n.toFixed(1)).join(',')).join(' ');
  const areaPath =
    `M ${xy(0, series[0] ?? 0)[0]} ${pad.t + innerH} ` +
    series.map((v, i) => `L ${xy(i, v)[0].toFixed(1)} ${xy(i, v)[1].toFixed(1)}`).join(' ') +
    ` L ${xy(series.length - 1, 0)[0]} ${pad.t + innerH} Z`;

  const total = series.reduce((s, v) => s + v, 0);
  const peakIdx = series.indexOf(Math.max(...series));
  const [peakX, peakY] = xy(peakIdx, series[peakIdx] ?? 0);

  // anomaly: pick a dip
  const anomalyIdx = series.indexOf(Math.min(...series.slice(20, 40))) || 30;
  const [anX, anY] = xy(anomalyIdx, series[anomalyIdx] ?? 0);

  return (
    <Panel
      title="Completions vs. plan"
      subtitle={`${total.toLocaleString('en-US')} completions in the last 56 days · forecast +4,460`}
      idx="01"
      action={
        <div className="flex items-center gap-1.5">
          <Chip label="Plan" dot="var(--color-ink-3)" muted />
          <Chip label="Actual" dot="oklch(0.685 0.198 41)" />
          <Chip label="Anomaly" dot="oklch(0.55 0.18 28)" />
        </div>
      }
    >
      <div className="relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="block w-full"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.685 0.198 41 / 0.32)" />
              <stop offset="100%" stopColor="oklch(0.685 0.198 41 / 0)" />
            </linearGradient>
            <pattern id="diag" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.685 0.198 41 / 0.12)" strokeWidth="2" />
            </pattern>
          </defs>

          {[0, 1, 2, 3, 4].map((i) => {
            const y = pad.t + (i / 4) * innerH;
            const v = max - (i / 4) * (max - min);
            return (
              <g key={i}>
                <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-rule-soft)" strokeWidth="0.6" />
                <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="9" className="mono" fill="var(--color-ink-3)">{v}</text>
              </g>
            );
          })}

          {[0, 14, 28, 42, 55].map((i, idx) => {
            const x = pad.l + (i / (series.length - 1)) * innerW;
            const labels = ['12 Mar', '26 Mar', '09 Apr', '23 Apr', '07 May'];
            return (
              <text key={i} x={x} y={h - 10} fontSize="9" textAnchor="middle" className="mono" fill="var(--color-ink-3)">
                {labels[idx]}
              </text>
            );
          })}

          <motion.path
            d={areaPath}
            fill="url(#areaGrad)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0 }}
          />

          {/* highlighted weekend bands */}
          {[6, 13, 20, 27, 34, 41, 48].map((i) => {
            const [x] = xy(i, 0);
            const w2 = innerW / (series.length - 1);
            return <rect key={i} x={x} y={pad.t} width={w2 * 2} height={innerH} fill="oklch(0.20 0.012 50 / 0.025)" />;
          })}

          <polyline points={benchPts} fill="none" stroke="var(--color-ink-3)" strokeDasharray="3 4" strokeWidth="1.2" />

          <motion.polyline
            points={linePts}
            fill="none"
            stroke="oklch(0.685 0.198 41)"
            strokeWidth="1.8"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          />

          {/* peak annotation */}
          <g>
            <line x1={peakX} x2={peakX} y1={peakY} y2={peakY - 22} stroke="var(--color-ink)" strokeWidth="0.8" />
            <circle cx={peakX} cy={peakY} r="3" fill="oklch(0.685 0.198 41)" stroke="white" strokeWidth="1.5" />
            <rect x={peakX - 36} y={peakY - 40} width="72" height="20" rx="2" fill="var(--color-overlay)" />
            <text x={peakX} y={peakY - 26} fontSize="10" className="mono" textAnchor="middle" fill="white">
              PEAK · {series[peakIdx]}
            </text>
          </g>

          {/* anomaly marker */}
          <g>
            <circle cx={anX} cy={anY} r="9" fill="none" stroke="oklch(0.55 0.18 28)" strokeWidth="1">
              <animate attributeName="r" from="4" to="14" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.8" to="0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx={anX} cy={anY} r="3.5" fill="oklch(0.55 0.18 28)" stroke="white" strokeWidth="1.2" />
            <text x={anX + 8} y={anY - 6} fontSize="9.5" className="mono" fill="oklch(0.45 0.16 28)">
              -18% · 2 Apr
            </text>
          </g>

          {/* crosshair */}
          {hover !== null && (() => {
            const sv = series[hover] ?? 0;
            const bv = benchmark[hover] ?? 1;
            const [hx, hy] = xy(hover, sv);
            const dates = new Date(2026, 2, 12);
            dates.setDate(dates.getDate() + hover);
            const dStr = `${String(dates.getDate()).padStart(2, '0')} ${dates.toLocaleString('en', { month: 'short' })}`;
            return (
              <g>
                <line x1={hx} x2={hx} y1={pad.t} y2={pad.t + innerH} stroke="var(--color-ink)" strokeWidth="0.8" strokeDasharray="2 3" />
                <circle cx={hx} cy={hy} r="4" fill="white" stroke="oklch(0.685 0.198 41)" strokeWidth="2" />
                <g transform={`translate(${hx > w - 130 ? hx - 130 : hx + 10} ${hy - 38})`}>
                  <rect width="118" height="42" rx="3" fill="var(--color-overlay)" />
                  <text x="10" y="15" fontSize="9.5" className="mono" fill="oklch(1 0 0 / 0.55)" letterSpacing="1.5">{dStr.toUpperCase()}</text>
                  <text x="10" y="32" fontSize="14" fill="white" className="tabular">{sv}</text>
                  <text x="64" y="32" fontSize="10" className="mono" fill="oklch(0.685 0.198 41)">+{(((sv / bv) - 1) * 100).toFixed(1)}% vs plan</text>
                </g>
              </g>
            );
          })()}
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[color:var(--color-rule-soft)] pt-3 sm:grid-cols-4">
        {[
          ['Mean / day', '74.7'],
          ['Best day', '07.05 · 226'],
          ['vs plan', '+12.4%'],
          ['Forecast 30 d', '+4,460'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{k}</div>
            <div className="tabular mt-1 text-[14px] font-medium text-[color:var(--color-ink)]">{v}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COMPLIANCE DONUT
   ════════════════════════════════════════════════════════════════════ */

function ComplianceDonut() {
  const segs = [
    { label: 'PDO',        value: 34, color: 'var(--color-sgs)' },
    { label: 'OQ',         value: 22, color: 'var(--color-sgs-bright)' },
    { label: 'Oxy Oman',   value: 16, color: 'var(--color-sgs-deep)' },
    { label: 'Shell · bp', value: 16, color: 'var(--color-ink-2)' },
    { label: 'Others',     value: 12, color: 'var(--color-ink-4)' },
  ];
  const total = segs.reduce((s, x) => s + x.value, 0);
  const r = 70, c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <Panel title="Deployed by operator" subtitle="Trainees on oil & gas sites" idx="02">
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
        <div className="relative grid place-items-center">
          <svg viewBox="0 0 200 200" className="block h-[200px] w-[200px]">
            <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-paper-3)" strokeWidth="22" />
            {segs.map((s) => {
              const dash = (s.value / total) * c;
              const offset = c - (acc / total) * c;
              const el = (
                <motion.circle
                  key={s.label}
                  cx="100" cy="100" r={r}
                  fill="none" stroke={s.color}
                  strokeWidth="22"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={offset}
                  transform="rotate(-90 100 100)"
                  initial={{ strokeDasharray: `0 ${c}` }}
                  whileInView={{ strokeDasharray: `${dash} ${c - dash}` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.0, ease: [0.2, 0.8, 0.2, 1] }}
                />
              );
              acc += s.value;
              return el;
            })}
            <text x="100" y="96" textAnchor="middle" fontSize="30" className="serif" fill="var(--color-ink)">486</text>
            <text x="100" y="116" textAnchor="middle" fontSize="9" className="mono" fill="var(--color-ink-3)" letterSpacing="2">DEPLOYED</text>
          </svg>
        </div>
        <ul className="space-y-2">
          {segs.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="flex items-center gap-2">
                <span className="block h-2.5 w-2.5 rounded-[1px]" style={{ background: s.color }} />
                <span className="text-[color:var(--color-ink)]">{s.label}</span>
              </span>
              <span className="tabular text-[color:var(--color-ink-2)]">{s.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   OMAN MINI MAP  (live pings)
   ════════════════════════════════════════════════════════════════════ */

const OMAN_MINI =
  'M260 90 L320 70 L380 80 L430 100 L470 130 L500 170 L515 220 ' +
  'L515 280 L495 330 L475 380 L445 425 L405 460 L350 480 L300 478 ' +
  'L268 460 L250 430 L246 395 L256 360 L280 330 L305 305 L322 270 ' +
  'L308 240 L278 220 L250 200 L232 170 L226 140 L242 110 Z';
const MUSANDAM_MINI = 'M335 35 L375 30 L395 55 L370 70 L342 64 Z';

const omanHubs = [
  { name: 'Muscat',  x: 410, y: 158, hq: true,  staff: 612, sector: 'SGS HQ' },
  { name: 'Sohar',   x: 365, y: 110,            staff: 184, sector: 'OQ'      },
  { name: 'Sur',     x: 470, y: 200,            staff: 96,  sector: 'bp LNG'  },
  { name: 'Nizwa',   x: 350, y: 220,            staff: 64,  sector: 'Daleel'  },
  { name: 'Duqm',    x: 420, y: 340,            staff: 188, sector: 'OQ Ref.' },
  { name: 'Salalah', x: 310, y: 460,            staff: 96,  sector: 'Shell'   },
];

function OmanMiniMap() {
  // simulate live "events" cycling through hubs
  const [activeHub, setActiveHub] = useState(0);
  useVisibleInterval(() => setActiveHub((i) => (i + 1) % omanHubs.length), 1800);

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <Panel
      title="Deployments across Oman"
      subtitle="Trainees on operator sites · live"
      idx="03"
      action={
        <span className="mono inline-flex items-center gap-1.5 rounded-[2px] border border-[color:var(--color-sgs)]/30 bg-[color:var(--color-sgs)]/10 px-1.5 py-0.5 text-[10px] tracking-[0.18em] text-[color:var(--color-sgs-ink)] uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-sgs)]" />
          Streaming
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <svg viewBox="0 0 600 520" className="block w-full">
            <defs>
              <pattern id="gridMini" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--color-rule-soft)" strokeWidth="0.5" />
              </pattern>
              <radialGradient id="omanGlowMini" cx="50%" cy="40%" r="55%">
                <stop offset="0%" stopColor="oklch(0.685 0.198 41 / 0.18)" />
                <stop offset="100%" stopColor="oklch(0.685 0.198 41 / 0)" />
              </radialGradient>
            </defs>

            <rect width="600" height="520" fill="url(#gridMini)" />
            <ellipse cx="370" cy="280" rx="240" ry="220" fill="url(#omanGlowMini)" />

            <path d={OMAN_MINI} fill="var(--color-paper-3)" stroke="var(--color-ink-3)" strokeWidth="1" strokeLinejoin="round" />
            <path d={MUSANDAM_MINI} fill="var(--color-paper-3)" stroke="var(--color-ink-4)" strokeWidth="1" strokeLinejoin="round" />

            {/* connection lines from HQ to other hubs */}
            {omanHubs.slice(1).map((h, i) => (
              <motion.line
                key={h.name}
                x1={omanHubs[0]?.x} y1={omanHubs[0]?.y}
                x2={h.x} y2={h.y}
                stroke="oklch(0.685 0.198 41 / 0.22)"
                strokeWidth="0.8"
                strokeDasharray="2 4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.0, delay: 0.2 + i * 0.08 }}
              />
            ))}

            {/* moving particle on the active connection (HQ → activeHub) */}
            {activeHub > 0 && (() => {
              const from = omanHubs[0], to = omanHubs[activeHub];
              if (!from || !to) return null;
              return (
                <circle r="3" fill="oklch(0.685 0.198 41)">
                  <animate attributeName="cx" from={from.x} to={to.x} dur="1.6s" repeatCount="1" />
                  <animate attributeName="cy" from={from.y} to={to.y} dur="1.6s" repeatCount="1" />
                  <animate attributeName="opacity" values="0;1;1;0" dur="1.6s" repeatCount="1" />
                </circle>
              );
            })()}

            {/* hubs */}
            {omanHubs.map((h, i) => {
              const isActive = i === activeHub;
              const isHover = i === hovered;
              return (
                <g key={h.name} transform={`translate(${h.x} ${h.y})`} onPointerEnter={() => setHovered(i)} onPointerLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                  {(isActive || isHover) && (
                    <circle r="4" fill="none" stroke="oklch(0.685 0.198 41 / 0.7)" strokeWidth="1.2">
                      <animate attributeName="r" from="4" to="22" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.8" to="0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r={h.hq ? 6 : 3.5} fill={h.hq ? 'oklch(0.685 0.198 41)' : 'var(--color-ink)'} stroke="white" strokeWidth="1.5" />
                  {h.hq && <circle r="11" fill="none" stroke="oklch(0.685 0.198 41)" strokeWidth="1" />}
                  <text x={h.hq ? 14 : 8} y={h.hq ? -10 : 4} fontSize="11" fill="var(--color-ink)" className="serif">{h.name}</text>
                  {!h.hq && <text x="8" y="16" fontSize="8" className="mono" fill="var(--color-ink-3)" letterSpacing="1">{h.sector.toUpperCase()}</text>}
                </g>
              );
            })}

            {/* compass rose */}
            <g transform="translate(550 470)" stroke="var(--color-ink-2)" fill="none">
              <circle r="14" />
              <line x1="0" y1="-14" x2="0" y2="-20" />
              <text x="0" y="-24" textAnchor="middle" fill="var(--color-ink-2)" fontSize="9" className="mono">N</text>
            </g>
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <div className="mono text-[10px] tracking-[0.2em] text-[color:var(--color-ink-3)] uppercase">Operator sites</div>
          {omanHubs.map((h, i) => (
            <button
              key={h.name}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              className={`flex items-center justify-between gap-3 rounded-[2px] border px-2.5 py-2 text-left text-[12px] transition-colors ${
                i === activeHub
                  ? 'border-[color:var(--color-sgs)]/40 bg-[color:var(--color-sgs)]/8'
                  : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] hover:border-[color:var(--color-ink)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`block h-1.5 w-1.5 rounded-full ${i === activeHub ? 'bg-[color:var(--color-sgs)] animate-pulse' : 'bg-[color:var(--color-ink-4)]'}`} />
                <span className="text-[color:var(--color-ink)]">{h.name}</span>
                {h.hq && <span className="mono rounded-[2px] bg-[color:var(--color-ink)] px-1 text-[9px] tracking-[0.18em] text-[color:var(--color-paper)] uppercase">HQ</span>}
              </span>
              <span className="tabular text-[color:var(--color-ink-2)]">{h.staff}</span>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LIVE STREAM
   ════════════════════════════════════════════════════════════════════ */

type Event = {
  id: number;
  ts: string;
  type: 'pass' | 'retake' | 'enrol' | 'cert' | 'audit';
  who: string;
  what: string;
  hub: string;
};

const eventTemplates: Array<Omit<Event, 'id' | 'ts'>> = [
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

function LiveStream() {
  const [events, setEvents] = useState<Event[]>(() =>
    eventTemplates.slice(0, 6).map((t, i) => ({ ...t, id: i, ts: relTime(i * 3 + 5) })),
  );
  const idRef = useRef(eventTemplates.length);
  const [paused, setPaused] = useState(false);

  useVisibleInterval(() => {
    const t = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
    if (!t) return;
    idRef.current += 1;
    setEvents((prev) => [{ ...t, id: idRef.current, ts: 'just now' }, ...prev].slice(0, 8));
  }, 2200, !paused);

  return (
    <Panel
      title="Activity stream"
      subtitle="Auto-updating every ~2 s"
      idx="04"
      action={
        <button
          onClick={() => setPaused((p) => !p)}
          className="mono inline-flex items-center gap-1.5 rounded-[2px] border border-[color:var(--color-rule-soft)] px-2 py-1 text-[10px] tracking-[0.18em] uppercase hover:border-[color:var(--color-ink)]"
        >
          <span className={`block h-1.5 w-1.5 rounded-full ${paused ? 'bg-[color:var(--color-ink-3)]' : 'bg-[color:var(--color-sgs)] animate-pulse'}`} />
          {paused ? 'Resume' : 'Pause'}
        </button>
      }
    >
      <ul className="no-scrollbar relative h-full max-h-[280px] space-y-2.5 overflow-y-auto pr-1">
        <span aria-hidden className="absolute bottom-0 left-[7px] top-2 w-px bg-[color:var(--color-rule-soft)]" />
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative flex items-start gap-3 pl-0"
            >
              <span className={`mt-1 grid h-3.5 w-3.5 place-items-center rounded-full border-2 border-[color:var(--color-paper)] ${
                e.type === 'pass'   ? 'bg-[color:var(--color-sgs)]' :
                e.type === 'cert'   ? 'bg-[color:var(--color-sgs-deep)]' :
                e.type === 'enrol'  ? 'bg-[color:var(--color-ink)]' :
                e.type === 'audit'  ? 'bg-[oklch(0.45_0.16_28)]' :
                                      'bg-[oklch(0.55_0.18_28)]'
              }`} />
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] text-[color:var(--color-ink)]">
                    <span className="font-medium">{e.who}</span>{' '}
                    <span className="text-[color:var(--color-ink-2)]">{verbFor(e.type)}</span>{' '}
                    <span className="font-medium">{e.what}</span>
                  </span>
                  <span className="mono shrink-0 text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                    {e.ts}
                  </span>
                </div>
                <div className="mono mt-0.5 text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${
                    e.type === 'pass' ? 'bg-[color:var(--color-sgs)]' :
                    e.type === 'retake' ? 'bg-[oklch(0.55_0.18_28)]' :
                    'bg-[color:var(--color-ink-3)]'
                  }`} />
                  {e.type} · {e.hub}
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Panel>
  );
}

function verbFor(t: Event['type']) {
  switch (t) {
    case 'pass':   return 'passed';
    case 'retake': return 'requested retake of';
    case 'enrol':  return 'enrolled in';
    case 'cert':   return 'deployed to';
    case 'audit':  return 'flagged for review at';
  }
}

function relTime(secs: number) {
  if (secs < 60) return `${secs} s ago`;
  return `${Math.floor(secs / 60)} m ago`;
}

/* ════════════════════════════════════════════════════════════════════
   PROGRAMME FUNNEL  (sankey-ish)
   ════════════════════════════════════════════════════════════════════ */

function ProgrammeFunnel() {
  const stages = [
    { label: 'Enrolled',    value: 5240 },
    { label: 'Started',     value: 4920 },
    { label: 'Mid-module',  value: 4612 },
    { label: 'Assessed',    value: 4310 },
    { label: 'Certified',   value: 4068 },
    { label: 'Deployed',    value: 3980 },
  ];
  const max = stages[0]?.value ?? 1;
  const w = 800, h = 220;
  const slot = w / stages.length;

  const points = (idx: number) => {
    const a = stages[idx];
    const b = stages[idx + 1];
    if (!a || !b) return '';
    const ax = idx * slot + slot * 0.55;
    const bx = (idx + 1) * slot + slot * 0.55;
    const aTop = h / 2 - (a.value / max) * (h / 2 - 6);
    const aBot = h / 2 + (a.value / max) * (h / 2 - 6);
    const bTop = h / 2 - (b.value / max) * (h / 2 - 6);
    const bBot = h / 2 + (b.value / max) * (h / 2 - 6);
    const cx = (ax + bx) / 2;
    return `M ${ax} ${aTop} C ${cx} ${aTop} ${cx} ${bTop} ${bx} ${bTop} L ${bx} ${bBot} C ${cx} ${bBot} ${cx} ${aBot} ${ax} ${aBot} Z`;
  };

  return (
    <Panel
      title="Enrolment → deployment funnel"
      subtitle="Across all courses · last 30 days"
      idx="05"
    >
      <svg viewBox={`0 0 ${w} ${h + 40}`} className="block w-full">
        <defs>
          <linearGradient id="funnelGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="oklch(0.685 0.198 41 / 0.7)" />
            <stop offset="100%" stopColor="oklch(0.555 0.180 38 / 0.5)" />
          </linearGradient>
        </defs>

        {stages.map((_, i) =>
          i < stages.length - 1 ? (
            <motion.path
              key={i}
              d={points(i)}
              fill="url(#funnelGrad)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
            />
          ) : null,
        )}

        {stages.map((s, i) => {
          const x = i * slot + slot * 0.55;
          const top = h / 2 - (s.value / max) * (h / 2 - 6);
          const bot = h / 2 + (s.value / max) * (h / 2 - 6);
          const prev = stages[i - 1];
          const drop = prev ? Math.round(((prev.value - s.value) / prev.value) * 1000) / 10 : 0;
          return (
            <g key={s.label}>
              <line x1={x} y1={top} x2={x} y2={bot} stroke="var(--color-ink)" strokeWidth="2" />
              <text x={x} y={top - 14} textAnchor="middle" fontSize="14" className="tabular" fill="var(--color-ink)">
                {s.value.toLocaleString('en-US')}
              </text>
              <text x={x} y={top - 28} textAnchor="middle" fontSize="9" className="mono" fill="var(--color-ink-3)" letterSpacing="2">
                {s.label.toUpperCase()}
              </text>
              {i > 0 && (
                <text x={x} y={bot + 18} textAnchor="middle" fontSize="10" className="mono" fill="oklch(0.55 0.18 28)">
                  -{drop}%
                </text>
              )}
            </g>
          );
        })}

        <line x1="0" x2={w} y1={h - 1} y2={h - 1} stroke="var(--color-rule-soft)" />
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[color:var(--color-rule-soft)] pt-3 sm:grid-cols-4">
        {[
          ['Conversion', '75.9%'],
          ['Drop-off · worst', 'Mid → Assessed'],
          ['Median time-to-cert', '11.4 d'],
          ['vs. last 30 d', '+1.6 pts'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{k}</div>
            <div className="tabular mt-1 text-[14px] font-medium text-[color:var(--color-ink)]">{v}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GAUGE
   ════════════════════════════════════════════════════════════════════ */

function Gauge() {
  const value = 99.94; // %
  const min = 99, max = 100;
  const pct = (value - min) / (max - min);
  const start = -110, end = 110;
  const angle = start + (end - start) * pct;

  const arc = (from: number, to: number, color: string, w = 12) => {
    const r = 70;
    const a1 = (from * Math.PI) / 180;
    const a2 = (to * Math.PI) / 180;
    const x1 = 100 + r * Math.sin(a1);
    const y1 = 100 - r * Math.cos(a1);
    const x2 = 100 + r * Math.sin(a2);
    const y2 = 100 - r * Math.cos(a2);
    const large = to - from > 180 ? 1 : 0;
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };

  return (
    <Panel title="Record integrity" subtitle="Trainee tracking uptime · 12 mo." idx="06">
      <div className="grid place-items-center">
        <svg viewBox="0 0 200 140" className="block w-full max-w-[220px]">
          {arc(start, end, 'var(--color-paper-3)')}
          <motion.g
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4 }}
          >
            {arc(start, angle, 'oklch(0.685 0.198 41)')}
          </motion.g>
          {/* ticks */}
          {Array.from({ length: 11 }).map((_, i) => {
            const a = start + (i / 10) * (end - start);
            const a1 = (a * Math.PI) / 180;
            const r1 = 80, r2 = 86;
            return (
              <line
                key={i}
                x1={100 + r1 * Math.sin(a1)}
                y1={100 - r1 * Math.cos(a1)}
                x2={100 + r2 * Math.sin(a1)}
                y2={100 - r2 * Math.cos(a1)}
                stroke="var(--color-ink-3)"
                strokeWidth="0.8"
              />
            );
          })}
          <text x="100" y="98" textAnchor="middle" fontSize="32" className="serif tabular" fill="var(--color-ink)">
            {value}
          </text>
          <text x="100" y="118" textAnchor="middle" fontSize="9" className="mono" fill="var(--color-ink-3)" letterSpacing="2">
            % TRACKED
          </text>
        </svg>
        <div className="mt-1 grid w-full grid-cols-3 gap-2 text-center">
          {[['Target', '99.9'], ['Sync', '6 m'], ['Gaps', '2']].map(([k, v]) => (
            <div key={k}>
              <div className="mono text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{k}</div>
              <div className="tabular mt-1 text-[13px] font-medium text-[color:var(--color-ink)]">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HUB BAR CHART
   ════════════════════════════════════════════════════════════════════ */

function HubBarChart() {
  const data = [
    { hub: 'PDO',      active: 186, due: 24 },
    { hub: 'OQ',       active: 142, due: 18 },
    { hub: 'Oxy Oman', active: 78,  due: 12 },
    { hub: 'Shell',    active: 64,  due: 9  },
    { hub: 'bp',       active: 52,  due: 7  },
    { hub: 'Daleel',   active: 38,  due: 5  },
  ];
  const max = Math.max(...data.map((d) => d.active));

  return (
    <Panel title="Trainees by operator" subtitle="Deployed · review due (30 d)" idx="07">
      <ul className="space-y-3">
        {data.map((d, i) => (
          <li key={d.hub} className="group cursor-pointer rounded-[2px] -mx-1 px-1 py-0.5 transition-colors hover:bg-[color:var(--color-paper-2)]" title={`${d.hub} · ${d.active} deployed · ${d.due} reviews due in 30 days · ${((d.due/d.active)*100).toFixed(1)}% review load`}>
            <div className="flex items-baseline justify-between text-[12.5px]">
              <span className="text-[color:var(--color-ink)]">{d.hub}</span>
              <span className="tabular text-[color:var(--color-ink-2)]">
                {d.active} <span className="mono text-[10.5px] text-[color:var(--color-ink-3)]">·</span>{' '}
                <span className="text-[color:var(--color-sgs-ink)]">{d.due} due</span>
              </span>
            </div>
            <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--color-paper-3)]">
              <motion.div
                className="absolute inset-y-0 left-0 h-full bg-[color:var(--color-sgs)]"
                initial={{ width: 0 }}
                whileInView={{ width: `${(d.active / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
              />
              <motion.div
                className="absolute inset-y-0 left-0 h-full bg-[color:var(--color-sgs-deep)]/70"
                initial={{ width: 0 }}
                whileInView={{ width: `${(d.due / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.05 + 0.15 }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SECTOR RADAR
   ════════════════════════════════════════════════════════════════════ */

function SectorRadar() {
  const axes = ['Drilling', 'Safety', 'E&I', 'Mechanical', 'Ops', 'Lifting'];
  const current = [88, 76, 64, 52, 81, 72];
  const target =  [90, 80, 70, 60, 85, 80];
  const cx = 130, cy = 130, r = 92;
  const points = (vals: number[]) =>
    vals.map((v, i) => {
      const a = (Math.PI * 2 * i) / vals.length - Math.PI / 2;
      const rr = (v / 100) * r;
      return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
    }).join(' ');

  return (
    <Panel title="Course readiness" subtitle="Avg progress vs. target" idx="08">
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[260px_1fr]">
        <svg viewBox="0 0 260 260" className="block w-full">
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <polygon
              key={s}
              points={axes.map((_, i) => {
                const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
                return `${cx + Math.cos(a) * r * s},${cy + Math.sin(a) * r * s}`;
              }).join(' ')}
              fill="none" stroke="var(--color-rule-soft)" strokeWidth="0.6"
            />
          ))}
          {axes.map((label, i) => {
            const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
            const x = cx + Math.cos(a) * (r + 14);
            const y = cy + Math.sin(a) * (r + 14);
            return (
              <text key={label} x={x} y={y + 3} fontSize="9.5" textAnchor="middle" className="mono" fill="var(--color-ink-2)" letterSpacing="1">
                {label.toUpperCase()}
              </text>
            );
          })}
          <polygon points={points(target)} fill="oklch(0.20 0.012 50 / 0.06)" stroke="oklch(0.20 0.012 50 / 0.5)" strokeDasharray="3 3" strokeWidth="1" />
          <motion.polygon
            points={points(current)}
            fill="oklch(0.685 0.198 41 / 0.18)"
            stroke="oklch(0.685 0.198 41)"
            strokeWidth="1.6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          {current.map((v, i) => {
            const a = (Math.PI * 2 * i) / current.length - Math.PI / 2;
            const rr = (v / 100) * r;
            return <circle key={i} cx={cx + Math.cos(a) * rr} cy={cy + Math.sin(a) * rr} r="2.5" fill="oklch(0.685 0.198 41)" />;
          })}
        </svg>
        <ul className="space-y-1.5 text-[12px]">
          {axes.map((label, i) => (
            <li key={label} className="flex items-center justify-between gap-2 border-b border-[color:var(--color-rule-soft)] pb-1.5">
              <span className="text-[color:var(--color-ink)]">{label}</span>
              <span className="tabular flex items-center gap-2">
                <span className="text-[color:var(--color-sgs-ink)]">{current[i]}</span>
                <span className="text-[color:var(--color-ink-3)]">/ {target[i]}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   RENEWALS
   ════════════════════════════════════════════════════════════════════ */

function RenewalsCountdown() {
  const items = [
    { code: 'PDO · Well Control', count: 24, days: 4,  pri: 'critical' as const },
    { code: 'OQ · HSE & H2S',     count: 18, days: 9,  pri: 'high' as const },
    { code: 'bp · Mechanical',    count: 16, days: 12, pri: 'high' as const },
    { code: 'Shell · E&I',        count: 12, days: 18, pri: 'med' as const },
    { code: 'Oxy · Operations',   count: 9,  days: 24, pri: 'med' as const },
    { code: 'Daleel · Rigging',   count: 7,  days: 30, pri: 'low' as const },
  ];
  const tone: Record<string, string> = {
    critical: 'oklch(0.55 0.18 28)',
    high:     'oklch(0.685 0.198 41)',
    med:      'oklch(0.555 0.180 38)',
    low:      'var(--color-ink-2)',
  };
  return (
    <Panel title="30-day reviews due" subtitle="Deployed trainees · by operator" idx="09">
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.code} className="flex items-center justify-between gap-3 border-b border-[color:var(--color-rule-soft)] pb-3 last:border-b-0 last:pb-0">
            <div>
              <div className="text-[13px] font-medium text-[color:var(--color-ink)]">{it.code}</div>
              <div className="mono mt-0.5 text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                {it.count} trainees
              </div>
            </div>
            <div className="text-right">
              <div className="tabular text-[18px] font-medium" style={{ color: tone[it.pri] }}>
                {it.days}
                <span className="ml-0.5 text-[10px] text-[color:var(--color-ink-3)]">d</span>
              </div>
              <div className="mono text-[9px] tracking-[0.18em] uppercase" style={{ color: tone[it.pri] }}>
                {it.pri}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ACTIVITY LEDGER
   ════════════════════════════════════════════════════════════════════ */

const activityRows: Array<[string, string, string, string, string, string, 'Pass' | 'Retake' | 'New']> = [
  ['07.05.2026', '14:08:22Z', 'N. Al-Hinai',     'ISO 17025 · M14',  'Muscat',   '96.4%', 'Pass'],
  ['07.05.2026', '13:51:04Z', 'F. Al-Balushi',   'API 510 · M02',    'Sohar',    '92.1%', 'Pass'],
  ['07.05.2026', '13:18:39Z', 'M. Al-Riyami',    'IATF 16949 · M11', 'Muscat',   '94.2%', 'Pass'],
  ['07.05.2026', '12:46:11Z', 'S. Al-Lawati',    'ISO 17020 · M07',  'Duqm',     '91.6%', 'Pass'],
  ['07.05.2026', '11:30:55Z', 'R. Al-Habsi',     'NACE CIP-2 · M03', 'Salalah',  '64.0%', 'Retake'],
  ['07.05.2026', '10:14:08Z', 'A. Al-Saadi',     'GSO PVoC · M05',   'Muscat',   '89.3%', 'Pass'],
  ['07.05.2026', '09:02:43Z', 'K. Al-Zadjali',   'PDO HSE · M02',    'Sohar',    '92.1%', 'Pass'],
  ['07.05.2026', '08:38:17Z', 'H. Al-Maskari',   'API 570 · M01',    'Duqm',     '—',      'New'],
];

function ActivityLedger() {
  return (
    <Panel
      title="Recent assessments"
      subtitle="Live · cryptographically timestamped"
      idx="10"
      action={
        <button className="mono text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-2)] uppercase hover:text-[color:var(--color-ink)]">
          View all →
        </button>
      }
    >
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="mono text-[9.5px] tracking-[0.2em] text-[color:var(--color-ink-3)] uppercase">
              <th className="border-b border-[color:var(--color-rule-soft)] px-2 py-2 font-normal">Date</th>
              <th className="border-b border-[color:var(--color-rule-soft)] px-2 py-2 font-normal">Time UTC</th>
              <th className="border-b border-[color:var(--color-rule-soft)] px-2 py-2 font-normal">Person</th>
              <th className="border-b border-[color:var(--color-rule-soft)] px-2 py-2 font-normal">Module</th>
              <th className="hidden md:table-cell border-b border-[color:var(--color-rule-soft)] px-2 py-2 font-normal">Hub</th>
              <th className="border-b border-[color:var(--color-rule-soft)] px-2 py-2 text-right font-normal">Score</th>
              <th className="border-b border-[color:var(--color-rule-soft)] px-2 py-2 text-right font-normal">Result</th>
            </tr>
          </thead>
          <tbody>
            {activityRows.map((r, i) => (
              <tr key={i} className="border-b border-[color:var(--color-rule-soft)]/70 hover:bg-[color:var(--color-paper-2)]">
                <td className="tabular px-2 py-2.5 text-[color:var(--color-ink-2)]">{r[0]}</td>
                <td className="mono px-2 py-2.5 text-[11.5px] text-[color:var(--color-ink-3)]">{r[1]}</td>
                <td className="px-2 py-2.5 text-[color:var(--color-ink)]">{r[2]}</td>
                <td className="px-2 py-2.5 text-[color:var(--color-ink-2)]">{r[3]}</td>
                <td className="hidden md:table-cell px-2 py-2.5 text-[color:var(--color-ink-2)]">{r[4]}</td>
                <td className="tabular px-2 py-2.5 text-right font-medium text-[color:var(--color-ink)]">{r[5]}</td>
                <td className="px-2 py-2.5 text-right">
                  <ResultPill r={r[6]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ResultPill({ r }: { r: 'Pass' | 'Retake' | 'New' }) {
  const cls =
    r === 'Pass'
      ? 'border-[color:var(--color-sgs)]/30 bg-[color:var(--color-sgs)]/10 text-[color:var(--color-sgs-ink)]'
      : r === 'Retake'
      ? 'border-[oklch(0.55_0.18_28)]/30 bg-[oklch(0.95_0.04_25)] text-[oklch(0.45_0.16_28)]'
      : 'border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)] text-[color:var(--color-ink-2)]';
  return (
    <span className={`mono inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[10px] tracking-[0.18em] uppercase ${cls}`}>
      {r}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HEATMAP
   ════════════════════════════════════════════════════════════════════ */

function Heatmap() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = useMemo(() => {
    const out: number[][] = [];
    let seed = 12;
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      for (let w = 0; w < 16; w++) {
        seed = (seed * 9301 + 49297) % 233280;
        const r = seed / 233280;
        const base = d >= 5 ? 0.25 : 0.6;
        row.push(Math.min(1, base + r * 0.55));
      }
      out.push(row);
    }
    return out;
  }, []);

  return (
    <Panel title="Activity heatmap" subtitle="16 weeks · 7 days · UTC" idx="11">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-1 mono text-[9px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
          {days.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
          {data.flatMap((row, d) => row.map((v, w) => (
            <motion.div
              key={`${d}-${w}`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (d + w) * 0.008 }}
              className="aspect-square rounded-[2px]"
              style={{ background: `oklch(0.685 0.198 41 / ${0.08 + v * 0.85})` }}
              title={`Week ${w + 1} · ${days[d]}: ${(v * 240).toFixed(0)} completions`}
            />
          )))}
        </div>
      </div>
      <div className="mono mt-3 flex items-center justify-between text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
        <span>Less</span>
        <div className="flex items-center gap-[3px]">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <span key={v} className="block h-2.5 w-2.5 rounded-[2px]" style={{ background: `oklch(0.685 0.198 41 / ${v})` }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TOP PROGRAMMES
   ════════════════════════════════════════════════════════════════════ */

function TopProgrammes() {
  const rows = [
    { code: 'WC-201', title: 'Well Control — IWCF Level 3',          enrolled: 412, pass: 96, trend: 'up' as const, sector: 'Drilling', delta: 4.2 },
    { code: 'HS-302', title: 'HSE & H2S Field Safety — PDO Approved', enrolled: 388, pass: 94, trend: 'up' as const, sector: 'Safety', delta: 2.8 },
    { code: 'EI-118', title: 'Electrical & Instrumentation — CompEx', enrolled: 286, pass: 91, trend: 'flat' as const, sector: 'E&I', delta: 0.0 },
    { code: 'MP-112', title: 'Mechanical Integrity & Piping — API 510', enrolled: 244, pass: 88, trend: 'up' as const, sector: 'Mechanical', delta: 3.1 },
    { code: 'OR-061', title: 'Operations Readiness & Start-up',       enrolled: 218, pass: 92, trend: 'down' as const, sector: 'Operations', delta: 1.6 },
    { code: 'RL-070', title: 'Rigging & Lifting — LEEA',             enrolled: 142, pass: 86, trend: 'up' as const, sector: 'Lifting', delta: 5.4 },
  ];
  const arrow = { up: '↑', down: '↓', flat: '–' };
  const arrowColor = { up: 'oklch(0.55 0.16 145)', down: 'oklch(0.55 0.18 28)', flat: 'var(--color-ink-3)' };

  return (
    <Panel title="Top courses · 30 d" subtitle="By enrolment volume" idx="12" action={<Chip label="6 of 27" muted />}>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.code} className="grid grid-cols-[60px_1fr_60px_70px_60px] items-center gap-3 border-b border-[color:var(--color-rule-soft)] py-2.5 last:border-b-0">
            <span className="mono text-[11px] tabular tracking-[0.06em] text-[color:var(--color-ink-3)]">{r.code}</span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-[color:var(--color-ink)]">{r.title}</div>
              <div className="mono mt-0.5 text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{r.sector}</div>
            </div>
            <span className="tabular text-right text-[13px] text-[color:var(--color-ink)]">{r.enrolled}</span>
            <div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-paper-3)]">
                <div className="absolute inset-y-0 left-0 bg-[color:var(--color-sgs)]" style={{ width: `${r.pass}%` }} />
              </div>
              <div className="tabular mt-1 text-right text-[10.5px] text-[color:var(--color-ink-2)]">{r.pass}%</div>
            </div>
            <span className="mono text-right text-[11px] tabular" style={{ color: arrowColor[r.trend] }}>
              {arrow[r.trend]} {r.delta.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   RISK REGISTER
   ════════════════════════════════════════════════════════════════════ */

function RiskRegister() {
  const risks = [
    { id: 'T-014', text: 'PDO well-control trainee behind by 2 modules',     sev: 4, lik: 4, owner: 'F. Al-Balushi' },
    { id: 'T-021', text: 'Shell HSE deployment · 30-day review overdue',     sev: 3, lik: 4, owner: 'N. Al-Hinai' },
    { id: 'T-029', text: 'Process Safety retake rate 12.4% (target ≤ 8%)',   sev: 4, lik: 3, owner: 'R. Al-Habsi' },
    { id: 'T-033', text: 'Duqm site trainer-to-trainee ratio 1:48',          sev: 2, lik: 3, owner: 'A. Al-Saadi' },
    { id: 'T-041', text: 'OQ cohort progress behind by 6 days',              sev: 3, lik: 2, owner: 'L. Al-Mahrouqi' },
  ];
  return (
    <Panel title="At-risk trainees" subtitle="Severity × likelihood · on site" idx="13">
      <ul className="space-y-2.5">
        {risks.map((r) => {
          const score = r.sev * r.lik;
          const tone =
            score >= 12 ? 'oklch(0.55 0.18 28)' :
            score >= 9  ? 'oklch(0.685 0.198 41)' :
            score >= 6  ? 'oklch(0.555 0.180 38)' :
                          'var(--color-ink-2)';
          return (
            <li key={r.id} className="grid grid-cols-[70px_1fr_60px_44px] items-center gap-3 border-b border-[color:var(--color-rule-soft)] pb-2.5 last:border-b-0">
              <span className="mono text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{r.id}</span>
              <div>
                <div className="text-[13px] text-[color:var(--color-ink)]">{r.text}</div>
                <div className="mono mt-0.5 text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                  Mentor · {r.owner}
                </div>
              </div>
              <div className="flex justify-end gap-[3px]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="block h-3 w-1 rounded-[1px]" style={{ background: i < r.sev ? tone : 'var(--color-rule-soft)' }} />
                ))}
              </div>
              <span className="tabular text-right text-[14px] font-medium" style={{ color: tone }}>{score}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FOOTER STRIP
   ════════════════════════════════════════════════════════════════════ */

function FooterStrip() {
  return (
    <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-[3px] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] px-5 py-4 mono text-[10.5px] tracking-[0.2em] text-[color:var(--color-ink-3)] uppercase md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 text-[color:var(--color-ink-2)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-sgs)]" />
          Ledger nominal · 99.94% / 12 mo.
        </span>
        <span>Source · ops.sgs-oman.lr / v4.0.1</span>
        <span>Edition MCT-26</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Refresh · 60 s</span>
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--color-sgs)]" />
        <span>SHA-256 · 9d4a…f7c2</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COMMAND PALETTE
   ════════════════════════════════════════════════════════════════════ */

const paletteItems = [
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

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  const results = useMemo(
    () => paletteItems.filter((it) => `${it.kind} ${it.label} ${it.hint}`.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  useEffect(() => {
    setSel(0);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results.length, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-start bg-[color:var(--color-night)]/55 backdrop-blur-sm pt-[12vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -10, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto w-[640px] max-w-[92vw] overflow-hidden rounded-[6px] border border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] shadow-[0_30px_80px_-20px_oklch(0.158_0.014_50_/_0.5)]"
          >
            <div className="flex items-center gap-3 border-b border-[color:var(--color-rule-soft)] px-4 py-3">
              <span aria-hidden className="mono text-[14px] text-[color:var(--color-ink-3)]">⌕</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search programmes, people, hubs, actions…"
                className="flex-1 bg-transparent text-[14px] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-3)] focus:outline-none"
              />
              <span className="mono rounded-[2px] border border-[color:var(--color-rule-soft)] px-1.5 py-0.5 text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">ESC</span>
            </div>

            <ul className="max-h-[420px] overflow-y-auto py-2">
              {results.length === 0 && (
                <li className="px-4 py-8 text-center text-[13px] text-[color:var(--color-ink-3)]">
                  No matches for “{q}”.
                </li>
              )}
              {results.map((it, i) => {
                const active = i === sel;
                return (
                  <li
                    key={`${it.kind}-${it.label}`}
                    onMouseEnter={() => setSel(i)}
                    className={`mx-2 flex items-center justify-between gap-3 rounded-[3px] px-3 py-2 ${
                      active ? 'bg-[color:var(--color-paper-3)]' : ''
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="mono w-[68px] rounded-[2px] border border-[color:var(--color-rule-soft)] px-1.5 py-0.5 text-center text-[9.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                        {it.kind}
                      </span>
                      <span className="text-[13px] text-[color:var(--color-ink)]">{it.label}</span>
                    </span>
                    <span className="mono text-[10.5px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
                      {it.hint}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mono flex items-center justify-between gap-4 border-t border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper-2)] px-4 py-2 text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
              <span className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </span>
              <span>{results.length} of {paletteItems.length}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GALLERY · MORE CHARTS
   ════════════════════════════════════════════════════════════════════ */

function GalleryHeader() {
  return (
    <div className="mb-4 flex shrink-0 items-end justify-between gap-4 border-b border-[color:var(--color-rule-soft)] pb-3">
      <div>
        <div className="eyebrow">II · Deep analytics</div>
        <h2 className="display mt-2 text-[clamp(1.6rem,2.3vw,2.1rem)] text-[color:var(--color-ink)]">
          The full <span className="serif-italic text-[color:var(--color-sgs-ink)]">picture</span>
        </h2>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-2)]">
          Six focused views · bar · line · polar · scatter · range · grouped — the whole board at a glance
        </p>
      </div>
      <div className="hidden items-center gap-1.5 md:flex">
        <RangeButton label="Daily" />
        <RangeButton label="Weekly" active />
        <RangeButton label="Monthly" />
      </div>
    </div>
  );
}

/* ── Vertical bar (months) ─────────────────────────────────────────── */

function VerticalBarChart() {
  const data = [
    { m: 'Nov', v: 312 }, { m: 'Dec', v: 268 }, { m: 'Jan', v: 384 },
    { m: 'Feb', v: 356 }, { m: 'Mar', v: 412 }, { m: 'Apr', v: 478 },
    { m: 'May', v: 512 }, { m: 'Jun', v: 446 }, { m: 'Jul', v: 388 },
    { m: 'Aug', v: 432 }, { m: 'Sep', v: 502 }, { m: 'Oct', v: 540 },
  ];
  const w = 540, h = 260, pad = { l: 36, r: 12, t: 18, b: 28 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const max = 600;
  const bw = innerW / data.length;
  const { ref, tip, move, leave } = useTip<{ m: string; v: number }>();

  return (
    <Panel title="Monthly completions" subtitle="Last 12 months · vertical bars" idx="14"
      action={<Chip label="Avg 419" muted />}>
     <div ref={ref} className="relative lg:h-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block w-full lg:h-full">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = pad.t + (i / 4) * innerH;
          const v = max - (i / 4) * max;
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-rule-soft)" strokeWidth="0.6" />
              <text x={pad.l - 6} y={y + 3} fontSize="9" textAnchor="end" className="mono" fill="var(--color-ink-3)">{v}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * bw + bw * 0.18;
          const bh = (d.v / max) * innerH;
          const y = pad.t + innerH - bh;
          const isPeak = d.v === Math.max(...data.map((x) => x.v));
          return (
            <g key={d.m}>
              <motion.rect
                x={x} width={bw * 0.64}
                initial={{ y: pad.t + innerH, height: 0 }}
                whileInView={{ y, height: bh }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
                fill={isPeak ? 'oklch(0.685 0.198 41)' : 'var(--color-ink-2)'}
                rx="1"
                style={{ cursor: 'pointer' }}
                onPointerMove={move(d)}
                onPointerLeave={leave}
                whileHover={{ filter: 'brightness(1.15)' }}
              />
              {/* invisible hit area for full bar slot */}
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={innerH} fill="transparent"
                onPointerMove={move(d)} onPointerLeave={leave} style={{ cursor: 'pointer' }} />
              <text x={x + bw * 0.32} y={pad.t + innerH + 16} fontSize="9.5" className="mono" textAnchor="middle" fill="var(--color-ink-3)" pointerEvents="none">
                {d.m.toUpperCase()}
              </text>
              {isPeak && (
                <text x={x + bw * 0.32} y={y - 6} fontSize="10" className="tabular" textAnchor="middle" fill="oklch(0.685 0.198 41)" pointerEvents="none">
                  {d.v}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <div className="mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">{tip.data.m} · 2026</div>
          <div className="tabular mt-0.5 text-[14px]">{tip.data.v.toLocaleString()} completions</div>
        </TipBox>
      )}
     </div>
    </Panel>
  );
}

/* ── Multi-line (4 series) ─────────────────────────────────────────── */

function MultiLineChart() {
  const series = [
    { name: 'Energy',     color: 'oklch(0.685 0.198 41)', data: gen(28, 60, 120, 3) },
    { name: 'Maritime',   color: 'oklch(0.555 0.180 38)', data: gen(28, 50, 100, 9) },
    { name: 'Mining',     color: 'var(--color-ink-2)',  data: gen(28, 30, 80,  17) },
    { name: 'Construction', color: 'oklch(0.36 0.150 38)', data: gen(28, 40, 90, 23) },
  ];
  const w = 540, h = 260, pad = { l: 32, r: 12, t: 18, b: 28 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const max = 130, min = 0;
  const xy = (i: number, v: number, n: number): [number, number] => [
    pad.l + (i / (n - 1)) * innerW,
    pad.t + (1 - (v - min) / (max - min)) * innerH,
  ];
  const n = series[0]?.data.length ?? 0;
  const { ref, tip, move, leave } = useTip<{ i: number }>();
  const onSvgMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * w;
    const i = Math.round(((px - pad.l) / innerW) * (n - 1));
    if (i >= 0 && i < n) move({ i })(e);
  };

  return (
    <Panel title="Sectors · 4-week trend" subtitle="Multi-series line chart" idx="15"
      action={
        <div className="flex flex-wrap gap-1.5">
          {series.map((s) => <Chip key={s.name} label={s.name} dot={s.color} />)}
        </div>
      }>
     <div ref={ref} className="relative lg:h-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block w-full lg:h-full" onPointerMove={onSvgMove} onPointerLeave={leave}>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = pad.t + (i / 4) * innerH;
          return <line key={i} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-rule-soft)" strokeWidth="0.6" />;
        })}
        {series.map((s, si) => {
          const pts = s.data.map((v, i) => xy(i, v, s.data.length).map((n) => n.toFixed(1)).join(',')).join(' ');
          return (
            <motion.polyline
              key={s.name}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: si * 0.15 }}
            />
          );
        })}
        {/* end-of-line dots */}
        {series.map((s) => {
          const last = s.data.length - 1;
          const [x, y] = xy(last, s.data[last] ?? 0, s.data.length);
          return <circle key={s.name + 'd'} cx={x} cy={y} r="2.6" fill={s.color} />;
        })}
        {[0, 7, 14, 21, 27].map((i, idx) => {
          const labels = ['W-4', 'W-3', 'W-2', 'W-1', 'Now'];
          const x = pad.l + (i / 27) * innerW;
          return <text key={i} x={x} y={h - 10} fontSize="9" textAnchor="middle" className="mono" fill="var(--color-ink-3)">{labels[idx]}</text>;
        })}
        {tip && (() => {
          const i = tip.data.i;
          const x = pad.l + (i / (n - 1)) * innerW;
          return (
            <g pointerEvents="none">
              <line x1={x} x2={x} y1={pad.t} y2={pad.t + innerH} stroke="var(--color-ink)" strokeDasharray="2 3" strokeWidth="0.7" />
              {series.map((s) => {
                const [hx, hy] = xy(i, s.data[i] ?? 0, n);
                return <circle key={s.name} cx={hx} cy={hy} r="3.5" fill="white" stroke={s.color} strokeWidth="2" />;
              })}
            </g>
          );
        })()}
      </svg>
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <div className="mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">Day {tip.data.i + 1} · of {n}</div>
          <div className="mt-1 space-y-0.5">
            {series.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="tabular text-[11px]">{(s.data[tip.data.i] ?? 0).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </TipBox>
      )}
     </div>
    </Panel>
  );
}

/* ── Waterfall ─────────────────────────────────────────────────────── */

function WaterfallChart() {
  const steps: Array<{ label: string; v: number; type: 'total' | 'pos' | 'neg' }> = [
    { label: 'Q3 start',    v: 1180, type: 'total' },
    { label: 'New hires',   v: 142,  type: 'pos' },
    { label: 'Promotions',  v: 38,   type: 'pos' },
    { label: 'Departures',  v: -64,  type: 'neg' },
    { label: 'Retirements', v: -18,  type: 'neg' },
    { label: 'Transfers',   v: -38,  type: 'neg' },
    { label: 'Q4 end',      v: 1240, type: 'total' },
  ];
  const w = 360, h = 240, pad = { l: 30, r: 8, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const slot = innerW / steps.length;
  const max = 1300;
  let running = 0;
  return (
    <Panel title="Headcount waterfall" subtitle="Q3 → Q4 build" idx="16">
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
        {[0, 1, 2, 3].map((i) => {
          const y = pad.t + (i / 3) * innerH;
          return <line key={i} x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-rule-soft)" strokeWidth="0.6" />;
        })}
        {steps.map((s, i) => {
          const x = pad.l + i * slot + slot * 0.18;
          let yTop: number, bh: number, color: string;
          if (s.type === 'total') {
            running = s.v;
            bh = (s.v / max) * innerH;
            yTop = pad.t + innerH - bh;
            color = 'var(--color-ink)';
          } else if (s.v >= 0) {
            yTop = pad.t + innerH - ((running + s.v) / max) * innerH;
            bh = (s.v / max) * innerH;
            running += s.v;
            color = 'oklch(0.685 0.198 41)';
          } else {
            const top = running;
            running += s.v;
            yTop = pad.t + innerH - (top / max) * innerH;
            bh = ((-s.v) / max) * innerH;
            color = 'oklch(0.55 0.18 28)';
          }
          return (
            <g key={s.label}>
              <motion.rect
                x={x}
                width={slot * 0.64}
                initial={{ y: pad.t + innerH, height: 0 }}
                whileInView={{ y: yTop, height: bh }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                fill={color}
                rx="1"
              />
              {i < steps.length - 1 && (
                <line
                  x1={x + slot * 0.64} x2={x + slot}
                  y1={s.type === 'total' ? yTop : (s.v >= 0 ? yTop : yTop + bh)}
                  y2={s.type === 'total' ? yTop : (s.v >= 0 ? yTop : yTop + bh)}
                  stroke="var(--color-ink-2)" strokeDasharray="2 2" strokeWidth="0.7"
                />
              )}
              <text x={x + slot * 0.32} y={pad.t + innerH + 14} fontSize="8" className="mono" textAnchor="middle" fill="var(--color-ink-3)" letterSpacing="1">
                {s.label.toUpperCase()}
              </text>
              <text x={x + slot * 0.32} y={pad.t + innerH + 26} fontSize="9" className="tabular" textAnchor="middle"
                fill={s.type === 'total' ? 'var(--color-ink)' : (s.v >= 0 ? 'oklch(0.685 0.198 41)' : 'oklch(0.55 0.18 28)')}>
                {s.type === 'total' ? s.v : (s.v > 0 ? `+${s.v}` : s.v)}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

/* ── Scatter ───────────────────────────────────────────────────────── */

function ScatterChart() {
  const dots = useMemo(() => {
    let s = 41;
    return Array.from({ length: 36 }, (_, idx) => {
      s = (s * 9301 + 49297) % 233280;
      const x = (s / 233280);
      s = (s * 9301 + 49297) % 233280;
      const y = (s / 233280);
      s = (s * 9301 + 49297) % 233280;
      const r = (s / 233280);
      return {
        id: `C-${String(idx + 100).padStart(3, '0')}`,
        hours: 20 + x * 100,
        score: 60 + y * 38 + x * 12,
        size: 3 + r * 5,
      };
    });
  }, []);
  const w = 360, h = 240, pad = { l: 36, r: 12, t: 14, b: 32 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const { ref, tip, move, leave } = useTip<typeof dots[number]>();

  return (
    <Panel title="Hours vs. score" subtitle="Each dot = one cohort" idx="17">
     <div ref={ref} className="relative lg:h-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block w-full lg:h-full">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = pad.t + (i / 4) * innerH;
          const v = 100 - (i / 4) * 50;
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-rule-soft)" strokeWidth="0.6" />
              <text x={pad.l - 6} y={y + 3} fontSize="9" textAnchor="end" className="mono" fill="var(--color-ink-3)">{v}</text>
            </g>
          );
        })}
        {/* trend line */}
        <line
          x1={pad.l} y1={pad.t + innerH * 0.7}
          x2={w - pad.r} y2={pad.t + innerH * 0.18}
          stroke="var(--color-ink)" strokeDasharray="3 3" strokeWidth="0.8"
        />
        {dots.map((d, i) => {
          const x = pad.l + ((d.hours - 20) / 100) * innerW;
          const y = pad.t + (1 - (d.score - 60) / 50) * innerH;
          return (
            <motion.circle
              key={i}
              cx={x} cy={y}
              initial={{ r: 0, opacity: 0 }}
              whileInView={{ r: d.size, opacity: 0.78 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.012 }}
              fill="oklch(0.685 0.198 41 / 0.55)"
              stroke="oklch(0.685 0.198 41)"
              strokeWidth="1"
              style={{ cursor: 'pointer' }}
              onPointerMove={move(d)}
              onPointerLeave={leave}
              whileHover={{ scale: 1.4 }}
            />
          );
        })}
        <text x={pad.l + innerW / 2} y={h - 8} fontSize="9" textAnchor="middle" className="mono" fill="var(--color-ink-3)" letterSpacing="2">HOURS →</text>
        <text x={10} y={pad.t + innerH / 2} fontSize="9" className="mono" fill="var(--color-ink-3)" letterSpacing="2"
          transform={`rotate(-90 10 ${pad.t + innerH / 2})`}>SCORE %</text>
      </svg>
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <div className="mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">Cohort {tip.data.id}</div>
          <div className="tabular mt-0.5 text-[12px]">{tip.data.hours.toFixed(1)} h · {tip.data.score.toFixed(1)}%</div>
        </TipBox>
      )}
     </div>
    </Panel>
  );
}

/* ── Candle / range chart ──────────────────────────────────────────── */

function CandleRange() {
  const data = useMemo(() => {
    let s = 91;
    return Array.from({ length: 18 }, () => {
      s = (s * 9301 + 49297) % 233280; const a = s / 233280;
      s = (s * 9301 + 49297) % 233280; const b = s / 233280;
      const lo = 70 + a * 8;
      const hi = lo + 8 + b * 14;
      const open = lo + (hi - lo) * 0.3;
      const close = lo + (hi - lo) * 0.7;
      const up = b > 0.45;
      return { lo, hi, open, close, up };
    });
  }, []);
  const w = 360, h = 240, pad = { l: 30, r: 10, t: 16, b: 24 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const min = 60, max = 100;
  const yAt = (v: number) => pad.t + (1 - (v - min) / (max - min)) * innerH;
  const slot = innerW / data.length;
  const { ref, tip, move, leave } = useTip<{ i: number; lo: number; hi: number; open: number; close: number; up: boolean }>();

  return (
    <Panel title="Pass-rate range · 18 cohorts" subtitle="High · low · open · close" idx="18">
     <div ref={ref} className="relative lg:h-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block w-full lg:h-full">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = pad.t + (i / 4) * innerH;
          const v = max - (i / 4) * (max - min);
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-rule-soft)" strokeWidth="0.6" />
              <text x={pad.l - 6} y={y + 3} fontSize="9" textAnchor="end" className="mono" fill="var(--color-ink-3)">{v}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * slot + slot * 0.5;
          const color = d.up ? 'oklch(0.685 0.198 41)' : 'oklch(0.55 0.18 28)';
          const top = Math.min(d.open, d.close);
          const bot = Math.max(d.open, d.close);
          return (
            <motion.g key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.03 }}>
              <line x1={x} x2={x} y1={yAt(d.hi)} y2={yAt(d.lo)} stroke={color} strokeWidth="0.8" />
              <rect x={x - slot * 0.28} width={slot * 0.56}
                y={yAt(bot)} height={Math.max(2, yAt(top) - yAt(bot))}
                fill={d.up ? color : 'white'} stroke={color} strokeWidth="1" />
              <rect x={pad.l + i * slot} y={pad.t} width={slot} height={innerH}
                fill="transparent" style={{ cursor: 'pointer' }}
                onPointerMove={move({ i, ...d })} onPointerLeave={leave} />
            </motion.g>
          );
        })}
      </svg>
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <div className="mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">Cohort #{tip.data.i + 1}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <span className="text-white/60">High</span><span className="tabular text-right">{tip.data.hi.toFixed(1)}</span>
            <span className="text-white/60">Low</span><span className="tabular text-right">{tip.data.lo.toFixed(1)}</span>
            <span className="text-white/60">Open</span><span className="tabular text-right">{tip.data.open.toFixed(1)}</span>
            <span className="text-white/60">Close</span><span className="tabular text-right" style={{ color: tip.data.up ? 'oklch(0.78 0.18 145)' : 'oklch(0.78 0.18 28)' }}>{tip.data.close.toFixed(1)}</span>
          </div>
        </TipBox>
      )}
     </div>
    </Panel>
  );
}

/* ── Grouped bar ───────────────────────────────────────────────────── */

function GroupedBarChart() {
  const groups = ['Q1', 'Q2', 'Q3', 'Q4'];
  const series = [
    { name: 'Plan',     color: 'var(--color-ink-2)',  vals: [820, 980, 1120, 1240] },
    { name: 'Actual',   color: 'oklch(0.685 0.198 41)', vals: [842, 956, 1184, 1318] },
    { name: 'Forecast', color: 'oklch(0.555 0.180 38)', vals: [810, 990, 1180, 1340] },
  ];
  const w = 460, h = 260, pad = { l: 36, r: 10, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const max = 1400;
  const slot = innerW / groups.length;
  const { ref, tip, move, leave } = useTip<{ name: string; v: number; group: string; color: string }>();

  return (
    <Panel title="Quarter performance" subtitle="Plan · Actual · Forecast" idx="19"
      action={<div className="flex gap-1.5">{series.map((s) => <Chip key={s.name} label={s.name} dot={s.color} />)}</div>}>
     <div ref={ref} className="relative lg:h-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block w-full lg:h-full">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = pad.t + (i / 4) * innerH;
          const v = max - (i / 4) * max;
          return (
            <g key={i}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-rule-soft)" strokeWidth="0.6" />
              <text x={pad.l - 6} y={y + 3} fontSize="9" textAnchor="end" className="mono" fill="var(--color-ink-3)">{v}</text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const gx = pad.l + gi * slot;
          const bw = (slot * 0.7) / series.length;
          return (
            <g key={g}>
              {series.map((s, si) => {
                const v = s.vals[gi] ?? 0;
                const bh = (v / max) * innerH;
                const x = gx + slot * 0.15 + si * bw;
                const y = pad.t + innerH - bh;
                return (
                  <motion.rect
                    key={s.name}
                    x={x} width={bw - 2}
                    initial={{ y: pad.t + innerH, height: 0 }}
                    whileInView={{ y, height: bh }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: gi * 0.08 + si * 0.05 }}
                    fill={s.color}
                    rx="1"
                    style={{ cursor: 'pointer' }}
                    onPointerMove={move({ name: s.name, v, group: g, color: s.color })}
                    onPointerLeave={leave}
                    whileHover={{ filter: 'brightness(1.18)' }}
                  />
                );
              })}
              <text x={gx + slot / 2} y={pad.t + innerH + 18} fontSize="10" className="mono" textAnchor="middle" fill="var(--color-ink-2)" letterSpacing="2">
                {g}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <div className="mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">{tip.data.group} · {tip.data.name}</div>
          <div className="tabular mt-0.5 flex items-center gap-2 text-[14px]">
            <span className="block h-2 w-2 rounded-[1px]" style={{ background: tip.data.color }} />
            {tip.data.v.toLocaleString()}
          </div>
        </TipBox>
      )}
     </div>
    </Panel>
  );
}

/* ── Treemap ───────────────────────────────────────────────────────── */

function TreemapChart() {
  // Hand-laid squarified layout (precomputed for clarity)
  const items = [
    { name: 'API · NACE',         v: 412, x: 0,    y: 0,   w: 0.42, h: 0.55, c: 'oklch(0.685 0.198 41)' },
    { name: 'ISO 17025',          v: 268, x: 0.42, y: 0,   w: 0.30, h: 0.55, c: 'oklch(0.555 0.180 38)' },
    { name: 'IATF 16949',         v: 188, x: 0.72, y: 0,   w: 0.28, h: 0.32, c: 'oklch(0.36 0.150 38)' },
    { name: 'OAC',                v: 142, x: 0.72, y: 0.32, w: 0.28, h: 0.23, c: 'var(--color-ink-2)' },
    { name: 'PDO HSE',            v: 244, x: 0,    y: 0.55, w: 0.32, h: 0.45, c: 'oklch(0.685 0.198 41 / 0.85)' },
    { name: 'NACE CIP-2',         v: 184, x: 0.32, y: 0.55, w: 0.24, h: 0.45, c: 'oklch(0.555 0.180 38 / 0.85)' },
    { name: 'GSO PVoC',           v: 128, x: 0.56, y: 0.55, w: 0.20, h: 0.45, c: 'oklch(0.36 0.150 38 / 0.85)' },
    { name: 'IRCA',               v: 96,  x: 0.76, y: 0.55, w: 0.24, h: 0.22, c: 'oklch(0.40 0.010 55 / 0.85)' },
    { name: 'Other',              v: 64,  x: 0.76, y: 0.77, w: 0.24, h: 0.23, c: 'var(--color-ink-4)' },
  ];
  const W = 700, H = 260;
  const total = items.reduce((s, x) => s + x.v, 0);
  const { ref, tip, move, leave } = useTip<typeof items[number]>();

  return (
    <Panel title="Programme portfolio" subtitle="Treemap · sized by enrolment" idx="20">
     <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
        {items.map((it, i) => {
          const x = it.x * W + 1, y = it.y * H + 1;
          const w = it.w * W - 2, h = it.h * H - 2;
          return (
            <motion.g key={it.name}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              style={{ transformOrigin: `${x + w / 2}px ${y + h / 2}px`, cursor: 'pointer' }}
              onPointerMove={move(it)}
              onPointerLeave={leave}
              whileHover={{ filter: 'brightness(1.15)' }}
            >
              <rect x={x} y={y} width={w} height={h} fill={it.c} />
              <text x={x + 10} y={y + 18} fontSize="11" className="mono" fill="white" letterSpacing="1.5" pointerEvents="none">{it.name.toUpperCase()}</text>
              <text x={x + 10} y={y + 38} fontSize="20" className="tabular" fill="white" pointerEvents="none">{it.v}</text>
            </motion.g>
          );
        })}
      </svg>
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <div className="mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">{tip.data.name}</div>
          <div className="tabular mt-0.5 text-[14px]">{tip.data.v.toLocaleString()} programmes</div>
          <div className="mono text-[10px] text-white/60">{((tip.data.v/total)*100).toFixed(1)}% of portfolio</div>
        </TipBox>
      )}
     </div>
    </Panel>
  );
}

/* ── Polar bar (radial) ────────────────────────────────────────────── */

function PolarBarChart() {
  const data = [
    { day: 'Mon', v: 92 }, { day: 'Tue', v: 78 }, { day: 'Wed', v: 84 },
    { day: 'Thu', v: 88 }, { day: 'Fri', v: 96 }, { day: 'Sat', v: 42 }, { day: 'Sun', v: 30 },
  ];
  const cx = 180, cy = 160, ri = 36, ro = 130;
  const max = 100;
  const { ref, tip, move, leave } = useTip<typeof data[number]>();
  const arc = (a1: number, a2: number, r1: number, r2: number) => {
    const x1 = cx + r1 * Math.cos(a1), y1 = cy + r1 * Math.sin(a1);
    const x2 = cx + r2 * Math.cos(a1), y2 = cy + r2 * Math.sin(a1);
    const x3 = cx + r2 * Math.cos(a2), y3 = cy + r2 * Math.sin(a2);
    const x4 = cx + r1 * Math.cos(a2), y4 = cy + r1 * Math.sin(a2);
    return `M ${x1} ${y1} L ${x2} ${y2} A ${r2} ${r2} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${r1} ${r1} 0 0 0 ${x1} ${y1} Z`;
  };

  return (
    <Panel title="Weekday utilisation" subtitle="Polar bar · % of capacity" idx="21">
     <div ref={ref} className="relative lg:h-full">
      <svg viewBox="0 0 360 320" preserveAspectRatio="xMidYMid meet" className="block w-full lg:h-full">
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <circle key={s} cx={cx} cy={cy} r={ri + (ro - ri) * s} fill="none" stroke="var(--color-rule-soft)" strokeWidth="0.6" />
        ))}
        {data.map((d, i) => {
          const a1 = -Math.PI / 2 + (i / data.length) * Math.PI * 2 + 0.04;
          const a2 = -Math.PI / 2 + ((i + 1) / data.length) * Math.PI * 2 - 0.04;
          const r2 = ri + (d.v / max) * (ro - ri);
          const am = (a1 + a2) / 2;
          const tx = cx + (ro + 16) * Math.cos(am);
          const ty = cy + (ro + 16) * Math.sin(am);
          return (
            <g key={d.day}>
              <motion.path
                d={arc(a1, a2, ri, r2)}
                fill="oklch(0.685 0.198 41)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                style={{ cursor: 'pointer' }}
                onPointerMove={move(d)}
                onPointerLeave={leave}
                whileHover={{ filter: 'brightness(1.15)' }}
              />
              <text x={tx} y={ty + 3} fontSize="10" textAnchor="middle" className="mono" fill="var(--color-ink-2)" letterSpacing="1.5" pointerEvents="none">
                {d.day.toUpperCase()}
              </text>
            </g>
          );
        })}
        <text x={cx} y={cy - 4} fontSize="22" textAnchor="middle" className="serif" fill="var(--color-ink)">72.9</text>
        <text x={cx} y={cy + 14} fontSize="9" textAnchor="middle" className="mono" fill="var(--color-ink-3)" letterSpacing="2">% AVG</text>
      </svg>
      {tip && (
        <TipBox x={tip.x} y={tip.y}>
          <div className="mono text-[9.5px] tracking-[0.2em] text-white/60 uppercase">{tip.data.day}</div>
          <div className="tabular mt-0.5 text-[14px]">{tip.data.v}% capacity</div>
        </TipBox>
      )}
     </div>
    </Panel>
  );
}

/* ── Stream graph ──────────────────────────────────────────────────── */

function StreamGraph() {
  const series = [
    { name: 'Energy',     color: 'oklch(0.685 0.198 41)', data: gen(28, 30, 90, 4) },
    { name: 'Maritime',   color: 'oklch(0.555 0.180 38)', data: gen(28, 20, 60, 11) },
    { name: 'Mining',     color: 'var(--color-ink-2)',  data: gen(28, 15, 40, 17) },
    { name: 'Constr.',    color: 'oklch(0.36 0.150 38)',  data: gen(28, 10, 35, 23) },
    { name: 'Public',     color: 'var(--color-ink-4)',  data: gen(28, 8, 24,  29) },
  ];
  const n = series[0]?.data.length ?? 0;
  const totals = Array.from({ length: n }, (_, i) => series.reduce((s, x) => s + (x.data[i] ?? 0), 0));
  const max = Math.max(...totals);

  const w = 540, h = 220, pad = { l: 0, r: 0, t: 12, b: 0 };
  const innerW = w, innerH = h - pad.t;
  const xAt = (i: number) => (i / (n - 1)) * innerW;

  const layers = (() => {
    const out: Array<{ color: string; name: string; top: number[]; bot: number[] }> = [];
    let baseline = totals.map((t) => (max - t) / 2);
    for (const s of series) {
      const bot = baseline.slice();
      const top = baseline.map((b, i) => b + (s.data[i] ?? 0));
      out.push({ color: s.color, name: s.name, top, bot });
      baseline = top;
    }
    return out;
  })();

  const yScale = (v: number) => pad.t + (v / max) * innerH;

  return (
    <Panel title="Sectors · stream" subtitle="Cumulative completions over 4 weeks" idx="22">
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
        {layers.map((L, idx) => {
          // Smooth path
          const topPath = L.top.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(' ');
          const botPath = L.bot.slice().reverse().map((v, k) => {
            const i = n - 1 - k;
            return `L ${xAt(i).toFixed(1)} ${yScale(v).toFixed(1)}`;
          }).join(' ');
          return (
            <motion.path
              key={L.name}
              d={`${topPath} ${botPath} Z`}
              fill={L.color}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: idx * 0.1 }}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-2">
            <span className="block h-2.5 w-2.5 rounded-[1px]" style={{ background: s.color }} />
            <span className="text-[color:var(--color-ink)]">{s.name}</span>
          </span>
        ))}
      </div>
    </Panel>
  );
}

/* ── Calendar year (12 month × 31 day grid) ─────────────────────────── */

function CalendarYearChart() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = useMemo(() => {
    const out: number[][] = [];
    let s = 71;
    for (let m = 0; m < 12; m++) {
      const row: number[] = [];
      const days = m === 1 ? 28 : [3, 5, 8, 10].includes(m) ? 30 : 31;
      for (let d = 0; d < 31; d++) {
        if (d >= days) { row.push(-1); continue; }
        s = (s * 9301 + 49297) % 233280;
        const r = s / 233280;
        const wkBoost = (m * 31 + d) % 7 >= 5 ? -0.3 : 0;
        row.push(Math.max(0, Math.min(1, 0.3 + r * 0.7 + wkBoost)));
      }
      out.push(row);
    }
    return out;
  }, []);

  return (
    <Panel
      title="Year · 2026 calendar"
      subtitle="Daily completions · 12 months × 31 days"
      idx="23"
      action={
        <div className="mono flex items-center gap-2 text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">
          <span>Less</span>
          <div className="flex items-center gap-[3px]">
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((v) => (
              <span key={v} className="block h-2.5 w-2.5 rounded-[2px]" style={{ background: `oklch(0.685 0.198 41 / ${v})` }} />
            ))}
          </div>
          <span>More</span>
        </div>
      }
    >
      <div className="space-y-1.5">
        {data.map((row, m) => (
          <div key={months[m]} className="flex items-center gap-3">
            <span className="mono w-9 text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{months[m]}</span>
            <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}>
              {row.map((v, d) => (
                <motion.div
                  key={d}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: (m * 31 + d) * 0.0015 }}
                  className="aspect-square rounded-[1.5px]"
                  style={{
                    background: v < 0
                      ? 'transparent'
                      : `oklch(0.685 0.198 41 / ${0.06 + v * 0.85})`,
                  }}
                  title={v < 0 ? '' : `${months[m]} ${d + 1} · ${(v * 240).toFixed(0)} completions`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[color:var(--color-rule-soft)] pt-3 sm:grid-cols-4">
        {[
          ['Total · YTD', '38,402'],
          ['Best month', 'Oct · 4,820'],
          ['Streak', '38 days'],
          ['vs 2025', '+11.6%'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="mono text-[10px] tracking-[0.18em] text-[color:var(--color-ink-3)] uppercase">{k}</div>
            <div className="tabular mt-1 text-[14px] font-medium text-[color:var(--color-ink)]">{v}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PRIMITIVES
   ════════════════════════════════════════════════════════════════════ */

function Panel({
  title,
  subtitle,
  idx,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  idx?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      className="surface flex h-full flex-col rounded-[3px] p-5"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            {idx && <span className="serif tabular text-[12.5px] leading-none text-[color:var(--color-sgs-ink)]">{idx}</span>}
            <h3 className="serif text-[15.5px] leading-[1.15] text-[color:var(--color-ink)]">{title}</h3>
          </div>
          {subtitle && <div className="mt-1 text-[12px] leading-snug text-[color:var(--color-ink-2)]">{subtitle}</div>}
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </motion.section>
  );
}

function Chip({ label, dot, muted }: { label: string; dot?: string; muted?: boolean }) {
  return (
    <span
      className={`mono inline-flex items-center gap-1.5 rounded-[2px] border px-1.5 py-0.5 text-[10px] tracking-[0.18em] uppercase ${
        muted
          ? 'border-[color:var(--color-rule-soft)] text-[color:var(--color-ink-3)]'
          : 'border-[color:var(--color-sgs)]/30 bg-[color:var(--color-sgs)]/10 text-[color:var(--color-sgs-ink)]'
      }`}
    >
      {dot && <span className="block h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════ */

/** setInterval that stops while the tab is hidden — no wasted renders or
 *  battery when nobody is looking; resumes cleanly on return. */
function useVisibleInterval(cb: () => void, ms: number, enabled = true) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (id) clearInterval(id);
      id = undefined;
    };
    const start = () => {
      stop();
      if (enabled && !document.hidden) id = setInterval(() => saved.current(), ms);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', start);
    };
  }, [ms, enabled]);
}

/** Floating HTML tooltip for charts. Position with mouse coords relative
 *  to a parent set as `position: relative`. */
function TipBox({
  x, y, children, side = 'top',
}: { x: number; y: number; children: React.ReactNode; side?: 'top' | 'right' }) {
  const transform =
    side === 'top'
      ? 'translate(-50%, calc(-100% - 12px))'
      : 'translate(12px, -50%)';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
      className="pointer-events-none absolute z-20 whitespace-nowrap rounded-[3px] border border-[color:var(--color-overlay)] bg-[color:var(--color-overlay)] px-2.5 py-1.5 text-[11px] leading-[1.4] text-white shadow-[0_8px_24px_-8px_oklch(0.158_0.014_50_/_0.5)]"
      style={{ left: x, top: y, transform }}
    >
      {children}
    </motion.div>
  );
}

function useTip<T>() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; data: T } | null>(null);
  const move = (data: T) => (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, data });
  };
  const leave = () => setTip(null);
  return { ref, tip, move, leave };
}

function formatGST(d: Date) {
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const m = new Date(utc + 4 * 60 * 60_000);
  const hh = String(m.getHours()).padStart(2, '0');
  const mm = String(m.getMinutes()).padStart(2, '0');
  const ss = String(m.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function gen(n: number, lo: number, hi: number, seed = 7) {
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
