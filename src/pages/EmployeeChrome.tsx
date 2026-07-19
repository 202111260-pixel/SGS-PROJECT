import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import NavDock from '../components/NavDock';
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
  { id: 'calendar', label: 'Duty roster', to: '/roster' },
  { id: 'team', label: 'My team', to: '/team' },
  { id: 'book', label: 'Training & Competency', to: '/training' },
  { id: 'shield', label: 'Compliance' },
  { id: 'chart', label: 'Analytics', to: '/dashboard/analytics' },
  { id: 'cog', label: 'Settings' },
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
      {/* ── the nav dock: one floating pill, centred ── */}
      <NavDock active={active} dark={dark} onToggleTheme={() => setDark((d) => !d)} />

      <div className="flex">
        {/* ── left rail ── */}
        <aside className="sticky top-[76px] hidden h-[calc(100vh-76px)] w-14 shrink-0 flex-col items-center gap-1 border-r border-[color:var(--color-rule-soft)] bg-[color:var(--color-paper)] py-3 md:flex">
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
    case 'calendar':
      return (<svg {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>);
    case 'team':
      return (<svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="m15.5 9.5 2 2 4-4.5" /></svg>);
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
