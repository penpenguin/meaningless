import { describe, expect, it } from 'vitest'
import { showBubbleLoadingAnimation } from './loadingScreen'

describe('showBubbleLoadingAnimation', () => {
  it('renders a procedural bubble cluster into the loading container', () => {
    document.body.innerHTML = '<div id="lottie-bubbles"></div>'

    showBubbleLoadingAnimation()

    const container = document.getElementById('lottie-bubbles') as HTMLDivElement
    const bubbles = Array.from(container.querySelectorAll('.loading-bubble'))
    const core = container.querySelector('.loading-bubble-core')

    expect(container.dataset.loadingAnimation).toBe('bubbles')
    expect(core).not.toBeNull()
    expect(bubbles).toHaveLength(7)
    expect(bubbles.every((bubble) => bubble instanceof HTMLSpanElement)).toBe(true)
  })

  it('does not duplicate the bubble cluster when initialized twice', () => {
    document.body.innerHTML = '<div id="lottie-bubbles"></div>'

    showBubbleLoadingAnimation()
    showBubbleLoadingAnimation()

    const container = document.getElementById('lottie-bubbles') as HTMLDivElement

    expect(container.querySelectorAll('.loading-bubble')).toHaveLength(7)
    expect(container.querySelectorAll('.loading-bubble-core')).toHaveLength(1)
  })
})
