/* eslint-disable @typescript-eslint/no-explicit-any */
// captions.test.ts
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock the date->filename helper for deterministic names
vi.mock('@/lib/utils', () => ({
  formatDateToFilename: (d?: Date) => (d ? 'mocked-from-date' : 'mocked-now'),
}))

import {
  deletePastTranscriptions,
  downloadCaptions,
  extractCaptions,
  formatCaptions,
  getPastTranscriptions,
  transcriptNameByDate,
} from './captions' // ⬅️ update this path if needed

// --- Mock chrome.downloads
beforeEach(() => {
  ;(globalThis as any).chrome = {
    downloads: { download: vi.fn() },
  }
  // JSDOM provides localStorage; ensure clean state
  localStorage.clear()
})

afterEach(() => {
  delete (globalThis as any).chrome
  vi.clearAllMocks()
})

describe('formatCaptions', () => {
  it('groups lines by speaker headers and collapses whitespace', () => {
    const input = `
      Pedro
      Hello   world
      how  are
      you?

      You
      I'm fine.

      José Álvez
      Ótimo, obrigado!
    `

    const out = formatCaptions(input)
    expect(out).toBe(
      [
        'Pedro: Hello world how are you?',
        "You: I'm fine.",
        'José Álvez: Ótimo, obrigado!',
      ].join('\n\n')
    )
  })

  it('returns empty string when no speaker blocks are formed', () => {
    const input = '   \n  '
    expect(formatCaptions(input)).toBe('')
  })
})

describe('extractCaptions', () => {
  it('returns empty string if container not found', () => {
    document.body.innerHTML = `<div>No captions here</div>`
    expect(extractCaptions()).toBe('')
  })
})

describe('transcriptNameByDate', () => {
  it('uses formatDateToFilename with provided date', () => {
    const d = new Date('2024-01-02T03:04:05Z')
    expect(transcriptNameByDate(d)).toBe(
      'formatted-transcript-mocked-from-date.txt'
    )
  })

  it('uses formatDateToFilename with current date when undefined', () => {
    expect(transcriptNameByDate()).toBe('formatted-transcript-mocked-now.txt')
  })
})

describe('downloadCaptions', () => {
  const mockDl = () => chrome.downloads.download as unknown as Mock

  it('calls chrome.downloads.download with a data URL and default filename', () => {
    downloadCaptions('hello world')

    expect(mockDl()).toHaveBeenCalledTimes(1)
    const arg = mockDl().mock.calls[0][0]
    expect(arg.filename).toBe('formatted-transcript-mocked-now.txt')
    expect(arg.url).toMatch(/^data:text\/plain;charset=utf-8,/)
    // ensure content is encoded
    expect(decodeURIComponent(arg.url.split(',')[1])).toBe('hello world')
    expect(arg.saveAs).toBe(true)
  })

  it('respects a custom filename when provided', () => {
    downloadCaptions('x', 'custom.txt')
    expect(mockDl()).toHaveBeenLastCalledWith({
      url: expect.stringMatching(/^data:text\/plain;charset=utf-8,/),
      filename: 'custom.txt',
      saveAs: true,
    })
  })
})

describe('getPastTranscriptions / deletePastTranscriptions', () => {
  it('collects items with the given prefix and parses timestamp from key', () => {
    localStorage.setItem('gmeet_1700000000000', 'text-1')
    localStorage.setItem('other_1700000000001', 'ignored')
    localStorage.setItem('gmeet_1800000000000', 'text-2')

    const res = getPastTranscriptions('gmeet_')

    expect(Object.keys(res).sort()).toEqual([
      'gmeet_1700000000000',
      'gmeet_1800000000000',
    ])

    expect(res['gmeet_1700000000000']).toEqual({
      text: 'text-1',
      timestamp: 1700000000000,
      id: 'gmeet_1700000000000',
    })
    expect(res['gmeet_1800000000000']).toEqual({
      text: 'text-2',
      timestamp: 1800000000000,
      id: 'gmeet_1800000000000',
    })
  })

  it('deletePastTranscriptions removes the item from localStorage', () => {
    localStorage.setItem('gmeet_170', 'abc')
    deletePastTranscriptions('gmeet_170')
    expect(localStorage.getItem('gmeet_170')).toBeNull()
  })
})
