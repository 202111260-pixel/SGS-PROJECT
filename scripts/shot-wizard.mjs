import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const OUT = 'shots'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:5181'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  defaultViewport: { width: 1440, height: 1000 },
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(BASE + '/employees/new', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1000))

const clickByText = (txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith(t))
    if (b) b.click()
    return !!b
  }, txt)

for (let i = 1; i <= 4; i++) {
  await page.screenshot({ path: `${OUT}/wiz-${i}.png` })
  console.log('shot step', i)
  if (i < 4) {
    const ok = await clickByText('Next')
    if (!ok) console.log('  (no Next button found)')
    await new Promise((r) => setTimeout(r, 900)) // let the slide + height settle
  }
}

// go back to step 1 via the stepper circle "1"
await page.evaluate(() => {
  const b = [...document.querySelectorAll('nav[aria-label="Form steps"] button')][0]
  if (b) b.click()
})
await new Promise((r) => setTimeout(r, 900))
await page.screenshot({ path: `${OUT}/wiz-back-to-1.png` })
console.log('shot back-to-1')

await browser.close()
console.log('PAGE ERRORS:', errors.length ? errors : 'none')
