import { findTurnOnCaptionsButton, isCaptionsOn } from './meet-dom'

export const AUTOSTART_RETRY_MS = 2_000
export const AUTOSTART_GIVE_UP_MS = 60_000

/**
 * Liga as legendas uma única vez por sessão. Depois que elas ligam (ou depois
 * de desistir), nunca mais clica, para respeitar quando eu desligo (R3.3).
 */
export class CaptionsAutostart {
  private startedAt: number | null = null
  private lastClickAt = Number.NEGATIVE_INFINITY
  private finished = false
  private readonly nowFn: () => number

  constructor(now: () => number) {
    this.nowFn = now
  }

  get done(): boolean {
    return this.finished
  }

  reset(): void {
    this.startedAt = null
    this.lastClickAt = Number.NEGATIVE_INFINITY
    this.finished = false
  }

  skip(): void {
    this.finished = true
  }

  tick(doc: Document): void {
    if (this.finished) return
    const now = this.nowFn()
    this.startedAt ??= now

    if (isCaptionsOn(doc)) {
      this.finished = true
      return
    }
    if (now - this.startedAt > AUTOSTART_GIVE_UP_MS) {
      this.finished = true
      return
    }

    const button = findTurnOnCaptionsButton(doc)
    if (button && now - this.lastClickAt >= AUTOSTART_RETRY_MS) {
      button.click()
      this.lastClickAt = now
    }
  }
}
