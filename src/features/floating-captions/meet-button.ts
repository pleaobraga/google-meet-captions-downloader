import { findCaptionsToggleButton } from '@/features/recording/meet-dom'

export const FLOATING_BUTTON_ID = 'meet-captions-floating-button'

const LABEL = 'Abrir legendas em janela flutuante'

// Estilo inline: dentro da página do Meet não existe o Tailwind da extensão.
const BASE_STYLE =
  'width: 40px; height: 40px; border-radius: 50%; border: none; background: #3c4043; color: #fff; font-size: 18px; cursor: pointer; margin: 0 6px;'
const FIXED_STYLE =
  'position: fixed; right: 16px; bottom: 96px; z-index: 2147483647;'

let currentOnClick: () => void = () => {}

/** Coloca o botão da janela flutuante no Meet, sem duplicar (R4.1). */
export function ensureFloatingButton(
  doc: Document,
  onClick: () => void
): HTMLButtonElement {
  currentOnClick = onClick
  const existing = doc.getElementById(FLOATING_BUTTON_ID)
  if (existing instanceof HTMLButtonElement && existing.isConnected)
    return existing

  const button = doc.createElement('button')
  button.type = 'button'
  button.id = FLOATING_BUTTON_ID
  button.setAttribute('aria-label', LABEL)
  button.title = LABEL
  button.textContent = '⧉'
  button.addEventListener('click', () => currentOnClick())

  const anchor = findCaptionsToggleButton(doc)
  if (anchor?.parentElement) {
    button.style.cssText = BASE_STYLE
    anchor.insertAdjacentElement('afterend', button)
  } else {
    button.style.cssText = BASE_STYLE + FIXED_STYLE
    doc.body.append(button)
  }
  return button
}

export function removeFloatingButton(doc: Document): void {
  doc.getElementById(FLOATING_BUTTON_ID)?.remove()
}
