import { beforeEach, describe, expect, test } from 'vitest'
import {
  CAPTIONS_REGION_SEPARATE_AVATAR,
  MEET_CAPTIONS_OFF_EN,
  MEET_IN_CALL_EN,
  MEET_IN_CALL_PT,
  MEET_LANDING,
} from './__fixtures__/meet-dom'
import {
  findCaptionsRegion,
  findTurnOnCaptionsButton,
  getMeetingTitle,
  isCaptionsOn,
  isInCall,
  readCaptionBlocks,
} from './meet-dom'

function render(html: string) {
  document.body.innerHTML = html
}

describe('meet-dom', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test.each([
    ['inglês', MEET_IN_CALL_EN],
    ['português', MEET_IN_CALL_PT],
  ])('lê os blocos de legenda em %s', (_, html) => {
    render(html)
    const region = findCaptionsRegion(document)
    expect(region).not.toBeNull()
    const blocks = readCaptionBlocks(region!)
    expect(blocks.map(({ speaker, text }) => ({ speaker, text }))).toEqual([
      { speaker: 'Ana Souza', text: 'então a gente fecha isso na sexta' },
      { speaker: 'Pedro', text: 'combinado' },
    ])
    expect(blocks[0].key).toBe(document.getElementById('b1'))
    expect(blocks[1].key).toBe(document.getElementById('b2'))
  })

  test('a chave do bloco continua a mesma quando o texto muda', () => {
    render(MEET_IN_CALL_EN)
    const region = findCaptionsRegion(document)!
    const before = readCaptionBlocks(region)[0].key
    document.querySelector('#b1 .said')!.textContent =
      'então a gente fecha isso na sexta-feira'
    const after = readCaptionBlocks(region)[0]
    expect(after.key).toBe(before)
    expect(after.text).toBe('então a gente fecha isso na sexta-feira')
  })

  test('aceita avatar separado do nome', () => {
    render(CAPTIONS_REGION_SEPARATE_AVATAR)
    const blocks = readCaptionBlocks(findCaptionsRegion(document)!)
    expect(blocks.map(({ speaker, text }) => ({ speaker, text }))).toEqual([
      { speaker: 'Ana', text: 'oi pessoal' },
    ])
  })

  test('identifica se está numa chamada', () => {
    render(MEET_IN_CALL_PT)
    expect(isInCall(document)).toBe(true)
    render(MEET_LANDING)
    expect(isInCall(document)).toBe(false)
  })

  test('acha o botão de ligar legendas e o estado das legendas', () => {
    render(MEET_CAPTIONS_OFF_EN)
    expect(findTurnOnCaptionsButton(document)).not.toBeNull()
    expect(isCaptionsOn(document)).toBe(false)
    render(MEET_IN_CALL_EN)
    expect(findTurnOnCaptionsButton(document)).toBeNull()
    expect(isCaptionsOn(document)).toBe(true)
  })

  test('lê o título da reunião', () => {
    render(MEET_IN_CALL_EN)
    expect(getMeetingTitle(document)).toBe('Daily do time')
    render(MEET_LANDING)
    expect(getMeetingTitle(document)).toBe('')
  })

  test('não confunde botões com a região de legendas', () => {
    render('<button aria-label="Captions"></button>')
    expect(findCaptionsRegion(document)).toBeNull()
  })
})
