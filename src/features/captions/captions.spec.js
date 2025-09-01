import { formatDateToFilename } from '@/lib/utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  deletePastTranscriptions,
  downloadCaptions,
  extractCaptions,
  formatCaptions,
  getPastTranscriptions,
  transcriptNameByDate,
} from './captions' // adjust path

vi.mock('@/lib/utils', () => ({
  formatDateToFilename: vi.fn(),
}))

const mockFormatDateToFilename = formatDateToFilename

describe('formatCaptions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('supports accented names and default headers', () => {
    const input = `João\nOi tudo bem?\n\nMarie Curie\nBonjour!`
    const out = formatCaptions({ captions: input })
    expect(
      out.startsWith(
        'Meeting: No Meeting title provided\nDate: no date provided'
      )
    ).toBe(true)
    expect(out).toContain('João: Oi tudo bem?')
    expect(out).toContain('Marie Curie: Bonjour!')
  })

  test('skips empty speeches and ignores empty blocks', () => {
    const input = `Alice\n\n\n\n\n\nBob\n   \n  `
    const out = formatCaptions({ captions: input })
    expect(out.trim()).toBe(
      ['Meeting: No Meeting title provided', 'Date: no date provided'].join(
        '\n'
      )
    )
  })

  test('keeps non-speaker lines under current speaker', () => {
    const input = `Alice\n> not a name line\nends with punctuation.\n\nBob\nokay`
    const out = formatCaptions({ captions: input, meetingTitle: 'X' })
    expect(out).toContain('Alice: > not a name line ends with punctuation.')
    expect(out).toContain('Bob: okay')
  })
})

describe('extractCaptions', () => {
  const origQuery = document.querySelector

  afterEach(() => {
    document.querySelector = origQuery
  })

  test('returns innerText when container exists', () => {
    document.querySelector = vi.fn().mockReturnValue({
      innerText: 'hello captions',
    })
    expect(extractCaptions()).toBe('hello captions')
  })

  test('returns empty string when container missing', () => {
    document.querySelector = vi.fn().mockReturnValue(null)
    expect(extractCaptions()).toBe('')
  })
})

describe('transcriptNameByDate', () => {
  test('uses formatDateToFilename and naming pattern', () => {
    mockFormatDateToFilename.mockReturnValue('2025-09-01_12-00-00')
    const name = transcriptNameByDate(new Date('2025-09-01T12:00:00Z'))
    expect(mockFormatDateToFilename).toHaveBeenCalled()
    expect(name).toBe('formatted-transcript-2025-09-01_12-00-00.txt')
  })
})

describe('downloadCaptions', () => {
  beforeEach(() => {
    globalThis.chrome = { downloads: { download: vi.fn() } }
    vi.spyOn(globalThis, 'encodeURIComponent')
  })

  test('uses provided filename', () => {
    downloadCaptions('hello', 'given.txt')
    expect(globalThis.chrome.downloads.download).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringMatching(/^data:text\/plain/),
        filename: 'given.txt',
        saveAs: true,
      })
    )
  })
})

describe('getPastTranscriptions', () => {
  const store = {}
  const ls = {
    length: 0,
    key: (i) => Object.keys(store)[i] ?? null,
    getItem: (k) => store[k] ?? null,
    removeItem: (k) => delete store[k],
    setItem: (k, v) => (store[k] = v),
  }
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    globalThis.localStorage = ls
  })

  test('collects only prefix keys, parses payload, derives timestamp from key', () => {
    const prefix = 'saved_'
    ls.setItem(
      `${prefix}1693410000000`,
      JSON.stringify({ text: 'A', title: 'One' })
    )
    ls.setItem(
      `${prefix}1693420000000`,
      JSON.stringify({ text: 'B', title: 'Two' })
    )
    ls.setItem(
      `other_1693430000000`,
      JSON.stringify({ text: 'C', title: 'Three' })
    )
    ls.length = Object.keys(store).length

    const result = getPastTranscriptions(prefix)

    expect(Object.keys(result)).toHaveLength(2)
    expect(result[`${prefix}1693410000000`]).toEqual({
      text: 'A',
      timestamp: 1693410000000,
      title: 'One',
      id: `${prefix}1693410000000`,
    })
    expect(result[`${prefix}1693420000000`].text).toBe('B')
  })

  test('ignores falsy parsed values', () => {
    const prefix = 'saved_'
    ls.setItem(`${prefix}1`, JSON.stringify(null))
    ls.length = Object.keys(store).length

    const result = getPastTranscriptions(prefix)
    expect(result).toEqual({})
  })
})

describe('deletePastTranscriptions', () => {
  test('removes item from localStorage', () => {
    const removeSpy = vi.spyOn(localStorage, 'removeItem')
    deletePastTranscriptions('saved_123')
    expect(removeSpy).toHaveBeenCalledWith('saved_123')
  })
})
