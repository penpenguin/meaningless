import { describe, expect, it } from 'vitest'
import { createAquariumStore } from '../utils/aquariumStore'
import { createFishGroupPanel } from '../components/FishGroupPanel'
import { createState } from './fixtures/aquariumState'

const setup = () => {
  const store = createAquariumStore(
    createState({
      fishGroups: [{ speciesId: 'neon-tetra', count: 5 }]
    })
  )
  const panel = createFishGroupPanel({ store })
  document.body.innerHTML = ''
  document.body.appendChild(panel)
  return { store, panel }
}

describe('fish group editing', () => {
  it('updates count for existing group', () => {
    const { store, panel } = setup()
    const input = panel.querySelector('[data-testid="fish-count-neon-tetra"]') as HTMLInputElement

    input.value = '10'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(store.getState().fishGroups[0].count).toBe(10)
  })

  it('keeps the count input element while typing', () => {
    const { panel } = setup()
    const input = panel.querySelector('[data-testid="fish-count-neon-tetra"]') as HTMLInputElement

    input.value = '12'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    const updated = panel.querySelector('[data-testid="fish-count-neon-tetra"]') as HTMLInputElement

    expect(updated).toBe(input)
  })

  it('normalizes decimal counts to integers', () => {
    const { store, panel } = setup()
    const input = panel.querySelector('[data-testid="fish-count-neon-tetra"]') as HTMLInputElement

    input.value = '1.5'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(store.getState().fishGroups[0].count).toBe(2)
  })

  it('adds and removes groups', () => {
    const { store, panel } = setup()
    const select = panel.querySelector('[data-testid="fish-select"]') as HTMLSelectElement
    const addButton = panel.querySelector('[data-testid="fish-add"]') as HTMLButtonElement
    const countInput = panel.querySelector('input[type="number"]') as HTMLInputElement

    select.value = 'clownfish'
    countInput.value = '2.2'
    addButton.click()

    const added = store.getState().fishGroups.find((group) => group.speciesId === 'clownfish')
    expect(added).toBeDefined()
    expect(added?.count).toBe(2)

    const removeButton = panel.querySelector('[data-testid="fish-remove-clownfish"]') as HTMLButtonElement
    removeButton.click()

    expect(store.getState().fishGroups.some((group) => group.speciesId === 'clownfish')).toBe(false)
  })
})
