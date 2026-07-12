import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../motion/gsap'
import SgsLogo from './SgsLogo'

export default function Preloader({ onDone }) {
  const root = useRef(null)
  const logo = useRef(null)
  const count = useRef(null)
  const fired = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (!fired.current) {
        fired.current = true
        onDone()
      }
    }

    if (prefersReducedMotion()) {
      gsap.set(root.current, { display: 'none' })
      finish()
      return undefined
    }

    const ctx = gsap.context(() => {
      const state = { v: 0 }
      const tl = gsap.timeline()

      // The crosshair rules draw themselves in first
      tl.fromTo(
        '[data-logo-line-h]',
        { scaleX: 0, transformOrigin: 'left center' },
        { scaleX: 2, duration: 0.9, ease: 'expo.inOut' },
        0.15,
      )
        .fromTo(
          '[data-logo-line-v]',
          { scaleY: 0, transformOrigin: 'center top' },
          { scaleY: 1, duration: 0.9, ease: 'expo.inOut' },
          0.3,
        )
        // Then the letters surface
        .from(
          '[data-logo-letter]',
          { y: 70, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 },
          0.55,
        )
        .to(
          state,
          {
            v: 100,
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => {
              // ref may be detached when the context reverts on unmount
              if (count.current) {
                count.current.textContent = String(Math.round(state.v)).padStart(3, '0')
              }
            },
          },
          0.3,
        )
        // Arm the page reveal while still fully covered, so the hero intro
        // is already in motion when the curtain lifts: no static pop.
        .call(finish, [], '+=0.15')
        // Exit: the curtain lifts, the mark drifts down inside it
        .to(logo.current, { y: 140, opacity: 0.9, duration: 1.05, ease: 'expo.inOut' }, '+=0.2')
        .to(
          root.current,
          { yPercent: -100, duration: 1.05, ease: 'expo.inOut' },
          '<',
        )
        .set(root.current, { display: 'none' })
    }, root)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="bg-paper fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    >
      <div ref={logo}>
        <SgsLogo className="text-ink w-[clamp(15rem,34vw,24rem)]" />
      </div>
      <span
        ref={count}
        className="text-ink-soft absolute bottom-10 text-xs font-medium tracking-[0.2em] tabular-nums"
      >
      </span>
    </div>
  )
}
