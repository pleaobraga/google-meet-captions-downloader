import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import {
  getMeeting,
  getSettings,
  listMeetings,
  saveMeeting,
} from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import { SettingsDialog } from './settings-dialog'

const DAY = 24 * 60 * 60 * 1000

const m = (id: string, daysAgo: number): Meeting => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: Date.now() - daysAgo * DAY,
  sessions: [
    {
      startedAt: Date.now() - daysAgo * DAY,
      endedAt: Date.now() - daysAgo * DAY,
    },
  ],
  utterances: [
    { id: 'u', speaker: 'Ana', startedAt: 1, text: 'oi', final: true },
  ],
})

async function open() {
  const user = userEvent.setup()
  render(<SettingsDialog />)
  await user.click(await screen.findByRole('button', { name: 'Configurações' }))
  return user
}

describe('SettingsDialog', () => {
  test('salva meu nome ao sair do campo', async () => {
    const user = await open()
    await user.type(
      screen.getByRole('textbox', { name: 'Meu nome' }),
      ' Maria '
    )
    await user.tab()
    await waitFor(async () =>
      expect((await getSettings()).myName).toBe('Maria')
    )
  })

  test('escolher um prazo pede confirmação e apaga as antigas', async () => {
    await saveMeeting(m('nova', 1))
    await saveMeeting(m('velha', 100))
    const user = await open()
    await user.click(screen.getByRole('radio', { name: 'Com mais de 30 dias' }))
    expect(
      screen.getByText(
        '1 reunião com mais de 30 dias será apagada agora. Daqui em diante, a limpeza é automática.'
      )
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(async () =>
      expect((await listMeetings()).map((x) => x.id)).toEqual(['nova'])
    )
    expect((await getSettings()).autoDeleteDays).toBe(30)
  })

  test('cancelar não muda a opção nem apaga', async () => {
    await saveMeeting(m('velha', 100))
    const user = await open()
    await user.click(screen.getByRole('radio', { name: 'Com mais de 90 dias' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect((await getSettings()).autoDeleteDays).toBe(0)
    expect(await listMeetings()).toHaveLength(1)
    expect(screen.getByRole('radio', { name: 'Nunca' })).toBeChecked()
  })

  test('importar um backup traz as reuniões', async () => {
    const user = await open()
    const backup = {
      app: 'meet-captions',
      version: 1,
      exportedAt: 1,
      meetings: [m('importada', 5)],
    }
    const file = new File([JSON.stringify(backup)], 'backup.json', {
      type: 'application/json',
    })
    await user.upload(screen.getByLabelText('Arquivo de backup'), file)
    await waitFor(async () =>
      expect(await getMeeting('importada')).toBeDefined()
    )
  })

  test('mostra o aviso sobre remover a extensão', async () => {
    await open()
    expect(
      screen.getByText(
        'As reuniões ficam guardadas só nesta extensão. Se você remover a extensão do Chrome, elas são apagadas.'
      )
    ).toBeInTheDocument()
  })
})
