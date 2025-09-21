/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react-vite'

import { CaptionListItem } from '.'

const meta = {
  title: 'Components/Caption List/Caption List Item',
  component: CaptionListItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CaptionListItem>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    date: new Date(),
    id: '123',
    text: 'Sample Caption',
    title: 'Sample Title',
    history: [
      { text: 'Initial caption text', time: '5 minutes' },
      { text: 'Updated caption text', time: '10 minutes' },
    ],
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
}
