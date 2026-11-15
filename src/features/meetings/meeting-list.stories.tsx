import type { Meta, StoryObj } from '@storybook/react-vite'
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
    utteranceCount: 42,
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

const meta = {
  title: 'Reuniões/MeetingList',
  component: MeetingList,
  args: { meetings, selectedId: 'b', liveMeetingId: null, onSelect: () => {} },
} satisfies Meta<typeof MeetingList>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const ComAoVivo: Story = {
  args: { liveMeetingId: 'b' },
}

export const Vazia: Story = {
  args: { meetings: [], selectedId: null },
}
