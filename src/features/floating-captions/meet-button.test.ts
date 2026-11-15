import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  MEET_IN_CALL_EN,
  MEET_LANDING,
} from '@/features/recording/__fixtures__/meet-dom'
import {
  FLOATING_BUTTON_ID,
  ensureFloatingButton,
  removeFloatingButton,
} from './meet-button'

describe('botão da janela flutuante', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('entra logo depois do botão de legendas', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    const button = ensureFloatingButton(document, () => {})
    const captions = document.querySelector(
      '[aria-label="Turn off captions (c)"]'
    )
    expect(captions?.nextElementSibling).toBe(button)
    expect(button).toHaveAttribute(
      'aria-label',
      'Abrir legendas em janela flutuante'
    )
  })

  test('sem botão de legendas, fica fixo na tela', () => {
    document.body.innerHTML = MEET_LANDING
    const button = ensureFloatingButton(document, () => {})
    expect(button.parentElement).toBe(document.body)
    expect(button.style.position).toBe('fixed')
  })

  test('não duplica e usa o clique mais recente', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    const first = vi.fn()
    const second = vi.fn()
    const a = ensureFloatingButton(document, first)
    const b = ensureFloatingButton(document, second)
    expect(b).toBe(a)
    expect(document.querySelectorAll(`#${FLOATING_BUTTON_ID}`)).toHaveLength(1)
    a.click()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('recria o botão se o Meet o removeu', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    ensureFloatingButton(document, () => {})
    document.body.innerHTML = MEET_IN_CALL_EN
    ensureFloatingButton(document, () => {})
    expect(document.querySelectorAll(`#${FLOATING_BUTTON_ID}`)).toHaveLength(1)
  })

  test('remove', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    ensureFloatingButton(document, () => {})
    removeFloatingButton(document)
    expect(document.getElementById(FLOATING_BUTTON_ID)).toBeNull()
  })
})
