import { describe, expect, test } from 'vitest'
import { getMeeting, listMeetings, saveMeeting } from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import {
  BACKUP_ERROR,
  backupFilename,
  buildBackup,
  importBackup,
  parseBackup,
} from './backup'

const NOW = new Date('2026-11-14T10:00:00-03:00').getTime()

const m = (id: string, text = 'oi'): Meeting => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: 1000,
  sessions: [{ startedAt: 1000, endedAt: 2000 }],
  utterances: [{ id: 'u', speaker: 'Ana', startedAt: 1100, text, final: true }],
})

describe('backup', () => {
  test('exporta todas as reuniões', async () => {
    await saveMeeting(m('a'))
    await saveMeeting(m('b'))
    const backup = await buildBackup(NOW)
    expect(backup).toMatchObject({
      app: 'meet-captions',
      version: 1,
      exportedAt: NOW,
    })
    expect(backup.meetings.map((x) => x.id).sort()).toEqual(['a', 'b'])
  })

  test('nome do arquivo', () => {
    expect(backupFilename(NOW)).toBe('meet-captions-backup-2026-11-14.json')
  })

  test('exportar, apagar tudo e importar traz as reuniões de volta', async () => {
    await saveMeeting(m('a'))
    const json = JSON.stringify(await buildBackup(NOW))
    await chrome.storage.local.clear()
    expect(await importBackup(parseBackup(json))).toEqual({
      imported: 1,
      skipped: 0,
    })
    expect(await getMeeting('a')).toEqual(m('a'))
    expect(await listMeetings()).toHaveLength(1)
  })

  test('importar não duplica nem altera reuniões que já existem', async () => {
    await saveMeeting(m('a', 'versão atual'))
    const file = {
      app: 'meet-captions',
      version: 1,
      exportedAt: NOW,
      meetings: [m('a', 'versão do backup'), m('b')],
    } as const
    expect(
      await importBackup({ ...file, meetings: [...file.meetings] })
    ).toEqual({ imported: 1, skipped: 1 })
    expect((await getMeeting('a'))?.utterances[0].text).toBe('versão atual')
  })

  test.each([
    ['não é json', '{quebrado'],
    ['outro app', JSON.stringify({ app: 'outro', version: 1, meetings: [] })],
    [
      'versão desconhecida',
      JSON.stringify({ app: 'meet-captions', version: 2, meetings: [] }),
    ],
    [
      'meetings não é lista',
      JSON.stringify({ app: 'meet-captions', version: 1, meetings: {} }),
    ],
    [
      'reunião sem id',
      JSON.stringify({
        app: 'meet-captions',
        version: 1,
        meetings: [{ startedAt: 1, sessions: [], utterances: [] }],
      }),
    ],
    [
      'reunião sem falas',
      JSON.stringify({
        app: 'meet-captions',
        version: 1,
        meetings: [{ id: 'a', startedAt: 1, sessions: [] }],
      }),
    ],
  ])('arquivo inválido: %s', (_, json) => {
    expect(() => parseBackup(json)).toThrow(BACKUP_ERROR)
  })
})
