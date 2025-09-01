/* eslint-disable storybook/no-renderer-packages */
import type { Meta, StoryObj } from '@storybook/react'

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
    onDelete: (id: string) => console.log(`Delete ${id}`),
  },
}
