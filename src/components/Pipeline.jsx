import { gsap } from '../motion/gsap'
import { useFontsGsap } from '../motion/useFontsGsap'
import { MaskedLines, FadedWords, CountUp } from '../motion/Reveal'
import { img } from '../data/content'

const steps = ['Enroll', 'Train', 'Certify', 'Deploy', 'Monitor']

function ArrowDot({ dark = false }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 items-center justify-center rounded-full text-base transition-transform duration-500 ease-out group-hover:rotate-45 ${
        dark ? 'bg-ink/80 text-ivory' : 'bg-ivory/90 text-ink'
      }`}
    >
      ↗
    </span>
  )
}

export default function Pipeline() {
  const scope = useFontsGsap(() => {
    gsap.from('[data-bento]', {
      opacity: 0,
      y: 64,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.12,
      scrollTrigger: { trigger: '[data-bento-grid]', start: 'top 78%' },
    })
    gsap.from('[data-step-chip]', {
      opacity: 0,
      y: -12,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.07,
      scrollTrigger: { trigger: scope.current, start: 'top 80%' },
    })
  })

  return (
    <section
      id="tracking"
      ref={scope}
      className="px-[clamp(1.5rem,4vw,4rem)] py-[clamp(5rem,12vw,11rem)]"
    >
      {/* Step chips, Cereen-style */}
      <div className="mb-7 flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <span
            key={s}
            data-step-chip
            className="border-ink/15 text-ink-soft flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium"
          >
            <span className="text-copper" aria-hidden="true">
              ✳
            </span>
            0{i + 1} {s}
          </span>
        ))}
      </div>

      <div className="grid items-end gap-10 lg:grid-cols-12">
        <MaskedLines
          as="h2"
          mode="play"
          className="font-display text-ink max-w-[14ch] text-[clamp(2.4rem,5.5vw,5rem)] leading-[1.05] font-bold tracking-tight lg:col-span-7"
        >
          Every trainee, tracked end-to-end.
        </MaskedLines>
        <FadedWords className="text-ink-soft max-w-[42ch] text-base leading-relaxed lg:col-span-5 lg:justify-self-end">
          Sponsors do not get a brochure and a goodbye. They get a live record
          that follows each trainee from the first enrollment form to the
          monthly report after deployment.
        </FadedWords>
      </div>

      {/* Bento grid */}
      <div data-bento-grid className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-5 lg:grid-cols-12">
        {/* 01 Enroll — large portrait card */}
        <a
          href="#contact"
          data-bento
          className="group relative min-h-[24rem] overflow-hidden rounded-[1.75rem] lg:col-span-5 lg:row-span-2 lg:min-h-0"
        >
          <img
            src={img.classroom.src}
            alt={img.classroom.alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.22_0.03_55/0.72)] via-transparent to-transparent" />
          <div className="absolute top-5 right-5">
            <ArrowDot />
          </div>
          <div className="absolute right-7 bottom-6 left-7">
            <p className="text-ivory/80 text-xs font-medium tracking-[0.16em] uppercase">
              01 · Enroll
            </p>
            <h3 className="font-display text-ivory mt-2 text-3xl font-medium">
              One record from day one
            </h3>
            <p className="text-ivory/85 mt-2 max-w-[40ch] text-sm leading-relaxed">
              Profile, sponsor company, target role and program plan, opened the
              moment a trainee walks in.
            </p>
          </div>
        </a>

        {/* 02 Train — photo with floating stat chip */}
        <div
          data-bento
          className="group relative min-h-[16rem] overflow-hidden rounded-[1.75rem] lg:col-span-4"
        >
          <img
            src={img.welder.src}
            alt={img.welder.alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.22_0.03_55/0.6)] via-transparent to-transparent" />
          <div className="bg-ivory/90 absolute top-5 right-5 max-w-[11rem] rounded-2xl p-4">
            <p className="font-display text-ink text-2xl font-bold">
              <CountUp value={92} suffix="%" />
            </p>
            <p className="text-ink-soft mt-1 text-xs leading-snug">
              average attendance, logged live in session
            </p>
          </div>
          <p className="text-ivory absolute bottom-5 left-6 text-xs font-medium tracking-[0.16em] uppercase">
            02 · Train
          </p>
        </div>

        {/* 03 Certify — sand text card */}
        <div
          data-bento
          className="bg-sand flex flex-col justify-between rounded-[1.75rem] p-7 lg:col-span-3"
        >
          <span className="border-ink/20 text-ink-soft w-fit rounded-full border px-4 py-1.5 text-xs font-medium">
            03 · Certify
          </span>
          <p className="font-display text-ink mt-8 text-[1.45rem] leading-snug font-medium">
            Exams sat on site. Every certificate verified, stored, shareable.
          </p>
          <a
            href="#contact"
            className="text-copper-deep mt-6 inline-flex items-center gap-2 text-sm font-semibold"
          >
            View a sample record <span aria-hidden="true">→</span>
          </a>
        </div>

        {/* 04 Deploy — photo with chip */}
        <div
          data-bento
          className="group relative min-h-[16rem] overflow-hidden rounded-[1.75rem] lg:col-span-3"
        >
          <img
            src={img.crew.src}
            alt={img.crew.alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.22_0.03_55/0.6)] via-transparent to-transparent" />
          <div className="bg-ivory/90 absolute top-5 left-5 rounded-2xl p-4">
            <p className="font-display text-ink text-2xl font-bold">
              <CountUp value={4800} suffix="+" />
            </p>
            <p className="text-ink-soft mt-1 text-xs">deployed to operators</p>
          </div>
          <p className="text-ivory absolute bottom-5 left-6 text-xs font-medium tracking-[0.16em] uppercase">
            04 · Deploy
          </p>
        </div>

        {/* 05 Monitor — copper card */}
        <a
          href="#contact"
          data-bento
          className="bg-copper group flex flex-col justify-between rounded-[1.75rem] p-7 lg:col-span-4"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="border-ivory/40 text-ivory w-fit rounded-full border px-4 py-1.5 text-xs font-medium">
              05 · Monitor
            </span>
            <ArrowDot />
          </div>
          <div>
            <p className="font-display text-ivory mt-10 text-[1.6rem] leading-snug font-medium">
              A report back to you every thirty days, for as long as they are on
              your site.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="flex -space-x-2.5">
                {[img.engineer, img.crew, img.classroom].map((m, i) => (
                  <img
                    key={i}
                    src={m.src.replace('w=1600', 'w=120').replace('w=2200', 'w=120')}
                    alt=""
                    aria-hidden="true"
                    className="border-copper h-9 w-9 rounded-full border-2 object-cover"
                  />
                ))}
              </span>
              <span className="text-ivory/90 text-xs leading-snug">
                340 trainees currently
                <br />
                under active monitoring
              </span>
            </div>
          </div>
        </a>
      </div>
    </section>
  )
}
