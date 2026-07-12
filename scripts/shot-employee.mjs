import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const OUT = 'shots'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:5181'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--window-size=1440,1000', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 1000 },
})

const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

async function grab(path, name) {
  await page.goto(BASE + path, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 900))
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot', name)
}

await grab('/employees/new', 'emp-new-light')
await grab('/employees/10241/edit', 'emp-edit-light')

// dark mode
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'dark'))
await grab('/employees/new', 'emp-new-dark')

// mobile
await page.setViewport({ width: 390, height: 900 })
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'light'))
await grab('/employees/new', 'emp-new-mobile')

await browser.close()
console.log('PAGE ERRORS:', errors.length ? errors : 'none')
