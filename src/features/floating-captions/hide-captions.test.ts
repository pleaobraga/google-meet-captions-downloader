import { beforeEach, expect, test } from 'vitest'
import { MEET_IN_CALL_EN } from '@/features/recording/__fixtures__/meet-dom'
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
