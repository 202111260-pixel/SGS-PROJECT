import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Wordmark from '../components/Wordmark';
import './dashboard.css';
import './employee-form.css';
import './directory.css';

/**
 * EmployeeShell — the persistent registry chrome (top bar · left rail · theme)
 * shared by the Employees directory and the Employee profile. It is a thin,
 * self-contained copy of the dashboard/competency shell so those pages are
 * never coupled to this one; theme is owned here and stamped as `data-theme`
 * on the page root, so every child reads it through the CSS token layer.
 */

type RailDef = { id: string; label: string; to?: string };

const RAIL: ReadonlyArray<RailDef> = [
  { id: 'home', label: 'Dashboard', to: '/dashboard' },
  { id: 'people', label: 'Employees', to: '/employees' },
  { id: 'book', label: 'Training & Competency', to: '/training' },
  { id: 'shield', label: 'Compliance' },
  { id: 'chart', label: 'Analytics', to: '/dashboard/analytics' },
  { id: 'cog', label: 'Settings' },
];

const NAV: ReadonlyArray<{ label: string; to?: string }> = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'Employees', to: '/employees' },
  { label: 'Training', to: '/training' },
  { label: 'Analytics', to: '/dashboard/analytics' },
];

export function EmployeeShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  const [dark, setDark] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('sgs-theme-v2') === 'dark',
  );
  useEffect(() => {
    localStorage.setItem('sgs-theme-v2', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div
      data-theme={dark ? 'dark' : undefined}
      className="sgs-registry emp-form dir-page min-h-screen bg-[color:var(--color-paper-2)] text-[color:var(--color-ink)]"
    >
      {/* ── top bar ── */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-5 px-5 lg:px-7">
          <a href="/" aria-label="Back to site" className="flex items-center gap-2.5">
            <Wordmark tone="light" />
          </a>
          <span className="hidden h-5 w-px bg-[color:var(--color-rule-soft)] md:block" />
          <nav className="mono hidden items-center gap-1 text-[11px] tracking-[0.18em] uppercase md:flex">
            {NAV.map(({ label, to }) => {
              const on = label === active;
              const cls = `rounded-[2px] px-2.5 py-1.5 transition-colors ${
                on
                  ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)]'
                  : 'text-[color:var(--color-ink-2)] hover:bg-[color:var(--color-paper-3)]'
              }`;
              return to ? (
                <Link key={label} to={to} className={cls}>
                  {label}
                </Link>
              ) : (
                <span key={label} className={cls}>
                  {label}
                </span>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
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
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--color-ink)] text-[11px] font-semibold text-[color:var(--color-paper)]">
              NA
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── left rail ── */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-14 shrink-0 flex-col items-center gap-1 border-r border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] py-3 md:flex">
          {RAIL.map((it) => {
            const on = it.label === active;
            const cls = `grid h-9 w-9 place-items-center rounded-[3px] transition-colors ${
              on
                ? 'bg-[color:var(--color-ink)] text-white'
                : 'text-[color:var(--color-ink-3)] hover:bg-[color:var(--color-paper-3)] hover:text-[color:var(--color-ink)]'
            }`;
            return it.to ? (
              <Link key={it.id} to={it.to} aria-label={it.label} title={it.label} className={cls}>
                <RailIcon id={it.id} />
              </Link>
            ) : (
              <button key={it.id} aria-label={it.label} title={it.label} className={cls}>
                <RailIcon id={it.id} />
              </button>
            );
          })}
        </aside>

        {/* ── main ── */}
        <main className="mx-auto min-w-0 max-w-[1480px] flex-1 px-5 pb-24 pt-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function RailIcon({ id }: { id: string }) {
  const p = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'home':
      return (<svg {...p}><path d="M3 11l9-8 9 8" /><path d="M5 9v12h14V9" /></svg>);
    case 'people':
      return (<svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M21 19c0-2.5-1.8-4.5-4-4.5" /></svg>);
    case 'book':
      return (<svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 4v13" /></svg>);
    case 'shield':
      return (<svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></svg>);
    case 'chart':
      return (<svg {...p}><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></svg>);
    default:
      return (<svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.8a7 7 0 0 0-1.7 1L5 6l-2 3.5L5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.4-.8a7 7 0 0 0 1.7 1L9.5 21h5l.4-2.8a7 7 0 0 0 1.7-1L19 18l2-3.5L19 13a7 7 0 0 0 0-1z" /></svg>);
  }
}
