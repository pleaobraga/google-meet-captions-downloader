import { beforeEach, describe, expect, test, vi } from 'vitest'
import { importLegacyMeetings, readLegacyMeetings } from './legacy-import'

describe('legacy import', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('converte as reuniões antigas', () => {
    localStorage.setItem(
      'captionText_1000',
      JSON.stringify({ text: 'Ana\noi', title: 'Daily' })
    )
    localStorage.setItem('history_captionText_1000', '[]')
    localStorage.setItem(
      'captionText_2000',
      JSON.stringify({ text: 'Pedro\nolá' })
    )
    localStorage.setItem('outra_chave', 'x')
    const { meetings, keys } = readLegacyMeetings(localStorage)
    expect(
      meetings.map((m) => [m.id, m.title, m.legacy, m.utterances[0].text])
    ).toEqual(
      expect.arrayContaining([
        ['legacy_1000', 'Daily', true, 'Ana\noi'],
        ['legacy_2000', 'Reunião antiga', true, 'Pedro\nolá'],
      ])
    )
    expect(keys.sort()).toEqual([
      'captionText_1000',
      'captionText_2000',
      'history_captionText_1000',
    ])
  })

  test('remove histórico órfão e ignora JSON inválido', () => {
    localStorage.setItem('history_captionText_3000', '[]')
    localStorage.setItem('captionText_4000', '{quebrado')
    const { meetings, keys } = readLegacyMeetings(localStorage)
    expect(meetings).toEqual([])
    expect(keys).toEqual(['history_captionText_3000'])
  })

  test('importa, salva e só então limpa o localStorage', async () => {
    localStorage.setItem(
      'captionText_1000',
      JSON.stringify({ text: 'oi', title: 'Daily' })
    )
    const save = vi.fn(async () => {})
    expect(await importLegacyMeetings(localStorage, save)).toBe(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('captionText_1000')).toBeNull()
  })

  test('se salvar falhar, não apaga nada', async () => {
    localStorage.setItem('captionText_1000', JSON.stringify({ text: 'oi' }))
    const save = vi.fn(async () => {
      throw new Error('falhou')
    })
    await expect(importLegacyMeetings(localStorage, save)).rejects.toThrow(
      'falhou'
    )
    expect(localStorage.getItem('captionText_1000')).not.toBeNull()
  })
})
