import type { Meta, StoryObj } from '@storybook/react-vite'

import { AudioSettings } from '.'

const meta = {
  title: 'Component/AudioSettings',
  component: AudioSettings,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AudioSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
