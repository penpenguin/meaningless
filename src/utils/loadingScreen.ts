const bubbleSpecs = [
  { left: '18%', size: '1.1rem', duration: '3.6s', delay: '-0.3s' },
  { left: '32%', size: '0.82rem', duration: '3.1s', delay: '-1.4s' },
  { left: '44%', size: '1.36rem', duration: '4.2s', delay: '-0.9s' },
  { left: '58%', size: '0.9rem', duration: '3.4s', delay: '-2.1s' },
  { left: '67%', size: '1.22rem', duration: '4.6s', delay: '-1.1s' },
  { left: '76%', size: '0.76rem', duration: '3.2s', delay: '-2.6s' },
  { left: '86%', size: '1rem', duration: '3.8s', delay: '-1.8s' }
] as const

const createBubbleElement = (
  spec: typeof bubbleSpecs[number],
  index: number
): HTMLSpanElement => {
  const bubble = document.createElement('span')
  bubble.className = 'loading-bubble'
  bubble.setAttribute('aria-hidden', 'true')
  bubble.style.setProperty('--bubble-left', spec.left)
  bubble.style.setProperty('--bubble-size', spec.size)
  bubble.style.setProperty('--bubble-duration', spec.duration)
  bubble.style.setProperty('--bubble-delay', spec.delay)
  bubble.style.setProperty('--bubble-drift', `${(index % 2 === 0 ? 1 : -1) * (8 + (index * 2))}px`)
  return bubble
}

export const showBubbleLoadingAnimation = (containerId = 'lottie-bubbles'): void => {
  const container = document.getElementById(containerId)
  if (!container) return
  if (container.dataset.loadingAnimation === 'bubbles') return

  container.innerHTML = ''
  container.dataset.loadingAnimation = 'bubbles'
  container.classList.add('loading-bubbles')

  const cluster = document.createElement('div')
  cluster.className = 'loading-bubble-cluster'

  const core = document.createElement('span')
  core.className = 'loading-bubble-core'
  core.setAttribute('aria-hidden', 'true')
  cluster.appendChild(core)

  bubbleSpecs.forEach((spec, index) => {
    cluster.appendChild(createBubbleElement(spec, index))
  })

  container.appendChild(cluster)
}

export const hideLoadingOverlay = (screenId = 'loading-screen'): void => {
  const loadingScreen = document.getElementById(screenId)
  if (!loadingScreen) return
  loadingScreen.style.transition = 'opacity 0.5s'
  loadingScreen.style.opacity = '0'
  setTimeout(() => {
    loadingScreen.style.display = 'none'
  }, 500)
}
