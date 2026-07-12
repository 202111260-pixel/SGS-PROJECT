import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap, ScrollSmoother, ScrollTrigger, prefersReducedMotion } from '../motion/gsap'
import { initMagnetic } from '../motion/magnetic'
import Preloader from '../components/Preloader'
import Hero from '../components/Hero'
import Partners from '../components/Partners'
import About from '../components/About'
import Pipeline from '../components/Pipeline'
import ParallaxBreak from '../components/ParallaxBreak'
import Testimonial from '../components/Testimonial'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

export default function Landing() {
  const [introDone, setIntroDone] = useState(false)
  const smoother = useRef(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined
    smoother.current = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.5,
      effects: true,
      smoothTouch: 0.1,
    })
    smoother.current.paused(true)
    window.__smoother = smoother.current

    // Velocity skew: display text leans with hard scroll flicks,
    // then settles back on an exponential curve. Liquid, never elastic.
    const skewTargets = gsap.utils.toArray('[data-skew]')
    let skewTrigger
    if (skewTargets.length) {
      const setSkew = gsap.quickSetter(skewTargets, 'skewY', 'deg')
      const proxy = { skew: 0 }
      skewTrigger = ScrollTrigger.create({
        onUpdate: (self) => {
          const target = gsap.utils.clamp(-4.5, 4.5, self.getVelocity() / -350)
          if (Math.abs(target) > Math.abs(proxy.skew)) {
            proxy.skew = target
            gsap.to(proxy, {
              skew: 0,
              duration: 0.9,
              ease: 'power3.out',
              overwrite: true,
              onUpdate: () => setSkew(proxy.skew),
            })
          }
        },
      })
    }

    return () => {
      skewTrigger?.kill()
      smoother.current?.kill()
      delete window.__smoother
    }
  }, [])

  useLayoutEffect(() => {
    if (!introDone) return undefined
    smoother.current?.paused(false)
    ScrollTrigger.refresh()
    return initMagnetic()
  }, [introDone])

  return (
    <>
      <Preloader onDone={() => setIntroDone(true)} />

      {/* Launch pill lives outside #smooth-content so its `fixed` is real */}
      <Link
        to="/dashboard"
        data-magnetic
        className="bg-ink text-ivory hover:bg-copper-deep fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-[0_20px_50px_-20px_oklch(0.2_0.03_55/0.6)] transition-colors duration-300"
      >
        <span className="bg-pos h-2 w-2 rounded-full" />
        Open dashboard
        <span aria-hidden="true">↗</span>
      </Link>

      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main>
            <Hero introDone={introDone} />
            <Partners />
            <About />
            <Pipeline />
            <ParallaxBreak />
            <Testimonial />
            <CTA />
          </main>
          <Footer />
        </div>
      </div>
    </>
  )
}
