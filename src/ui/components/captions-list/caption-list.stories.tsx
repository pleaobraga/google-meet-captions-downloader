/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react'

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
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
  '456': {
    timestamp: new Date().getTime(),
    id: '456',
    text: 'Another Sample Caption',
    title: 'Another Sample Title',
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
  '789': {
    timestamp: new Date().getTime(),
    id: '789',
    text: 'Third Sample Caption',
    title: 'Third Sample Title',
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
