import { gsap, ScrollTrigger } from '../motion/gsap'
import { useFontsGsap } from '../motion/useFontsGsap'
import { partners } from '../data/content'

export default function Partners() {
  const scope = useFontsGsap(() => {
    const track = scope.current.querySelector('.marquee-track')
    // GSAP drives the loop so scroll velocity can warp its speed
    track.style.animation = 'none'
    const loop = gsap.to(track, {
      xPercent: -50,
      duration: 30,
      ease: 'none',
      repeat: -1,
    })
    ScrollTrigger.create({
      onUpdate: (self) => {
        const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 350)
        loop.timeScale(boost)
        gsap.to(loop, {
          timeScale: 1,
          duration: 1.6,
          ease: 'power2.out',
          overwrite: true,
        })
      },
    })
  })

  const row = [...partners, ...partners]
  return (
    <section id="partners" ref={scope} className="border-ink/10 border-b py-12">
      <p className="text-ink-soft mb-8 text-center text-xs font-medium tracking-[0.16em] uppercase">
        Our graduates work with
      </p>
      <div
        className="overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div className="marquee-track items-baseline gap-[clamp(3rem,7vw,6rem)] pr-[clamp(3rem,7vw,6rem)]">
          {row.map((name, i) => (
            <span
              key={i}
              aria-hidden={i >= partners.length}
              className="font-display text-ink/60 text-3xl font-medium whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
