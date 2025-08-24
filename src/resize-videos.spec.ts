import {
  getfullScreamStyles,
  getHTMLElements,
  increaseVideoSize,
} from './resize-video'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Resize Video', () => {
  const FIXED_NOW = 1_725_000_000_000 // stable Date.now for IDs

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getHTMLElements throws when <video> is missing', () => {
    expect(() => getHTMLElements()).toThrow('Video element not found')
  })

  it('getHTMLElements returns video and elements with height = videoHeight-2', () => {
    const video = document.createElement('video')
    video.style.height = '649px' // otherHeight = 647
    document.body.appendChild(video)

    const e1 = document.createElement('div')
    e1.style.cssText = 'height: 647px; color: red;'
    const e2 = document.createElement('section')
    e2.style.cssText = 'border: 1px solid; height: 647px;'
    const e3 = document.createElement('p')
    e3.style.cssText = 'height: 100px;'
    document.body.append(e1, e2, e3)

    const { video: outVideo, otherElements } = getHTMLElements()
    expect(outVideo).toBe(video)
    expect(Array.from(otherElements)).toEqual([e1, e2])
  })

  it('getfullScreamStyles assigns deterministic IDs and returns styles', () => {
    const video = document.createElement('video')
    video.style.cssText = 'height: 649px; width: 800px;'
    document.body.appendChild(video)

    const e1 = document.createElement('div')
    e1.style.cssText = 'height: 647px; color: red;'
    const e2 = document.createElement('section')
    e2.style.cssText = 'height: 647px; opacity: 0.5;'
    document.body.append(e1, e2)

    const { videoStyle, elementsStyle } = getfullScreamStyles()

    expect(videoStyle).toContain('height: 649px')
    expect(videoStyle).toContain('width: 800px')

    expect(e1.id).toBe(`el-0-${FIXED_NOW}`)
    expect(e2.id).toBe(`el-1-${FIXED_NOW}`)

    expect(elementsStyle).toEqual({
      [`el-0-${FIXED_NOW}`]: e1.style.cssText,
      [`el-1-${FIXED_NOW}`]: e2.style.cssText,
    })
  })

  it('increaseVideoSize applies provided styles back to DOM', () => {
    const video = document.createElement('video')
    video.style.height = '649px' // ensures otherHeight=647
    document.body.appendChild(video)

    const e1 = document.createElement('div')
    e1.style.cssText = 'height: 647px;'
    const e2 = document.createElement('section')
    e2.style.cssText = 'height: 647px;'
    document.body.append(e1, e2)

    // generate IDs and capture baseline like your flow
    getfullScreamStyles()

    // change to something else
    e1.style.cssText = 'height: 10px;'
    e2.style.cssText = 'height: 10px;'
    video.style.cssText = 'height: 12px;'

    increaseVideoSize({
      videoFullStyle: 'height: 720px; width: 1280px;',
      elementsFullStyle: {
        [e1.id]: 'height: 400px;',
        [e2.id]: 'height: 500px;',
      },
    })

    expect(e1.style.cssText).toBe('height: 400px;')
    expect(e2.style.cssText).toBe('height: 500px;')
    expect(video.style.cssText).toBe('height: 720px; width: 1280px;')
  })
})
