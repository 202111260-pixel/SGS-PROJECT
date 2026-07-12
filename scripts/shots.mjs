import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const OUT = 'shots'
mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--window-size=1440,900', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900 },
})

const page = await browser.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })

// let the preloader and hero intro finish
await new Promise((r) => setTimeout(r, 5200))
await page.screenshot({ path: `${OUT}/01-hero.png` })

const height = await page.evaluate(
  () => document.querySelector('#smooth-content').scrollHeight,
)
const stops = 9
for (let i = 1; i <= stops; i++) {
  const y = Math.round(((height - 900) * i) / stops)
  await page.evaluate((y) => window.scrollTo(0, y), y)
  // wait for smooth-scroll inertia + scrubbed reveals to settle
  await new Promise((r) => setTimeout(r, 2400))
  await page.screenshot({ path: `${OUT}/${String(i + 1).padStart(2, '0')}-y${y}.png` })
}

// mobile pass
await page.setViewport({ width: 390, height: 844 })
await page.evaluate(() => window.scrollTo(0, 0))
await new Promise((r) => setTimeout(r, 1500))
await page.screenshot({ path: `${OUT}/m1-hero.png` })
const mh = await page.evaluate(
  () => document.querySelector('#smooth-content').scrollHeight,
)
for (const [name, frac] of [['m2', 0.25], ['m3', 0.5], ['m4', 0.75], ['m5', 1]]) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round((mh - 844) * frac))
  await new Promise((r) => setTimeout(r, 2200))
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

await browser.close()
console.log('done, content height', height, 'mobile', mh)
