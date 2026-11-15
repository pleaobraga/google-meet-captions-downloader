import { expect, test } from 'vitest'
import type { Utterance } from '@/shared/types'
import { buildTranscriptItems } from './transcript-items'

const u = (id: string, startedAt: number): Utterance => ({
  id,
  speaker: 'Ana',
  startedAt,
  text: id,
  final: true,
})

test('sem sessões extras não há marcador', () => {
  const items = buildTranscriptItems(
    [u('a', 10)],
    [{ startedAt: 0, endedAt: 100 }]
  )
  expect(items.map((i) => i.kind)).toEqual(['utterance'])
})

test('marcador entra antes da primeira fala da sessão seguinte', () => {
  const items = buildTranscriptItems(
    [u('a', 10), u('b', 210)],
    [
      { startedAt: 0, endedAt: 100 },
      { startedAt: 200, endedAt: 300 },
    ]
  )
  expect(items).toEqual([
    { kind: 'utterance', utterance: u('a', 10) },
    { kind: 'marker', leftAt: 100, returnedAt: 200 },
    { kind: 'utterance', utterance: u('b', 210) },
  ])
})

test('sem fala depois da volta, o marcador vai no fim', () => {
  const items = buildTranscriptItems(
    [u('a', 10)],
    [
      { startedAt: 0, endedAt: 100 },
      { startedAt: 200, endedAt: 300 },
    ]
  )
  expect(items.at(-1)).toEqual({ kind: 'marker', leftAt: 100, returnedAt: 200 })
})
