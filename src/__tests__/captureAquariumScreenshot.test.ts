import { describe, expect, it, vi } from 'vitest'
import { captureAquariumScreenshot } from '../../scripts/capture-aquarium-screenshot.mjs'

describe('captureAquariumScreenshot', () => {
  it('captures through a Playwright CDP session instead of page.screenshot', async () => {
    const writeFile = vi.fn()
    const send = vi.fn(async () => ({ data: Buffer.from('jpeg').toString('base64') }))
    const pageScreenshot = vi.fn()
    const browser = { close: vi.fn() }
    const page = {
      goto: vi.fn(),
      waitForTimeout: vi.fn(),
      screenshot: pageScreenshot,
      evaluate: vi.fn(),
      context: () => ({
        newCDPSession: vi.fn(async () => ({ send }))
      })
    }
    const chromium = {
      launch: vi.fn(async () => ({
        newPage: vi.fn(async () => page),
        close: browser.close
      }))
    }

    const result = await captureAquariumScreenshot({
      chromium,
      fs: { writeFile },
      url: 'http://127.0.0.1:5174/meaningless/',
      outputPath: '/tmp/aquarium.jpg',
      waitMs: 0
    })

    expect(result).toEqual('/tmp/aquarium.jpg')
    expect(page.goto).toHaveBeenCalledWith(
      'http://127.0.0.1:5174/meaningless/',
      { waitUntil: 'domcontentloaded' }
    )
    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function))
    expect(send).toHaveBeenCalledWith('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 85,
      fromSurface: true
    })
    expect(pageScreenshot).not.toHaveBeenCalled()
    expect(writeFile).toHaveBeenCalledWith('/tmp/aquarium.jpg', Buffer.from('jpeg'))
    expect(browser.close).toHaveBeenCalled()
  })
})
