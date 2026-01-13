import type { AquariumStore } from '../utils/aquariumStore'
import { createSaveSlot, deleteSaveSlot, getSaveSlots, updateSaveSlot } from '../utils/storage'
import { showToast } from './Toast'

export const createSaveManagerPanel = (options: { store: AquariumStore }): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'editor-panel-section'
  panel.dataset.testid = 'save-panel'

  const title = document.createElement('h3')
  title.textContent = 'Saves'
  panel.appendChild(title)

  const form = document.createElement('div')
  form.className = 'editor-control'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Save name'
  input.dataset.testid = 'save-name'

  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.textContent = 'Save'
  saveButton.dataset.testid = 'save-create'

  saveButton.addEventListener('click', () => {
    try {
      const name = input.value.trim()
      if (!name) return
      createSaveSlot(name, options.store.getState())
      input.value = ''
      render()
    } catch (error) {
      showToast('Save failed', 'error')
      console.error(error)
    }
  })

  form.appendChild(input)
  form.appendChild(saveButton)
  panel.appendChild(form)

  const list = document.createElement('div')
  list.className = 'save-slot-list'
  panel.appendChild(list)

  const render = (): void => {
    list.innerHTML = ''
    getSaveSlots().forEach((slot) => {
      const row = document.createElement('div')
      row.className = 'save-slot-row'

      const label = document.createElement('span')
      label.textContent = slot.name

      const loadButton = document.createElement('button')
      loadButton.type = 'button'
      loadButton.textContent = 'Load'
      loadButton.dataset.testid = `save-load-${slot.id}`
      loadButton.addEventListener('click', () => {
        options.store.setState(slot.state)
      })

      const overwriteButton = document.createElement('button')
      overwriteButton.type = 'button'
      overwriteButton.textContent = 'Overwrite'
      overwriteButton.dataset.testid = `save-update-${slot.id}`
      overwriteButton.addEventListener('click', () => {
        updateSaveSlot(slot.id, options.store.getState())
        render()
      })

      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.textContent = 'Delete'
      deleteButton.dataset.testid = `save-delete-${slot.id}`
      deleteButton.addEventListener('click', () => {
        deleteSaveSlot(slot.id)
        render()
      })

      row.appendChild(label)
      row.appendChild(loadButton)
      row.appendChild(overwriteButton)
      row.appendChild(deleteButton)
      list.appendChild(row)
    })
  }

  render()
  return panel
}
