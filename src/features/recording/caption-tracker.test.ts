import { beforeEach, describe, expect, test } from 'vitest'
import { CaptionTracker } from './caption-tracker'

let n = 0
const createId = () => `u${++n}`
const block = (key: object, speaker: string, text: string) => ({
  key,
  speaker,
  text,
})

describe('CaptionTracker', () => {
  let tracker: CaptionTracker
  const a = {}
  const b = {}

  beforeEach(() => {
    n = 0
    tracker = new CaptionTracker(createId)
  })

  test('bloco novo cria uma fala aberta com horário de início', () => {
    expect(tracker.sync([block(a, 'Ana', 'bom dia')], 1000)).toBe(true)
    expect(tracker.utterances).toEqual([
      {
        id: 'u1',
        speaker: 'Ana',
        startedAt: 1000,
        text: 'bom dia',
        final: false,
      },
    ])
  })

  test('correções substituem o texto sem criar fala nova e mantêm o horário', () => {
    tracker.sync([block(a, 'Ana', 'a gente pode')], 1000)
    tracker.sync([block(a, 'Ana', 'a gente pode fazer isso amanhã')], 1500)
    tracker.sync([block(a, 'Ana', 'agente pode fazer isso amanhã cedo')], 2000)
    expect(tracker.utterances).toHaveLength(1)
    expect(tracker.utterances[0]).toMatchObject({
      startedAt: 1000,
      text: 'agente pode fazer isso amanhã cedo',
      final: false,
    })
  })

  test('mesmo texto não conta como mudança', () => {
    tracker.sync([block(a, 'Ana', 'oi')], 1000)
    expect(tracker.sync([block(a, 'Ana', 'oi')], 1100)).toBe(false)
  })

  test('dois blocos visíveis ficam abertos e recebem correções separadas', () => {
    tracker.sync([block(a, 'Ana', 'vamos fechar na')], 1000)
    tracker.sync(
      [block(a, 'Ana', 'vamos fechar na'), block(b, 'Pedro', 'combinado')],
      2000
    )
    tracker.sync(
      [
        block(a, 'Ana', 'vamos fechar na sexta'),
        block(b, 'Pedro', 'combinado'),
      ],
      2500
    )
    expect(tracker.utterances.map((u) => [u.speaker, u.text, u.final])).toEqual(
      [
        ['Ana', 'vamos fechar na sexta', false],
        ['Pedro', 'combinado', false],
      ]
    )
  })

  test('fala só fecha quando o bloco some', () => {
    tracker.sync([block(a, 'Ana', 'oi')], 1000)
    tracker.sync([block(a, 'Ana', 'oi'), block(b, 'Pedro', 'olá')], 2000)
    expect(tracker.utterances[0].final).toBe(false)
    tracker.sync([block(b, 'Pedro', 'olá')], 3000)
    expect(tracker.utterances[0].final).toBe(true)
    expect(tracker.utterances[1].final).toBe(false)
  })

  test('fala final não muda mais', () => {
    tracker.sync([block(a, 'Ana', 'oi')], 1000)
    tracker.sync([], 2000)
    tracker.sync([block(a, 'Ana', 'oi tudo bem')], 3000)
    expect(tracker.utterances.map((u) => u.text)).toEqual(['oi', 'oi tudo bem'])
    expect(tracker.utterances[0].final).toBe(true)
  })

  test('split fecha a fala atual e abre outra no mesmo bloco', () => {
    tracker.sync(
      [block(a, 'Ana', 'então a gente fecha isso na sexta combinado')],
      1000
    )
    tracker.sync(
      [block(a, 'Ana', 'agora vamos para o próximo item da pauta')],
      5000
    )
    expect(
      tracker.utterances.map((u) => [u.text, u.final, u.startedAt])
    ).toEqual([
      ['então a gente fecha isso na sexta combinado', true, 1000],
      ['agora vamos para o próximo item da pauta', false, 5000],
    ])
  })

  test('nome do falante que aparece depois é atualizado', () => {
    tracker.sync([block(a, '', 'oi')], 1000)
    tracker.sync([block(a, 'Ana', 'oi')], 1100)
    expect(tracker.utterances[0].speaker).toBe('Ana')
  })

  test('blocos com texto vazio são ignorados', () => {
    expect(tracker.sync([block(a, 'Ana', '   ')], 1000)).toBe(false)
    expect(tracker.utterances).toEqual([])
  })

  test('finalizeAll fecha todas as falas abertas', () => {
    tracker.sync([block(a, 'Ana', 'oi'), block(b, 'Pedro', 'olá')], 1000)
    expect(tracker.finalizeAll()).toBe(true)
    expect(tracker.utterances.every((u) => u.final)).toBe(true)
    expect(tracker.finalizeAll()).toBe(false)
  })

  test('load carrega falas anteriores e adiciona as novas depois', () => {
    tracker.load([
      { id: 'old', speaker: 'Ana', startedAt: 1, text: 'antes', final: false },
    ])
    tracker.sync([block(a, 'Pedro', 'depois')], 1000)
    expect(tracker.utterances.map((u) => [u.id, u.final])).toEqual([
      ['old', true],
      ['u1', false],
    ])
  })
})
