# Etapa 2: tela de reuniões completa e configurações (plano de implementação)

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Spec:** [docs/superpowers/specs/2026-11-14-melhorias-extensao-requisitos.md](../specs/2026-11-14-melhorias-extensao-requisitos.md). Leia também o [CLAUDE.md](../../../CLAUDE.md).

**Branch:** `feat/v2-melhorias`.

**Regras de execução:** as mesmas da [etapa 1](2026-11-14-etapa-1-gravacao-completa.md), seções "Como usar este plano" e "Restrições globais". Leia as duas antes de começar. Em resumo:

- execute as tarefas na ordem e use exatamente os nomes de arquivos, funções e tipos do plano;
- sem `enum`, sem parâmetros de construtor com modificador, sem `any`, sem `console.log`;
- interface em português, só com shadcn/ui, Tailwind e ícones do `lucide-react`;
- testes de unidade: `pnpm vitest run --project unit <caminho>`;
- nunca use `--no-verify` nos commits;
- a numeração das tarefas continua a da etapa anterior.

**Objetivo:** completar a tela de reuniões (busca, renomear, apagar, baixar em `.md` e `.txt`), criar as configurações (meu nome, limpeza automática, backup, diagnóstico) e permitir parar de gravar só uma reunião.

**Pré-requisito:** [etapa 1](2026-11-14-etapa-1-gravacao-completa.md) concluída, incluindo a verificação manual (Tarefa 16).

**Requisitos atendidos:** R3.9, R5.6 a R5.12, seção 4.6, R7.2 a R7.4, R8.5.

**Mudança nas restrições:** a partir da Tarefa 23, o manifest passa a ter também a permissão `alarms`.

---

Só comece depois que a Tarefa 16 (verificação manual da etapa 1) estiver feita e os problemas encontrados nela estiverem corrigidos.

Antes da primeira tarefa da etapa 2, adicione os componentes do shadcn que ela usa:

```bash
pnpm dlx shadcn@latest add input label checkbox dialog dropdown-menu radio-group
```

Se o CLI perguntar se pode sobrescrever `src/styles/index.css`, responda **não**.

---

### Tarefa 17: busca que ignora acentos e maiúsculas

Atende R5.6, R5.7 e R5.7a (a lógica; a interface vem nas Tarefas 21 e 22).

**Arquivos:**

- Criar: `src/lib/text.ts`, `src/features/meetings/search.ts`
- Teste: `src/lib/text.test.ts`, `src/features/meetings/search.test.ts`

**Interfaces:**

- Consome: `listMeetings`, `getMeeting` (Tarefa 2); `Meeting`.
- Produz:
  - `normalizeText(text: string): string`
  - `type TextPart = { text: string; match: boolean }`
  - `splitHighlight(text: string, query: string): TextPart[]`
  - `countMatches(text: string, query: string): number`
  - `meetingMatches(meeting: Meeting, query: string): boolean`
  - `searchMeetingIds(query: string): Promise<Set<string>>`

**Regras:**

- `normalizeText`: `text.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()`.
- `splitHighlight`: divide `text` em pedaços, marcando os que casam com `query`. A comparação usa o texto normalizado, mas os pedaços devolvidos são do texto **original**. Consulta vazia (depois do `trim`) ou sem ocorrência devolve um pedaço só, com `match: false`. Nunca devolve pedaço com `text` vazio.
- `countMatches`: quantidade de pedaços com `match: true`.
- `meetingMatches`: consulta vazia devolve `true`. Senão, devolve `true` se a consulta normalizada aparecer no `title`, no `customTitle`, no `code`, ou no `speaker` ou `text` de alguma fala (todos normalizados).
- `searchMeetingIds`: carrega cada reunião do índice com `getMeeting` e devolve os ids das que casam.

`splitHighlight` precisa de um mapa entre as posições do texto normalizado e as do original, porque normalizar muda o tamanho do texto. Use este código:

```ts
function normalizeWithMap(text: string): { normalized: string; map: number[] } {
  let normalized = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    for (const ch of normalizeText(text[i])) {
      normalized += ch
      map.push(i)
    }
  }
  return { normalized, map }
}

export function splitHighlight(text: string, query: string): TextPart[] {
  const needle = normalizeText(query.trim())
  if (!needle) return [{ text, match: false }]

  const { normalized, map } = normalizeWithMap(text)
  const parts: TextPart[] = []
  let cursor = 0
  let from = 0
  while (true) {
    const index = normalized.indexOf(needle, from)
    if (index === -1) break
    const start = map[index]
    let end = map[index + needle.length - 1] + 1
    // Inclui acentos soltos (texto decomposto) que vêm logo depois do trecho.
    while (end < text.length && /\p{M}/u.test(text[end])) end++
    if (start > cursor)
      parts.push({ text: text.slice(cursor, start), match: false })
    parts.push({ text: text.slice(start, end), match: true })
    cursor = end
    from = index + needle.length
  }
  if (cursor < text.length)
    parts.push({ text: text.slice(cursor), match: false })
  return parts.length > 0 ? parts : [{ text, match: false }]
}
```

- [ ] **Passo 1: escrever os testes** (`src/features/meetings/search.test.ts`)

```ts
import { describe, expect, test } from 'vitest'
import { saveMeeting } from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import {
  countMatches,
  meetingMatches,
  searchMeetingIds,
  splitHighlight,
} from './search'

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm1',
    code: 'abc-defg-hij',
    title: 'Daily do time',
    startedAt: 1000,
    sessions: [{ startedAt: 1000, endedAt: 2000 }],
    utterances: [
      {
        id: 'u1',
        speaker: 'João',
        startedAt: 1100,
        text: 'A reunião é na sexta',
        final: true,
      },
    ],
    ...overrides,
  }
}

describe('splitHighlight', () => {
  test('ignora acentos e maiúsculas, devolvendo o texto original', () => {
    expect(splitHighlight('Reunião de sexta', 'reuniao')).toEqual([
      { text: 'Reunião', match: true },
      { text: ' de sexta', match: false },
    ])
  })

  test('marca todas as ocorrências', () => {
    expect(splitHighlight('a sexta e a SEXTA', 'sexta')).toEqual([
      { text: 'a ', match: false },
      { text: 'sexta', match: true },
      { text: ' e a ', match: false },
      { text: 'SEXTA', match: true },
    ])
    expect(countMatches('a sexta e a SEXTA', 'sexta')).toBe(2)
  })

  test('consulta vazia ou sem ocorrência devolve o texto inteiro sem marca', () => {
    expect(splitHighlight('bom dia', '  ')).toEqual([
      { text: 'bom dia', match: false },
    ])
    expect(splitHighlight('bom dia', 'xyz')).toEqual([
      { text: 'bom dia', match: false },
    ])
    expect(countMatches('bom dia', 'xyz')).toBe(0)
  })
})

describe('meetingMatches', () => {
  test.each([
    ['', true],
    ['daily', true],
    ['joao', true],
    ['REUNIAO', true],
    ['abc-defg', true],
    ['inexistente', false],
  ])('consulta %j -> %s', (query, expected) => {
    expect(meetingMatches(meeting(), query)).toBe(expected)
  })

  test('procura também no título que eu dei', () => {
    expect(
      meetingMatches(meeting({ customTitle: 'Planejamento' }), 'planeja')
    ).toBe(true)
  })
})

describe('searchMeetingIds', () => {
  test('devolve os ids das reuniões que casam', async () => {
    await saveMeeting(meeting({ id: 'a' }))
    await saveMeeting(meeting({ id: 'b', title: 'Outra', utterances: [] }))
    expect(await searchMeetingIds('sexta')).toEqual(new Set(['a']))
  })
})
```

`src/lib/text.test.ts`:

