// scripts/prerender.js
import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer'

const HOST = 'http://localhost:4173'      // matches `npm run preview`
const ROUTES = ['/', '/digging']            // add new routes here

async function prerender () {
  // 1) Launch headless Chrome
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // 2) For each route…
  for (const route of ROUTES) {
    const url = HOST + route
    const outDir = path.join('dist', route === '/' ? '' : route)
    const outFile = path.join(outDir, 'index.html')

    console.log(`Prerendering ${url} → ${outFile}`)
    await page.goto(url, { waitUntil: 'networkidle0' })

    // 3) Grab the fully rendered HTML (with your meta tags!)
    const html = await page.content()

    // 4) Write it back out
    await fs.mkdir(outDir, { recursive: true })
    await fs.writeFile(outFile, html)
  }

  await browser.close()
  console.log('✅ Prerender complete.')
}

prerender().catch(err => {
  console.error(err)
  process.exit(1)
})
