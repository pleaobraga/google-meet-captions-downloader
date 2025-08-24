/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadCaptions, extractCaptions } from './captions'

beforeEach(() => {
  document.body.innerHTML = ''

  // JSDOM innerText polyfill (keeps the code resilient)
  if (!('innerText' in document.documentElement)) {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      get() {
        return this.textContent ?? ''
      },
      set(v: any) {
        this.textContent = String(v)
      },
    })
  }
})

function mountCaptions(text: string) {
  const el = document.createElement('div')
  el.setAttribute('aria-label', 'Captions')
  el.innerText = text
  document.body.appendChild(el)
}

describe('extractCaptions', () => {
  it('returns empty string when no captions container exists', () => {
    expect(extractCaptions()).toBe('')
  })

  it('parses multiple speakers and collapses whitespace', () => {
    mountCaptions(`You
Hello there!

Pedro
Oi   tudo   bem?`)

    expect(extractCaptions()).toBe(`You: Hello there!\n\nPedro: Oi tudo bem?`)
  })
})

describe('downloadCaptions', () => {
  it('uses chrome.downloads with a data URL and a formatted filename', () => {
    // mock chrome.downloads
    ;(globalThis as any).chrome = {
      downloads: { download: vi.fn() },
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-02T03:04:05.678Z'))

    downloadCaptions('hello')

    const call = (globalThis as any).chrome.downloads.download.mock.calls[0][0]
    expect(call.url).toBe(
      'data:text/plain;charset=utf-8,' + encodeURIComponent('hello')
    )
    expect(call.filename).toBe(
      'formatted-transcript-2025-01-02T03-04-05-678Z.txt'
    )
    expect(call.saveAs).toBe(true)

    vi.useRealTimers()
  })
})
