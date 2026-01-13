import { vi } from 'vitest'

const createMockCanvasContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const gradient = { addColorStop: vi.fn() }
  return {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    globalCompositeOperation: 'source-over',
    createLinearGradient: vi.fn(() => gradient),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn()
  } as unknown as CanvasRenderingContext2D
}

const mockGetContext = (function getContext(
  this: HTMLCanvasElement,
  contextId: string
) {
  if (contextId === '2d') {
    return createMockCanvasContext(this)
  }
  return null
}) as unknown as HTMLCanvasElement['getContext']

HTMLCanvasElement.prototype.getContext = mockGetContext

if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => {
    return {
      media: query,
      matches: false,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }
  }
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return window.setTimeout(() => cb(Date.now()), 16)
  }
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = (id: number): void => {
    window.clearTimeout(id)
  }
}
