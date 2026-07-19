import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const OUT = 'shots'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE || 'http://localhost:5181'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--window-size=1500,1100', '--hide-scrollbars'],
  defaultViewport: { width: 1500, height: 1100 },
})

const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

async function go(path = '/roster') {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 1000))
}

async function shot(name, fullPage = true) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
  console.log('shot', name)
}

// clean slate
await go()
await page.evaluate(() => localStorage.clear())
await go()

// the page must LAND on the flat sheet: every employee, alphabetical, no
// team group rows, no org-unit teams, today's column marked and in view
const check = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.rst-table tbody tr')]
  const supSelect = [...(document.querySelectorAll('.rst-filter select')[0]?.options ?? [])].map((o) => o.value)
  const scrollBox = document.querySelector('.rst-scroll')
  return {
    rowCount: rows.length,
    firstRows: rows.slice(0, 4).map((r) => r.querySelector('.rst-name-main')?.textContent.trim() ?? ''),
    firstRowIsSup: !!rows[0]?.querySelector('th.is-sup'),
    groupHeaders: document.querySelectorAll('.rst-group').length,
    countText: document.querySelector('.rst-count')?.textContent.trim() ?? '',
    hasCountryTeams: supSelect.some((v) => v.includes('Country')),
    todayMarked: document.querySelector('th.rst-day.is-tdy') !== null,
    scrolledToToday: scrollBox ? scrollBox.scrollLeft > 0 : null,
  }
})
console.log('SHEET CHECK:', JSON.stringify(check, null, 2))
await shot('roster-light', false)

// smart filter: narrowing to a team must show its SUPERVISOR first, then
// the members, each member's sub-line naming the team
await page.evaluate(() => {
  const sel = document.querySelectorAll('.rst-filter select')[0]
  if (sel) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
    setter.call(sel, 'Salim Al-Rashdi')
    sel.dispatchEvent(new Event('change', { bubbles: true }))
  }
})
await new Promise((r) => setTimeout(r, 500))
const filtered = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.rst-table tbody tr')]
  return {
    rows: rows.length,
    countText: document.querySelector('.rst-count')?.textContent.trim() ?? '',
    supLeads: !!rows[0]?.querySelector('th.is-sup'),
    supName: rows[0]?.querySelector('.rst-name-main')?.textContent.trim() ?? '',
    memberSubsNameTeam: rows.slice(1).every((r) => (r.querySelector('.rst-name-sub')?.textContent ?? '').includes('Team ')),
  }
})
console.log('FILTERED:', JSON.stringify(filtered))
await shot('roster-filtered', false)

// THE AUTOMATIC RULE — stamp a day on the supervisor's row: every member
// of the team must take the same code in the same stroke
await page.evaluate(() => {
  const chip = [...document.querySelectorAll('.rst-tray .rst-chip')].find((c) => c.textContent.trim() === 'V')
  chip?.click()
})
await new Promise((r) => setTimeout(r, 300))
await page.evaluate(() => {
  const supRow = [...document.querySelectorAll('.rst-table tbody tr')].find((r) => r.querySelector('th.is-sup'))
  const cell = supRow?.querySelector('td:nth-child(4) button')
  cell?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
})
await new Promise((r) => setTimeout(r, 400))
const follow = await page.evaluate(() =>
  [...document.querySelectorAll('.rst-table tbody tr')].map((r) => ({
    sup: !!r.querySelector('th.is-sup'),
    day3: r.querySelector('td:nth-child(4) button')?.textContent.trim() ?? '',
  })),
)
console.log(
  'FOLLOW CHECK — sup stamped V:', follow.find((r) => r.sup)?.day3 === 'V',
  '· every member V:', follow.filter((r) => !r.sup).every((r) => r.day3 === 'V'),
  '· team size:', follow.length,
)

// dark + mobile
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('sgs-theme-v2', 'dark') })
await go()
await shot('roster-dark', false)
await page.setViewport({ width: 390, height: 900 })
await page.evaluate(() => localStorage.setItem('sgs-theme-v2', 'light'))
await go()
await shot('roster-mobile')

await browser.close()
console.log('PAGE ERRORS:', errors.length ? errors : 'none')
