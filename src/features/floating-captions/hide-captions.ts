import {
  findCaptionsRegion,
  findLeaveCallButton,
} from '@/features/recording/meet-dom'
import { expandVideo, restoreVideo } from './expand-video'

export const HIDE_STYLE_ID = 'meet-captions-hide-style'
export const HIDDEN_ATTR = 'data-meet-captions-hidden'

/**
 * A caixa que o Meet reserva para as legendas: o ancestral mais alto da região
 * que não contém o vídeo nem a barra de botões. Sem a barra, fica só a região.
 */
export function findCaptionsContainer(doc: Document): HTMLElement | null {
  const region = findCaptionsRegion(doc)
  const leave = findLeaveCallButton(doc)
  if (!region || !leave) return region
  let box = region
  let parent = box.parentElement
  while (
    parent &&
    parent !== doc.body &&
    !parent.querySelector('video') &&
    !parent.contains(leave)
  ) {
    box = parent
    parent = box.parentElement
  }
  return box
}

/**
 * Esconde as legendas da página do Meet e amplia o vídeo no lugar delas. O
 * texto continua sendo lido (R4.8).
 */
export function hideCaptions(doc: Document): void {
  if (!doc.getElementById(HIDE_STYLE_ID)) {
    const style = doc.createElement('style')
    style.id = HIDE_STYLE_ID
    style.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`
    doc.head.append(style)
  }
  findCaptionsContainer(doc)?.setAttribute(HIDDEN_ATTR, '')
  expandVideo(doc)
}

export function showCaptions(doc: Document): void {
  doc.getElementById(HIDE_STYLE_ID)?.remove()
  doc
    .querySelectorAll(`[${HIDDEN_ATTR}]`)
    .forEach((el) => el.removeAttribute(HIDDEN_ATTR))
  restoreVideo(doc)
}
