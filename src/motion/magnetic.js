import { gsap, prefersReducedMotion } from './gsap'

/**
 * Buttons gently chase the cursor and ease back on leave.
 * Pointer-fine devices only; exponential return, no elastic.
 */
export function initMagnetic() {
  if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) {
    return () => {}
  }
  const cleanups = []
  document.querySelectorAll('.btn, [data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' })
    const move = (e) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * 0.32)
      yTo((e.clientY - (r.top + r.height / 2)) * 0.38)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    cleanups.push(() => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    })
  })
  return () => cleanups.forEach((fn) => fn())
}
