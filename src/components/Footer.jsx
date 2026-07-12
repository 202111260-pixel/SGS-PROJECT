import { gsap } from '../motion/gsap'
import { useFontsGsap } from '../motion/useFontsGsap'
import SgsLogo from './SgsLogo'

const columns = [
  {
    title: 'Programs',
    span: 'md:col-span-3',
    items: ['HSE & H2S Safety', 'Well Control', 'Electrical & Instrumentation', 'Mechanical & Piping', 'Operations Readiness'],
  },
  {
    title: 'Company',
    span: 'md:col-span-2',
    items: ['About SGS', 'Partner operators', 'Accreditations', 'Careers'],
  },
  {
    title: 'Contact',
    span: 'md:col-span-2',
    items: ['enroll@sgs-training.om', '+968 24 00 00 00', 'Knowledge Oasis, Muscat'],
  },
]

export default function Footer() {
  const scope = useFontsGsap(() => {
    gsap.from('[data-footer-mark]', {
      yPercent: 40,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '[data-footer-mark]',
        start: 'top 100%',
        end: 'top 72%',
        scrub: 1.2,
      },
    })
  })

  return (
    <footer ref={scope} className="px-[clamp(1.5rem,4vw,4rem)] pt-[clamp(4rem,8vw,7rem)] pb-8">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <SgsLogo className="text-ink h-12 w-auto" aria-label="SGS" />
          <p className="text-ink-soft mt-4 max-w-xs text-sm leading-relaxed">
            Training management for the energy sector. Enroll, train, certify,
            deploy, monitor.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} className={col.span}>
            <h3 className="text-ink mb-4 text-xs font-semibold tracking-[0.14em] uppercase">
              {col.title}
            </h3>
            <ul className="space-y-2.5">
              {col.items.map((item) => (
                <li key={item}>
                  <a
                    href="#contact"
                    className="text-ink-soft hover:text-copper-deep text-sm transition-colors duration-300"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-[clamp(3rem,6vw,5rem)] flex justify-center overflow-hidden" data-lag="0.15" data-skew>
        <SgsLogo
          data-footer-mark
          aria-hidden="true"
          className="text-ink/90 w-[min(58rem,82vw)]"
        />
      </div>

      <div className="border-ink/10 mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <p className="text-ink-soft text-xs">
          © {new Date().getFullYear()} SGS Training Institute. All rights reserved.
        </p>
        <p className="text-ink-soft text-xs">Muscat · Sohar · Salalah</p>
      </div>
    </footer>
  )
}
