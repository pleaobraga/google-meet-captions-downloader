import { describe, expect, test, vi } from 'vitest'
import { getStorageSnapshot } from './chrome-fake'

describe('chrome fake', () => {
  test('guarda e lê valores do storage', async () => {
    await chrome.storage.local.set({ a: 1, b: { c: 2 } })
    expect(await chrome.storage.local.get('a')).toEqual({ a: 1 })
    expect(await chrome.storage.local.get(['a', 'b'])).toEqual({
      a: 1,
      b: { c: 2 },
    })
    expect(await chrome.storage.local.get(null)).toEqual({ a: 1, b: { c: 2 } })
  })

  test('remove valores', async () => {
    await chrome.storage.local.set({ a: 1, b: 2 })
    await chrome.storage.local.remove('a')
    expect(getStorageSnapshot()).toEqual({ b: 2 })
  })

  test('avisa mudanças pelo onChanged', async () => {
    const listener = vi.fn()
    chrome.storage.onChanged.addListener(listener)
    await chrome.storage.local.set({ a: 1 })
    await Promise.resolve()
    expect(listener).toHaveBeenCalledWith(
      { a: { oldValue: undefined, newValue: 1 } },
      'local'
    )
  })

  test('começa vazio em cada teste', () => {
    expect(getStorageSnapshot()).toEqual({})
  })
})
