import type { Meta, StoryObj } from '@storybook/react-vite'

import { CaptionsList } from '.'

const meta = {
  title: 'Components/Caption List',
  component: CaptionsList,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CaptionsList>

export default meta
type Story = StoryObj<typeof meta>

const items = {
  '123': {
    timestamp: new Date().getTime(),
    id: '123',
    text: 'Sample Caption',
    title: 'Sample Title',
    history: [],
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
  '456': {
    timestamp: new Date().getTime(),
    id: '456',
    text: 'Another Sample Caption',
    title: 'Another Sample Title',
    history: [
      { text: 'Initial caption text', time: '5 minutes' },
      { text: 'Updated caption text', time: '10 minutes' },
    ],
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
  '789': {
    timestamp: new Date().getTime(),
    id: '789',
    text: 'Third Sample Caption',
    title: 'Third Sample Title',
    history: [
      { text: 'Initial caption text', time: '5 minutes' },
      { text: 'Updated caption text', time: '10 minutes' },
    ],
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
}

export const Default: Story = {
  args: {
    pastTranscriptions: items,
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
}

export const Empty: Story = {
  args: {
    pastTranscriptions: null,
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
}
