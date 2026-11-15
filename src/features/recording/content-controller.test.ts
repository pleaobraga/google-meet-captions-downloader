import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getLiveStatus,
  getMeeting,
  getSettings,
  listMeetings,
  updateSettings,
} from '@/shared/storage'
import {
  MEET_CAPTIONS_OFF_EN,
  MEET_IN_CALL_EN,
  MEET_LANDING,
} from './__fixtures__/meet-dom'
import { startContentController } from './content-controller'

let n = 0
let controller: ReturnType<typeof startContentController> | null = null

function start() {
  controller = startContentController({
    doc: document,
    win: window,
    now: () => Date.now(),
    createId: () => `u${++n}`,
    tabToken: 'tab-1',
  })
  return controller.ready
}

function goTo(path: string) {
  window.history.pushState({}, '', path)
}

describe('content controller', () => {
  beforeEach(() => {
    n = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-14T10:00:00-03:00'))
    document.body.innerHTML = ''
    goTo('/')
  })

  afterEach(async () => {
    await controller?.dispose()
    controller = null
    vi.useRealTimers()
  })

  test('grava as falas de uma reunião', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    const [summary] = await listMeetings()
    expect(summary.code).toBe('abc-defg-hij')
    expect(summary.title).toBe('Daily do time')
    expect(summary.utteranceCount).toBe(2)
  })

  test('extensão desligada: não grava e não clica em nada', async () => {
    await updateSettings({ enabled: false })
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    const click = vi.fn()
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', click)
    await start()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(click).not.toHaveBeenCalled()
    expect(await listMeetings()).toEqual([])
    expect(await getLiveStatus()).toBeUndefined()
  })

  test('liga as legendas uma vez e respeita quando eu desligo', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    const click = vi.fn(() => {
      document.body.innerHTML = MEET_IN_CALL_EN
    })
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', click)
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    expect(click).toHaveBeenCalledTimes(1)

    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    const secondClick = vi.fn()
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', secondClick)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(secondClick).not.toHaveBeenCalled()
    expect((await getLiveStatus())?.state).toBe('captions-off')
  })

  test('recarregar depois de desligar as legendas não religa', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    await vi.advanceTimersByTimeAsync(1_500)
    await controller?.dispose()

    const click = vi.fn()
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', click)
    await start()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(click).not.toHaveBeenCalled()
  })

  test('navegação sem recarregar: entra, sai e volta na mesma reunião', async () => {
    document.body.innerHTML = MEET_LANDING
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await getLiveStatus()).toBeUndefined()

    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await vi.advanceTimersByTimeAsync(1_500)
    expect((await getLiveStatus())?.code).toBe('abc-defg-hij')

    document.body.innerHTML = '<p>Você saiu da reunião</p>'
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await getLiveStatus()).toBeUndefined()

    vi.setSystemTime(new Date('2026-11-14T14:00:00-03:00'))
    document.body.innerHTML = MEET_IN_CALL_EN
    await vi.advanceTimersByTimeAsync(1_500)
    const meetings = await listMeetings()
    expect(meetings).toHaveLength(1)
    expect((await getMeeting(meetings[0].id))?.sessions).toHaveLength(2)
  })

  test('pagehide salva o que estava na tela imediatamente', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    document.querySelector('#b2 > div:last-child')!.textContent =
      'combinado então'
    await vi.advanceTimersByTimeAsync(150)
    window.dispatchEvent(new Event('pagehide'))
    await vi.advanceTimersByTimeAsync(0)
    const [summary] = await listMeetings()
    const saved = await getMeeting(summary.id)
    expect(saved?.utterances.map((u) => u.text)).toContain('combinado então')
  })

  test('desligar no meio da reunião para de gravar e limpa o status', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    await updateSettings({ enabled: false })
    await vi.advanceTimersByTimeAsync(100)
    expect(await getLiveStatus()).toBeUndefined()
    expect((await getSettings()).enabled).toBe(false)
  })

  test('descartar com salvamento pendente: a reunião não reaparece', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    const [summary] = await listMeetings()
    document.querySelector('#b2 > div:last-child')!.textContent =
      'combinado então'
    await vi.advanceTimersByTimeAsync(150)
    await updateSettings({ enabled: false })
    await vi.advanceTimersByTimeAsync(100)
    await chrome.storage.local.remove([`meeting:${summary.id}`, 'meetingIndex'])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await getMeeting(summary.id)).toBeUndefined()
    expect(await listMeetings()).toEqual([])
  })

  test('ligar no meio da reunião começa a gravar a partir dali', async () => {
    await updateSettings({ enabled: false })
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await listMeetings()).toEqual([])
    await updateSettings({ enabled: true })
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await listMeetings()).toHaveLength(1)
  })
})
