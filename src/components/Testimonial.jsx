import { FadedWords } from '../motion/Reveal'

export default function Testimonial() {
  return (
    <section className="px-[clamp(1.5rem,4vw,4rem)] py-[clamp(5rem,12vw,10rem)]">
      <figure className="mx-auto max-w-4xl">
        <p className="eyebrow text-ink-soft mb-10">From a project operator</p>
        <blockquote>
          <FadedWords
            as="p"
            mode="scrub"
            split="chars"
            className="font-display text-ink text-[clamp(1.8rem,3.4vw,3.1rem)] leading-[1.25] font-medium"
          >
            “SGS placed forty operators on our project. Before any of them reached
            the gate, we could see every certificate and competency grade: valid,
            verified, and current. No spreadsheet gave us that.”
          </FadedWords>
        </blockquote>
        <figcaption className="mt-10 flex items-center gap-4">
          <span className="bg-copper block h-px w-12" />
          <span className="text-ink-soft text-sm">
            <strong className="text-ink font-semibold">Latifa Al Harthy</strong>, Operations
            Readiness Lead, project operator
          </span>
        </figcaption>
      </figure>
    </section>
  )
}
