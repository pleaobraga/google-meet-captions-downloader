import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import css from '@/styles/index.css?inline'
import type { CaptionsStore } from './captions-store'
import { FloatingRoot } from './floating-root'

export type FloatingWindowHandle = {
  close: () => void
}

export async function openFloatingWindow(options: {
  win: Window
  store: CaptionsStore
  onClose: () => void
}): Promise<FloatingWindowHandle | null> {
  const api = options.win.documentPictureInPicture
  if (!api) return null

  const pip = await api.requestWindow({ width: 420, height: 320 })
  const doc = pip.document
  doc.documentElement.lang = 'pt-BR'
  doc.documentElement.className = 'dark'
  doc.title = 'Legendas'

  const style = doc.createElement('style')
  style.textContent = css
  doc.head.append(style)

  const container = doc.createElement('div')
  doc.body.append(container)
  doc.body.style.margin = '0'

  const root = createRoot(container)
  root.render(
    <StrictMode>
      <FloatingRoot store={options.store} />
    </StrictMode>
  )

  let closed = false
  const finish = () => {
    if (closed) return
    closed = true
    root.unmount()
    options.onClose()
  }
  pip.addEventListener('pagehide', finish)

  return {
    close: () => {
      pip.close()
      finish()
    },
  }
}
