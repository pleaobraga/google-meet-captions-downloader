import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Utterance } from '@/shared/types'
import { TranscriptView } from './transcript-view'

const at = (iso: string) => new Date(iso).getTime()

const utterances: Utterance[] = [
  {
    id: '1',
    speaker: 'Pedro',
    startedAt: at('2026-11-14T10:02:00-03:00'),
    text: 'Bom dia, pessoal.',
    final: true,
  },
  {
    id: '2',
    speaker: 'Ana',
    startedAt: at('2026-11-14T10:03:00-03:00'),
    text: 'Vamos começar pelo deploy.',
    final: true,
  },
  {
    id: '3',
    speaker: 'Ana',
    startedAt: at('2026-11-14T14:06:00-03:00'),
    text: 'Então a gente fecha isso na sexta',
    final: false,
  },
]

const meta = {
  title: 'Transcrição/TranscriptView',
  component: TranscriptView,
  args: {
    utterances: utterances.slice(0, 2),
    sessions: [
      {
        startedAt: at('2026-11-14T10:00:00-03:00'),
        endedAt: at('2026-11-14T10:30:00-03:00'),
      },
    ],
  },
} satisfies Meta<typeof TranscriptView>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const ComSaidaEVolta: Story = {
  args: {
    utterances,
    sessions: [
      {
        startedAt: at('2026-11-14T10:00:00-03:00'),
        endedAt: at('2026-11-14T10:20:00-03:00'),
      },
      {
        startedAt: at('2026-11-14T14:05:00-03:00'),
        endedAt: at('2026-11-14T14:30:00-03:00'),
      },
    ],
  },
}

export const Vazio: Story = {
  args: { utterances: [], sessions: [] },
}
