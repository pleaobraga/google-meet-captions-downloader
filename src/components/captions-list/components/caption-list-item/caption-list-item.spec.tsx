/* eslint-disable @typescript-eslint/no-explicit-any */
// CaptionListItem.test.tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock deps before importing the SUT
vi.mock('./use-caption-item', () => ({ useCaptionItem: vi.fn() }))
vi.mock('@/components/chadcn/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))
vi.mock('@/components/chadcn/separator', () => ({
  Separator: (props: React.HTMLAttributes<HTMLHRElement>) => <hr {...props} />,
}))

import { CaptionListItem } from './'
import { useCaptionItem } from './use-caption-item'

type HookShape = {
  downloadTranscript: ReturnType<typeof vi.fn>
  deleteTranscript: ReturnType<typeof vi.fn>
  isDeleting: boolean
  isDownloading: boolean
}

const setupHook = (overrides?: Partial<HookShape>) => {
  const defaults: HookShape = {
    downloadTranscript: vi.fn(),
    deleteTranscript: vi.fn().mockResolvedValue(undefined),
    isDeleting: false,
    isDownloading: false,
  }
  const value = { ...defaults, ...overrides }
  vi.mocked(useCaptionItem).mockReturnValue(value as any)
  return value
}

describe('<CaptionListItem />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the formatted date', () => {
    setupHook()
    const date = new Date('2024-01-02T03:04:05Z')
    render(
      <CaptionListItem
        date={date}
        id="abc"
        text="hello world"
        onDelete={() => {}}
      />
    )
    // The component uses toLocaleString(); compare against the same call.
    expect(screen.getByText(date.toLocaleString())).toBeInTheDocument()
  })

  it('calls downloadTranscript with { date, text } when clicking Download', () => {
    const { downloadTranscript } = setupHook()
    const date = new Date('2024-05-10T12:00:00Z')

    render(
      <CaptionListItem
        date={date}
        id="id-1"
        text="some text"
        onDelete={() => {}}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(downloadTranscript).toHaveBeenCalledTimes(1)
    expect(downloadTranscript).toHaveBeenCalledWith({ date, text: 'some text' })
  })

  it('disables Download button when isDownloading is true', () => {
    setupHook({ isDownloading: true })
    render(
      <CaptionListItem
        date={new Date()}
        id="id-2"
        text="x"
        onDelete={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled()
  })

  it('calls deleteTranscript then onDelete with id when clicking Delete', async () => {
    const { deleteTranscript } = setupHook()
    const onDelete = vi.fn()

    render(
      <CaptionListItem
        date={new Date()}
        id="to-del"
        text="y"
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(deleteTranscript).toHaveBeenCalledWith({ id: 'to-del' })
      expect(onDelete).toHaveBeenCalledWith('to-del')
    })
  })

  it('disables Delete button when isDeleting is true', () => {
    setupHook({ isDeleting: true })
    render(
      <CaptionListItem
        date={new Date()}
        id="id-3"
        text="z"
        onDelete={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
  })

  it('logs an error and does not call onDelete if delete fails', async () => {
    const err = new Error('boom')
    const { deleteTranscript } = setupHook({
      deleteTranscript: vi.fn().mockRejectedValue(err),
    })
    const onDelete = vi.fn()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <CaptionListItem
        date={new Date()}
        id="bad"
        text="t"
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(deleteTranscript).toHaveBeenCalledWith({ id: 'bad' })
      expect(onDelete).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalled() // message logged
    })

    spy.mockRestore()
  })
})
