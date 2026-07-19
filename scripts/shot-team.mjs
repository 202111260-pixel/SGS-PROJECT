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

async function go() {
  await page.goto(`${BASE}/team`, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 900))
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot', name)
}

await go()
await shot('team-one-light')

// open day 20 in the inspector, mark it Vacation via the inspector chips
await page.evaluate(() => {
  const days = [...document.querySelectorAll('.tm-day')]
  const d20 = days.find((d) => d.querySelector('.tm-day-no')?.textContent === '20')
  if (d20) d20.click()
})
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const chips = [...document.querySelectorAll('.tm-insp-chips .rst-chip')]
  const v = chips.find((c) => c.textContent.trim().startsWith('V'))
  if (v) v.click()
})
await new Promise((r) => setTimeout(r, 300))

// walk to day 21 and give it custom working hours 07:30 – 15:00
await page.evaluate(() => {
  const days = [...document.querySelectorAll('.tm-day')]
  const d21 = days.find((d) => d.querySelector('.tm-day-no')?.textContent === '21')
  if (d21) d21.click()
})
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  const inputs = [...document.querySelectorAll('.tm-time')]
  if (inputs[0]) {
    setter.call(inputs[0], '07:30')
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
  }
})
await new Promise((r) => setTimeout(r, 250))
await page.evaluate(() => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  const inputs = [...document.querySelectorAll('.tm-time')]
  if (inputs[1]) {
    setter.call(inputs[1], '15:00')
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
  }
})
await new Promise((r) => setTimeout(r, 400))
await shot('team-one-edited')

// open the add panel, then edit mode
await page.evaluate(() => {
  const add = [...document.querySelectorAll('.tm-mini')].find((b) => b.textContent.includes('Add'))
  if (add) add.click()
})
await new Promise((r) => setTimeout(r, 500))
await shot('team-one-add')
await page.evaluate(() => {
  const edit = [...document.querySelectorAll('.tm-mini')].find((b) => b.textContent.trim() === 'Edit')
  if (edit) edit.click()
})
await new Promise((r) => setTimeout(r, 400))
await shot('team-one-edit-mode')

// dark
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'dark'))
await go()
await shot('team-one-dark')

// mobile
await page.setViewport({ width: 390, height: 900 })
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'light'))
await go()
await shot('team-one-mobile')

await browser.close()
console.log('PAGE ERRORS:', errors.length ? errors : 'none')
