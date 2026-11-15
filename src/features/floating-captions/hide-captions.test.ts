import { beforeEach, expect, test } from 'vitest'
import {
  CAPTIONS_REGION_EN,
  MEET_IN_CALL_EN,
} from '@/features/recording/__fixtures__/meet-dom'
import {
  findCaptionsRegion,
  readCaptionBlocks,
} from '@/features/recording/meet-dom'
import {
  HIDDEN_ATTR,
  HIDE_STYLE_ID,
  hideCaptions,
  showCaptions,
} from './hide-captions'

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = MEET_IN_CALL_EN
})

test('esconde a região e continua lendo as falas', () => {
  hideCaptions(document)
  hideCaptions(document)
  const region = findCaptionsRegion(document)!
  expect(region).toHaveAttribute(HIDDEN_ATTR)
  expect(document.querySelectorAll(`#${HIDE_STYLE_ID}`)).toHaveLength(1)
  expect(readCaptionBlocks(region)).toHaveLength(2)
})

test('mostrar desfaz tudo', () => {
  hideCaptions(document)
  showCaptions(document)
  expect(findCaptionsRegion(document)).not.toHaveAttribute(HIDDEN_ATTR)
  expect(document.getElementById(HIDE_STYLE_ID)).toBeNull()
})

/** Estrutura do Meet: a caixa das legendas fica entre o vídeo e a barra de botões. */
const MEET_LAYOUT = `
<div id="root">
  <div id="stage"><video></video></div>
  <div id="captions-box"><div id="captions-inner">${CAPTIONS_REGION_EN}</div></div>
  <div id="toolbar"><button aria-label="Leave call"></button></div>
</div>`

test('esconde a caixa inteira das legendas, sem tocar no vídeo nem na barra', () => {
  document.body.innerHTML = MEET_LAYOUT
  hideCaptions(document)
  expect(document.getElementById('captions-box')).toHaveAttribute(HIDDEN_ATTR)
  expect(document.querySelectorAll(`[${HIDDEN_ATTR}]`)).toHaveLength(1)
  expect(readCaptionBlocks(findCaptionsRegion(document)!)).toHaveLength(2)
  showCaptions(document)
  expect(document.querySelectorAll(`[${HIDDEN_ATTR}]`)).toHaveLength(0)
})

test('sem o botão de sair, esconde só a região de legendas', () => {
  document.body.innerHTML = MEET_LAYOUT.replace(
    '<button aria-label="Leave call"></button>',
    ''
  )
  hideCaptions(document)
  expect(findCaptionsRegion(document)).toHaveAttribute(HIDDEN_ATTR)
  expect(document.querySelectorAll(`[${HIDDEN_ATTR}]`)).toHaveLength(1)
})
