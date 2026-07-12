import { gsap, SplitText } from './gsap'
import { useFontsGsap } from './useFontsGsap'

/**
 * Headline lines rise out of a clipped mask, line by line.
 * scrub mode ties the rise directly to scroll velocity (with inertia);
 * play mode fires once with an exponential ease.
 */
export function MaskedLines({
  as: Tag = 'h2',
  children,
  className = '',
  mode = 'scrub', // 'scrub' | 'play'
  start = 'top 90%',
  end = 'top 45%',
  stagger = 0.18,
  ...rest
}) {
  const scope = useFontsGsap(() => {
    const el = scope.current
    const split = SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
    })
    if (mode === 'scrub') {
      // Lines surface with a slight roll that settles as they clear the mask
      gsap.from(split.lines, {
        yPercent: 122,
        rotate: 4,
        transformOrigin: '0% 100%',
        ease: 'none',
        stagger,
        scrollTrigger: { trigger: el, start, end, scrub: 1.2 },
      })
    } else {
      gsap.from(split.lines, {
        yPercent: 122,
        rotate: 3,
        transformOrigin: '0% 100%',
        duration: 1.5,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: el, start, toggleActions: 'play none none reverse' },
      })
    }
  })

  return (
    <Tag ref={scope} className={className} {...rest}>
      {children}
    </Tag>
  )
}

/**
 * Paragraph words fade in one after another as the text enters the
 * viewport. scrub mode brightens the text from near-invisible as you
 * scroll through the block (word- or character-grained); play mode is
 * a fast one-shot stagger.
 */
export function FadedWords({
  as: Tag = 'p',
  children,
  className = '',
  mode = 'play', // 'scrub' | 'play'
  split = 'words', // 'words' | 'chars'
  start = 'top 85%',
  end = 'bottom 65%',
  ...rest
}) {
  const scope = useFontsGsap(() => {
    const el = scope.current
    if (mode === 'scrub' && split === 'chars') {
      const parts = SplitText.create(el, { type: 'words,chars' })
      gsap.from(parts.chars, {
        opacity: 0.08,
        ease: 'none',
        stagger: 0.015,
        scrollTrigger: { trigger: el, start, end, scrub: 0.7 },
      })
      return
    }
    const parts = SplitText.create(el, { type: 'words' })
    if (mode === 'scrub') {
      gsap.from(parts.words, {
        opacity: 0.12,
        ease: 'none',
        stagger: 0.06,
        scrollTrigger: { trigger: el, start, end, scrub: 0.8 },
      })
    } else {
      gsap.from(parts.words, {
        opacity: 0,
        y: 12,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.016,
        scrollTrigger: { trigger: el, start, toggleActions: 'play none none reverse' },
      })
    }
  })

  return (
    <Tag ref={scope} className={className} {...rest}>
      {children}
    </Tag>
  )
}

/** Counts a number up from zero the first time it scrolls into view. */
export function CountUp({ value, suffix = '', className = '' }) {
  const scope = useFontsGsap(() => {
    const el = scope.current
    const state = { v: 0 }
    gsap.to(state, {
      v: value,
      duration: 1.8,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => {
        el.textContent = Math.round(state.v).toLocaleString('en-US') + suffix
      },
    })
  })

  return (
    <span ref={scope} className={className}>
      {value.toLocaleString('en-US')}
      {suffix}
    </span>
  )
}
