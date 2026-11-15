import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Utterance } from '@/shared/types'
import { type FloatingSnapshot, createCaptionsStore } from './captions-store'
import { FloatingCaptions } from './floating-captions'

const at = (iso: string) => new Date(iso).getTime()
const u = (
  id: string,
  speaker: string,
  text: string,
  final = true
): Utterance => ({
  id,
  speaker,
  startedAt: at('2026-11-14T10:02:00-03:00'),
  text,
  final,
})

function setup(snapshot?: FloatingSnapshot, fontSize = 16) {
  const store = createCaptionsStore()
  if (snapshot) store.set(snapshot)
  const onFontSizeChange = vi.fn()
  const view = render(
    <FloatingCaptions
      store={store}
      myName="Maria"
      fontSize={fontSize}
      onFontSizeChange={onFontSizeChange}
    />
  )
  return { store, onFontSizeChange, user: userEvent.setup(), ...view }
}

describe('FloatingCaptions', () => {
  test.each([
    ['idle', 'Nenhuma reunião em andamento'],
    ['recording', 'Aguardando legendas…'],
    ['captions-off', 'Legendas desligadas'],
    ['stopped', 'Gravação parada nesta reunião'],
    ['captions-unavailable', 'Não foi possível ler as legendas'],
  ] as const)('sem falas, status %s mostra "%s"', (status, message) => {
    setup({ status, utterances: [], sessions: [] })
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  test('mostra as falas com meu nome e atualiza ao vivo', () => {
    const { store } = setup({
      status: 'recording',
      utterances: [u('1', 'Você', 'bom dia')],
      sessions: [],
    })
    expect(screen.getByText('Maria:')).toBeInTheDocument()
    expect(screen.getByText('bom dia')).toBeInTheDocument()
    act(() => {
      store.set({
        status: 'recording',
        utterances: [u('1', 'Você', 'bom dia pessoal', false)],
        sessions: [],
      })
    })
    expect(screen.getByText('bom dia pessoal')).toHaveClass(
      'text-muted-foreground'
    )
  })

  test('com falas e legendas desligadas, mostra o aviso no rodapé', () => {
    setup({
      status: 'captions-off',
      utterances: [u('1', 'Ana', 'oi')],
      sessions: [],
    })
    expect(screen.getByText('oi')).toBeInTheDocument()
    expect(screen.getByText('Legendas desligadas')).toBeInTheDocument()
  })

  test('botões de letra respeitam os limites', async () => {
    const { onFontSizeChange, user } = setup(undefined, 16)
    await user.click(screen.getByRole('button', { name: 'Aumentar letra' }))
    expect(onFontSizeChange).toHaveBeenCalledWith(18)
    await user.click(screen.getByRole('button', { name: 'Diminuir letra' }))
    expect(onFontSizeChange).toHaveBeenCalledWith(14)
  })

  test('no tamanho mínimo e no máximo, o botão fica desabilitado', () => {
    const min = setup(undefined, 12)
    expect(
      screen.getByRole('button', { name: 'Diminuir letra' })
    ).toBeDisabled()
    min.unmount()
    setup(undefined, 32)
    expect(
      screen.getByRole('button', { name: 'Aumentar letra' })
    ).toBeDisabled()
  })

  test('rolar para cima mostra "Voltar ao vivo"', async () => {
    const { container, user } = setup({
      status: 'recording',
      utterances: [u('1', 'Ana', 'oi')],
      sessions: [],
    })
    expect(
      screen.queryByRole('button', { name: 'Voltar ao vivo' })
    ).not.toBeInTheDocument()
    const body = container.querySelector('.overflow-y-auto') as HTMLDivElement
    Object.defineProperty(body, 'scrollHeight', {
      configurable: true,
      value: 1000,
    })
    Object.defineProperty(body, 'clientHeight', {
      configurable: true,
      value: 300,
    })
    body.scrollTop = 100
    fireEvent.scroll(body)
    await user.click(screen.getByRole('button', { name: 'Voltar ao vivo' }))
    expect(
      screen.queryByRole('button', { name: 'Voltar ao vivo' })
    ).not.toBeInTheDocument()
  })
})
