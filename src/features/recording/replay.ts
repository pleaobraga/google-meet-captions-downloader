import type { DiagnosticLog, Utterance } from '@/shared/types'
import { CaptionTracker } from './caption-tracker'

/** Reapresenta um log de diagnóstico e devolve as falas que ele produz. */
export function replayDiagnosticLog(log: DiagnosticLog): Utterance[] {
  let n = 0
  const tracker = new CaptionTracker(() => `r${++n}`)
  const keyObjects = new Map<number, object>()
  const keyFor = (k: number): object => {
    let key = keyObjects.get(k)
    if (!key) {
      key = {}
      keyObjects.set(k, key)
    }
    return key
  }

  for (const event of log.events) {
    if (event.kind === 'blocks') {
      tracker.sync(
        event.blocks.map((block) => ({
          key: keyFor(block.k),
          speaker: block.speaker,
          text: block.text,
        })),
        event.t
      )
    } else if (
      event.kind === 'state' &&
      event.state.startsWith('region-missing')
    ) {
      tracker.sync([], event.t)
    }
  }

  tracker.finalizeAll()
  return tracker.utterances.map((utterance) => ({ ...utterance }))
}
