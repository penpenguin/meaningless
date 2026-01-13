import type { AquariumStore } from '../utils/aquariumStore'
import { exportState, importState } from '../utils/serialization'
import { showToast } from './Toast'

export const createImportExportPanel = (options: { store: AquariumStore }): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'editor-panel-section'
  panel.dataset.testid = 'import-export-panel'

  const title = document.createElement('h3')
  title.textContent = 'Import / Export'
  panel.appendChild(title)

  const textarea = document.createElement('textarea')
  textarea.rows = 6
  textarea.placeholder = 'Paste JSON here'
  textarea.dataset.testid = 'json-input'

  const actions = document.createElement('div')
  actions.className = 'editor-control'

  const exportButton = document.createElement('button')
  exportButton.type = 'button'
  exportButton.textContent = 'Export'
  exportButton.addEventListener('click', () => {
    textarea.value = exportState(options.store.getState())
  })

  const importButton = document.createElement('button')
  importButton.type = 'button'
  importButton.textContent = 'Import'
  importButton.addEventListener('click', () => {
    const imported = importState(textarea.value)
    if (!imported) {
      showToast('Invalid JSON', 'error')
      return
    }
    options.store.setState(imported)
  })

  actions.appendChild(exportButton)
  actions.appendChild(importButton)

  panel.appendChild(textarea)
  panel.appendChild(actions)
  return panel
}
