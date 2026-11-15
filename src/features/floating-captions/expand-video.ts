import { findLeaveCallButton } from '@/features/recording/meet-dom'

export const ZOOM_STYLE_ID = 'meet-captions-zoom-style'
export const ZOOM_ATTR = 'data-meet-captions-zoom'
const BAR_GAP_PX = 8

export type Box = { left: number; top: number; width: number; height: number }

/** Deslocamento em px e escala, com origem no canto superior esquerdo da área de vídeo. */
export type VideoZoom = { scale: number; x: number; y: number }

/**
 * Zoom que faz os vídeos ocuparem o espaço disponível, centralizados. O Meet
 * calcula o tamanho dos vídeos pelo estado "legendas ligadas" e não recalcula
 * quando a caixa das legendas some, então a ampliação é só visual (R4.8).
 */
export function computeVideoZoom(
  main: Box,
  available: Box,
  videos: Box[]
): VideoZoom | null {
  if (videos.length === 0 || available.height <= 0) return null
  const left = Math.min(...videos.map((v) => v.left))
  const top = Math.min(...videos.map((v) => v.top))
  const right = Math.max(...videos.map((v) => v.left + v.width))
  const bottom = Math.max(...videos.map((v) => v.top + v.height))
  const scale = Math.min(
    available.width / (right - left),
    available.height / (bottom - top)
  )
  if (!(scale > 1.01)) return null
  const centerX = available.left + available.width / 2
  const centerY = available.top + available.height / 2
  return {
    scale,
    x: centerX - (main.left + scale * ((left + right) / 2 - main.left)),
    y: centerY - (main.top + scale * ((top + bottom) / 2 - main.top)),
  }
}

function findVideoArea(doc: Document): HTMLElement | null {
  return (
    Array.from(doc.querySelectorAll('main')).find((m) =>
      m.querySelector('video')
    ) ?? null
  )
}

/** O bloco da barra de botões: o ancestral mais alto do botão de sair fora da área de vídeo. */
function findToolbar(leave: HTMLElement, main: HTMLElement): HTMLElement {
  let bar = leave
  while (bar.parentElement && !bar.parentElement.contains(main)) {
    bar = bar.parentElement
  }
  return bar
}

function visibleBoxes(elements: Element[]): Box[] {
  return elements
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
}

/** Amplia os vídeos até a barra de botões. Pode ser chamada a cada ciclo. */
export function expandVideo(doc: Document): void {
  const main = findVideoArea(doc)
  const leave = findLeaveCallButton(doc)
  if (!main || !leave) {
    restoreVideo(doc)
    return
  }
  // Mede sem o zoom; nada é pintado entre tirar e recolocar.
  main.removeAttribute(ZOOM_ATTR)
  const area = main.getBoundingClientRect()
  const barTop = findToolbar(leave, main).getBoundingClientRect().top
  const zoom = computeVideoZoom(
    area,
    {
      left: area.left,
      top: area.top,
      width: area.width,
      height: barTop - BAR_GAP_PX - area.top,
    },
    visibleBoxes(Array.from(main.querySelectorAll('video')))
  )
  if (!zoom) {
    doc.getElementById(ZOOM_STYLE_ID)?.remove()
    return
  }
  let style = doc.getElementById(ZOOM_STYLE_ID)
  if (!style) {
    style = doc.createElement('style')
    style.id = ZOOM_STYLE_ID
    doc.head.append(style)
  }
  const css = `main[${ZOOM_ATTR}] { transform-origin: 0 0 !important; transform: translate(${zoom.x.toFixed(1)}px, ${zoom.y.toFixed(1)}px) scale(${zoom.scale.toFixed(4)}) !important; }`
  if (style.textContent !== css) style.textContent = css
  main.setAttribute(ZOOM_ATTR, '')
}

export function restoreVideo(doc: Document): void {
  doc.getElementById(ZOOM_STYLE_ID)?.remove()
  doc
    .querySelectorAll(`[${ZOOM_ATTR}]`)
    .forEach((el) => el.removeAttribute(ZOOM_ATTR))
}
