import { findCaptionsRegion } from '@/features/recording/meet-dom'

export const HIDE_STYLE_ID = 'meet-captions-hide-style'
export const HIDDEN_ATTR = 'data-meet-captions-hidden'

/** Esconde as legendas da página do Meet; o texto continua sendo lido (R4.8). */
export function hideCaptions(doc: Document): void {
  if (!doc.getElementById(HIDE_STYLE_ID)) {
    const style = doc.createElement('style')
    style.id = HIDE_STYLE_ID
    style.textContent = `[${HIDDEN_ATTR}] { display: none !important; }`
    doc.head.append(style)
  }
  findCaptionsRegion(doc)?.setAttribute(HIDDEN_ATTR, '')
}

export function showCaptions(doc: Document): void {
  doc.getElementById(HIDE_STYLE_ID)?.remove()
  doc
    .querySelectorAll(`[${HIDDEN_ATTR}]`)
    .forEach((el) => el.removeAttribute(HIDDEN_ATTR))
}
