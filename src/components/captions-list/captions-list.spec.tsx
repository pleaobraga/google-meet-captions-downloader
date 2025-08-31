import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// SUT
import { CaptionsList } from '.'

// Mock the child so we can assert props & interactions
vi.mock('./components/caption-list-item', () => {
  return {
    CaptionListItem: ({
      id,
      text,
      date,
      onDelete,
    }: {
      id: string
      text: string
      date: Date
      onDelete: (id: string) => void
    }) => (
      <li
        data-testid="caption-item"
        data-id={id}
        data-date={date.toISOString()}
      >
        <span>{text}</span>
        <button onClick={() => onDelete(id)}>delete</button>
      </li>
    ),
  }
})

describe('<CaptionsList />', () => {
  it('renders an empty list when pastTranscriptions is null', () => {
    const onDelete = vi.fn()
    render(<CaptionsList pastTranscriptions={null} onDelete={onDelete} />)

    // UL exists but has no items
    const list = screen.getByRole('list')
    expect(within(list).queryAllByTestId('caption-item')).toHaveLength(0)
  })

  it('renders items in reverse order and passes correct props', () => {
    const onDelete = vi.fn()
    const pastTranscriptions = {
      a: { id: 'a', text: 'first', timestamp: 1_700_000_000_000 },
      b: { id: 'b', text: 'second', timestamp: 1_800_000_000_000 },
    } as const

    render(
      <CaptionsList
        pastTranscriptions={pastTranscriptions}
        onDelete={onDelete}
      />
    )

    const items = screen.getAllByTestId('caption-item')
    expect(items).toHaveLength(2)

    // Should be reversed: entry 'b' first, then 'a'
    expect(items[0]).toHaveAttribute('data-id', 'b')
    expect(items[1]).toHaveAttribute('data-id', 'a')

    // Date prop should match new Date(timestamp)
    expect(items[0]).toHaveAttribute(
      'data-date',
      new Date(pastTranscriptions.b.timestamp).toISOString()
    )
    expect(items[1]).toHaveAttribute(
      'data-date',
      new Date(pastTranscriptions.a.timestamp).toISOString()
    )

    // Text rendered
    within(items[0]).getByText('second')
    within(items[1]).getByText('first')
  })

  it('bubbles delete action with the correct id', () => {
    const onDelete = vi.fn()
    const pastTranscriptions = {
      only: { id: 'only', text: 'hello', timestamp: 1_900_000_000_000 },
    }

    render(
      <CaptionsList
        pastTranscriptions={pastTranscriptions}
        onDelete={onDelete}
      />
    )

    const item = screen.getByTestId('caption-item')
    fireEvent.click(within(item).getByRole('button', { name: /delete/i }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('only')
  })
})
