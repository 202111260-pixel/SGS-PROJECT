import { FadedWords, CountUp } from '../motion/Reveal'
import { img } from '../data/content'

export default function About() {
  return (
    <section className="px-[clamp(1.5rem,4vw,4rem)] py-[clamp(5rem,12vw,10rem)]">
      <div className="grid gap-12 lg:grid-cols-12">
        <p className="eyebrow text-ink-soft lg:col-span-3">What we run</p>
        <FadedWords
          as="p"
          mode="scrub"
          split="chars"
          className="font-display text-ink max-w-[24ch] text-[clamp(1.9rem,3.6vw,3.4rem)] leading-[1.18] font-medium lg:col-span-9"
        >
          SGS keeps its field-operations workforce audit-ready: every employee
          is certified, every certificate is current, and every competency grade
          is calculated live, down to the last expiry date.
        </FadedWords>
      </div>

      <div className="relative mt-[clamp(7rem,14vw,12rem)]">
        <p
          aria-hidden="true"
          data-speed="1.08"
          data-skew
          className="font-display text-ink/[0.05] pointer-events-none absolute -top-[0.82em] left-0 leading-none font-bold tracking-tight whitespace-nowrap select-none text-[clamp(6rem,15vw,13rem)]"
        >
          312 on roster
        </p>

        <div className="relative grid gap-5 md:grid-cols-12">
        <figure className="relative overflow-hidden rounded-3xl md:col-span-5">
          <img
            src={img.pylons.src}
            alt={img.pylons.alt}
            loading="lazy"
            className="h-full min-h-[22rem] w-full scale-110 object-cover"
            data-speed="auto"
          />
          <figcaption className="text-ivory/90 absolute bottom-5 left-6 text-xs font-medium tracking-[0.14em] uppercase">
            Interconnect corridor, 18:40
          </figcaption>
        </figure>

        <div className="bg-copper text-ivory flex flex-col justify-between rounded-3xl p-8 md:col-span-3 md:translate-y-8">
          <p className="text-sm leading-relaxed opacity-90">
            of the workforce holds a current, in-date competency grade at any
            given moment.
          </p>
          <p className="font-display mt-14 text-[clamp(4rem,6vw,5.5rem)] leading-none font-bold">
            <CountUp value={94} suffix="%" />
          </p>
        </div>

        <div className="md:col-span-4 md:pl-6">
          <p className="text-ink-soft max-w-[44ch] text-base leading-relaxed">
            The numbers speak for themselves. <CountUp value={312} suffix="" className="text-ink font-semibold" />{' '}
            employees on the live roster, across{' '}
            <CountUp value={8} className="text-ink font-semibold" /> field-operations
            roles, on{' '}
            <CountUp value={2} className="text-ink font-semibold" /> major
            projects. Every one carries a complete, verifiable certificate
            record, and every grade recomputes the moment a certificate changes.
          </p>
          <figure className="mt-8 overflow-hidden rounded-3xl">
            <img
              src={img.classroom.src}
              alt={img.classroom.alt}
              loading="lazy"
              className="h-52 w-full object-cover"
            />
          </figure>
        </div>
        </div>
      </div>
    </section>
  )
}