```ts
import { expect, test } from 'vitest'
import { normalizeText } from './text'

test('normalizeText tira acentos e maiúsculas', () => {
  expect(normalizeText('Reunião À TARDE')).toBe('reuniao a tarde')
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/lib/text.test.ts src/features/meetings/search.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar** `text.ts` e `search.ts` seguindo as regras e o código acima.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/lib/text.test.ts src/features/meetings/search.test.ts`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/lib/text.ts src/lib/text.test.ts src/features/meetings/search.ts src/features/meetings/search.test.ts
git commit -m "feat: add accent-insensitive search for meetings"
```

---

### Tarefa 18: itens da transcrição, meu nome e destaque da busca

Atende R7.3 (a lógica) e prepara R5.7 e a exportação. Refatora os componentes de transcrição da Tarefa 13 sem mudar o que eles mostram hoje.

**Arquivos:**

- Criar: `src/lib/speaker.ts`, `src/components/transcript/transcript-items.ts`
- Modificar: `src/components/transcript/utterance-item.tsx`, `src/components/transcript/transcript-view.tsx`
- Teste: `src/lib/speaker.test.ts`, `src/components/transcript/transcript-items.test.ts`; acrescentar testes em `src/components/transcript/transcript-view.test.tsx`

**Interfaces:**

- Consome: `normalizeText`, `splitHighlight` (Tarefa 17).
- Produz:
  - `displaySpeaker(speaker: string, myName: string): string`
  - `participantsOf(utterances: Utterance[], myName: string): string[]`
  - `type TranscriptItem = { kind: 'utterance'; utterance: Utterance } | { kind: 'marker'; leftAt: number; returnedAt: number }`
  - `buildTranscriptItems(utterances: Utterance[], sessions: Session[]): TranscriptItem[]`
  - `<UtteranceItem utterance myName? highlight? />`
  - `<TranscriptView utterances sessions myName? highlight? />`

**Regras:**

- `displaySpeaker`: se `myName.trim()` não for vazio e `normalizeText(speaker.trim())` for `'voce'` ou `'you'`, devolve `myName.trim()`. Senão, devolve `speaker`.
- `participantsOf`: nomes de exibição (`displaySpeaker`) únicos e não vazios, na ordem em que aparecem.
- `buildTranscriptItems`: mesma regra de marcação da Tarefa 13. Para cada sessão `i > 0`, um item `marker` com `leftAt = sessions[i-1].endedAt` e `returnedAt = sessions[i].startedAt` entra antes da primeira fala com `startedAt >= sessions[i].startedAt`. Se não houver fala posterior, o marcador vai no fim.
- `TranscriptView` passa a usar `buildTranscriptItems` e repassa `myName` e `highlight` para cada `UtteranceItem`.
- `UtteranceItem`:
  - o nome mostrado é `displaySpeaker(u.speaker, myName ?? '')`;
  - o texto é renderizado com `splitHighlight(u.text, highlight ?? '')`. Pedaços com `match: true` vão dentro de `<mark className="rounded-sm bg-yellow-500/40 text-foreground">`. Os outros são texto puro dentro do mesmo `<span>` de antes. Sem `highlight`, o HTML fica igual ao da Tarefa 13.

- [ ] **Passo 1: escrever os testes**

`src/lib/speaker.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import type { Utterance } from '@/shared/types'
import { displaySpeaker, participantsOf } from './speaker'

const u = (speaker: string): Utterance => ({
  id: speaker,
  speaker,
  startedAt: 0,
  text: 'x',
  final: true,
})

describe('displaySpeaker', () => {
  test.each([
    ['Você', 'Maria', 'Maria'],
    ['You', 'Maria', 'Maria'],
    ['você', ' Maria ', 'Maria'],
    ['Pedro', 'Maria', 'Pedro'],
    ['Você', '', 'Você'],
    ['Você', '   ', 'Você'],
  ])('%s com meu nome %j -> %s', (speaker, myName, expected) => {
    expect(displaySpeaker(speaker, myName)).toBe(expected)
  })
})

test('participantsOf devolve nomes únicos na ordem em que aparecem', () => {
  expect(
    participantsOf(
      [u('Pedro'), u('Você'), u(''), u('Pedro'), u('You')],
      'Maria'
    )
  ).toEqual(['Pedro', 'Maria'])
})
```

`src/components/transcript/transcript-items.test.ts`:

```ts
import { expect, test } from 'vitest'
import type { Utterance } from '@/shared/types'
import { buildTranscriptItems } from './transcript-items'

const u = (id: string, startedAt: number): Utterance => ({
  id,
  speaker: 'Ana',
  startedAt,
  text: id,
  final: true,
})

test('sem sessões extras não há marcador', () => {
  const items = buildTranscriptItems(
    [u('a', 10)],
    [{ startedAt: 0, endedAt: 100 }]
  )
  expect(items.map((i) => i.kind)).toEqual(['utterance'])
})

test('marcador entra antes da primeira fala da sessão seguinte', () => {
  const items = buildTranscriptItems(
    [u('a', 10), u('b', 210)],
    [
      { startedAt: 0, endedAt: 100 },
      { startedAt: 200, endedAt: 300 },
    ]
  )
  expect(items).toEqual([
    { kind: 'utterance', utterance: u('a', 10) },
    { kind: 'marker', leftAt: 100, returnedAt: 200 },
    { kind: 'utterance', utterance: u('b', 210) },
  ])
})

test('sem fala depois da volta, o marcador vai no fim', () => {
  const items = buildTranscriptItems(
    [u('a', 10)],
    [
      { startedAt: 0, endedAt: 100 },
      { startedAt: 200, endedAt: 300 },
    ]
  )
  expect(items.at(-1)).toEqual({ kind: 'marker', leftAt: 100, returnedAt: 200 })
})
```

Acrescente em `src/components/transcript/transcript-view.test.tsx`, dentro do `describe` existente:

```tsx
test('mostra meu nome no lugar de Você', () => {
  render(
    <TranscriptView
      utterances={[u('1', '2026-11-14T10:02:00-03:00', 'Você', 'oi')]}
      sessions={[]}
      myName="Maria"
    />
  )
  expect(screen.getByText('Maria:')).toBeInTheDocument()
  expect(screen.queryByText('Você:')).not.toBeInTheDocument()
})

