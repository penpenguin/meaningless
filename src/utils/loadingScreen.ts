import lottie from 'lottie-web'

const bubbleAnimationData = {
  v: '5.5.7',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'Bubbles',
  ddd: 0,
  assets: [],
  layers: [{
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: 'Bubble 1',
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: {
        a: 1,
        k: [{
          i: { x: 0.5, y: 1 },
          o: { x: 0.5, y: 0 },
          t: 0,
          s: [100, 180, 0],
          to: [0, -30, 0],
          ti: [0, 30, 0]
        }, {
          t: 60,
          s: [100, 20, 0]
        }]
      },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0,
    shapes: [{
      ty: 'gr',
      it: [{
        ind: 0,
        ty: 'el',
        s: { a: 0, k: [20, 20] },
        p: { a: 0, k: [0, 0] }
      }, {
        ty: 'st',
        c: { a: 0, k: [0.42, 0.78, 0.84, 1] },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 2 }
      }, {
        ty: 'fl',
        c: { a: 0, k: [0.42, 0.78, 0.84, 0.3] },
        o: { a: 0, k: 30 }
      }, {
        ty: 'tr',
        p: { a: 0, k: [0, 0] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
        r: { a: 0, k: 0 },
        o: { a: 0, k: 100 }
      }]
    }],
    ip: 0,
    op: 60,
    st: 0
  }]
}

const cloneAnimationData = () => JSON.parse(JSON.stringify(bubbleAnimationData)) as typeof bubbleAnimationData

export const showBubbleLoadingAnimation = (containerId = 'lottie-bubbles'): void => {
  const lottieContainer = document.getElementById(containerId)
  if (!lottieContainer) return

  lottie.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: cloneAnimationData()
  })
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
