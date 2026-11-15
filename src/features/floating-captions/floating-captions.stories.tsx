import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Utterance } from '@/shared/types'
import { createCaptionsStore, type FloatingSnapshot } from './captions-store'
import { FloatingCaptions } from './floating-captions'

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
    speaker: 'Você',
    startedAt: at('2026-11-14T10:04:00-03:00'),
    text: 'Então a gente fecha isso na',
    final: false,
  },
]

function storeWith(snapshot: FloatingSnapshot) {
  const store = createCaptionsStore()
  store.set(snapshot)
  return store
}

const meta = {
  title: 'Janela flutuante/FloatingCaptions',
  component: FloatingCaptions,
  args: {
    store: storeWith({ status: 'recording', utterances: [], sessions: [] }),
    myName: 'Maria',
    fontSize: 16,
    onFontSizeChange: () => {},
  },
} satisfies Meta<typeof FloatingCaptions>

export default meta
type Story = StoryObj<typeof meta>

export const Aguardando: Story = {}

export const ComFalas: Story = {
  args: { store: storeWith({ status: 'recording', utterances, sessions: [] }) },
}

export const LegendasDesligadas: Story = {
  args: {
    store: storeWith({ status: 'captions-off', utterances, sessions: [] }),
  },
}
