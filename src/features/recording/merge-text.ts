export type MergeKind = 'replace' | 'extend' | 'split'
export type MergeResult = { kind: MergeKind; text: string }

const ANCHOR_SIZE = 3
const MIN_WORDS_TO_SPLIT = 6
const MIN_SIMILARITY = 0.3

type Word = { raw: string; norm: string }

function toWords(text: string): Word[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({
      raw,
      norm: raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''),
    }))
    .filter((word) => word.norm.length > 0)
}

function commonPrefixLength(a: Word[], aStart: number, b: Word[]): number {
  let n = 0
  while (
    aStart + n < a.length &&
    n < b.length &&
    a[aStart + n].norm === b[n].norm
  ) {
    n++
  }
  return n
}

function similarity(stored: Word[], incoming: Word[]): number {
  const known = new Set(stored.map((word) => word.norm))
  const hits = incoming.filter((word) => known.has(word.norm)).length
  return hits / incoming.length
}

export function mergeCaptionText(
  stored: string,
  incoming: string
): MergeResult {
  const text = incoming.trim()
  if (!text) return { kind: 'replace', text: stored }

  const storedWords = toWords(stored)
  const incomingWords = toWords(text)
  if (storedWords.length === 0 || incomingWords.length === 0) {
    return { kind: 'replace', text }
  }

  const anchor = Math.min(ANCHOR_SIZE, incomingWords.length)

  // 1. Começa igual: é a mesma fala sendo corrigida ou crescendo.
  if (commonPrefixLength(storedWords, 0, incomingWords) >= anchor) {
    return { kind: 'replace', text }
  }

  // 2. O começo do texto novo aparece mais adiante no salvo: o Meet cortou o começo.
  //    Escolhe a posição com o maior trecho em comum (em empate, a última).
  let bestPos = -1
  let bestLen = 0
  for (let pos = 1; pos < storedWords.length; pos++) {
    const len = commonPrefixLength(storedWords, pos, incomingWords)
    if (len >= anchor && len >= bestLen) {
      bestPos = pos
      bestLen = len
    }
  }
  if (bestPos > 0) {
    const prefix = storedWords.slice(0, bestPos).map((word) => word.raw)
    return { kind: 'extend', text: [...prefix, text].join(' ') }
  }

  // 3. Sem âncora: correção grande da mesma fala, ou fala nova no mesmo bloco.
  if (
    storedWords.length < MIN_WORDS_TO_SPLIT ||
    commonPrefixLength(storedWords, 0, incomingWords) >= 1 ||
    similarity(storedWords, incomingWords) >= MIN_SIMILARITY
  ) {
    return { kind: 'replace', text }
  }
  return { kind: 'split', text }
}
