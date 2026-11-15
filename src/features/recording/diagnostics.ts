import type {
  CaptionsState,
  DiagnosticBlock,
  DiagnosticEvent,
  DiagnosticLog,
  ObservedBlock,
} from '@/shared/types'

export const DIAGNOSTIC_MAX_EVENTS = 50_000
export const DIAGNOSTIC_MAX_HTML = 20_000

type DiagnosticMeta = {
  meetingId: string
  code: string
  startedAt: number
  userAgent: string
  language: string
}

export class DiagnosticRecorder {
  private readonly log: DiagnosticLog
  private readonly keys = new WeakMap<object, number>()
  private nextKey = 1
  private lastKeySet = ''
  private lastBlocksJson = ''
  private lastState = ''

  constructor(meta: DiagnosticMeta, existing?: DiagnosticLog) {
    this.log = existing
      ? structuredClone(existing)
      : { ...meta, truncated: false, events: [] }

    for (const event of this.log.events) {
      if (event.kind !== 'blocks') continue
      for (const block of event.blocks) {
        this.nextKey = Math.max(this.nextKey, block.k + 1)
      }
    }
  }

  record(
    blocks: ObservedBlock[] | null,
    region: Element | null,
    captionsState: CaptionsState,
    t: number
  ): void {
    if (blocks === null) {
      const state = `region-missing:${captionsState}`
      if (state === this.lastState) return
      this.lastState = state
      this.push({ t, kind: 'state', state })
      return
    }

    const mapped: DiagnosticBlock[] = blocks.map((block) => ({
      k: this.keyFor(block.key),
      speaker: block.speaker,
      text: block.text,
    }))

    const keySet = mapped.map((block) => block.k).join(',')
    if (keySet !== this.lastKeySet) {
      this.lastKeySet = keySet
      if (region) {
        this.push({
          t,
          kind: 'html',
          html: region.outerHTML.slice(0, DIAGNOSTIC_MAX_HTML),
        })
      }
    }

    const json = JSON.stringify(mapped)
    if (json === this.lastBlocksJson) return
    this.lastBlocksJson = json
    this.push({ t, kind: 'blocks', blocks: mapped })
  }

  toLog(): DiagnosticLog {
    return structuredClone(this.log)
  }

  private keyFor(key: object): number {
    let k = this.keys.get(key)
    if (k === undefined) {
      k = this.nextKey++
      this.keys.set(key, k)
    }
    return k
  }

  private push(event: DiagnosticEvent): void {
    if (this.log.events.length >= DIAGNOSTIC_MAX_EVENTS) {
      this.log.truncated = true
      return
    }
    this.log.events.push(event)
  }
}
