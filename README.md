# SGS Training — Landing Page

Cinematic landing page for the SGS training management platform: enroll
employees in accredited programs, track progress end-to-end, and monitor
every trainee deployed to oil & gas operators.

## Stack

- React 19 + Vite + React Router
- Tailwind CSS v4
- GSAP 3 (ScrollTrigger, ScrollSmoother, SplitText)

## Routes

- `/` — cinematic marketing landing page (GSAP, Zodiak/Switzer, warm palette)
- `/dashboard` — SGS Oman Learning Registry operations cockpit (Motion/framer-motion, Inter/Instrument Serif/JetBrains Mono, light + dark)

The dashboard and landing use deliberately different design systems. The
dashboard's tokens, fonts and utility classes are scoped to `.sgs-registry`
(see `src/pages/dashboard.css`) so they never bleed into the landing.

## Run

```bash
npm install --include=dev   # this machine has npm omit=dev globally
npm run dev
```

Open http://localhost:5173/ (landing) or http://localhost:5173/dashboard

## Dashboard

App shell (`src/dashboard/`, page in `src/pages/Dashboard.jsx`) in the same
warm palette, with Apple-style motion driven entirely by GSAP:

| Element | Motion |
|---|---|
| Sidebar active item | Highlight pill glides between items (`expo.out`) |
| Period segmented control | Sliding pill |
| KPI cards | Count-up numbers + hand-drawn sparklines that draw in |
| Area chart | Two smooth (Catmull-Rom) series, stroke draw-in, gradient fill, hover crosshair + tooltip |
| Donut | Per-segment `stroke-dasharray` fill, center count-up |
| Tables / progress | Rows stagger in, progress bars scale from 0 |

All charts are hand-built SVG (no chart library) for full control over the
draw-in animation. Reduced motion renders every panel static.

## Motion system

| Effect | Where | How |
|---|---|---|
| Line mask reveals tied to scroll speed | Section headlines | `SplitText` (`mask: 'lines'`) + `ScrollTrigger` `scrub: 1.2` |
| Staggered word fades | Paragraphs, manifesto, testimonial | `SplitText` words, opacity stagger (one-shot or scrubbed) |
| Text/image parallax | Hero, dunes interlude, footer | `ScrollSmoother` `effects: true` with `data-speed` / `data-lag` |
| Smooth inertia | Whole page | `ScrollSmoother` `smooth: 1.35` |
| Pinned scrubbed timeline | "Tracking" pipeline | Pinned `ScrollTrigger`, progress line + runner dot |

`prefers-reduced-motion` disables the smoother, preloader and all reveals;
content renders fully static.

`scripts/shots.mjs` drives headless Chrome through the page and captures
desktop + mobile screenshots into `shots/` for visual QA.
