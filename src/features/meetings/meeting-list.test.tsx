import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { MeetingSummary } from '@/shared/types'
import { MeetingList } from './meeting-list'

const at = (iso: string) => new Date(iso).getTime()
const meetings: MeetingSummary[] = [
  {
    id: 'b',
    code: 'abc-defg-hij',
    title: 'Daily do time',
    startedAt: at('2026-11-14T10:00:00-03:00'),
    endedAt: at('2026-11-14T10:32:00-03:00'),
    durationMs: 32 * 60_000,
    utteranceCount: 5,
  },
  {
    id: 'a',
    code: '',
    title: 'Reunião antiga',
    startedAt: at('2026-11-12T09:00:00-03:00'),
    endedAt: at('2026-11-12T09:00:00-03:00'),
    durationMs: 0,
    utteranceCount: 1,
    legacy: true,
  },
]

describe('MeetingList', () => {
  test('mostra título, data, duração e selos', () => {
    render(
      <MeetingList
        selection={new Set()}
        onToggleSelect={() => {}}
        meetings={meetings}
        selectedId="b"
        liveMeetingId="b"
        onSelect={() => {}}
      />
    )
    expect(screen.getByText('Daily do time')).toBeInTheDocument()
    expect(screen.getByText('14/11/2026 10:00 · 32 min')).toBeInTheDocument()
    expect(screen.getByText('Ao vivo')).toBeInTheDocument()
    expect(screen.getByText('Formato antigo')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Daily do time/ })
    ).toHaveAttribute('aria-current', 'true')
  })

  test('selecionar uma reunião', async () => {
    const onSelect = vi.fn()
    render(
      <MeetingList
        selection={new Set()}
        onToggleSelect={() => {}}
        meetings={meetings}
        selectedId="b"
        liveMeetingId={null}
        onSelect={onSelect}
      />
    )
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /Reunião antiga/ }))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  test('marcar uma reunião e não permitir marcar a que está ao vivo', async () => {
    const onToggleSelect = vi.fn()
    render(
      <MeetingList
        meetings={meetings}
        selectedId="b"
        liveMeetingId="b"
        selection={new Set()}
        onSelect={() => {}}
        onToggleSelect={onToggleSelect}
      />
    )
    expect(
      screen.getByRole('checkbox', { name: 'Selecionar Daily do time' })
    ).toBeDisabled()
    await userEvent
      .setup()
      .click(
        screen.getByRole('checkbox', { name: 'Selecionar Reunião antiga' })
      )
    expect(onToggleSelect).toHaveBeenCalledWith('a')
  })
})
