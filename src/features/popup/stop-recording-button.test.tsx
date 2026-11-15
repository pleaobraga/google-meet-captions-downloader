import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { LiveStatus } from '@/shared/types'
import { StopRecordingButton } from './stop-recording-button'

const live: LiveStatus = {
  meetingId: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily do time',
  since: 0,
  heartbeatAt: 0,
  state: 'recording',
  utteranceCount: 12,
  tabToken: 't',
}

function setup(status: LiveStatus | undefined) {
  const onStop = vi.fn()
  const onResume = vi.fn()
  const view = render(
    <StopRecordingButton live={status} onStop={onStop} onResume={onResume} />
  )
  return { onStop, onResume, user: userEvent.setup(), ...view }
}

describe('StopRecordingButton', () => {
  test('sem reunião, não mostra nada', () => {
    const { container } = setup(undefined)
    expect(container).toBeEmptyDOMElement()
  })

  test('com gravação: pergunta e descarta', async () => {
    const { onStop, user } = setup(live)
    await user.click(
      screen.getByRole('button', { name: 'Parar de gravar esta reunião' })
    )
    expect(
      screen.getByText('O que fazer com o que já foi gravado?')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onStop).toHaveBeenCalledWith({ discard: true })
  })

  test('com gravação: mantém', async () => {
    const { onStop, user } = setup(live)
    await user.click(
      screen.getByRole('button', { name: 'Parar de gravar esta reunião' })
    )
    await user.click(screen.getByRole('button', { name: 'Manter gravação' }))
    expect(onStop).toHaveBeenCalledWith({ discard: false })
  })

  test('sem nada gravado: uma confirmação só', async () => {
    const { onStop, user } = setup({ ...live, meetingId: null })
    await user.click(
      screen.getByRole('button', { name: 'Parar de gravar esta reunião' })
    )
    expect(
      screen.getByText('Parar de gravar esta reunião?')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Parar' }))
    expect(onStop).toHaveBeenCalledWith({ discard: false })
  })

  test('parada: mostra retomar', async () => {
    const { onResume, user } = setup({
      ...live,
      state: 'stopped',
      meetingId: null,
    })
    await user.click(screen.getByRole('button', { name: 'Retomar gravação' }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })
})
