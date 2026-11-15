import type {
  DiagnosticBlock,
  DiagnosticEvent,
  DiagnosticLog,
} from '@/shared/types'

export type Scenario = {
  name: string
  log: DiagnosticLog
  expected: Array<{ speaker: string; text: string }>
}

const b = (k: number, speaker: string, text: string): DiagnosticBlock => ({
  k,
  speaker,
  text,
})
const blocks = (t: number, ...list: DiagnosticBlock[]): DiagnosticEvent => ({
  t,
  kind: 'blocks',
  blocks: list,
})
const missing = (t: number, state: string): DiagnosticEvent => ({
  t,
  kind: 'state',
  state: `region-missing:${state}`,
})

function log(events: DiagnosticEvent[]): DiagnosticLog {
  return {
    meetingId: 'abc-defg-hij_0',
    code: 'abc-defg-hij',
    startedAt: 0,
    userAgent: 'test',
    language: 'pt-BR',
    truncated: false,
    events,
  }
}

export const SCENARIOS: Scenario[] = [
  {
    name: 'correções em tempo real',
    log: log([
      blocks(1000, b(1, 'Ana', 'a gente pode')),
      blocks(1500, b(1, 'Ana', 'a gente pode fazer isso amanhã')),
      blocks(2000, b(1, 'Ana', 'agente pode fazer isso amanhã cedo')),
      blocks(2600, b(1, 'Ana', 'A gente pode fazer isso amanhã cedo.')),
      blocks(9000),
    ]),
    expected: [
      { speaker: 'Ana', text: 'A gente pode fazer isso amanhã cedo.' },
    ],
  },
  {
    name: 'fala longa com o começo cortado pelo Meet',
    log: log([
      blocks(
        1000,
        b(
          1,
          'Pedro',
          'bom dia pessoal hoje vamos falar sobre o deploy da sexta'
        )
      ),
      blocks(
        4000,
        b(
          1,
          'Pedro',
          'falar sobre o deploy da sexta-feira e também sobre testes'
        )
      ),
    ]),
    expected: [
      {
        speaker: 'Pedro',
        text: 'bom dia pessoal hoje vamos falar sobre o deploy da sexta-feira e também sobre testes',
      },
    ],
  },
  {
    name: 'dois falantes intercalados com correção atrasada',
    log: log([
      blocks(1000, b(1, 'Ana', 'vamos fechar na')),
      blocks(2000, b(1, 'Ana', 'vamos fechar na'), b(2, 'Pedro', 'combinado')),
      blocks(
        2500,
        b(1, 'Ana', 'vamos fechar na sexta'),
        b(2, 'Pedro', 'combinado')
      ),
      blocks(6000, b(2, 'Pedro', 'combinado então')),
    ]),
    expected: [
      { speaker: 'Ana', text: 'vamos fechar na sexta' },
      { speaker: 'Pedro', text: 'combinado então' },
    ],
  },
  {
    name: 'bloco reaproveitado para uma fala nova',
    log: log([
      blocks(1000, b(1, 'Ana', 'então a gente fecha isso na sexta combinado')),
      blocks(5000, b(1, 'Ana', 'agora vamos para o próximo item da pauta')),
    ]),
    expected: [
      { speaker: 'Ana', text: 'então a gente fecha isso na sexta combinado' },
      { speaker: 'Ana', text: 'agora vamos para o próximo item da pauta' },
    ],
  },
  {
    name: 'legendas desligadas e religadas no meio da reunião',
    log: log([
      blocks(1000, b(1, 'Ana', 'primeira parte')),
      missing(2000, 'off'),
      blocks(8000, b(2, 'Pedro', 'segunda parte')),
    ]),
    expected: [
      { speaker: 'Ana', text: 'primeira parte' },
      { speaker: 'Pedro', text: 'segunda parte' },
    ],
  },
]
