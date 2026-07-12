import { useLayoutEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from './gsap'

/**
 * Runs a gsap.context callback once webfonts are loaded, scoped to the
 * returned ref. SplitText needs final glyph metrics, so nothing splits
 * before document.fonts.ready resolves. No-ops under reduced motion:
 * every animation here is a `from`, so static markup is the final state.
 */
export function useFontsGsap(callback, deps = []) {
  const scope = useRef(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return undefined
    let ctx
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled || !scope.current) return
      ctx = gsap.context(callback, scope)
    })
    return () => {
      cancelled = true
      if (ctx) ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return scope
}
