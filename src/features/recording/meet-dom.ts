import type { ObservedBlock } from '@/shared/types'

export const MEET_LABELS = {
  captionsRegion: ['captions', 'legendas'],
  turnOnCaptions: ['turn on captions', 'ativar legendas'],
  turnOffCaptions: ['turn off captions', 'desativar legendas'],
  leaveCall: ['leave call', 'sair da chamada'],
}

type LabelList = readonly string[]

function labelOf(el: Element): string {
  return (el.getAttribute('aria-label') ?? '').trim().toLowerCase()
}

function matchesExact(el: Element, labels: LabelList): boolean {
  return labels.includes(labelOf(el))
}

function matchesButton(el: Element, labels: LabelList): boolean {
  const label = labelOf(el)
  return labels.some(
    (expected) =>
      label === expected ||
      label.startsWith(expected + ' ') ||
      label.startsWith(expected + '(')
  )
}

function findButton(doc: Document, labels: LabelList): HTMLElement | null {
  const candidates = doc.querySelectorAll<HTMLElement>(
    'button[aria-label], [role="button"][aria-label]'
  )
  for (const el of Array.from(candidates)) {
    if (matchesButton(el, labels)) return el
  }
  return null
}

export function findCaptionsRegion(doc: Document): HTMLElement | null {
  const regions = doc.querySelectorAll<HTMLElement>(
    '[role="region"][aria-label]'
  )
  for (const el of Array.from(regions)) {
    if (matchesExact(el, MEET_LABELS.captionsRegion)) return el
  }
  const others = doc.querySelectorAll<HTMLElement>('[aria-label]')
  for (const el of Array.from(others)) {
    if (el.matches('button, [role="button"]')) continue
    if (matchesExact(el, MEET_LABELS.captionsRegion)) return el
  }
  return null
}

export function findTurnOnCaptionsButton(doc: Document): HTMLElement | null {
  return findButton(doc, MEET_LABELS.turnOnCaptions)
}

/** O botão de legendas do Meet, ligado ou desligado. */
export function findCaptionsToggleButton(doc: Document): HTMLElement | null {
  return (
    findButton(doc, MEET_LABELS.turnOnCaptions) ??
    findButton(doc, MEET_LABELS.turnOffCaptions)
  )
}

export function isCaptionsOn(doc: Document): boolean {
  return (
    findButton(doc, MEET_LABELS.turnOffCaptions) !== null ||
    findCaptionsRegion(doc) !== null
  )
}

export function findLeaveCallButton(doc: Document): HTMLElement | null {
  return findButton(doc, MEET_LABELS.leaveCall)
}

export function isInCall(doc: Document): boolean {
  return findLeaveCallButton(doc) !== null
}

export function getMeetingTitle(doc: Document): string {
  const el = doc.querySelector('[data-meeting-title]')
  if (!el) return ''
  const attr = (el.getAttribute('data-meeting-title') ?? '').trim()
  if (attr) return attr
  const firstLine = (el.textContent ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  return firstLine ?? ''
}

function textOf(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function blockFromAvatar(img: Element, region: Element) {
  let child: Element = img
  let parent = img.parentElement
  while (parent && region.contains(parent)) {
    const others = Array.from(parent.children).filter(
      (el) =>
        el !== child && !el.matches('button, [role="button"]') && textOf(el)
    )
    if (textOf(child) && others.length >= 1) {
      return {
        el: parent,
        speaker: textOf(child),
        text: others.map(textOf).join(' '),
      }
    }
    if (!textOf(child) && others.length >= 2) {
      const [name, ...rest] = others
      return {
        el: parent,
        speaker: textOf(name),
        text: rest.map(textOf).join(' '),
      }
    }
    child = parent
    parent = parent.parentElement
  }
  return null
}

export function readCaptionBlocks(region: HTMLElement): ObservedBlock[] {
  const seen = new Set<Element>()
  const blocks: ObservedBlock[] = []
  for (const img of Array.from(region.querySelectorAll('img'))) {
    const found = blockFromAvatar(img, region)
    if (!found || seen.has(found.el)) continue
    seen.add(found.el)
    blocks.push({ key: found.el, speaker: found.speaker, text: found.text })
  }
  return blocks
}
