import type { ObservedBlock, Utterance } from '@/shared/types'
import { mergeCaptionText } from './merge-text'

export class CaptionTracker {
  private list: Utterance[] = []
  private open = new Map<object, Utterance>()
  private readonly createId: () => string

  constructor(createId: () => string) {
    this.createId = createId
  }

  get utterances(): readonly Utterance[] {
    return this.list
  }

  load(existing: Utterance[]): void {
    this.list = existing.map((utterance) => ({ ...utterance, final: true }))
    this.open.clear()
  }

  sync(blocks: ObservedBlock[], now: number): boolean {
    let changed = false
    const seen = new Set<object>()

    for (const block of blocks) {
      const text = block.text.trim()
      if (!text) continue
      const speaker = block.speaker.trim()
      seen.add(block.key)

      const current = this.open.get(block.key)
      if (!current) {
        this.openUtterance(block.key, speaker, text, now)
        changed = true
        continue
      }

      if (speaker && speaker !== current.speaker) {
        current.speaker = speaker
        changed = true
      }
      if (text === current.text) continue

      const merged = mergeCaptionText(current.text, text)
      if (merged.kind === 'split') {
        current.final = true
        this.openUtterance(block.key, current.speaker, merged.text, now)
      } else {
        current.text = merged.text
      }
      changed = true
    }

    for (const [key, utterance] of this.open) {
      if (!seen.has(key)) {
        utterance.final = true
        this.open.delete(key)
        changed = true
      }
    }
    return changed
  }

  finalizeAll(): boolean {
    if (this.open.size === 0) return false
    for (const utterance of this.open.values()) utterance.final = true
    this.open.clear()
    return true
  }

  private openUtterance(
    key: object,
    speaker: string,
    text: string,
    now: number
  ) {
    const utterance: Utterance = {
      id: this.createId(),
      speaker,
      startedAt: now,
      text,
      final: false,
    }
    this.list.push(utterance)
    this.open.set(key, utterance)
  }
}
