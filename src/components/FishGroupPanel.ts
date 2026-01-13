import type { AquariumStore } from '../utils/aquariumStore'
import { getSpeciesList } from '../utils/speciesCatalog'

export const createFishGroupPanel = (options: { store: AquariumStore }): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'editor-panel-section'
  panel.dataset.testid = 'fish-panel'

  const title = document.createElement('h3')
  title.textContent = 'Fish Groups'
  panel.appendChild(title)

  const form = document.createElement('div')
  form.className = 'editor-control'

  const select = document.createElement('select')
  select.dataset.testid = 'fish-select'
  getSpeciesList().forEach((species) => {
    const option = document.createElement('option')
    option.value = species.speciesId
    option.textContent = species.displayName
    select.appendChild(option)
  })

  const countInput = document.createElement('input')
  countInput.type = 'number'
  countInput.min = '1'
  countInput.value = '1'

  const addButton = document.createElement('button')
  addButton.type = 'button'
  addButton.textContent = 'Add'
  addButton.dataset.testid = 'fish-add'
  addButton.addEventListener('click', () => {
    const speciesId = select.value
    const count = Math.max(1, Number(countInput.value) || 1)
    const existing = options.store.getState().fishGroups.find((group) => group.speciesId === speciesId)
    if (existing) {
      options.store.updateFishGroupCount(speciesId, existing.count + count)
      return
    }
    options.store.addFishGroup({ speciesId, count })
  })

  form.appendChild(select)
  form.appendChild(countInput)
  form.appendChild(addButton)
  panel.appendChild(form)

  const list = document.createElement('div')
  list.className = 'fish-group-list'
  panel.appendChild(list)

  const render = (): void => {
    list.innerHTML = ''
    options.store.getState().fishGroups.forEach((group) => {
      const row = document.createElement('div')
      row.className = 'fish-group-row'

      const label = document.createElement('span')
      label.textContent = group.speciesId

      const input = document.createElement('input')
      input.type = 'number'
      input.min = '1'
      input.value = String(group.count)
      input.dataset.testid = `fish-count-${group.speciesId}`
      input.addEventListener('input', () => {
        const next = Math.max(1, Number(input.value) || 1)
        options.store.updateFishGroupCount(group.speciesId, next)
      })

      const removeButton = document.createElement('button')
      removeButton.type = 'button'
      removeButton.textContent = 'Remove'
      removeButton.dataset.testid = `fish-remove-${group.speciesId}`
      removeButton.addEventListener('click', () => {
        options.store.removeFishGroup(group.speciesId)
      })

      row.appendChild(label)
      row.appendChild(input)
      row.appendChild(removeButton)
      list.appendChild(row)
    })
  }

  options.store.subscribe(() => render())
  render()

  return panel
}
