import { MaskedLines, FadedWords } from '../motion/Reveal'
import { img } from '../data/content'
import LogoMask from './LogoMask'

export default function CTA() {
  return (
    <section id="contact" className="px-[clamp(0.5rem,1.2vw,1rem)]">
      <div className="bg-copper rounded-[2rem] px-[clamp(1.5rem,5vw,5rem)] py-[clamp(5rem,10vw,9rem)]">
        <div className="grid items-center gap-x-16 gap-y-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="eyebrow text-ivory/90 mb-8 before:bg-ivory">Start this quarter</p>
            <div data-skew>
              <MaskedLines
                as="h2"
                className="font-display text-ivory max-w-[13ch] text-[clamp(2.8rem,6vw,5.5rem)] leading-[1.03] font-bold tracking-tight"
              >
                Your next crew is already in class.
              </MaskedLines>
            </div>
            <FadedWords className="text-ivory/90 mt-10 max-w-md text-lg leading-relaxed">
              Tell us the roles you need to fill. We will map the programs,
              enroll your candidates, and hand you the tracking dashboard.
            </FadedWords>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="mailto:enroll@sgs-training.om" className="btn bg-ivory text-ink hover:bg-sand">
                Request a demo
                <span className="arrow">→</span>
              </a>
              <a
                href="tel:+96824000000"
                className="btn border-ivory/50 text-ivory hover:border-ivory border"
              >
                +968 24 00 00 00
              </a>
            </div>
          </div>

          {/* The field, seen through the letters that train it */}
          <div>
            <LogoMask src={img.crew.src} className="w-full" />
            <p className="text-ivory/80 mt-6 text-center text-xs font-medium tracking-[0.18em] uppercase">
              The field, through our letters
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
