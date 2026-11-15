import { expect, test } from 'vitest'
import { normalizeText } from './text'

test('normalizeText tira acentos e maiúsculas', () => {
  expect(normalizeText('Reunião À TARDE')).toBe('reuniao a tarde')
})
