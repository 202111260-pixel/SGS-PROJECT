import { MaskedLines } from '../motion/Reveal'
import { img } from '../data/content'

const chips = [
  { label: 'discipline', speed: '1.18', cls: 'top-[24%] left-[12%] -rotate-6' },
  { label: 'precision', speed: '0.86', cls: 'top-[30%] right-[14%] rotate-3' },
  { label: 'endurance', speed: '1.08', cls: 'bottom-[22%] left-[18%] rotate-2' },
]

/**
 * Full-bleed cinematic interlude. Four depth layers, each at its own
 * scroll speed: the dunes, an outline ghost headline drifting one way,
 * the solid headline pair drifting the other, and floating tag chips.
 * Every line still rises out of its own mask, scrub-linked.
 */
export default function ParallaxBreak() {
  return (
    <section className="relative h-[118svh] overflow-hidden">
      <img
        src={img.dunes.src}
        alt={img.dunes.alt}
        loading="lazy"
        data-speed="auto"
        className="absolute inset-0 h-full w-full scale-125 object-cover"
      />
      <div className="absolute inset-0 bg-[oklch(0.3_0.04_55/0.22)]" />

      {/* Ghost outline layer, drifting against the headline */}
      <p
        aria-hidden="true"
        data-speed="0.78"
        className="font-display pointer-events-none absolute top-[14%] left-1/2 -translate-x-1/2 text-[clamp(5rem,16vw,15rem)] leading-none font-bold whitespace-nowrap text-transparent select-none [-webkit-text-stroke:1px_oklch(0.97_0.01_85/0.35)]"
      >
        4,800 strong
      </p>

      {/* Floating tag chips, ecoshire-style */}
      {chips.map((c) => (
        <span
          key={c.label}
          data-speed={c.speed}
          className={`border-ivory/60 text-ivory absolute z-10 hidden rounded-full border px-5 py-2 text-xs font-medium tracking-[0.18em] uppercase md:block ${c.cls}`}
        >
          {c.label}
        </span>
      ))}

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2 px-6">
        <div data-speed="1.14" data-skew>
          <MaskedLines
            as="p"
            start="top 95%"
            end="top 55%"
            className="font-display text-ivory text-center text-[clamp(3rem,10vw,9rem)] leading-none font-bold tracking-tight"
          >
            From classroom
          </MaskedLines>
        </div>
        <div data-speed="0.88" data-skew>
          <MaskedLines
            as="p"
            start="top 95%"
            end="top 50%"
            className="font-display text-ivory text-center text-[clamp(3.4rem,11.5vw,10.5rem)] leading-none font-bold tracking-tight italic"
          >
            to rig floor.
          </MaskedLines>
        </div>
        <p
          data-speed="1.05"
          className="text-ivory/90 mt-8 text-xs font-medium tracking-[0.18em] uppercase"
        >
          The journey is the product
        </p>
      </div>
    </section>
  )
}
