import { describe, expect, test } from 'vitest'
import { SCENARIOS } from './__fixtures__/scenarios'
import { replayDiagnosticLog } from './replay'

describe('replayDiagnosticLog', () => {
  test.each(SCENARIOS.map((s) => [s.name, s] as const))('%s', (_, scenario) => {
    const result = replayDiagnosticLog(scenario.log)
    expect(result.map(({ speaker, text }) => ({ speaker, text }))).toEqual(
      scenario.expected
    )
    expect(result.every((u) => u.final)).toBe(true)
  })
})
