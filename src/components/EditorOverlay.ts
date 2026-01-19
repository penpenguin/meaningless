import type { AquariumStore } from '../utils/aquariumStore'
import { createThemeEditorPanel } from './ThemeEditorPanel'
import { createFishGroupPanel } from './FishGroupPanel'
import { createSaveManagerPanel } from './SaveManagerPanel'
import { createImportExportPanel } from './ImportExportPanel'
import { createViewControls } from './ViewControls'

export const createEditorOverlay = (options: { store: AquariumStore }): HTMLDivElement => {
  const root = document.createElement('div')
  root.className = 'editor-overlay'

  const viewControls = createViewControls({
    onEnterEdit: () => options.store.setMode('edit')
  })

  const sidePanel = document.createElement('div')
  sidePanel.className = 'editor-side-panel'

  const header = document.createElement('div')
  header.className = 'editor-panel-header'

  const title = document.createElement('h2')
  title.textContent = 'Edit Aquarium'

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'View'
  closeButton.dataset.testid = 'exit-edit'
  closeButton.addEventListener('click', () => options.store.setMode('view'))

  header.appendChild(title)
  header.appendChild(closeButton)
  sidePanel.appendChild(header)

  sidePanel.appendChild(createThemeEditorPanel({ store: options.store }))
  sidePanel.appendChild(createFishGroupPanel({ store: options.store }))
  sidePanel.appendChild(createSaveManagerPanel({ store: options.store }))
  sidePanel.appendChild(createImportExportPanel({ store: options.store }))

  root.appendChild(viewControls)
  root.appendChild(sidePanel)

  const applyMode = (mode: string): void => {
    root.dataset.mode = mode
    root.classList.toggle('mode-edit', mode === 'edit')
    root.classList.toggle('mode-view', mode === 'view')
    sidePanel.style.display = mode === 'edit' ? 'flex' : 'none'
  }

  options.store.subscribe(({ mode }) => {
    applyMode(mode)
  })

  applyMode(options.store.getMode())

  return root
}
