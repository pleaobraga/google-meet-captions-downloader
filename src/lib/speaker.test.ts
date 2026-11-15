import { describe, expect, test } from 'vitest'
import type { Utterance } from '@/shared/types'
import { displaySpeaker, participantsOf } from './speaker'

const u = (speaker: string): Utterance => ({
  id: speaker,
  speaker,
  startedAt: 0,
  text: 'x',
  final: true,
})

describe('displaySpeaker', () => {
  test.each([
    ['Você', 'Maria', 'Maria'],
    ['You', 'Maria', 'Maria'],
    ['você', ' Maria ', 'Maria'],
    ['Pedro', 'Maria', 'Pedro'],
    ['Você', '', 'Você'],
    ['Você', '   ', 'Você'],
  ])('%s com meu nome %j -> %s', (speaker, myName, expected) => {
    expect(displaySpeaker(speaker, myName)).toBe(expected)
  })
})

test('participantsOf devolve nomes únicos na ordem em que aparecem', () => {
  expect(
    participantsOf(
      [u('Pedro'), u('Você'), u(''), u('Pedro'), u('You')],
      'Maria'
    )
  ).toEqual(['Pedro', 'Maria'])
})