test('destaca o termo buscado', () => {
  const { container } = render(
    <TranscriptView
      utterances={[
        u('1', '2026-11-14T10:02:00-03:00', 'Ana', 'a reunião é na sexta'),
      ]}
      sessions={[]}
      highlight="reuniao"
    />
  )
  const marks = container.querySelectorAll('mark')
  expect(marks).toHaveLength(1)
  expect(marks[0]).toHaveTextContent('reunião')
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/lib/speaker.test.ts src/components/transcript`
Esperado: FAIL nos testes novos.

- [ ] **Passo 3: implementar** os dois arquivos novos e modificar os dois componentes.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/lib/speaker.test.ts src/components/transcript`
Esperado: PASS, incluindo os testes antigos da Tarefa 13.

- [ ] **Passo 5: commit**

```bash
git add src/lib/speaker.ts src/lib/speaker.test.ts src/components/transcript
git commit -m "feat: add my-name replacement and search highlight to transcripts"
```

---

### Tarefa 19: exportação em `.md` e `.txt`

Atende a seção 4.6 inteira (R6.1 a R6.5).

**Arquivos:**

- Criar: `src/features/meetings/export.ts`
- Modificar: `src/lib/format.ts` (duas funções novas)
- Teste: `src/features/meetings/export.test.ts`; acrescentar em `src/lib/format.test.ts`

**Interfaces:**

- Consome: `buildTranscriptItems`, `displaySpeaker`, `participantsOf` (Tarefa 18); `displayTitle`, `formatTime` (Tarefa 13).
- Produz:
  - em `format.ts`: `formatDate(ms: number): string` (`"14/11/2026"`) e `formatIsoDate(ms: number): string` (`"2026-11-14"`), as duas no fuso local, montadas com `padStart` como as outras
  - `type ExportFormat = 'md' | 'txt'`
  - `buildExport(meeting: Meeting, format: ExportFormat, myName: string): string`
  - `exportFilename(meeting: Meeting, format: ExportFormat): string`

**Formato exato do `.md`** (blocos separados por uma linha em branco, arquivo termina com uma quebra de linha):

```text
# Daily do time

- **Data:** 14/11/2026
- **Horário:** 10:00–14:30
- **Participantes:** Pedro, Ana

**10:02 Pedro:** bom dia

_Saiu às 10:20 · voltou às 14:05_

**14:06 Ana:** boa tarde
```

**Formato exato do `.txt`:**

```text
Daily do time
Data: 14/11/2026
Horário: 10:00–14:30
Participantes: Pedro, Ana

10:02 Pedro: bom dia

--- Saiu às 10:20 · voltou às 14:05 ---

14:06 Ana: boa tarde
```

**Regras:**

- Título: `displayTitle(meeting)`.
- Horário: `formatTime(meeting.startedAt)`, o caractere `–` (travessão curto, U+2013) e `formatTime` do `endedAt` da última sessão.
- A linha de participantes é omitida se `participantsOf` devolver lista vazia.
- Fala sem nome: `.md` fica `**10:02** texto`; `.txt` fica `10:02 texto`.
- O nome de cada fala passa por `displaySpeaker(speaker, myName)`.
- `exportFilename`: `` `${formatIsoDate(meeting.startedAt)} ${título limpo}.${format}` ``. Para limpar o título: remover os caracteres `\ / : * ? " < > |` e os de controle (`/[\\/:*?"<>|\u0000-\u001f]/g`), trocar sequências de espaços por um espaço, `trim()` e cortar em 100 caracteres. Se sobrar vazio, usar `Reunião`.

- [ ] **Passo 1: escrever os testes**

```ts
import { describe, expect, test } from 'vitest'
import type { Meeting } from '@/shared/types'
import { buildExport, exportFilename } from './export'

const at = (iso: string) => new Date(iso).getTime()

const meeting: Meeting = {
  id: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily do time',
  startedAt: at('2026-11-14T10:00:00-03:00'),
  sessions: [
    {
      startedAt: at('2026-11-14T10:00:00-03:00'),
      endedAt: at('2026-11-14T10:20:00-03:00'),
    },
    {
      startedAt: at('2026-11-14T14:05:00-03:00'),
      endedAt: at('2026-11-14T14:30:00-03:00'),
    },
  ],
  utterances: [
    {
      id: 'u1',
      speaker: 'Pedro',
      startedAt: at('2026-11-14T10:02:00-03:00'),
      text: 'bom dia',
      final: true,
    },
    {
      id: 'u2',
      speaker: 'Ana',
      startedAt: at('2026-11-14T14:06:00-03:00'),
      text: 'boa tarde',
      final: true,
    },
  ],
}

describe('buildExport', () => {
  test('markdown', () => {
    expect(buildExport(meeting, 'md', '')).toBe(
      [
        '# Daily do time',
        '',
        '- **Data:** 14/11/2026',
        '- **Horário:** 10:00–14:30',
        '- **Participantes:** Pedro, Ana',
        '',
        '**10:02 Pedro:** bom dia',
        '',
        '_Saiu às 10:20 · voltou às 14:05_',
        '',
        '**14:06 Ana:** boa tarde',
        '',
      ].join('\n')
    )
  })

  test('texto puro', () => {
    expect(buildExport(meeting, 'txt', '')).toBe(
      [
        'Daily do time',
        'Data: 14/11/2026',
        'Horário: 10:00–14:30',
        'Participantes: Pedro, Ana',
        '',
        '10:02 Pedro: bom dia',
        '',
        '--- Saiu às 10:20 · voltou às 14:05 ---',
        '',
        '14:06 Ana: boa tarde',
        '',
      ].join('\n')
    )
  })

  test('usa meu nome e trata fala sem nome', () => {
    const m: Meeting = {
      ...meeting,
      sessions: [meeting.sessions[0]],
      utterances: [
        {
          id: 'u1',
          speaker: 'Você',
          startedAt: at('2026-11-14T10:02:00-03:00'),
          text: 'oi',
          final: true,
        },
        {
          id: 'u2',
          speaker: '',
          startedAt: at('2026-11-14T10:03:00-03:00'),
          text: 'sem nome',
          final: true,
        },
      ],
    }
    const md = buildExport(m, 'md', 'Maria')
    expect(md).toContain('- **Participantes:** Maria')
    expect(md).toContain('**10:02 Maria:** oi')
    expect(md).toContain('**10:03** sem nome')
    expect(buildExport(m, 'txt', 'Maria')).toContain('10:03 sem nome')
  })

  test('sem participantes, omite a linha', () => {
    const m: Meeting = { ...meeting, utterances: [] }
    expect(buildExport(m, 'txt', '')).not.toContain('Participantes')
  })
})

describe('exportFilename', () => {
  test('data e título', () => {
    expect(exportFilename(meeting, 'md')).toBe('2026-11-14 Daily do time.md')
  })

  test('remove caracteres inválidos e usa o título que eu dei', () => {
    expect(
      exportFilename(
        { ...meeting, customTitle: 'Plano: Q1/Q2  "final"?' },
        'txt'
      )
    ).toBe('2026-11-14 Plano Q1Q2 final.txt')
  })

  test('título vazio depois de limpar vira Reunião', () => {
    expect(exportFilename({ ...meeting, customTitle: '???' }, 'md')).toBe(
      '2026-11-14 Reunião.md'
    )
  })
})
```

Acrescente em `src/lib/format.test.ts` (e importe as duas funções):

```ts
test('formatDate e formatIsoDate', () => {
  expect(formatDate(at('2026-11-04T10:02:00-03:00'))).toBe('04/11/2026')
  expect(formatIsoDate(at('2026-11-04T10:02:00-03:00'))).toBe('2026-11-04')
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/meetings/export.test.ts src/lib/format.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar.** Monte uma lista de blocos (cabeçalho, cada fala, cada marcador), junte com `'\n\n'` e termine com `'\n'`. No `.txt`, as quatro linhas do cabeçalho formam um bloco só.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/meetings/export.test.ts src/lib/format.test.ts`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/meetings/export.ts src/features/meetings/export.test.ts src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: export meetings as markdown and plain text"
```

---

### Tarefa 20: renomear e apagar no storage

Atende a parte de dados de R5.8, R5.9, R5.9a e R8.5. Inclui a correção para o título que eu dei não ser sobrescrito pela gravação em andamento.

**Arquivos:**

- Modificar: `src/shared/storage.ts`, `src/features/recording/recorder.ts`
- Teste: acrescentar em `src/shared/storage.test.ts` e `src/features/recording/recorder.test.ts`

**Interfaces:**

- Produz, em `storage.ts`:
  - `renameMeeting(id: string, customTitle: string): Promise<void>`
  - `deleteMeetings(ids: string[]): Promise<void>`
  - `deleteDiagnostics(meetingId: string): Promise<void>`

**Regras:**

- `renameMeeting`: lê a reunião. Se não existir, não faz nada. Com `customTitle.trim()` vazio, remove o campo `customTitle` (volta a valer o título do Meet). Senão, grava o valor com `trim()`. Salva com `saveMeeting`.
- `deleteMeetings`: lê o índice **uma vez**, grava o índice sem os ids e remove, numa chamada só, as chaves `meeting:<id>` e `diagnostics:<id>` de todos. Lista vazia não faz nada.
- `deleteMeeting(id)` passa a ser `return deleteMeetings([id])`.
- `deleteDiagnostics`: remove a chave `diagnostics:<meetingId>`.
- **Recorder:** dentro de `persist(m)`, logo antes do `saveMeeting`, leia a versão guardada e preserve o título que eu dei. Sem isso, o salvamento seguinte da reunião em andamento apagaria um renomear feito na tela:

```ts
const stored = await getMeeting(m.id)
if (stored?.customTitle) m.customTitle = stored.customTitle
else delete m.customTitle
```

- [ ] **Passo 1: escrever os testes**

Acrescente em `src/shared/storage.test.ts` (importe as três funções novas):

```ts
describe('renomear e apagar', () => {
  test('renameMeeting grava o título, e vazio volta ao título do Meet', async () => {
    await saveMeeting(meeting())
    await renameMeeting('abc-defg-hij_1000', '  Planejamento  ')
    expect((await getMeeting('abc-defg-hij_1000'))?.customTitle).toBe(
      'Planejamento'
    )
    expect((await listMeetings())[0].customTitle).toBe('Planejamento')
    await renameMeeting('abc-defg-hij_1000', '   ')
    expect((await getMeeting('abc-defg-hij_1000'))?.customTitle).toBeUndefined()
  })

  test('renameMeeting ignora reunião que não existe', async () => {
    await renameMeeting('nao-existe', 'x')
    expect(await listMeetings()).toEqual([])
  })

  test('deleteMeetings apaga várias de uma vez, com os diagnósticos', async () => {
    await saveMeeting(meeting({ id: 'a' }))
    await saveMeeting(meeting({ id: 'b' }))
    await saveMeeting(meeting({ id: 'c' }))
    await saveDiagnostics({ ...diagLog(), meetingId: 'a' })
    await deleteMeetings(['a', 'b'])
    expect((await listMeetings()).map((m) => m.id)).toEqual(['c'])
    expect(await getMeeting('a')).toBeUndefined()
    expect(await getDiagnostics('a')).toBeUndefined()
  })

  test('deleteDiagnostics apaga só o diagnóstico', async () => {
    await saveMeeting(meeting())
    await saveDiagnostics(diagLog())
    await deleteDiagnostics('abc-defg-hij_1000')
    expect(await getDiagnostics('abc-defg-hij_1000')).toBeUndefined()
    expect(await getMeeting('abc-defg-hij_1000')).toBeDefined()
  })
})
```

Acrescente em `src/features/recording/recorder.test.ts` (importe `renameMeeting`):

```ts
test('o título que eu dei sobrevive aos salvamentos da gravação', async () => {
  const recorder = createRecorder()
  await recorder.join(CODE, 'Daily')
  recorder.observe(blocks('oi'), 'on', null)
  await vi.advanceTimersByTimeAsync(1_000)
  const [summary] = await listMeetings()
  await renameMeeting(summary.id, 'Meu título')
  recorder.observe(blocks('oi pessoal'), 'on', null)
  await vi.advanceTimersByTimeAsync(2_000)
  const saved = await getMeeting(summary.id)
  expect(saved?.customTitle).toBe('Meu título')
  expect(saved?.utterances[0].text).toBe('oi pessoal')
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/shared/storage.test.ts src/features/recording/recorder.test.ts`
Esperado: FAIL nos testes novos.

- [ ] **Passo 3: implementar.**

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/shared src/features/recording`
Esperado: PASS em tudo, incluindo os testes antigos.

- [ ] **Passo 5: commit**

```bash
git add src/shared/storage.ts src/shared/storage.test.ts src/features/recording/recorder.ts src/features/recording/recorder.test.ts
git commit -m "feat: rename and bulk delete meetings in storage"
```

---

### Tarefa 21: tela da reunião completa (renomear, apagar, baixar, buscar)

Atende R5.4, R5.7, R5.8, R5.9, R5.9c e R5.10 na interface.

**Arquivos:**

- Reescrever: `src/features/meetings/meeting-detail.tsx`
- Teste: `src/features/meetings/meeting-detail.test.tsx`

**Interfaces:**

- Consome: `summarizeMeeting` (Tarefa 2); `TranscriptView`, `participantsOf` (Tarefa 18); `countMatches` (Tarefa 17); `displayTitle`, `formatDate`, `formatTime`, `formatDuration`; componentes shadcn `Input`, `Button`, `DropdownMenu`, `AlertDialog`.
- Produz:

```ts
type MeetingDetailProps = {
  meeting: Meeting
  isLive: boolean
  myName: string
  initialQuery?: string
  onRename: (title: string) => void | Promise<void>
  onDelete: () => void | Promise<void>
  onDownload: (format: ExportFormat) => void
}
```

**O que aparece, de cima para baixo:**

1. **Título** (`displayTitle(meeting)`) num `<h2>`, com um botão de ícone `Pencil` e `aria-label="Renomear reunião"`.
   - Clicar troca o título por um `Input` com `aria-label="Título da reunião"`, já preenchido, e os botões `Salvar` e `Cancelar`.
   - `Enter` ou `Salvar` chama `onRename(valor)` e sai do modo de edição. `Esc` ou `Cancelar` sai sem chamar nada.
2. **Linha de dados:** `{formatDate(startedAt)} · {formatTime(startedAt)}–{formatTime(fim da última sessão)} · {formatDuration(summarizeMeeting(meeting).durationMs)}`.
3. **Participantes:** `Participantes: {participantsOf(meeting.utterances, myName).join(', ')}`. Omitir se a lista for vazia.
4. **Ações**, à direita:
   - `DropdownMenu` com o botão `Baixar` (ícone `Download`) e os itens `Markdown (.md)` e `Texto (.txt)`, que chamam `onDownload('md')` e `onDownload('txt')`.
   - Botão de ícone `Trash2` com `aria-label="Apagar reunião"`. Com `isLive`, fica `disabled` e com `title="A reunião em gravação não pode ser apagada"`.
   - Clicar em apagar abre um `AlertDialog`: título `Apagar esta reunião?`, descrição `"{título}" será apagada para sempre. Não dá para desfazer.`, botões `Cancelar` e `Apagar` (variante `destructive`). `Apagar` chama `onDelete()`.
5. **Busca na reunião:** `Input` com `aria-label="Buscar nesta reunião"` e `placeholder="Buscar nesta reunião"`, começando com `initialQuery ?? ''`. Ao lado, quando a busca não está vazia, a contagem (soma de `countMatches` em todas as falas): `Nenhuma ocorrência`, `1 ocorrência` ou `{n} ocorrências`.
6. **Transcrição:** `<TranscriptView utterances sessions myName={myName} highlight={busca} />`.

- [ ] **Passo 1: escrever os testes**

```tsx
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
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/meetings/meeting-detail.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: implementar** `meeting-detail.tsx`. O teste `MeetingsApp` da Tarefa 15 vai quebrar por causa das props novas. Ele é consertado na Tarefa 22. Por enquanto, em `meetings-app.tsx`, passe `isLive`, `myName=""` e funções vazias para o projeto compilar.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/meetings`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/meetings src/components/ui package.json pnpm-lock.yaml
git commit -m "feat: rename, delete, download and search inside a meeting"
```

---

### Tarefa 22: lista completa (busca geral, apagar várias, apagar antigas)

Atende R5.6, R5.9a, R5.9b e R5.9c, e liga tudo na página.

**Arquivos:**

- Criar: `src/features/meetings/bulk-delete.ts`, `src/features/meetings/delete-before-dialog.tsx`
- Modificar: `src/features/meetings/meeting-list.tsx`, `src/features/meetings/meetings-app.tsx`
- Teste: `src/features/meetings/bulk-delete.test.ts`; atualizar `meeting-list.test.tsx` e `meetings-app.test.tsx`

**Interfaces:**

- Consome: `searchMeetingIds` (Tarefa 17); `renameMeeting`, `deleteMeetings` (Tarefa 20); `buildExport`, `exportFilename` (Tarefa 19); `downloadTextFile`; `useSettings`, `useLiveStatus`.
- Produz:
  - `pluralMeetings(n: number): string`: `"1 reunião"` ou `"{n} reuniões"`
  - `idsBefore(summaries: MeetingSummary[], dateIso: string, liveMeetingId: string | null): string[]`
  - `<DeleteBeforeDialog meetings liveMeetingId onDelete />`
  - `MeetingList` ganha as props `selection: Set<string>` e `onToggleSelect: (id: string) => void`

**Regras:**

- `idsBefore`: `dateIso` vem de um `<input type="date">` (`"2026-11-14"`). Converta para a meia-noite **local** com `new Date(ano, mês - 1, dia).getTime()`. Devolve os ids com `startedAt` menor que esse valor, **sem** o `liveMeetingId`. `dateIso` vazio ou inválido devolve `[]`.
- `MeetingList`: cada item ganha um `Checkbox` com `aria-label={`Selecionar ${título}`}`. O da reunião ao vivo fica `disabled`. O checkbox fica **fora** do `<button>` do item (irmão dele), para não aninhar elementos clicáveis.
- `DeleteBeforeDialog`:
  - botão `Apagar antigas…` abre um `Dialog` com o título `Apagar reuniões antigas`;
  - um `<Input type="date">` com o `Label` `Apagar reuniões anteriores a`;
  - com data escolhida, o texto `{pluralMeetings(n)} serão apagadas para sempre.` (com `n = 1`: `1 reunião será apagada para sempre.`; com `n = 0`: `Nenhuma reunião anterior a essa data.`);
  - botões `Cancelar` e `Apagar` (variante `destructive`, `disabled` com `n = 0`). `Apagar` chama `onDelete(ids)` e fecha.
- `MeetingsApp`:
  - no topo da coluna esquerda, `Input` com `aria-label="Buscar em todas as reuniões"` e o mesmo `placeholder`. Com texto, a lista mostra só as reuniões cujo id está em `searchMeetingIds(texto)`. Espere 200 ms depois da última tecla antes de buscar. Sem resultado: `Nenhuma reunião encontrada.`;
  - com seleção não vazia, aparece o botão `Apagar selecionadas ({n})`. Ele abre um `AlertDialog`: título `Apagar {pluralMeetings(n)}?`, descrição `Elas serão apagadas para sempre. Não dá para desfazer.`, botões `Cancelar` e `Apagar`. Confirmar chama `deleteMeetings`, limpa a seleção e, se a reunião aberta foi apagada, abre a primeira da lista;
  - `DeleteBeforeDialog` sempre visível, usando `deleteMeetings`;
  - `MeetingDetail` recebe: `key={meeting.id}`, `isLive={meeting.id === live?.meetingId}`, `myName={settings.myName}`, `initialQuery={busca geral}`, `onRename={(t) => renameMeeting(meeting.id, t)}`, `onDelete={() => deleteMeetings([meeting.id])}`, `onDownload={(f) => downloadTextFile(exportFilename(meeting, f), buildExport(meeting, f, settings.myName), f === 'md' ? 'text/markdown' : 'text/plain')}`.

- [ ] **Passo 1: escrever os testes**

`src/features/meetings/bulk-delete.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import type { MeetingSummary } from '@/shared/types'
import { idsBefore, pluralMeetings } from './bulk-delete'

const at = (iso: string) => new Date(iso).getTime()
const s = (id: string, iso: string): MeetingSummary => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: at(iso),
  endedAt: at(iso),
  durationMs: 0,
  utteranceCount: 1,
})

const list = [
  s('novembro-14', '2026-11-14T10:00:00-03:00'),
  s('novembro-13-noite', '2026-11-13T23:59:00-03:00'),
  s('novembro-10', '2026-11-10T10:00:00-03:00'),
]

describe('idsBefore', () => {
  test('usa a meia-noite local da data escolhida', () => {
    expect(idsBefore(list, '2026-11-14', null)).toEqual([
      'novembro-13-noite',
      'novembro-10',
    ])
  })

  test('nunca inclui a reunião ao vivo', () => {
    expect(idsBefore(list, '2026-11-14', 'novembro-10')).toEqual([
      'novembro-13-noite',
    ])
  })

  test('data vazia ou inválida não apaga nada', () => {
    expect(idsBefore(list, '', null)).toEqual([])
    expect(idsBefore(list, 'abc', null)).toEqual([])
  })
})

test('pluralMeetings', () => {
  expect(pluralMeetings(1)).toBe('1 reunião')
  expect(pluralMeetings(3)).toBe('3 reuniões')
})
```

Em `meeting-list.test.tsx`, passe `selection={new Set()}` e `onToggleSelect={() => {}}` nos testes existentes e acrescente:

```tsx
test('marcar uma reunião e não permitir marcar a que está ao vivo', async () => {
  const onToggleSelect = vi.fn()
  render(
    <MeetingList
      meetings={meetings}
      selectedId="b"
      liveMeetingId="b"
      selection={new Set()}
      onSelect={() => {}}
      onToggleSelect={onToggleSelect}
    />
  )
  expect(
    screen.getByRole('checkbox', { name: 'Selecionar Daily do time' })
  ).toBeDisabled()
  await userEvent
    .setup()
    .click(screen.getByRole('checkbox', { name: 'Selecionar Reunião antiga' }))
  expect(onToggleSelect).toHaveBeenCalledWith('a')
})
```

Acrescente em `meetings-app.test.tsx` (importe `listMeetings`, `getMeeting`, `userEvent`, `waitFor`):

```tsx
async function seed() {
  const base = {
    code: 'abc-defg-hij',
    sessions: [
      {
        startedAt: at('2026-11-14T10:00:00-03:00'),
        endedAt: at('2026-11-14T10:32:00-03:00'),
      },
    ],
  }
  await saveMeeting({
    ...base,
    id: 'm1',
    title: 'Daily do time',
    startedAt: at('2026-11-14T10:00:00-03:00'),
    utterances: [
      {
        id: 'u1',
        speaker: 'Pedro',
        startedAt: at('2026-11-14T10:02:00-03:00'),
        text: 'deploy na sexta',
        final: true,
      },
    ],
  })
  await saveMeeting({
    ...base,
    id: 'm2',
    title: 'Planejamento',
    startedAt: at('2026-11-10T10:00:00-03:00'),
    utterances: [
      {
        id: 'u2',
        speaker: 'Ana',
        startedAt: at('2026-11-10T10:02:00-03:00'),
        text: 'metas do trimestre',
        final: true,
      },
    ],
  })
}

test('a busca geral filtra a lista', async () => {
  await seed()
  render(<MeetingsApp />)
  const user = userEvent.setup()
  await screen.findByRole('button', { name: /Planejamento/ })
  await user.type(
    screen.getByRole('textbox', { name: 'Buscar em todas as reuniões' }),
    'trimestre'
  )
  await waitFor(() => {
    expect(
      screen.queryByRole('button', { name: /Daily do time/ })
    ).not.toBeInTheDocument()
  })
  expect(
    screen.getByRole('button', { name: /Planejamento/ })
  ).toBeInTheDocument()
})

test('apagar as reuniões selecionadas', async () => {
  await seed()
  render(<MeetingsApp />)
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('checkbox', { name: 'Selecionar Daily do time' })
  )
  await user.click(
    screen.getByRole('checkbox', { name: 'Selecionar Planejamento' })
  )
  await user.click(
    screen.getByRole('button', { name: 'Apagar selecionadas (2)' })
  )
  expect(screen.getByText('Apagar 2 reuniões?')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Apagar' }))
  await waitFor(async () => expect(await listMeetings()).toEqual([]))
})

test('renomear pela tela grava no storage', async () => {
  await seed()
  render(<MeetingsApp />)
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('button', { name: 'Renomear reunião' })
  )
  const input = screen.getByRole('textbox', { name: 'Título da reunião' })
  await user.clear(input)
  await user.type(input, 'Novo nome{Enter}')
  await waitFor(async () =>
    expect((await getMeeting('m1'))?.customTitle).toBe('Novo nome')
  )
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/meetings`
Esperado: FAIL nos testes novos.

- [ ] **Passo 3: implementar.**

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/meetings`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/meetings
git commit -m "feat: global search and bulk delete on the meetings page"
```

---

### Tarefa 23: limpeza automática de reuniões antigas

Atende R7.2 (a lógica e a execução) e a parte da limpeza no R8.5. Esta tarefa adiciona a permissão `alarms`.

**Arquivos:**

- Criar: `src/features/retention/retention.ts`
- Modificar: `src/entries/background.ts`, `public/manifest.json`
- Teste: `src/features/retention/retention.test.ts`

**Interfaces:**

- Consome: `getSettings`, `listMeetings`, `getLiveStatus`, `deleteMeetings`, `listDiagnostics`, `deleteDiagnostics`; `AutoDeleteDays`.
- Produz:
  - `AUTO_DELETE_OPTIONS: readonly AutoDeleteDays[] = [0, 30, 90, 180]`
  - `RETENTION_ALARM = 'retention'`
  - `findExpiredMeetingIds(summaries: MeetingSummary[], days: AutoDeleteDays, now: number, liveMeetingId: string | null): string[]`
  - `runRetention(now: number): Promise<number>`

**Regras:**

- `findExpiredMeetingIds`: com `days === 0`, devolve `[]`. Senão, `corte = now - days * 24 * 60 * 60 * 1000` e devolve os ids com `startedAt < corte`, sem o `liveMeetingId`.
- `runRetention`:
  1. Lê `getSettings()`. Com `autoDeleteDays === 0`, devolve `0`.
  2. Lê `getLiveStatus(now)` e `listMeetings()`. Calcula os ids vencidos e chama `deleteMeetings(ids)`.
  3. Apaga também diagnósticos sem reunião: para cada item de `listDiagnostics()` com `startedAt < corte` e `code` diferente do `live?.code`, chama `deleteDiagnostics`.
  4. Devolve a quantidade de **reuniões** apagadas.
- `manifest.json`: `"permissions": ["storage", "unlimitedStorage", "alarms"]`.
- `background.ts`, acrescentar:

```ts
import { RETENTION_ALARM, runRetention } from '@/features/retention/retention'

function scheduleRetention() {
  void chrome.alarms.create(RETENTION_ALARM, { periodInMinutes: 24 * 60 })
  void runRetention(Date.now())
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RETENTION_ALARM) void runRetention(Date.now())
})
```

e chamar `scheduleRetention()` dentro dos listeners de `onInstalled` e `onStartup` que já existem.

- [ ] **Passo 1: escrever os testes**

```ts
import { describe, expect, test } from 'vitest'
import {
  getDiagnostics,
  listMeetings,
  saveDiagnostics,
  saveMeeting,
  setLiveStatus,
  updateSettings,
} from '@/shared/storage'
import type { Meeting, MeetingSummary } from '@/shared/types'
import { findExpiredMeetingIds, runRetention } from './retention'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-11-14T10:00:00-03:00').getTime()

const s = (id: string, daysAgo: number): MeetingSummary => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: NOW - daysAgo * DAY,
  endedAt: NOW - daysAgo * DAY,
  durationMs: 0,
  utteranceCount: 1,
})

