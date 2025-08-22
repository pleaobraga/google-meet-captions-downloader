import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioSettings } from './'

// --- Mock the Select component so we can easily inspect options ---
vi.mock('../select', () => ({
  Select: (props: {
    label: string
    emptyOption: string
    options: { value: string; label: string }[]
  }) => (
    <div data-testid={`select-${props.label}`}>
      <span>{props.label}</span>
      <ul>
        <li>{props.emptyOption}</li>
        {props.options.map((o) => (
          <li key={o.value}>{o.label}</li>
        ))}
      </ul>
    </div>
  ),
}))

// --- Helpers to build fake devices ---
const makeDevice = (
  id: string,
  kind: MediaDeviceInfo['kind'],
  label?: string
): MediaDeviceInfo =>
  ({
    deviceId: id,
    kind,
    label: label ?? '',
    groupId: 'g',
    toJSON: () => ({}),
  }) as unknown as MediaDeviceInfo

describe('<AudioSettings />', () => {
  const getUserMedia = vi.fn()
  const enumerateDevices = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()

    // @ts-expect-error - define minimal mock for testing
    global.navigator.mediaDevices = {
      getUserMedia,
      enumerateDevices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      getDisplayMedia: vi.fn(),
      ondevicechange: null,
    } as unknown as MediaDevices
  })

  it('requests mic permission once and lists microphones & speakers', async () => {
    // Arrange: permission succeeds and devices are returned
    getUserMedia.mockResolvedValueOnce({ getTracks: () => [] })
    enumerateDevices.mockResolvedValueOnce([
      makeDevice('mic-1', 'audioinput', 'USB Mic'),
      makeDevice('mic-2', 'audioinput', ''), // no label -> 'Unknown Microphone'
      makeDevice('spk-1', 'audiooutput', 'Headphones'),
      makeDevice('cam-1', 'videoinput', 'Irrelevant Camera'),
    ])

    render(<AudioSettings />)

    // Assert permission requested
    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    // Assert microphones
    const micSelect = await screen.findByTestId('select-Microphone')
    const micItems = within(micSelect)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(micItems).toEqual([
      'Select a microphone',
      'USB Mic',
      'Unknown Microphone',
    ])

    // Assert speakers
    const spkSelect = screen.getByTestId('select-Speakers')
    const spkItems = within(spkSelect)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(spkItems).toEqual(['Select a speaker', 'Headphones'])
  })

  it('handles empty device lists gracefully', async () => {
    getUserMedia.mockResolvedValueOnce({ getTracks: () => [] })
    enumerateDevices.mockResolvedValueOnce([])

    render(<AudioSettings />)

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    const micItems = within(await screen.findByTestId('select-Microphone'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(micItems).toEqual(['Select a microphone'])

    const spkItems = within(screen.getByTestId('select-Speakers'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(spkItems).toEqual(['Select a speaker'])
  })

  it('shows unknown labels when device label is empty', async () => {
    getUserMedia.mockResolvedValueOnce({ getTracks: () => [] })
    enumerateDevices.mockResolvedValueOnce([
      makeDevice('mic-1', 'audioinput', ''),
      makeDevice('spk-1', 'audiooutput', ''),
    ])

    render(<AudioSettings />)

    const micItems = within(await screen.findByTestId('select-Microphone'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(micItems).toEqual(['Select a microphone', 'Unknown Microphone'])

    const spkItems = within(screen.getByTestId('select-Speakers'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(spkItems).toEqual(['Select a speaker', 'Unknown Speaker'])
  })

  it('logs (does not crash) when permission is denied', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('Denied'))
    enumerateDevices.mockResolvedValueOnce([]) // will still be called in your code after then()

    render(<AudioSettings />)

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    // Component should still render selects with only empty options
    const micItems = within(await screen.findByTestId('select-Microphone'))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(micItems).toEqual(['Select a microphone'])
  })
})
