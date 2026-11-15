export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
}

export type TextPart = { text: string; match: boolean }

function normalizeWithMap(text: string): { normalized: string; map: number[] } {
  let normalized = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    for (const ch of normalizeText(text[i])) {
      normalized += ch
      map.push(i)
    }
  }
  return { normalized, map }
}

export function splitHighlight(text: string, query: string): TextPart[] {
  const needle = normalizeText(query.trim())
  if (!needle) return [{ text, match: false }]

  const { normalized, map } = normalizeWithMap(text)
  const parts: TextPart[] = []
  let cursor = 0
  let from = 0
  while (true) {
    const index = normalized.indexOf(needle, from)
    if (index === -1) break
    const start = map[index]
    let end = map[index + needle.length - 1] + 1
    // Inclui acentos soltos (texto decomposto) que vêm logo depois do trecho.
    while (end < text.length && /\p{M}/u.test(text[end])) end++
    if (start > cursor)
      parts.push({ text: text.slice(cursor, start), match: false })
    parts.push({ text: text.slice(start, end), match: true })
    cursor = end
    from = index + needle.length
  }
  if (cursor < text.length)
    parts.push({ text: text.slice(cursor), match: false })
  return parts.length > 0 ? parts : [{ text, match: false }]
}
export function countMatches(text: string, query: string): number {
  return splitHighlight(text, query).filter((part) => part.match).length
}
