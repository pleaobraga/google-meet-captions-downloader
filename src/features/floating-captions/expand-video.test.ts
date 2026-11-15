import { beforeEach, expect, test } from 'vitest'
import {
  ZOOM_ATTR,
  ZOOM_STYLE_ID,
  computeVideoZoom,
  expandVideo,
  restoreVideo,
  type Box,
  type VideoZoom,
} from './expand-video'

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
})

/** Onde o retângulo `r` vai parar depois do zoom aplicado em `main`. */
function project(r: Box, main: Box, zoom: VideoZoom) {
  const map = (x: number, y: number) => ({
    x: main.left + zoom.x + zoom.scale * (x - main.left),
    y: main.top + zoom.y + zoom.scale * (y - main.top),
  })
  const a = map(r.left, r.top)
  const b = map(r.left + r.width, r.top + r.height)
  return { left: a.x, top: a.y, right: b.x, bottom: b.y }
}

// Medidas reais do Meet com as legendas ligadas (1920 x 959, barra em y = 879).
const MAIN = box(16, 64, 1888, 591)
const AVAILABLE = box(16, 64, 1888, 807)
const SPEAKER = box(433, 63, 1052, 593)
const SELF_VIEW = box(1653, 506, 236, 134)

test('amplia os vídeos até a largura disponível e centraliza na vertical', () => {
  const zoom = computeVideoZoom(MAIN, AVAILABLE, [SPEAKER, SELF_VIEW])!
  expect(zoom.scale).toBeCloseTo(1888 / 1456, 3)
  const all = box(433, 63, 1456, 593)
  const out = project(all, MAIN, zoom)
  expect(out.left).toBeCloseTo(16, 0)
  expect(out.right).toBeCloseTo(1904, 0)
  expect((out.top + out.bottom) / 2).toBeCloseTo(64 + 807 / 2, 0)
})

test('um vídeo só é limitado pela altura e fica centralizado', () => {
  const tile = box(434, 64, 1050, 591)
  const zoom = computeVideoZoom(MAIN, AVAILABLE, [tile])!
  expect(zoom.scale).toBeCloseTo(807 / 591, 3)
  const out = project(tile, MAIN, zoom)
  expect(out.top).toBeCloseTo(64, 0)
  expect(out.bottom).toBeCloseTo(871, 0)
  expect((out.left + out.right) / 2).toBeCloseTo(960, 0)
})

test('não amplia sem vídeos, sem espaço a mais ou se precisaria diminuir', () => {
  expect(computeVideoZoom(MAIN, AVAILABLE, [])).toBeNull()
  expect(computeVideoZoom(MAIN, MAIN, [box(16, 64, 1888, 591)])).toBeNull()
  expect(computeVideoZoom(MAIN, box(16, 64, 1888, 0), [SPEAKER])).toBeNull()
})

function stubRect(el: Element, r: Box) {
  el.getBoundingClientRect = () =>
    DOMRect.fromRect({ x: r.left, y: r.top, width: r.width, height: r.height })
}

const LAYOUT = `
<div id="root">
  <main id="stage"><div><video id="speaker"></video></div></main>
  <div id="captions-box"></div>
  <div id="toolbar"><button aria-label="Leave call"></button></div>
</div>`

function setupLayout() {
  document.body.innerHTML = LAYOUT
  stubRect(document.getElementById('stage')!, MAIN)
  stubRect(document.getElementById('speaker')!, box(434, 64, 1050, 591))
  stubRect(document.getElementById('toolbar')!, box(0, 879, 1920, 80))
}

beforeEach(() => {
  document.head.innerHTML = ''
})

test('expandVideo aplica o zoom na área de vídeo e restoreVideo desfaz', () => {
  setupLayout()
  expandVideo(document)
  expandVideo(document)
  const stage = document.getElementById('stage')!
  expect(stage).toHaveAttribute(ZOOM_ATTR)
  const style = document.querySelectorAll(`#${ZOOM_STYLE_ID}`)
  expect(style).toHaveLength(1)
  expect(style[0].textContent).toContain(`main[${ZOOM_ATTR}]`)
  expect(style[0].textContent).toMatch(/scale\(1\.36\d*\)/)

  restoreVideo(document)
  expect(stage).not.toHaveAttribute(ZOOM_ATTR)
  expect(document.getElementById(ZOOM_STYLE_ID)).toBeNull()
})

test('sem a barra de botões do Meet, não mexe no vídeo', () => {
  setupLayout()
  document.querySelector('[aria-label="Leave call"]')!.remove()
  expandVideo(document)
  expect(document.getElementById('stage')).not.toHaveAttribute(ZOOM_ATTR)
  expect(document.getElementById(ZOOM_STYLE_ID)).toBeNull()
})
