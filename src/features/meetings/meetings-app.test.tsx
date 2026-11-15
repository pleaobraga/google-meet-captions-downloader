import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { getMeeting, listMeetings, saveMeeting } from '@/shared/storage'
import { MeetingsApp } from './meetings-app'

const at = (iso: string) => new Date(iso).getTime()

describe('MeetingsApp', () => {
  test('lista as reuniões e mostra a mais recente aberta', async () => {
    await saveMeeting({
      id: 'm1',
      code: 'abc-defg-hij',
      title: 'Daily do time',
      startedAt: at('2026-11-14T10:00:00-03:00'),
      sessions: [
        {
          startedAt: at('2026-11-14T10:00:00-03:00'),
          endedAt: at('2026-11-14T10:32:00-03:00'),
        },
      ],
      utterances: [
        {
          id: 'u1',
          speaker: 'Pedro',
          startedAt: at('2026-11-14T10:02:00-03:00'),
          text: 'bom dia',
          final: true,
        },
        {
          id: 'u2',
          speaker: 'Ana',
          startedAt: at('2026-11-14T10:03:00-03:00'),
          text: 'vamos lá',
          final: true,
        },
      ],
    })
    render(<MeetingsApp />)
    expect(await screen.findByText('bom dia')).toBeInTheDocument()
    expect(screen.getByText('Participantes: Pedro, Ana')).toBeInTheDocument()
  })

  test('sem reuniões', async () => {
    render(<MeetingsApp />)
    expect(
      await screen.findByText('Nenhuma reunião gravada ainda.')
    ).toBeInTheDocument()
  })

  async function seed() {
    const base = {
      code: 'abc-defg-hij',
      sessions: [
        {
          startedAt: at('2026-11-14T10:00:00-03:00'),
          endedAt: at('2026-11-14T10:32:00-03:00'),
        },
      ],
    }
    await saveMeeting({
      ...base,
      id: 'm1',
      title: 'Daily do time',
      startedAt: at('2026-11-14T10:00:00-03:00'),
      utterances: [
        {
          id: 'u1',
          speaker: 'Pedro',
          startedAt: at('2026-11-14T10:02:00-03:00'),
          text: 'deploy na sexta',
          final: true,
        },
      ],
    })
    await saveMeeting({
      ...base,
      id: 'm2',
      title: 'Planejamento',
      startedAt: at('2026-11-10T10:00:00-03:00'),
      utterances: [
        {
          id: 'u2',
          speaker: 'Ana',
          startedAt: at('2026-11-10T10:02:00-03:00'),
          text: 'metas do trimestre',
          final: true,
        },
      ],
    })
  }

  test('a busca geral filtra a lista', async () => {
    await seed()
    render(<MeetingsApp />)
    const user = userEvent.setup()
    await screen.findByRole('button', { name: /Planejamento/ })
    await user.type(
      screen.getByRole('textbox', { name: 'Buscar em todas as reuniões' }),
      'trimestre'
    )
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Daily do time/ })
      ).not.toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /Planejamento/ })
    ).toBeInTheDocument()
  })

  test('apagar as reuniões selecionadas', async () => {
    await seed()
    render(<MeetingsApp />)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('checkbox', { name: 'Selecionar Daily do time' })
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Selecionar Planejamento' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Apagar selecionadas (2)' })
    )
    expect(screen.getByText('Apagar 2 reuniões?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apagar' }))
    await waitFor(async () => expect(await listMeetings()).toEqual([]))
  })

  test('renomear pela tela grava no storage', async () => {
    await seed()
    render(<MeetingsApp />)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', { name: 'Renomear reunião' })
    )
    const input = screen.getByRole('textbox', { name: 'Título da reunião' })
    await user.clear(input)
    await user.type(input, 'Novo nome{Enter}')
    await waitFor(async () =>
      expect((await getMeeting('m1'))?.customTitle).toBe('Novo nome')
    )
  })
})
