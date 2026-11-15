import { beforeEach, describe, expect, test, vi } from 'vitest'
import { MEET_CAPTIONS_OFF_EN, MEET_IN_CALL_EN } from './__fixtures__/meet-dom'
import { CaptionsAutostart } from './captions-autostart'

describe('CaptionsAutostart', () => {
  let now = 0
  let autostart: CaptionsAutostart
  const clicks = vi.fn()

  function renderOff() {
    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', clicks)
  }

  beforeEach(() => {
    now = 0
    clicks.mockClear()
    autostart = new CaptionsAutostart(() => now)
  })

  test('clica no botão de ligar legendas', () => {
    renderOff()
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
  })

  test('espera 2s entre tentativas', () => {
    renderOff()
    autostart.tick(document)
    now = 1999
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
    now = 2000
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(2)
  })

  test('depois que as legendas ligam, nunca mais clica, mesmo se eu desligar', () => {
    renderOff()
    autostart.tick(document)
    document.body.innerHTML = MEET_IN_CALL_EN
    now = 3000
    autostart.tick(document)
    expect(autostart.done).toBe(true)
    renderOff()
    now = 10_000
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
  })

  test('legendas já ligadas pelo Meet: não clica', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    autostart.tick(document)
    expect(autostart.done).toBe(true)
  })

  test('desiste depois de 60s', () => {
    document.body.innerHTML = '<button aria-label="Leave call"></button>'
    autostart.tick(document)
    now = 60_001
    autostart.tick(document)
    expect(autostart.done).toBe(true)
  })

  test('skip impede qualquer clique', () => {
    renderOff()
    autostart.skip()
    autostart.tick(document)
    expect(autostart.done).toBe(true)
    expect(clicks).not.toHaveBeenCalled()
  })

  test('reset permite ligar de novo numa nova sessão', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    autostart.tick(document)
    autostart.reset()
    renderOff()
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
  })
})
