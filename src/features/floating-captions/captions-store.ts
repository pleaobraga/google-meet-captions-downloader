import type { LiveState, Session, Utterance } from '@/shared/types'

export type FloatingStatus = 'idle' | LiveState

export type FloatingSnapshot = {
  status: FloatingStatus
  utterances: Utterance[]
  sessions: Session[]
}

export type CaptionsStore = {
  getSnapshot: () => FloatingSnapshot
  subscribe: (listener: () => void) => () => void
  set: (next: FloatingSnapshot) => void
}

export const IDLE_SNAPSHOT: FloatingSnapshot = {
  status: 'idle',
  utterances: [],
  sessions: [],
}

/** Guarda o que a janela flutuante mostra, no formato do useSyncExternalStore. */
export function createCaptionsStore(): CaptionsStore {
  let snapshot = IDLE_SNAPSHOT
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set: (next) => {
      snapshot = next
      listeners.forEach((listener) => listener())
    },
  }
}
