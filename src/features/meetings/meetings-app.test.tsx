import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { saveMeeting } from '@/shared/storage'
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
})
