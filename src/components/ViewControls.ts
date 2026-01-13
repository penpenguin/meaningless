export const createViewControls = (options: { onEnterEdit: () => void }): HTMLDivElement => {
  const container = document.createElement('div')
  container.className = 'view-controls'

  const editButton = document.createElement('button')
  editButton.type = 'button'
  editButton.textContent = 'Edit'
  editButton.dataset.testid = 'enter-edit'
  editButton.addEventListener('click', options.onEnterEdit)

  container.appendChild(editButton)
  return container
}
