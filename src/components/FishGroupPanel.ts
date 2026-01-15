import type { AquariumStore } from '../utils/aquariumStore'
import { getSpeciesList } from '../utils/speciesCatalog'

export const createFishGroupPanel = (options: { store: AquariumStore }): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'editor-panel-section'
  panel.dataset.testid = 'fish-panel'

  const normalizeCount = (value: string): number => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 1
    return Math.max(1, Math.round(parsed))
  }

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
  countInput.step = '1'
  countInput.value = '1'

  const addButton = document.createElement('button')
  addButton.type = 'button'
  addButton.textContent = 'Add'
  addButton.dataset.testid = 'fish-add'
  addButton.addEventListener('click', () => {
    const speciesId = select.value
    const count = normalizeCount(countInput.value)
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

  const rows = new Map<string, { row: HTMLDivElement; input: HTMLInputElement }>()

  const createRow = (speciesId: string, count: number): { row: HTMLDivElement; input: HTMLInputElement } => {
    const row = document.createElement('div')
    row.className = 'fish-group-row'

    const label = document.createElement('span')
    label.textContent = speciesId

    const input = document.createElement('input')
    input.type = 'number'
    input.min = '1'
    input.step = '1'
    input.value = String(count)
    input.dataset.testid = `fish-count-${speciesId}`
    input.addEventListener('input', () => {
      const next = normalizeCount(input.value)
      if (input.value !== String(next)) {
        input.value = String(next)
      }
      options.store.updateFishGroupCount(speciesId, next)
    })

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.textContent = 'Remove'
    removeButton.dataset.testid = `fish-remove-${speciesId}`
    removeButton.addEventListener('click', () => {
      options.store.removeFishGroup(speciesId)
    })

    row.appendChild(label)
    row.appendChild(input)
    row.appendChild(removeButton)

    return { row, input }
  }

  const render = (): void => {
    const seen = new Set<string>()
    options.store.getState().fishGroups.forEach((group) => {
      seen.add(group.speciesId)
      const existing = rows.get(group.speciesId) ?? createRow(group.speciesId, group.count)
      rows.set(group.speciesId, existing)
      if (document.activeElement !== existing.input) {
        const nextValue = String(group.count)
        if (existing.input.value !== nextValue) {
          existing.input.value = nextValue
        }
      }
      list.appendChild(existing.row)
    })

    rows.forEach((row, speciesId) => {
      if (!seen.has(speciesId)) {
        row.row.remove()
        rows.delete(speciesId)
      }
    })
  }

  options.store.subscribe(() => render())
  render()

  return panel
}
