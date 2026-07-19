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

async function gotoWallet() {
  await page.goto(BASE + '/training', { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 700))
  // click stepper item 3 ("Certificates", step index 2)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('nav[aria-label="Competency sections"] button')]
    const target = btns.find((b) => b.textContent.includes('Certificates'))
    if (target) target.click()
  })
  await new Promise((r) => setTimeout(r, 900))
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot', name)
}

async function openFolder(label, midShot) {
  await page.evaluate((lbl) => {
    const folders = [...document.querySelectorAll('.cert-folder')]
    const f = folders.find((b) => b.querySelector('.cf-title')?.textContent === lbl)
    if (f) f.click()
  }, label)
  if (midShot) {
    await new Promise((r) => setTimeout(r, 90))
    await shot(midShot)
  }
  await new Promise((r) => setTimeout(r, 1000))
}

// light — closed folders
await gotoWallet()
await shot('wallet-folders-closed')

// light — valid folder cold open, catching cards mid-flight out of the folder
await openFolder('Valid', 'wallet-flight-mid')
await shot('wallet-folder-valid-open')

// light — switch to the empty expired folder while open
await openFolder('Expired')
await shot('wallet-folder-expired-open')

// dark
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'dark'))
await gotoWallet()
await openFolder('Valid')
await shot('wallet-dark-valid-open')

// mobile
await page.setViewport({ width: 390, height: 900 })
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'light'))
await gotoWallet()
await shot('wallet-mobile-closed')
await openFolder('Missing')
await shot('wallet-mobile-missing-open')

await browser.close()
console.log('PAGE ERRORS:', errors.length ? errors : 'none')
