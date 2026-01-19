import './styles.css'
import { AdvancedAquariumApp } from './AdvancedAquariumApp'

let app: AdvancedAquariumApp | null = null

const startApp = (): void => {
  if (app) {
    app.dispose()
  }
  app = new AdvancedAquariumApp()
}

document.addEventListener('DOMContentLoaded', () => {
  startApp()
})

window.addEventListener('beforeunload', () => {
  app?.dispose()
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app?.dispose()
    app = null
  })
}
