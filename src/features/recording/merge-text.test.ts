import { describe, expect, test } from 'vitest'
import { mergeCaptionText } from './merge-text'

describe('mergeCaptionText', () => {
  test('texto crescendo é substituição', () => {
    expect(mergeCaptionText('bom dia', 'bom dia pessoal')).toEqual({
      kind: 'replace',
      text: 'bom dia pessoal',
    })
  })

  test('correção no fim é substituição', () => {
    expect(
      mergeCaptionText(
        'o deploy vai ser na sexta à tarde',
        'o deploy vai ser na sexta-feira à tarde'
      )
    ).toEqual({
      kind: 'replace',
      text: 'o deploy vai ser na sexta-feira à tarde',
    })
  })

  test('correção no começo, pelo contexto, é substituição', () => {
    expect(
      mergeCaptionText(
        'a gente pode fazer isso amanhã cedo',
        'agente pode fazer isso amanhã cedo'
      )
    ).toEqual({ kind: 'replace', text: 'agente pode fazer isso amanhã cedo' })
  })

  test('maiúsculas e pontuação não atrapalham', () => {
    expect(
      mergeCaptionText('a gente pode fazer isso', 'A gente pode fazer isso.')
    ).toEqual({ kind: 'replace', text: 'A gente pode fazer isso.' })
  })

  test('frase com trecho repetido não duplica na correção', () => {
    expect(
      mergeCaptionText(
        'eu acho que sim eu acho que não',
        'eu acho que sim eu acho que não.'
      )
    ).toEqual({ kind: 'replace', text: 'eu acho que sim eu acho que não.' })
  })

  test('Meet cortou o começo: mantém o começo antigo', () => {
    expect(
      mergeCaptionText(
        'bom dia pessoal hoje vamos falar sobre o deploy da sexta',
        'falar sobre o deploy da sexta-feira e também sobre testes'
      )
    ).toEqual({
      kind: 'extend',
      text: 'bom dia pessoal hoje vamos falar sobre o deploy da sexta-feira e também sobre testes',
    })
  })

  test('texto já estendido continua estendendo nas próximas mudanças', () => {
    const first = mergeCaptionText(
      'bom dia pessoal hoje vamos falar sobre o deploy da sexta',
      'falar sobre o deploy da sexta e testes'
    )
    expect(
      mergeCaptionText(
        first.text,
        'falar sobre o deploy da sexta e testes de carga'
      )
    ).toEqual({
      kind: 'extend',
      text: 'bom dia pessoal hoje vamos falar sobre o deploy da sexta e testes de carga',
    })
  })

  test('texto totalmente diferente num bloco longo é fala nova', () => {
    expect(
      mergeCaptionText(
        'então a gente fecha isso na sexta combinado',
        'agora vamos para o próximo item da pauta'
      )
    ).toEqual({
      kind: 'split',
      text: 'agora vamos para o próximo item da pauta',
    })
  })

  test('texto curto (menos de 6 palavras) nunca vira fala nova', () => {
    expect(mergeCaptionText('oi', 'e aí')).toEqual({
      kind: 'replace',
      text: 'e aí',
    })
  })

  test('texto novo vazio mantém o salvo', () => {
    expect(mergeCaptionText('bom dia', '   ')).toEqual({
      kind: 'replace',
      text: 'bom dia',
    })
  })
})
