import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { LiveStatus } from '@/shared/types'
import { LiveStatusLine } from './live-status-line'

const since = new Date('2026-11-14T10:02:00-03:00').getTime()
const base: LiveStatus = {
  meetingId: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily do time',
  since,
  heartbeatAt: since,
  state: 'recording',
  utteranceCount: 3,
  tabToken: 't',
}

describe('LiveStatusLine', () => {
  test('sem reunião', () => {
    render(<LiveStatusLine live={undefined} now={since} />)
    expect(screen.getByText('Nenhuma reunião em andamento')).toBeInTheDocument()
  })

  test('gravando', () => {
    render(<LiveStatusLine live={base} now={since + 14 * 60_000} />)
    expect(screen.getByText('Gravando: Daily do time')).toBeInTheDocument()
    expect(screen.getByText('desde 10:02 · 14 min')).toBeInTheDocument()
  })

  test('aguardando legendas', () => {
    render(<LiveStatusLine live={{ ...base, meetingId: null }} now={since} />)
    expect(
      screen.getByText('Na reunião abc-defg-hij · aguardando legendas')
    ).toBeInTheDocument()
  })

  test('legendas desligadas', () => {
    render(
      <LiveStatusLine live={{ ...base, state: 'captions-off' }} now={since} />
    )
    expect(
      screen.getByText('Legendas desligadas · gravação pausada')
    ).toBeInTheDocument()
  })

  test('legendas indisponíveis', () => {
    render(
      <LiveStatusLine
        live={{ ...base, state: 'captions-unavailable' }}
        now={since}
      />
    )
    expect(
      screen.getByText('Não foi possível ler as legendas desta reunião')
    ).toBeInTheDocument()
  })

  test('gravação parada', () => {
    render(
      <LiveStatusLine
        live={{ ...base, state: 'stopped', meetingId: null }}
        now={since}
      />
    )
    expect(
      screen.getByText('Gravação parada nesta reunião')
    ).toBeInTheDocument()
  })
})