const m = (id: string, daysAgo: number): Meeting => ({
  id,
  code: `cod-${id}`,
  title: id,
  startedAt: NOW - daysAgo * DAY,
  sessions: [{ startedAt: NOW - daysAgo * DAY, endedAt: NOW - daysAgo * DAY }],
  utterances: [
    {
      id: 'u',
      speaker: 'Ana',
      startedAt: NOW - daysAgo * DAY,
      text: 'oi',
      final: true,
    },
  ],
})

describe('findExpiredMeetingIds', () => {
  const list = [s('hoje', 0), s('d29', 29), s('d31', 31), s('d200', 200)]

  test('nunca: não apaga nada', () => {
    expect(findExpiredMeetingIds(list, 0, NOW, null)).toEqual([])
  })

  test('30 dias', () => {
    expect(findExpiredMeetingIds(list, 30, NOW, null)).toEqual(['d31', 'd200'])
  })

  test('180 dias', () => {
    expect(findExpiredMeetingIds(list, 180, NOW, null)).toEqual(['d200'])
  })

  test('nunca apaga a reunião ao vivo', () => {
    expect(findExpiredMeetingIds(list, 30, NOW, 'd200')).toEqual(['d31'])
  })
})

describe('runRetention', () => {
  test('com "nunca", não apaga', async () => {
    await saveMeeting(m('velha', 400))
    expect(await runRetention(NOW)).toBe(0)
    expect(await listMeetings()).toHaveLength(1)
  })

  test('apaga reuniões vencidas e os diagnósticos antigos', async () => {
    await updateSettings({ autoDeleteDays: 90 })
    await saveMeeting(m('nova', 10))
    await saveMeeting(m('velha', 100))
    const log = {
      meetingId: 'orfa',
      code: 'zzz-zzzz-zzz',
      startedAt: NOW - 100 * DAY,
      userAgent: '',
      language: '',
      truncated: false,
      events: [],
    }
    await saveDiagnostics(log)
    await saveDiagnostics({ ...log, meetingId: 'velha' })
    expect(await runRetention(NOW)).toBe(1)
    expect((await listMeetings()).map((x) => x.id)).toEqual(['nova'])
    expect(await getDiagnostics('velha')).toBeUndefined()
    expect(await getDiagnostics('orfa')).toBeUndefined()
  })

  test('não apaga a reunião que está sendo gravada', async () => {
    await updateSettings({ autoDeleteDays: 30 })
    await saveMeeting(m('velha', 100))
    await setLiveStatus({
      meetingId: 'velha',
      code: 'cod-velha',
      title: '',
      since: NOW,
      heartbeatAt: NOW,
      state: 'recording',
      utteranceCount: 1,
      tabToken: 't',
    })
    expect(await runRetention(NOW)).toBe(0)
    expect(await listMeetings()).toHaveLength(1)
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/retention`
Esperado: FAIL.

- [ ] **Passo 3: implementar** `retention.ts`, e modificar `background.ts` e `manifest.json`.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/retention && pnpm build`
Esperado: PASS e build sem erro.

- [ ] **Passo 5: commit**

```bash
git add src/features/retention src/entries/background.ts public/manifest.json
git commit -m "feat: delete old meetings automatically"
```

---

### Tarefa 24: backup (exportar tudo e importar)

Atende R7.4 (a lógica).

**Arquivos:**

- Criar: `src/features/backup/backup.ts`
- Teste: `src/features/backup/backup.test.ts`

**Interfaces:**

- Consome: `listMeetings`, `getMeeting`, `saveMeeting`; `formatIsoDate`.
- Produz:

```ts
export type BackupFile = {
  app: 'meet-captions'
  version: 1
  exportedAt: number
  meetings: Meeting[]
}
export const BACKUP_ERROR = 'Arquivo de backup inválido'
export function buildBackup(now: number): Promise<BackupFile>
export function backupFilename(now: number): string // "meet-captions-backup-2026-11-14.json"
export function parseBackup(json: string): BackupFile // lança Error(BACKUP_ERROR)
export function importBackup(
  file: BackupFile
): Promise<{ imported: number; skipped: number }>
```

**Regras:**

- `buildBackup`: todas as reuniões do índice, lidas com `getMeeting`. Ignora ids que não tiverem reunião guardada.
- `parseBackup`: `JSON.parse` dentro de `try/catch`. É inválido, e lança `new Error(BACKUP_ERROR)`, se:
  - o JSON não puder ser lido;
  - `app !== 'meet-captions'` ou `version !== 1`;
  - `meetings` não for um array;
  - alguma reunião não tiver `id` do tipo string, `startedAt` do tipo number, `sessions` array e `utterances` array.
- `importBackup`: para cada reunião, se `getMeeting(id)` já existir, conta em `skipped` e **não altera** a que existe. Senão, `saveMeeting` e conta em `imported`.

- [ ] **Passo 1: escrever os testes**

```ts
import { describe, expect, test } from 'vitest'
import { getMeeting, listMeetings, saveMeeting } from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import {
  BACKUP_ERROR,
  backupFilename,
  buildBackup,
  importBackup,
  parseBackup,
} from './backup'

const NOW = new Date('2026-11-14T10:00:00-03:00').getTime()

const m = (id: string, text = 'oi'): Meeting => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: 1000,
  sessions: [{ startedAt: 1000, endedAt: 2000 }],
  utterances: [{ id: 'u', speaker: 'Ana', startedAt: 1100, text, final: true }],
})

describe('backup', () => {
  test('exporta todas as reuniões', async () => {
    await saveMeeting(m('a'))
    await saveMeeting(m('b'))
    const backup = await buildBackup(NOW)
    expect(backup).toMatchObject({
      app: 'meet-captions',
      version: 1,
      exportedAt: NOW,
    })
    expect(backup.meetings.map((x) => x.id).sort()).toEqual(['a', 'b'])
  })

  test('nome do arquivo', () => {
    expect(backupFilename(NOW)).toBe('meet-captions-backup-2026-11-14.json')
  })

  test('exportar, apagar tudo e importar traz as reuniões de volta', async () => {
    await saveMeeting(m('a'))
    const json = JSON.stringify(await buildBackup(NOW))
    await chrome.storage.local.clear()
    expect(await importBackup(parseBackup(json))).toEqual({
      imported: 1,
      skipped: 0,
    })
    expect(await getMeeting('a')).toEqual(m('a'))
    expect(await listMeetings()).toHaveLength(1)
  })

  test('importar não duplica nem altera reuniões que já existem', async () => {
    await saveMeeting(m('a', 'versão atual'))
    const file = {
      app: 'meet-captions',
      version: 1,
      exportedAt: NOW,
      meetings: [m('a', 'versão do backup'), m('b')],
    } as const
    expect(
      await importBackup({ ...file, meetings: [...file.meetings] })
    ).toEqual({ imported: 1, skipped: 1 })
    expect((await getMeeting('a'))?.utterances[0].text).toBe('versão atual')
  })

  test.each([
    ['não é json', '{quebrado'],
    ['outro app', JSON.stringify({ app: 'outro', version: 1, meetings: [] })],
    [
      'versão desconhecida',
      JSON.stringify({ app: 'meet-captions', version: 2, meetings: [] }),
    ],
    [
      'meetings não é lista',
      JSON.stringify({ app: 'meet-captions', version: 1, meetings: {} }),
    ],
    [
      'reunião sem id',
      JSON.stringify({
        app: 'meet-captions',
        version: 1,
        meetings: [{ startedAt: 1, sessions: [], utterances: [] }],
      }),
    ],
    [
      'reunião sem falas',
      JSON.stringify({
        app: 'meet-captions',
        version: 1,
        meetings: [{ id: 'a', startedAt: 1, sessions: [] }],
      }),
    ],
  ])('arquivo inválido: %s', (_, json) => {
    expect(() => parseBackup(json)).toThrow(BACKUP_ERROR)
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/backup`
Esperado: FAIL.

- [ ] **Passo 3: implementar.** Em `parseBackup`, trate o resultado do `JSON.parse` como `unknown` e valide campo a campo, sem `any`.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/backup`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/backup
git commit -m "feat: export and import a full backup of meetings"
```

---

### Tarefa 25: tela de configurações

Atende R5.11, R7.1 a R7.4 e R8.5 na interface.

**Arquivos:**

- Criar: `src/features/settings/settings-dialog.tsx`
- Modificar: `src/features/meetings/diagnostics-panel.tsx`, `src/features/meetings/meetings-app.tsx`
- Teste: `src/features/settings/settings-dialog.test.tsx`

**Interfaces:**

- Consome: `useSettings`; `useMeetings`, `useLiveStatus`; `findExpiredMeetingIds`, `runRetention`, `AUTO_DELETE_OPTIONS` (Tarefa 23); `buildBackup`, `backupFilename`, `parseBackup`, `importBackup` (Tarefa 24); `deleteDiagnostics` (Tarefa 20); `pluralMeetings` (Tarefa 22); `downloadTextFile`; `toast` do `sonner`.
- Produz: `<SettingsDialog />`, que não recebe props e inclui o próprio botão de abrir.

**Mudanças nos arquivos existentes:**

- `DiagnosticsPanel` ganha a prop `onDelete: (meetingId: string) => void` e, em cada log, um botão de ícone `Trash2` com `aria-label="Apagar diagnóstico"`.
- `MeetingsApp`: o `DiagnosticsPanel` **sai** da coluna esquerda. No cabeçalho da coluna esquerda, ao lado do título `Reuniões`, entra o `<SettingsDialog />`. Acrescente `<Toaster />` (de `@/components/ui/sonner`) no fim do componente.

**Conteúdo do `SettingsDialog`:**

- Botão de ícone `Settings` (lucide) com `aria-label="Configurações"`, que abre um `Dialog` com o título `Configurações`.
- Quatro seções, cada uma com um `<h3>`:

1. **`Meu nome`**
   - `Input` com `Label` `Meu nome`, começando com `settings.myName`.
   - Texto de ajuda: `Aparece no lugar de "Você" nas transcrições. Deixe vazio para manter como o Meet mostra.`
   - Salva ao sair do campo (`onBlur`): `update({ myName: valor.trim() })`.

2. **`Apagar reuniões antigas automaticamente`**
   - `RadioGroup` com as opções, nesta ordem: `Nunca` (0), `Com mais de 30 dias`, `Com mais de 90 dias`, `Com mais de 180 dias`. A marcada é `settings.autoDeleteDays`.
   - Escolher `Nunca` salva na hora: `update({ autoDeleteDays: 0 })`.
   - Escolher um prazo abre um `AlertDialog` **antes** de salvar. `n = findExpiredMeetingIds(meetings, dias, Date.now(), live?.meetingId ?? null).length`.
     - Título: `Apagar reuniões antigas?`
     - Descrição com `n > 0`: `{pluralMeetings(n)} com mais de {dias} dias serão apagadas agora. Daqui em diante, a limpeza é automática.` (com `n = 1`, use `será apagada`).
     - Descrição com `n = 0`: `Nenhuma reunião será apagada agora. As que passarem de {dias} dias serão apagadas automaticamente.`
     - Botões `Cancelar` e `Confirmar`. `Confirmar` faz `await update({ autoDeleteDays: dias })` e `await runRetention(Date.now())`. `Cancelar` mantém a opção anterior.

3. **`Backup`**
   - Texto: `As reuniões ficam guardadas só nesta extensão. Se você remover a extensão do Chrome, elas são apagadas.`
   - Botão `Exportar tudo`: `downloadTextFile(backupFilename(agora), JSON.stringify(await buildBackup(agora)), 'application/json')`.
   - Botão `Importar backup`, que aciona um `<input type="file" accept="application/json,.json" aria-label="Arquivo de backup" className="hidden">`.
   - Ao escolher o arquivo: `const { imported, skipped } = await importBackup(parseBackup(await file.text()))` e `toast.success(`${pluralMeetings(imported)} importadas, ${skipped} já existiam.`)`. Com `imported === 1`, use `importada`.
   - Se der erro: `toast.error('Arquivo de backup inválido')`.
   - Depois de qualquer resultado, limpe o valor do input, para permitir escolher o mesmo arquivo de novo.

4. **`Modo de diagnóstico`**
   - O `DiagnosticsPanel`, com `enabled={settings.diagnostics}`, `onToggle`, `logs={useDiagnostics()}`, `onDownload` (igual ao da Tarefa 15) e `onDelete={deleteDiagnostics}`.

- [ ] **Passo 1: escrever os testes**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import {
  getMeeting,
  getSettings,
  listMeetings,
  saveMeeting,
} from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import { SettingsDialog } from './settings-dialog'

const DAY = 24 * 60 * 60 * 1000

const m = (id: string, daysAgo: number): Meeting => ({
  id,
  code: 'abc-defg-hij',
  title: id,
  startedAt: Date.now() - daysAgo * DAY,
  sessions: [
    {
      startedAt: Date.now() - daysAgo * DAY,
      endedAt: Date.now() - daysAgo * DAY,
    },
  ],
  utterances: [
    { id: 'u', speaker: 'Ana', startedAt: 1, text: 'oi', final: true },
  ],
})

async function open() {
  const user = userEvent.setup()
  render(<SettingsDialog />)
  await user.click(await screen.findByRole('button', { name: 'Configurações' }))
  return user
}

describe('SettingsDialog', () => {
  test('salva meu nome ao sair do campo', async () => {
    const user = await open()
    await user.type(
      screen.getByRole('textbox', { name: 'Meu nome' }),
      ' Maria '
    )
    await user.tab()
    await waitFor(async () =>
      expect((await getSettings()).myName).toBe('Maria')
    )
  })

  test('escolher um prazo pede confirmação e apaga as antigas', async () => {
    await saveMeeting(m('nova', 1))
    await saveMeeting(m('velha', 100))
    const user = await open()
    await user.click(screen.getByRole('radio', { name: 'Com mais de 30 dias' }))
    expect(
      screen.getByText(
        '1 reunião com mais de 30 dias será apagada agora. Daqui em diante, a limpeza é automática.'
      )
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(async () =>
      expect((await listMeetings()).map((x) => x.id)).toEqual(['nova'])
    )
    expect((await getSettings()).autoDeleteDays).toBe(30)
  })

  test('cancelar não muda a opção nem apaga', async () => {
    await saveMeeting(m('velha', 100))
    const user = await open()
    await user.click(screen.getByRole('radio', { name: 'Com mais de 90 dias' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect((await getSettings()).autoDeleteDays).toBe(0)
    expect(await listMeetings()).toHaveLength(1)
    expect(screen.getByRole('radio', { name: 'Nunca' })).toBeChecked()
  })

  test('importar um backup traz as reuniões', async () => {
    const user = await open()
    const backup = {
      app: 'meet-captions',
      version: 1,
      exportedAt: 1,
      meetings: [m('importada', 5)],
    }
    const file = new File([JSON.stringify(backup)], 'backup.json', {
      type: 'application/json',
    })
    await user.upload(screen.getByLabelText('Arquivo de backup'), file)
    await waitFor(async () =>
      expect(await getMeeting('importada')).toBeDefined()
    )
  })

  test('mostra o aviso sobre remover a extensão', async () => {
    await open()
    expect(
      screen.getByText(
        'As reuniões ficam guardadas só nesta extensão. Se você remover a extensão do Chrome, elas são apagadas.'
      )
    ).toBeInTheDocument()
  })
})
```

Se `file.text()` não existir no jsdom, acrescente em `vitest.setup.ts`:

```ts
if (!File.prototype.text) {
  File.prototype.text = function () {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(this)
    })
  }
}
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/settings`
Esperado: FAIL.

- [ ] **Passo 3: implementar** o `SettingsDialog` e as mudanças no `DiagnosticsPanel` e no `MeetingsApp`.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/settings src/features/meetings`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/settings src/features/meetings vitest.setup.ts
git commit -m "feat: add settings (my name, auto delete, backup, diagnostics)"
```

---

### Tarefa 26: parar de gravar só esta reunião

Atende R3.9 e o botão correspondente do R5.0b.

**Como funciona:** o menu grava no storage que a reunião com aquele código foi parada hoje. O content script vê essa mudança, encerra a gravação e passa a publicar o status ao vivo com `state: 'stopped'`. "Retomar gravação" remove a marca, e o content script volta a gravar como se eu tivesse acabado de entrar.

**Arquivos:**

- Criar: `src/features/extension-toggle/stop-recording.ts`, `src/features/popup/stop-recording-button.tsx`
- Modificar: `src/shared/storage.ts`, `src/features/recording/content-controller.ts`, `src/features/popup/live-status-line.tsx`, `src/features/popup/popup-app.tsx`
- Teste: `src/features/extension-toggle/stop-recording.test.ts`, `src/features/popup/stop-recording-button.test.tsx`; acrescentar em `storage.test.ts`, `content-controller.test.ts` e `live-status-line.test.tsx`

**Interfaces:**

- Produz, em `storage.ts`:
  - `STORAGE_KEYS.stops = 'recordingStops'`
  - `stopRecording(code: string, now: number): Promise<void>`
  - `resumeRecording(code: string): Promise<void>`
  - `getStoppedCodes(now: number): Promise<string[]>`
- Produz, em `stop-recording.ts`:
  - `stopRecordingThisMeeting(options: { code: string; meetingId: string | null; discard: boolean }): Promise<void>`
- Produz: `<StopRecordingButton live onStop onResume />`

**Regras do storage:**

- A chave `recordingStops` guarda `Array<{ code: string; at: number }>`.
- `stopRecording`: remove entradas com o mesmo `code` e as que não são do mesmo dia local de `now` (`sameLocalDay`), e acrescenta `{ code, at: now }`.
- `resumeRecording`: remove as entradas com o `code`.
- `getStoppedCodes(now)`: os `code` das entradas com `sameLocalDay(at, now)`.

**Regras de `stopRecordingThisMeeting`:**

1. `await stopRecording(code, Date.now())`.
2. Espera até `DISABLE_WAIT_MS` (2 s), checando a cada 100 ms, até `(await getLiveStatus())?.state === 'stopped'` ou o status sumir. Isso dá tempo de o content script salvar e parar.
3. Se `discard && meetingId`, chama `await deleteMeeting(meetingId)`.

**Mudanças no controller:**

- Novo estado: `stoppedCodes: string[]` e `lastStoppedPublishAt = 0`.
- Carregue `stoppedCodes` com `getStoppedCodes(deps.now())` junto com as configurações, no `ready`, e de novo a cada mudança de `STORAGE_KEYS.stops` (`onStorageKeysChange`), chamando `run()` em seguida. Cancele a inscrição no `dispose`.
- Função interna:

```ts
async function clearStopped() {
  if (lastStoppedPublishAt === 0) return
  lastStoppedPublishAt = 0
  await clearLiveStatus(deps.tabToken)
}
```

- No `evaluate`:
  - no ramo `if (!settings.enabled)`, chame `await clearStopped()` antes do `return`;
  - logo depois de calcular `code` e `inCall`, **antes** das regras de `leave` e `join`, acrescente:

```ts
const stopped = inCall && code !== null && stoppedCodes.includes(code)
if (stopped) {
  if (recorder.active) await recorder.leave()
  const now = deps.now()
  if (
    lastStoppedPublishAt === 0 ||
    now - lastStoppedPublishAt >= HEARTBEAT_MS
  ) {
    lastStoppedPublishAt = now
    await setLiveStatus({
      meetingId: null,
      code,
      title: getMeetingTitle(deps.doc),
      since: now,
      heartbeatAt: now,
      state: 'stopped',
      utteranceCount: 0,
      tabToken: deps.tabToken,
    })
  }
  return
}
await clearStopped()
```

- No `dispose`, chame `await clearStopped()`.
- Enquanto estiver parada, o controller não chama `autostart.tick` nem `recorder.observe` (o `return` acima garante).

**`LiveStatusLine`:** novo caso, verificado **antes** dos outros estados: `state === 'stopped'` mostra `Gravação parada nesta reunião`.

**`StopRecordingButton`:**

```ts
type StopRecordingButtonProps = {
  live: LiveStatus | undefined
  onStop: (options: { discard: boolean }) => void | Promise<void>
  onResume: () => void | Promise<void>
}
```

- Sem `live`: não renderiza nada.
- `live.state === 'stopped'`: botão `Retomar gravação`, que chama `onResume()`.
- Senão: botão `Parar de gravar esta reunião` (variante `outline`), que abre um `AlertDialog`:
  - com `live.meetingId === null` (nada gravado ainda): título `Parar de gravar esta reunião?`, descrição `A extensão continua ligada para as outras reuniões.`, botões `Cancelar` e `Parar`. `Parar` chama `onStop({ discard: false })`;
  - com gravação: título `O que fazer com o que já foi gravado?`, descrição `"{displayTitle(live)}" já tem {live.utteranceCount} falas gravadas. A extensão continua ligada para as outras reuniões.`, botões `Cancelar`, `Descartar` (variante `destructive`, chama `onStop({ discard: true })`) e `Manter gravação` (chama `onStop({ discard: false })`).

**`PopupApp`:** entre o `LiveStatusLine` e o botão `Abrir reuniões salvas`, só com a extensão ligada: `<StopRecordingButton live={live} onStop={({ discard }) => stopRecordingThisMeeting({ code: live.code, meetingId: live.meetingId, discard })} onResume={() => resumeRecording(live.code)} />`.

- [ ] **Passo 1: escrever os testes**

Acrescente em `storage.test.ts`:

```ts
describe('parar de gravar uma reunião', () => {
  const day1 = new Date('2026-11-14T10:00:00-03:00').getTime()
  const day2 = new Date('2026-11-15T10:00:00-03:00').getTime()

  test('parar e retomar', async () => {
    await stopRecording('abc-defg-hij', day1)
    expect(await getStoppedCodes(day1)).toEqual(['abc-defg-hij'])
    await resumeRecording('abc-defg-hij')
    expect(await getStoppedCodes(day1)).toEqual([])
  })

  test('a parada só vale no mesmo dia', async () => {
    await stopRecording('abc-defg-hij', day1)
    expect(await getStoppedCodes(day2)).toEqual([])
  })

  test('parar de novo não duplica e limpa entradas de outros dias', async () => {
    await stopRecording('aaa-aaaa-aaa', day1)
    await stopRecording('abc-defg-hij', day2)
    await stopRecording('abc-defg-hij', day2)
    const raw = await chrome.storage.local.get('recordingStops')
    expect(raw.recordingStops).toEqual([{ code: 'abc-defg-hij', at: day2 }])
  })
})
```

Acrescente em `content-controller.test.ts` (importe `stopRecording`, `resumeRecording`, `getMeeting`):

```ts
test('parar de gravar esta reunião e depois retomar', async () => {
  goTo('/abc-defg-hij')
  document.body.innerHTML = MEET_IN_CALL_EN
  await start()
  await vi.advanceTimersByTimeAsync(1_500)
  const [summary] = await listMeetings()

  await stopRecording('abc-defg-hij', Date.now())
  await vi.advanceTimersByTimeAsync(200)
  expect((await getLiveStatus())?.state).toBe('stopped')

  document.querySelector('#b2 > div:last-child')!.textContent =
    'isto não é gravado'
  await vi.advanceTimersByTimeAsync(3_000)
  const texts = (await getMeeting(summary.id))?.utterances.map((u) => u.text)
  expect(texts).not.toContain('isto não é gravado')

  await resumeRecording('abc-defg-hij')
  await vi.advanceTimersByTimeAsync(1_500)
  expect((await getLiveStatus())?.state).toBe('recording')
  expect((await getMeeting(summary.id))?.sessions).toHaveLength(2)
})

test('a parada continua valendo depois de recarregar a página', async () => {
  await stopRecording('abc-defg-hij', Date.now())
  goTo('/abc-defg-hij')
  document.body.innerHTML = MEET_IN_CALL_EN
  await start()
  await vi.advanceTimersByTimeAsync(3_000)
  expect(await listMeetings()).toEqual([])
  expect((await getLiveStatus())?.state).toBe('stopped')
})

test('sair da chamada com a gravação parada limpa o status', async () => {
  await stopRecording('abc-defg-hij', Date.now())
  goTo('/abc-defg-hij')
  document.body.innerHTML = MEET_IN_CALL_EN
  await start()
  await vi.advanceTimersByTimeAsync(1_500)
  document.body.innerHTML = '<p>Você saiu da reunião</p>'
  await vi.advanceTimersByTimeAsync(1_500)
  expect(await getLiveStatus()).toBeUndefined()
})
```

`src/features/extension-toggle/stop-recording.test.ts`:

```ts
import { expect, test } from 'vitest'
import {
  getMeeting,
  getStoppedCodes,
  onStorageKeysChange,
  saveMeeting,
  setLiveStatus,
} from '@/shared/storage'
import type { LiveStatus, Meeting } from '@/shared/types'
import { stopRecordingThisMeeting } from './stop-recording'

const meeting: Meeting = {
  id: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily',
  startedAt: Date.now(),
  sessions: [{ startedAt: Date.now(), endedAt: Date.now() }],
  utterances: [
    {
      id: 'u1',
      speaker: 'Ana',
      startedAt: Date.now(),
      text: 'oi',
      final: true,
    },
  ],
}

const live = (
  state: LiveStatus['state'],
  meetingId: string | null
): LiveStatus => ({
  meetingId,
  code: 'abc-defg-hij',
  title: 'Daily',
  since: Date.now(),
  heartbeatAt: Date.now(),
  state,
  utteranceCount: 1,
  tabToken: 'tab-1',
})

async function simulateTab() {
  await saveMeeting(meeting)
  await setLiveStatus(live('recording', 'm1'))
  onStorageKeysChange(['recordingStops'], () => {
    setTimeout(() => void setLiveStatus(live('stopped', null)), 50)
  })
}

test('parar mantendo a gravação', async () => {
  await simulateTab()
  await stopRecordingThisMeeting({
    code: 'abc-defg-hij',
    meetingId: 'm1',
    discard: false,
  })
  expect(await getStoppedCodes(Date.now())).toEqual(['abc-defg-hij'])
  expect(await getMeeting('m1')).toBeDefined()
})

test('parar descartando a gravação', async () => {
  await simulateTab()
  await stopRecordingThisMeeting({
    code: 'abc-defg-hij',
    meetingId: 'm1',
    discard: true,
  })
  expect(await getMeeting('m1')).toBeUndefined()
})
```

`src/features/popup/stop-recording-button.test.tsx`:

```tsx
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
```

Acrescente em `live-status-line.test.tsx`:

```tsx
test('gravação parada', () => {
  render(
    <LiveStatusLine
      live={{ ...base, state: 'stopped', meetingId: null }}
      now={since}
    />
  )
  expect(screen.getByText('Gravação parada nesta reunião')).toBeInTheDocument()
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit`
Esperado: FAIL nos testes novos.

- [ ] **Passo 3: implementar** tudo o que a tarefa lista.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit && pnpm lint && pnpm build`
Esperado: PASS, lint e build sem erro.

- [ ] **Passo 5: commit**

```bash
git add src
git commit -m "feat: stop and resume recording for a single meeting"
```

---

### Tarefa 27: verificação manual da etapa 2

Sem código novo. **Precisa do usuário.** Recarregue a extensão em `chrome://extensions` depois do `pnpm build`.

- [ ] **Roteiro** (anote o resultado de cada item)

1. Na tela de reuniões, buscar `reuniao` encontra reuniões que têm "Reunião" nas falas ou no título.
2. Dentro de uma reunião, a busca destaca as ocorrências e mostra a contagem.
3. Renomear uma reunião, inclusive uma que está sendo gravada: o nome novo continua depois de alguns segundos.
4. Baixar em `.md` e em `.txt`: o arquivo tem o nome `AAAA-MM-DD Título` e o conteúdo com cabeçalho, falas e marcações de saída e volta.
5. Apagar uma reunião; marcar duas e apagar juntas; usar `Apagar antigas…` com uma data.
6. A reunião ao vivo não pode ser marcada nem apagada.
7. Nas configurações: preencher `Meu nome` e conferir que "Você" foi trocado na tela e no arquivo baixado.
8. Escolher `Com mais de 30 dias`: a confirmação mostra a quantidade certa.
9. `Exportar tudo`, apagar uma reunião e `Importar backup`: a reunião volta. Importar de novo não duplica.
10. Durante uma reunião, `Parar de gravar esta reunião`: o menu mostra `Gravação parada nesta reunião`, nada novo é gravado, e recarregar a aba mantém parado. `Retomar gravação` volta a gravar.
11. Apagar uma gravação de diagnóstico pelas configurações.

---
