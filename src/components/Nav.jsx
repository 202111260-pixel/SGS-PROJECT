import { useState } from 'react'

const links = [
  ['Home', '#top'],
  ['How it works', '#tracking'],
  ['Operators', '#partners'],
  ['Contact', '#contact'],
]

/** Segmented pill bar: white capsule, active link gets the dark pill. */
export default function Nav() {
  const [active, setActive] = useState('#top')

  const go = (e, hash) => {
    e.preventDefault()
    setActive(hash)
    const el = document.querySelector(hash)
    if (!el) return
    if (window.__smoother) window.__smoother.scrollTo(el, true, 'top 64px')
    else el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav
      data-hero-nav
      className="bg-ivory inline-flex items-center gap-1 rounded-full p-1.5 shadow-[0_10px_30px_-18px_oklch(0.2_0.03_55/0.45)]"
    >
      {links.map(([label, hash]) => (
        <a
          key={hash}
          href={hash}
          onClick={(e) => go(e, hash)}
          className={`rounded-full px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors duration-300 sm:px-5 sm:py-2.5 sm:text-sm ${
            active === hash
              ? 'bg-ink text-ivory'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}
