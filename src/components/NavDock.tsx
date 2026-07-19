import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SgsLogo from './SgsLogo';
import '../pages/navdock.css';

/**
 * NavDock — the one floating ink pill every registry page shares: SGS mark
 * in a white circle, the six sections (the active one is the white pill),
 * then search (when the page offers it), theme and the signed-in chip.
 * Press anything and it grows a touch; scroll and the dock settles.
 */

const NAV: ReadonlyArray<{ label: string; to?: string }> = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'Employees', to: '/employees' },
  { label: 'Roster', to: '/roster' },
  { label: 'My team', to: '/team' },
  { label: 'Training', to: '/training' },
  { label: 'Analytics', to: '/dashboard/analytics' },
];

export default function NavDock({
  active,
  dark,
  onToggleTheme,
  onSearch,
}: {
  active: string;
  dark: boolean;
  onToggleTheme: () => void;
  onSearch?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      // pro scroll feel: slide away going down, glide back going up
      if (y < 120) setHidden(false);
      else if (y > lastY + 4) setHidden(true);
      else if (y < lastY - 4) setHidden(false);
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav-dock-wrap ${hidden ? 'is-hidden' : ''}`}>
      <nav className={`nav-dock ${scrolled ? 'is-scrolled' : ''}`} aria-label="Primary">
        <a href="/" aria-label="Back to site" className="nav-dock-logo">
          <SgsLogo withLines={false} aria-hidden className="nav-dock-mark" />
        </a>
        <div className="nav-dock-links">
          {NAV.map(({ label, to }) => {
            const on = label === active;
            return to ? (
              <Link key={label} to={to} className={on ? 'is-on' : ''}>
                {label}
              </Link>
            ) : (
              <span key={label} className={on ? 'is-on' : ''}>
                {label}
              </span>
            );
          })}
        </div>
        <div className="nav-dock-end">
          {onSearch && (
            <button type="button" onClick={onSearch} aria-label="Search" title="Search · ⌘K" className="nav-dock-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
            className="nav-dock-ic"
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
          <span className="nav-dock-user" title="Signed in as NA">
            NA
          </span>
        </div>
      </nav>
    </header>
  );
}
