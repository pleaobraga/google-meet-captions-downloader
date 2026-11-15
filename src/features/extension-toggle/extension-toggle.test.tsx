import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { LiveStatus } from '@/shared/types'
import { ExtensionToggle } from './extension-toggle'

const recording: LiveStatus = {
  meetingId: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily do time',
  since: 0,
  heartbeatAt: 0,
  state: 'recording',
  utteranceCount: 12,
  tabToken: 't',
}

function setup(enabled: boolean, live?: LiveStatus) {
  const onEnable = vi.fn()
  const onDisable = vi.fn()
  render(
    <ExtensionToggle
      enabled={enabled}
      live={live}
      onEnable={onEnable}
      onDisable={onDisable}
    />
  )
  const toggle = screen.getByRole('switch', {
    name: 'Ligar ou desligar a extensão',
  })
  return { onEnable, onDisable, toggle, user: userEvent.setup() }
}

describe('ExtensionToggle', () => {
  test('ligar não pede confirmação', async () => {
    const { onEnable, toggle, user } = setup(false)
    await user.click(toggle)
    expect(onEnable).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  test('desligar sem gravação pede uma confirmação', async () => {
    const { onDisable, toggle, user } = setup(true)
    await user.click(toggle)
    expect(screen.getByText('Desligar a extensão?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desligar' }))
    expect(onDisable).toHaveBeenCalledWith({ discard: false })
  })

  test('cancelar mantém a extensão ligada', async () => {
    const { onDisable, toggle, user } = setup(true)
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onDisable).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  test('com gravação: confirma e depois pergunta, descartando', async () => {
    const { onDisable, toggle, user } = setup(true, recording)
    await user.click(toggle)
    expect(screen.getByText('Há uma reunião sendo gravada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desligar' }))
    expect(screen.getByText('O que fazer com a gravação?')).toBeInTheDocument()
    expect(
      screen.getByText('"Daily do time" já tem 12 falas gravadas.')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onDisable).toHaveBeenCalledWith({ discard: true })
  })

  test('com gravação: manter gravação', async () => {
    const { onDisable, toggle, user } = setup(true, recording)
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Desligar' }))
    await user.click(screen.getByRole('button', { name: 'Manter gravação' }))
    expect(onDisable).toHaveBeenCalledWith({ discard: false })
  })

  test('na reunião sem falas ainda, trata como sem gravação', async () => {
    const { toggle, user } = setup(true, { ...recording, meetingId: null })
    await user.click(toggle)
    expect(screen.getByText('Desligar a extensão?')).toBeInTheDocument()
  })
})
