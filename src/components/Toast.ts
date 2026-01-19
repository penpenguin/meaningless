type ToastType = 'info' | 'error'

const ensureContainer = (): HTMLDivElement => {
  let container = document.getElementById('toast-container') as HTMLDivElement | null
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.className = 'toast-container'
    document.body.appendChild(container)
  }
  return container
}

export const showToast = (message: string, type: ToastType = 'info'): void => {
  const container = ensureContainer()
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('toast-hide')
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}
