import type { Session, Utterance } from '@/shared/types'

export type TranscriptItem =
  | { kind: 'utterance'; utterance: Utterance }
  | { kind: 'marker'; leftAt: number; returnedAt: number }

/** Intercala as falas com as marcações de saída e volta (R2.3). */
export function buildTranscriptItems(
  utterances: Utterance[],
  sessions: Session[]
): TranscriptItem[] {
  const items: TranscriptItem[] = []
  let next = 1
  const marker = (i: number): TranscriptItem => ({
    kind: 'marker',
    leftAt: sessions[i - 1].endedAt,
    returnedAt: sessions[i].startedAt,
  })

  for (const utterance of utterances) {
    while (
      next < sessions.length &&
      utterance.startedAt >= sessions[next].startedAt
    ) {
      items.push(marker(next++))
    }
    items.push({ kind: 'utterance', utterance })
  }
  while (next < sessions.length) items.push(marker(next++))
  return items
}
