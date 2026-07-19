import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const OUT = 'shots'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:5181'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--window-size=1440,1100', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 1100 },
})

const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

async function gotoProfile(id) {
  await page.goto(`${BASE}/employees/${id}`, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 900))
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot', name)
}

async function clickSub(title) {
  await page.evaluate((t) => {
    const subs = [...document.querySelectorAll('.pf-sub')]
    const f = subs.find((b) => b.querySelector('.pf-sub-name')?.textContent === t)
    if (f) f.click()
  }, title)
  await new Promise((r) => setTimeout(r, 900))
}

async function openProperty() {
  await page.evaluate(() => {
    document.querySelector('.pf-face')?.click()
  })
  await new Promise((r) => setTimeout(r, 900))
}

// light — dossier closed
await gotoProfile('e-10247')
await shot('profile-dossier-light')

// light — valid sub-folder pulled out, drawer open
await clickSub('Valid')
await shot('profile-dossier-valid-open')

// light — switch to missing while open + property drawer
await clickSub('Missing')
await openProperty()
await shot('profile-dossier-missing-property')

// dark
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'dark'))
await gotoProfile('e-10247')
await clickSub('Valid')
await shot('profile-dossier-dark')

// mobile
await page.setViewport({ width: 390, height: 900 })
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'light'))
await gotoProfile('e-10247')
await shot('profile-dossier-mobile')

await browser.close()
console.log('PAGE ERRORS:', errors.length ? errors : 'none')
