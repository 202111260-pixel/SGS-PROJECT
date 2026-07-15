import { useEffect, useRef, useState } from 'react'
import { gsap, SplitText, prefersReducedMotion } from '../motion/gsap'
import { useFontsGsap } from '../motion/useFontsGsap'
import { img } from '../data/content'
import Nav from './Nav'
import SgsLogo from './SgsLogo'
import section1 from '../assets/section1.jpeg'

const AUTOPLAY = 5.5

const variants = [
  {
    key: 'crew',
    label: 'Field Ops',
    specA: { icon: '⛨', value: '312', unit: '/On the roster' },
    specB: { icon: '✓', value: '94%', unit: '/Certified' },
    location: 'OQ · Field Operations',
  },
  {
    key: 'hero',
    label: 'Safety',
    specA: { icon: '⛨', value: '7', unit: '/Required certificates' },
    specB: { icon: '↯', value: '90d', unit: '/Expiry watch' },
    location: 'Oxy Oman · Compliance',
  },
  {
    key: 'engineer',
    label: 'Grades',
    specA: { icon: '⛨', value: 'C·B·A', unit: '/Ladder' },
    specB: { icon: '↯', value: 'Auto', unit: '/Computed' },
    location: 'Muscat · Competency Engine',
  },
]

export default function Hero({ introDone }) {
  const [active, setActive] = useState(1)
  const prev = useRef(1)
  const dir = useRef(1)
  const progress = useRef(null)
  const paused = useRef(false)

  const go = (i, d) => {
    dir.current = d ?? (i > active ? 1 : -1)
    setActive(i)
  }
  const step = (d) => go((active + d + variants.length) % variants.length, d)
  const stepRef = useRef(step)
  stepRef.current = step

  const scope = useFontsGsap(() => {
    if (!introDone) return

    const sub = SplitText.create('[data-hero-sub]', { type: 'words' })

    gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .from('[data-hero-nav]', { opacity: 0, y: -16, duration: 1 }, 0.1)
      .from('[data-hline]', { yPercent: 115, duration: 1.4, stagger: 0.12 }, 0.15)
      .fromTo(
        '[data-hero-panel]',
        { clipPath: 'inset(0 0 0 100% round 1.75rem)' },
        { clipPath: 'inset(0 0 0 0% round 1.75rem)', duration: 1.5, ease: 'expo.inOut' },
        0.25,
      )
      .from('[data-panel-stack]', { scale: 1.22, duration: 2.4, ease: 'power3.out' }, 0.3)
      .from(
        '[data-hero-divider] > *',
        { scaleX: 0, opacity: 0, duration: 1, stagger: 0.08 },
        0.85,
      )
      .from(sub.words, { opacity: 0, y: 10, duration: 0.7, ease: 'power3.out', stagger: 0.02 }, 1.0)
      .from('[data-thumb]', { opacity: 0, y: 26, duration: 0.9, stagger: 0.1 }, 1.1)
      .from('[data-counter]', { opacity: 0, y: 14, duration: 0.8 }, 1.35)
      .from('[data-panel-ui]', { opacity: 0, y: 18, duration: 0.9, stagger: 0.1 }, 1.05)
      .from('[data-spec]', { opacity: 0, scale: 0.82, y: 14, duration: 0.9, stagger: 0.16 }, 1.25)
      .from('[data-keyword]', { opacity: 0, y: 12, duration: 0.7, stagger: 0.06 }, 1.4)
      .from('[data-plus]', { opacity: 0, duration: 1 }, 1.5)

    // Spec pills breathe on independent periods
    gsap.utils.toArray('[data-spec]').forEach((el, i) => {
      gsap.to(el, {
        y: i % 2 ? 9 : -9,
        duration: 2.9 + i * 0.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2.4,
      })
    })

    // Cursor tilt: the panel leans toward the pointer, instruments drift with it
    if (window.matchMedia('(pointer: fine)').matches) {
      const panel = scope.current.querySelector('[data-hero-panel]')
      gsap.set(panel, { transformPerspective: 1100 })
      const rx = gsap.quickTo(panel, 'rotationX', { duration: 0.9, ease: 'power3.out' })
      const ry = gsap.quickTo(panel, 'rotationY', { duration: 0.9, ease: 'power3.out' })
      const drift = gsap.utils.toArray('[data-spec], [data-panel-ui]').map((el) =>
        gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3.out' }),
      )
      const move = (e) => {
        const r = panel.getBoundingClientRect()
        const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
        const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
        ry(nx * 2.4)
        rx(-ny * 2.4)
        drift.forEach((set, i) => set(nx * (i % 2 ? 10 : -8)))
      }
      const leave = () => {
        rx(0)
        ry(0)
        drift.forEach((set) => set(0))
      }
      panel.addEventListener('mousemove', move)
      panel.addEventListener('mouseleave', leave)
      return () => {
        panel.removeEventListener('mousemove', move)
        panel.removeEventListener('mouseleave', leave)
      }
    }
  }, [introDone])

  // Instrument readouts roll to the new program
  useEffect(() => {
    const from = prev.current
    prev.current = active
    if (from === active || prefersReducedMotion()) return
    gsap.fromTo(
      '[data-roll]',
      { yPercent: dir.current * 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05 },
    )
  }, [active])

  // Autoplay: the progress hairline is the timer itself
  useEffect(() => {
    if (!introDone || prefersReducedMotion()) return undefined
    const line = progress.current
    const tween = gsap.fromTo(
      line,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: AUTOPLAY,
        ease: 'none',
        onComplete: () => stepRef.current(1),
      },
    )
    if (paused.current) tween.pause()
    line._tween = tween
    return () => tween.kill()
  }, [active, introDone])

  const hold = (v) => {
    paused.current = v
    const tween = progress.current?._tween
    if (!tween) return
    if (v) tween.pause()
    else tween.resume()
  }

  const v = variants[active]

  return (
    <section
      id="top"
      ref={scope}
      className="px-[clamp(0.75rem,2vw,1.75rem)] pt-[clamp(0.75rem,2vw,1.5rem)]"
    >
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-[1fr_1.08fr]">
        {/* ——————— Left column ——————— */}
        <div className="flex min-h-[calc(100svh-3rem)] flex-col pt-2 lg:pl-[clamp(0.5rem,2vw,2.5rem)]">
          <Nav />

          <p className="eyebrow text-ink-soft mt-[clamp(2.5rem,6vh,4.5rem)]">
            When you need to be sure
          </p>

          <h1 className="font-display text-ink mt-5 text-[clamp(2.3rem,3.9vw,3.9rem)] leading-[1.12] font-bold tracking-tight">
            {[
              <>Every Employee,</>,
              <>
                Every Certificate
                <span className="ml-3 inline-flex align-[0.04em] -space-x-[0.22em]">
                  <img
                    src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=160&q=70"
                    alt=""
                    aria-hidden="true"
                    className="border-paper inline-block h-[0.62em] w-[0.62em] rounded-full border-2 object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=160&q=70"
                    alt=""
                    aria-hidden="true"
                    className="border-paper inline-block h-[0.62em] w-[0.62em] rounded-full border-2 object-cover"
                  />
                </span>
              </>,
              <>
                <SgsLogo
                  aria-label="SGS"
                  className="mr-[0.18em] inline-block h-[1.02em] w-auto align-[-0.22em]"
                />
                Workforce,
              </>,
              <>
                Graded <em className="text-copper-deep italic">Live</em>
              </>,
            ].map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
                <span data-hline className="block">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          {/* Dashed divider; the capsule reads the live program index */}
          <div data-hero-divider className="mt-[clamp(1.5rem,4vh,3rem)] flex items-center gap-5">
            <span className="border-ink/25 flex-1 origin-left border-t border-dashed" />
            <span className="border-ink/30 text-ink-soft overflow-hidden rounded-full border border-dashed px-5 py-1.5 text-xs tabular-nums">
              <span data-roll className="block">
                0{active + 1}
              </span>
            </span>
            <span className="border-ink/25 w-[18%] origin-right border-t border-dashed" />
          </div>

          {/* Bottom: micro-paragraph + thumbnail cards + counter */}
          <div
            className="mt-auto flex flex-wrap items-center gap-x-10 gap-y-8 pt-10 pb-3"
            onMouseEnter={() => hold(true)}
            onMouseLeave={() => hold(false)}
          >
            <p
              data-hero-sub
              className="text-ink-soft max-w-[24ch] text-[0.68rem] leading-[1.8] font-medium tracking-[0.08em] uppercase"
            >
              <span className="bg-copper mr-2 -mt-0.5 inline-block h-2 w-2 align-middle" />
              SGS runs its field-operations workforce on one live system. Every
              employee, every certificate, and a competency grade that stays current.
            </p>

            <div className="flex-1">
              <div className="flex items-end gap-3">
                {variants.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    data-thumb
                    data-magnetic
                    onClick={() => go(i)}
                    className={`bg-ivory relative rounded-2xl p-1.5 text-left shadow-[0_14px_36px_-20px_oklch(0.2_0.03_55/0.5)] transition-transform duration-500 ease-out ${
                      active === i ? 'lg:-translate-y-2' : ''
                    }`}
                  >
                    <img
                      src={img[item.key].src.replace('w=1600', 'w=400').replace('w=2200', 'w=400')}
                      alt={img[item.key].alt}
                      className="h-16 w-24 rounded-xl object-cover"
                    />
                    <span
                      aria-hidden="true"
                      className="bg-ivory text-ink-soft absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px]"
                    >
                      ↗
                    </span>
                    <span
                      className={`mx-auto mt-1.5 block w-fit rounded-full px-3.5 py-1 text-[11px] font-medium ${
                        active === i
                          ? 'bg-copper text-ivory'
                          : 'border-ink/15 text-ink-soft border'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              <div data-counter className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-ink flex items-baseline text-lg font-medium tabular-nums">
                    <span className="overflow-hidden">
                      <span data-roll className="block">
                        {active + 1}
                      </span>
                    </span>
                    <span className="text-ink-soft text-sm">
                      /{String(variants.length).padStart(2, '0')}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-magnetic
                      onClick={() => step(-1)}
                      aria-label="Previous program"
                      className="border-ink/20 text-ink hover:border-ink flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-300"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      data-magnetic
                      onClick={() => step(1)}
                      aria-label="Next program"
                      className="border-ink/20 text-ink hover:border-ink flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-300"
                    >
                      →
                    </button>
                  </div>
                </div>
                {/* Autoplay hairline: refills each cycle */}
                <div className="bg-ink/10 mt-3 h-px w-full overflow-hidden">
                  <div ref={progress} className="bg-copper h-full origin-left" style={{ transform: 'scaleX(0)' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-ink/30 flex justify-between pb-2 text-xs tracking-[0.3em]">
            <span data-plus>+++</span>
            <span data-plus>++</span>
          </div>
        </div>

        {/* ——————— Right: illustration panel ——————— */}
        <div
          data-hero-panel
          onMouseEnter={() => hold(true)}
          onMouseLeave={() => hold(false)}
          className="relative h-[62svh] min-h-[26rem] overflow-hidden rounded-[1.75rem] bg-[#f1efe8] will-change-transform lg:h-[calc(100svh-2.5rem)]"
        >
          <div data-panel-stack className="absolute inset-0">
            <img
              src={section1}
              alt="Illustration: an SGS supervisor with a tablet reviewing a field crew's certificates, in SGS orange"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
            />
          </div>

          {/* Vertical brand tab + arrow circle */}
          <div data-panel-ui className="absolute top-5 left-5 z-10 flex flex-col items-center gap-2.5">
            <span className="bg-ivory text-ink border-ink/10 rounded-full border px-2.5 py-4 text-[10px] font-semibold tracking-[0.22em] uppercase [writing-mode:vertical-rl]">
              SGS Workforce
            </span>
            <a
              href="#tracking"
              aria-label="See how grading works"
              className="bg-ink text-ivory hover:bg-copper-deep flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors duration-300"
            >
              ↗
            </a>
          </div>

          {/* Contact pill */}
          <div data-panel-ui className="absolute top-5 right-5 z-10 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="bg-ink text-ivory flex h-10 w-10 items-center justify-center rounded-full text-sm"
            >
              ✆
            </span>
            <a
              href="#contact"
              className="bg-ivory text-ink hover:bg-sand border-ink/10 rounded-full border px-5 py-2.5 text-xs font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
            >
              Contact us
            </a>
          </div>

          {/* Spec pills: live readouts for the selected program */}
          <div
            data-spec
            className="bg-ivory/95 border-ink/10 absolute top-[16%] left-[28%] z-10 flex items-center gap-2.5 rounded-full border py-1.5 pr-5 pl-1.5 shadow-[0_24px_60px_-24px_oklch(0.2_0.03_55/0.5)]"
          >
            <span className="bg-ink text-ivory flex h-8 w-8 items-center justify-center rounded-full text-xs">
              {v.specA.icon}
            </span>
            <span className="overflow-hidden text-sm">
              <span data-roll className="block">
                <strong className="text-ink font-semibold">{v.specA.value}</strong>
                <span className="text-ink-soft">{v.specA.unit}</span>
              </span>
            </span>
          </div>
          <div
            data-spec
            className="bg-ivory/95 border-ink/10 absolute right-[10%] bottom-[34%] z-10 hidden items-center gap-2.5 rounded-full border py-1.5 pr-5 pl-1.5 shadow-[0_24px_60px_-24px_oklch(0.2_0.03_55/0.5)] sm:flex"
          >
            <span className="bg-ink text-ivory flex h-8 w-8 items-center justify-center rounded-full text-xs">
              {v.specB.icon}
            </span>
            <span className="overflow-hidden text-sm">
              <span data-roll className="block">
                <strong className="text-ink font-semibold">{v.specB.value}</strong>
                <span className="text-ink-soft">{v.specB.unit}</span>
              </span>
            </span>
          </div>

          {/* Location readout + translucent keywords */}
          <div className="absolute right-6 bottom-6 left-6 z-10 flex items-end justify-between gap-6">
            <span className="bg-ink/55 text-ivory flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-xs font-medium">
              <span aria-hidden="true">◉</span>
              <span data-roll className="block whitespace-nowrap">
                {v.location}
              </span>
            </span>
            <span className="hidden max-w-[15rem] flex-wrap justify-end gap-2 md:flex">
              {['Register', 'Certify', 'Grade', 'Promote', 'Alert', 'SGS'].map((k) => (
                <span
                  key={k}
                  data-keyword
                  className="bg-ink/40 text-ivory/90 rounded-full px-4 py-1.5 text-xs font-medium"
                >
                  {k}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
