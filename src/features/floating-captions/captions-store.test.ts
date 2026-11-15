import { expect, test, vi } from 'vitest'
import { IDLE_SNAPSHOT, createCaptionsStore } from './captions-store'

test('começa ocioso e mantém o mesmo objeto entre leituras', () => {
  const store = createCaptionsStore()
  expect(store.getSnapshot()).toBe(IDLE_SNAPSHOT)
  expect(store.getSnapshot()).toBe(store.getSnapshot())
})

test('set troca o snapshot e avisa os inscritos', () => {
  const store = createCaptionsStore()
  const listener = vi.fn()
  const unsubscribe = store.subscribe(listener)
  const next = { status: 'recording' as const, utterances: [], sessions: [] }
  store.set(next)
  expect(store.getSnapshot()).toBe(next)
  expect(listener).toHaveBeenCalledTimes(1)
  unsubscribe()
  store.set({ ...next })
  expect(listener).toHaveBeenCalledTimes(1)
})
