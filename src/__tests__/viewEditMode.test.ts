import { describe, expect, it } from 'vitest'
import { createAquariumStore } from '../utils/aquariumStore'
import { createEditorOverlay } from '../components/EditorOverlay'

const setup = () => {
  const store = createAquariumStore()
  const overlay = createEditorOverlay({ store })
  document.body.innerHTML = ''
  document.body.appendChild(overlay)
  return { store, overlay }
}

describe('view/edit mode transitions', () => {
  it('toggles view to edit and back without replacing overlay', () => {
    const { store, overlay } = setup()

    expect(overlay.dataset.mode).toBe('view')
    expect(store.getMode()).toBe('view')

    const editButton = overlay.querySelector('[data-testid="enter-edit"]') as HTMLButtonElement
    editButton.click()

    expect(store.getMode()).toBe('edit')
    expect(overlay.dataset.mode).toBe('edit')

    const viewButton = overlay.querySelector('[data-testid="exit-edit"]') as HTMLButtonElement
    viewButton.click()

    expect(store.getMode()).toBe('view')
    expect(overlay.dataset.mode).toBe('view')
  })
})
