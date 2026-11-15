import { describe, expect, test } from 'vitest'
import type { LiveStatus } from '@/shared/types'
import { applyBadge } from './badge'

const live: LiveStatus = {
  meetingId: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily',
  since: 0,
  heartbeatAt: 0,
  state: 'recording',
  utteranceCount: 1,
  tabToken: 't',
}

describe('applyBadge', () => {
  test('ligada e sem reunião: sem selo', async () => {
    await applyBadge(true, undefined)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'Meet Captions: ligada',
    })
  })

  test('desligada: selo OFF cinza, mesmo com status ao vivo', async () => {
    await applyBadge(false, live)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'OFF' })
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#6b7280',
    })
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'Meet Captions: desligada',
    })
  })

  test('gravando: selo REC vermelho', async () => {
    await applyBadge(true, live)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'REC' })
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#dc2626',
    })
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'Meet Captions: gravando',
    })
  })

  test('falha ao ler as legendas: selo de alerta', async () => {
    await applyBadge(true, { ...live, state: 'captions-unavailable' })
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' })
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'Meet Captions: não foi possível ler as legendas',
    })
  })

  test('aguardando a primeira fala ou legendas desligadas: sem selo', async () => {
    await applyBadge(true, { ...live, meetingId: null })
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' })
    await applyBadge(true, { ...live, state: 'captions-off' })
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' })
  })
})
