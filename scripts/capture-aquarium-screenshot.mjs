import { chromium as defaultChromium } from 'playwright'
import { promises as defaultFs } from 'node:fs'

const defaultUrl = 'http://127.0.0.1:5173/meaningless/'
const defaultOutputPath = '/tmp/meaningless-aquarium.jpg'

/**
 * @typedef {{
 *   launch: (options: { headless: boolean }) => Promise<any>
 * }} ScreenshotChromium
 *
 * @typedef {{
 *   writeFile: (path: string, data: Buffer) => Promise<unknown>
 * }} ScreenshotFs
 *
 * @typedef {{
 *   chromium?: ScreenshotChromium,
 *   fs?: ScreenshotFs,
 *   url?: string,
 *   outputPath?: string,
 *   width?: number,
 *   height?: number,
 *   waitMs?: number,
 *   quality?: number,
 *   hideHud?: boolean
 * }} CaptureAquariumScreenshotOptions
 */

/**
 * @param {CaptureAquariumScreenshotOptions} [options]
 * @returns {Promise<string>}
 */
export const captureAquariumScreenshot = async ({
  chromium = defaultChromium,
  fs = defaultFs,
  url = defaultUrl,
  outputPath = defaultOutputPath,
  width = 1368,
  height = 768,
  waitMs = 1500,
  quality = 85,
  hideHud = true
} = {}) => {
  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(waitMs)

    if (hideHud) {
      await page.evaluate(() => {
        const hideHudButton = document.querySelector('[data-action="hide-hud"]')
        if (hideHudButton instanceof HTMLButtonElement) {
          hideHudButton.click()
        }
      })
      await page.waitForTimeout(500)
    }

    const client = await page.context().newCDPSession(page)
    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality,
      fromSurface: true
    })

    await fs.writeFile(outputPath, Buffer.from(screenshot.data, 'base64'))
    return outputPath
  } finally {
    await browser.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputPath = process.argv[2] ?? defaultOutputPath
  const url = process.env.AQUARIUM_SCREENSHOT_URL ?? defaultUrl
  const waitMs = Number(process.env.AQUARIUM_SCREENSHOT_WAIT_MS ?? 1500)
  const hideHud = process.env.AQUARIUM_SCREENSHOT_HIDE_HUD !== '0'

  captureAquariumScreenshot({ outputPath, url, waitMs, hideHud })
    .then((path) => {
      console.log(path)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
