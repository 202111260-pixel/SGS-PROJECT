# Design

## Theme

Warm light. Scene: a training coordinator reviews partners on a bright office monitor in Muscat at 10am; daylight everywhere, the page must feel like the golden-hour field photography it frames. Light surfaces, deep warm ink, one committed copper accent.

## Color (OKLCH, Committed strategy)

- `--paper`: oklch(0.965 0.012 85) — warm ivory page ground
- `--sand`: oklch(0.925 0.022 80) — section alternation, image mats
- `--ink`: oklch(0.245 0.02 55) — espresso ink, all primary text
- `--ink-soft`: oklch(0.42 0.018 55) — secondary text
- `--copper`: oklch(0.58 0.13 45) — committed accent: drenched CTA band, progress line, numerals
- `--copper-deep`: oklch(0.42 0.11 45) — hover/pressed, text-on-sand accent
- `--palm`: oklch(0.46 0.06 160) — sparse secondary (certified/active states only)

Copper carries 30–60% of the CTA band and timeline; never as gradient text.

## Typography

- Display: **Zodiak** (Fontshare) — sharp warm wedge serif, weights 400/700. Fluid clamp scale, ratio ≥1.3.
- Body/UI: **Switzer** (Fontshare) — 400/500/600. Body max 70ch.
- Caps only for short eyebrow labels, tracked +0.12em, Switzer 500.

## Layout

12-col fluid grid, asymmetric: text blocks sit off-center, images bleed to one edge. Section padding `clamp(5rem, 12vw, 11rem)` with deliberate tight/loose rhythm. Images matted in `--sand` with 1.25rem radius (Farmora-style inset framing). No identical card grids.

## Motion

GSAP ScrollSmoother (inertia, `effects: true` parallax) + ScrollTrigger + SplitText.

- Headlines: line mask reveal (lines clip-path/overflow hidden, yPercent 110 → 0), scrubbed or staggered, ease `expo.out`.
- Paragraphs: word-level stagger fade (opacity 0 → 1, slight y), `power3.out`.
- Images/text layers: `data-speed` parallax offsets (0.85–1.15).
- Reduced motion: all content visible, smoother disabled.

## Components

- Pill buttons: ink on paper / paper on copper, 999px radius, arrow nudge on hover.
- Eyebrow: small copper dot + tracked caps label.
- Stat band: asymmetric mix of photo tiles and one copper-drenched numeral panel (no uniform metric cards).
- Program index: numbered editorial rows with hover image swap, hairline `--ink`/12% dividers.
