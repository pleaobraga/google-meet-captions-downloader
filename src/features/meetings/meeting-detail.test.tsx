import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Meeting } from '@/shared/types'
import { MeetingDetail } from './meeting-detail'

const at = (iso: string) => new Date(iso).getTime()

const meeting: Meeting = {
  id: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily do time',
  startedAt: at('2026-11-14T10:00:00-03:00'),
  sessions: [
    {
      startedAt: at('2026-11-14T10:00:00-03:00'),
      endedAt: at('2026-11-14T10:32:00-03:00'),
    },
  ],
  utterances: [
    {
      id: 'u1',
      speaker: 'Você',
      startedAt: at('2026-11-14T10:02:00-03:00'),
      text: 'a reunião é na sexta',
      final: true,
    },
    {
      id: 'u2',
      speaker: 'Ana',
      startedAt: at('2026-11-14T10:03:00-03:00'),
      text: 'sexta está ótimo',
      final: true,
    },
  ],
}

function setup(
  props: Partial<React.ComponentProps<typeof MeetingDetail>> = {}
) {
  const handlers = { onRename: vi.fn(), onDelete: vi.fn(), onDownload: vi.fn() }
  render(
    <MeetingDetail
      meeting={meeting}
      isLive={false}
      myName="Maria"
      {...handlers}
      {...props}
    />
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('MeetingDetail', () => {
  test('mostra dados da reunião e participantes com meu nome', () => {
    setup()
    expect(
      screen.getByRole('heading', { name: 'Daily do time' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('14/11/2026 · 10:00–10:32 · 32 min')
    ).toBeInTheDocument()
    expect(screen.getByText('Participantes: Maria, Ana')).toBeInTheDocument()
  })

  test('renomear com Enter', async () => {
    const { onRename, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Renomear reunião' }))
    const input = screen.getByRole('textbox', { name: 'Título da reunião' })
    await user.clear(input)
    await user.type(input, 'Planejamento{Enter}')
    expect(onRename).toHaveBeenCalledWith('Planejamento')
    expect(
      screen.queryByRole('textbox', { name: 'Título da reunião' })
    ).not.toBeInTheDocument()
  })

  test('cancelar o renomear não chama nada', async () => {
    const { onRename, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Renomear reunião' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onRename).not.toHaveBeenCalled()
  })

  test('apagar pede confirmação', async () => {
    const { onDelete, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Apagar reunião' }))
    expect(screen.getByText('Apagar esta reunião?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apagar' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test('reunião ao vivo não pode ser apagada', () => {
    setup({ isLive: true })
    expect(
      screen.getByRole('button', { name: 'Apagar reunião' })
    ).toBeDisabled()
  })

  test('baixar em markdown e em texto', async () => {
    const { onDownload, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Baixar' }))
    await user.click(screen.getByRole('menuitem', { name: 'Markdown (.md)' }))
    expect(onDownload).toHaveBeenCalledWith('md')
    await user.click(screen.getByRole('button', { name: 'Baixar' }))
    await user.click(screen.getByRole('menuitem', { name: 'Texto (.txt)' }))
    expect(onDownload).toHaveBeenCalledWith('txt')
  })

  test('busca destaca e conta as ocorrências', async () => {
    const { user } = setup()
    await user.type(
      screen.getByRole('textbox', { name: 'Buscar nesta reunião' }),
      'sexta'
    )
    expect(screen.getByText('2 ocorrências')).toBeInTheDocument()
    expect(document.querySelectorAll('mark')).toHaveLength(2)
  })

  test('busca sem resultado', async () => {
    const { user } = setup({ initialQuery: 'inexistente' })
    expect(screen.getByText('Nenhuma ocorrência')).toBeInTheDocument()
    await user.clear(
      screen.getByRole('textbox', { name: 'Buscar nesta reunião' })
    )
    expect(screen.queryByText('Nenhuma ocorrência')).not.toBeInTheDocument()
  })
})
