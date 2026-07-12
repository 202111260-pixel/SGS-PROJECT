import SgsLogo from './SgsLogo';

/**
 * SGS wordmark — the real SGS crosshair mark (shared with the marketing
 * landing page) plus the registry lockup. Letters take currentColor so they
 * flip with the dashboard theme; the crosshair rules stay SGS orange.
 */
export default function Wordmark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const subInk =
    tone === 'dark' ? 'text-white/55' : 'text-[color:var(--color-ink-3)]';
  const main =
    tone === 'dark' ? 'text-white' : 'text-[color:var(--color-ink)]';

  return (
    <div className="flex items-center gap-2.5">
      <SgsLogo aria-label="SGS" className={`h-6 w-auto ${main}`} />
      <span className="h-6 w-px bg-[color:var(--color-rule-soft)]" />
      <div className="flex flex-col leading-tight">
        <span className={`text-[12.5px] font-semibold tracking-[-0.005em] ${main}`}>
          Learning Registry
        </span>
        <span className={`mono -mt-0.5 text-[9px] uppercase tracking-[0.2em] ${subInk}`}>
          SGS Oman · Muscat
        </span>
      </div>
    </div>
  );
}
