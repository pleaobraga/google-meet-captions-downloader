import { vi } from 'vitest'

type StorageChanges = Record<string, chrome.storage.StorageChange>
type ChangeListener = (changes: StorageChanges, areaName: string) => void

let data: Record<string, unknown> = {}
const listeners = new Set<ChangeListener>()

function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value)
}

function emit(changes: StorageChanges) {
  if (Object.keys(changes).length === 0) return
  queueMicrotask(() => {
    listeners.forEach((listener) => listener(changes, 'local'))
  })
}

const local = {
  async get(keys?: string | string[] | null): Promise<Record<string, unknown>> {
    if (keys === undefined || keys === null) return clone(data)
    const list = Array.isArray(keys) ? keys : [keys]
    const result: Record<string, unknown> = {}
    for (const key of list) {
      if (key in data) result[key] = clone(data[key])
    }
    return result
  },
  async set(items: Record<string, unknown>): Promise<void> {
    const changes: StorageChanges = {}
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: clone(data[key]), newValue: clone(value) }
      data[key] = clone(value)
    }
    emit(changes)
  },
  async remove(keys: string | string[]): Promise<void> {
    const list = Array.isArray(keys) ? keys : [keys]
    const changes: StorageChanges = {}
    for (const key of list) {
      if (key in data) {
        changes[key] = { oldValue: clone(data[key]) }
        delete data[key]
      }
    }
    emit(changes)
  },
  async clear(): Promise<void> {
    await local.remove(Object.keys(data))
  },
}

export const chromeFake = {
  storage: {
    local,
    onChanged: {
      addListener: (listener: ChangeListener) => {
        listeners.add(listener)
      },
      removeListener: (listener: ChangeListener) => {
        listeners.delete(listener)
      },
    },
  },
  action: {
    setBadgeText: vi.fn<(details: { text: string }) => Promise<void>>(
      async () => {}
    ),
    setBadgeBackgroundColor: vi.fn<
      (details: { color: string }) => Promise<void>
    >(async () => {}),
    setTitle: vi.fn<(details: { title: string }) => Promise<void>>(
      async () => {}
    ),
  },
  runtime: {
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
  },
  tabs: {
    create: vi.fn<(props: { url: string }) => Promise<object>>(
      async () => ({})
    ),
  },
  alarms: {
    create: vi.fn(async () => {}),
    onAlarm: { addListener: vi.fn() },
  },
}

export function installChromeFake() {
  ;(globalThis as unknown as { chrome: typeof chromeFake }).chrome = chromeFake
}

export function resetChromeFake() {
  data = {}
  listeners.clear()
  chromeFake.action.setBadgeText.mockClear()
  chromeFake.action.setBadgeBackgroundColor.mockClear()
  chromeFake.action.setTitle.mockClear()
  chromeFake.runtime.onInstalled.addListener.mockClear()
  chromeFake.runtime.onStartup.addListener.mockClear()
  chromeFake.tabs.create.mockClear()
  chromeFake.alarms.create.mockClear()
  chromeFake.alarms.onAlarm.addListener.mockClear()
}

export function getStorageSnapshot(): Record<string, unknown> {
  return clone(data)
}
