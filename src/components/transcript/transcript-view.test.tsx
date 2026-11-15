import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Session, Utterance } from '@/shared/types'
import { TranscriptView } from './transcript-view'

const at = (iso: string) => new Date(iso).getTime()
const u = (
  id: string,
  iso: string,
  speaker: string,
  text: string,
  final = true
): Utterance => ({
  id,
  speaker,
  startedAt: at(iso),
  text,
  final,
})

describe('TranscriptView', () => {
  test('mostra horário, nome e texto de cada fala', () => {
    render(
      <TranscriptView
        utterances={[u('1', '2026-11-14T10:02:00-03:00', 'Pedro', 'bom dia')]}
        sessions={[
          {
            startedAt: at('2026-11-14T10:00:00-03:00'),
            endedAt: at('2026-11-14T10:30:00-03:00'),
          },
        ]}
      />
    )
    expect(screen.getByText('10:02')).toBeInTheDocument()
    expect(screen.getByText('Pedro:')).toBeInTheDocument()
    expect(screen.getByText('bom dia')).toBeInTheDocument()
  })

  test('marca quando saí e voltei', () => {
    const sessions: Session[] = [
      {
        startedAt: at('2026-11-14T10:00:00-03:00'),
        endedAt: at('2026-11-14T10:20:00-03:00'),
      },
      {
        startedAt: at('2026-11-14T14:05:00-03:00'),
        endedAt: at('2026-11-14T14:30:00-03:00'),
      },
    ]
    render(
      <TranscriptView
        utterances={[
          u('1', '2026-11-14T10:02:00-03:00', 'Ana', 'manhã'),
          u('2', '2026-11-14T14:06:00-03:00', 'Ana', 'tarde'),
        ]}
        sessions={sessions}
      />
    )
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    const separator = screen.getByRole('separator')
    expect(separator).toHaveTextContent('Saiu às 10:20 · voltou às 14:05')
    expect(items[0]).toContain('manhã')
    expect(items[1]).toContain('tarde')
  })

  test('fala ainda aberta aparece mais clara', () => {
    render(
      <TranscriptView
        utterances={[
          u('1', '2026-11-14T10:02:00-03:00', 'Ana', 'digitando', false),
        ]}
        sessions={[]}
      />
    )
    expect(screen.getByText('digitando')).toHaveClass('text-muted-foreground')
  })

  test('sem falas', () => {
    render(<TranscriptView utterances={[]} sessions={[]} />)
    expect(screen.getByText('Nenhuma fala gravada ainda.')).toBeInTheDocument()
  })
})
