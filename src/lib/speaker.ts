import type { Utterance } from '@/shared/types'
import { normalizeText } from './text'

const SELF_NAMES = ['voce', 'you']

/** Troca "Você"/"You" pelo meu nome, quando ele está preenchido (R7.3). */
export function displaySpeaker(speaker: string, myName: string): string {
  const name = myName.trim()
  if (name && SELF_NAMES.includes(normalizeText(speaker.trim()))) return name
  return speaker
}

export function participantsOf(
  utterances: Utterance[],
  myName: string
): string[] {
  const names: string[] = []
  for (const { speaker } of utterances) {
    const name = displaySpeaker(speaker, myName).trim()
    if (name && !names.includes(name)) names.push(name)
  }
  return names
}
