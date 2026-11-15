# Etapa 1: gravação completa (plano de implementação)

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** reescrever a extensão para gravar a reunião inteira (cada fala com nome, horário e texto, aceitando as correções do Meet), guardar tudo em `chrome.storage.local`, ligar e desligar a extensão por um menu com confirmações, e ter um modo de diagnóstico. Inclui uma tela de reuniões **mínima**, só leitura, para conferir as gravações. A etapa 2 completa essa tela.

**Arquitetura:** o content script na aba do Meet lê as legendas pelo HTML, converte os blocos em falas com um rastreador de "fala aberta e fechada" e salva direto em `chrome.storage.local`. O menu da extensão (popup) e a página de reuniões leem o mesmo storage e reagem a mudanças. O service worker só atualiza o selo do ícone. Toda a lógica de domínio fica em funções e classes puras, testadas sem navegador.

**Stack:** React 19, TypeScript strict, Vite 7, Tailwind v4, shadcn/ui (new-york, lucide), Vitest (jsdom) + Testing Library, Storybook 9, pnpm, Chrome Manifest V3.

**Spec:** [docs/superpowers/specs/2026-11-14-melhorias-extensao-requisitos.md](../specs/2026-11-14-melhorias-extensao-requisitos.md). Leia também o [CLAUDE.md](../../../CLAUDE.md).

**Branch:** `feat/v2-melhorias` (já existe). Trabalhe nela.

---

## Como usar este plano (leia antes de começar)

- Execute as tarefas **na ordem**. Cada uma depende das anteriores.
- Quando o plano mostra o código completo de um arquivo, copie como está. Quando mostra só a assinatura, implemente seguindo as regras descritas e faça os testes passarem.
- **Não invente nomes.** Use exatamente os nomes de arquivos, funções, tipos e constantes do plano. As tarefas seguintes dependem deles.
- O `tsconfig` usa `erasableSyntaxOnly: true`. **Não use** `enum`, `namespace` nem parâmetros de construtor com modificador (`constructor(private x: T)`). Declare os campos da classe explicitamente.
- Sem `any`. Sem `console.log`. `console.error` só no ponto indicado (tratamento de erro do controller).
- Imports com o alias `@/` (aponta para `src/`).
- Comando para rodar só os testes de unidade: `pnpm vitest run --project unit <caminho>`. Para todos: `pnpm vitest run --project unit`.
- O hook de `pre-commit` roda Prettier, ESLint e todos os testes (inclusive os do Storybook, que precisam do Chromium do Playwright). Se o commit falhar por causa do hook, corrija o problema. **Nunca use `--no-verify`.**
- O hook de `commit-msg` está quebrado (aponta para outro projeto) e imprime um erro de `cat`. Isso não impede o commit e pode ser ignorado.

## Restrições globais

- Interface em português (pt-BR). Os textos exatos estão nas tarefas.
- Componentes de interface: só shadcn/ui. Estilo: só classes Tailwind com os tokens do tema (`bg-background`, `text-muted-foreground`, etc.). Ícones: só `lucide-react`.
- Nenhuma requisição de rede, nenhum dado sai do computador, nenhuma IA.
- Permissões do manifest: **só** `storage` e `unlimitedStorage`.
- **Nunca** use, copie ou se baseie em `src/features/resize-video/` (é apagado na Tarefa 1).
- Mantenha as ferramentas: ESLint, Prettier, Husky, lint-staged, Vitest, Storybook, TypeScript. Não desative regras nem hooks.
- Constantes fixas (use estes valores exatos):

| Constante               | Valor            | Onde               |
| ----------------------- | ---------------- | ------------------ |
| `SAVE_INTERVAL_MS`      | `1_000`          | recorder           |
| `HEARTBEAT_MS`          | `15_000`         | recorder           |
| `UNAVAILABLE_AFTER_MS`  | `20_000`         | recorder           |
| `LIVE_STALE_MS`         | `45_000`         | storage            |
| `CONTINUE_GAP_MS`       | `15 * 60 * 1000` | meeting-identity   |
| `AUTOSTART_RETRY_MS`    | `2_000`          | captions-autostart |
| `AUTOSTART_GIVE_UP_MS`  | `60_000`         | captions-autostart |
| `DIAGNOSTIC_MAX_EVENTS` | `50_000`         | diagnostics        |
| `DIAGNOSTIC_MAX_HTML`   | `20_000`         | diagnostics        |
| `POLL_MS`               | `1_000`          | content-controller |
| `OBSERVE_DEBOUNCE_MS`   | `100`            | content-controller |
| `DISABLE_WAIT_MS`       | `2_000`          | disable-extension  |

- Código de reunião do Meet: regex `^[a-z]{3}-[a-z]{4}-[a-z]{3}$`, aplicada ao primeiro segmento do caminho da URL.
- ID de reunião: `${code}_${startedAt}`. ID de reunião antiga importada: `legacy_${timestamp}`.
- Testes rodam com `TZ=America/Sao_Paulo` (configurado na Tarefa 1).

## Pontos de atenção na revisão

Situações que a spec implica e que mais podem dar errado no uso real. Cada uma tem um teste na tarefa indicada.

1. **O Meet troca de página sem recarregar.** Sair da página inicial e entrar numa reunião, ou sair da chamada e clicar em "voltar", acontece sem recarregar a aba. A gravação tem que começar, terminar e abrir uma nova sessão da mesma reunião corretamente. Teste na Tarefa 11.
2. **Duas abas na mesma reunião.** Só uma aba grava. A outra não pode sobrescrever as falas. Teste na Tarefa 9.
3. **Desligar e descartar com um salvamento pendente.** A reunião descartada não pode reaparecer depois. Teste na Tarefa 11.
4. **Fechar a aba de repente.** O que estava na tela é salvo no `pagehide`, e o fim da sessão fica registrado pelo heartbeat. Testes nas Tarefas 9 e 11.
5. **Correção de uma frase com trecho repetido** (ex.: "eu acho que sim eu acho que não"). A correção não pode duplicar o texto. Teste na Tarefa 3.

## Mapa de arquivos

```text
popup.html                              # página do menu (popup)
meetings.html                           # página de reuniões
vite.config.ts                          # build das páginas + background (ESM)
vite.content.config.ts                  # build do content script (IIFE)
public/manifest.json
src/
  styles/index.css                      # CSS global (movido de src/ui/index.css)
  components/ui/*                       # shadcn (gerado pelo CLI)
  components/transcript/
    utterance-item.tsx                  # uma fala (reutilizado pela janela flutuante na etapa 3)
    transcript-view.tsx                 # lista de falas + marcações de saída e volta
  lib/
    utils.ts                            # cn() (já existe; manter só o cn)
    format.ts                           # datas, durações, título de exibição
    download.ts                         # baixar arquivo de texto
  shared/
    types.ts                            # todos os tipos compartilhados
    storage.ts                          # acesso ao chrome.storage.local
    time.ts                             # sameLocalDay
  features/
    recording/
      merge-text.ts                     # junta correções e cortes do Meet
      caption-tracker.ts                # falas abertas e fechadas
      meeting-identity.ts               # código da reunião, continuar ou criar
      meet-dom.ts                       # leitura do HTML do Meet
      captions-autostart.ts             # liga as legendas uma vez por sessão
      diagnostics.ts                    # modo de diagnóstico
      replay.ts                         # reapresenta um log de diagnóstico
      recorder.ts                       # orquestra gravação e persistência
      legacy-import.ts                  # importa reuniões do formato antigo
      content-controller.ts             # liga tudo à página do Meet
      __fixtures__/meet-dom.ts          # HTML de exemplo do Meet
      __fixtures__/scenarios.ts         # logs de diagnóstico sintéticos
    extension-toggle/
      badge.ts                          # selo do ícone
      disable-extension.ts              # fluxo de desligar
      use-settings.ts
      use-live-status.ts
      extension-toggle.tsx              # interruptor + diálogos
    popup/
      live-status-line.tsx
      popup-app.tsx
    meetings/
      use-meetings.ts
      use-meeting.ts
      use-diagnostics.ts
      meeting-list.tsx
      meeting-detail.tsx
      live-banner.tsx
      diagnostics-panel.tsx
      meetings-app.tsx
  entries/
    background.ts
    content-script.ts
    popup.tsx
    meetings.tsx
  test/
    chrome-fake.ts                      # fake do chrome.* para testes
```

---

### Tarefa 1: base do projeto (limpeza, build, manifest, shadcn, fake do Chrome)

**Arquivos:**

- Apagar: `src/ui/` (inteiro, depois de mover o CSS), `src/features/captions/`, `src/features/resize-video/`, `src/scripts/`, `src/constants.ts`, `src/entries/main.tsx`, `index.html`
- Mover: `src/ui/index.css` para `src/styles/index.css`
- Criar: `popup.html`, `meetings.html`, `vite.content.config.ts`, `src/entries/popup.tsx`, `src/entries/meetings.tsx`, `src/entries/content-script.ts`, `src/test/chrome-fake.ts`, `src/test/chrome-fake.test.ts`
- Reescrever: `src/entries/background.ts`, `public/manifest.json`, `vite.config.ts`, `src/lib/utils.ts`
- Modificar: `package.json`, `components.json`, `vitest.setup.ts`, `tsconfig.node.json`, `.storybook/main.ts`, `.storybook/preview.ts`

**Interfaces:**

- Produz: `installChromeFake()`, `resetChromeFake()`, `getStorageSnapshot()` e `chromeFake` em `src/test/chrome-fake.ts`, instalados automaticamente em todos os testes de unidade.

- [ ] **Passo 1: mover o CSS e apagar o código antigo**

```bash
mkdir -p src/styles
git mv src/ui/index.css src/styles/index.css
git rm -r -q src/ui src/features/captions src/features/resize-video src/scripts src/constants.ts src/entries/main.tsx index.html
```

- [ ] **Passo 2: deixar `src/lib/utils.ts` só com o `cn`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Passo 3: corrigir o `components.json`**

Troque `"css": "src/index.css"` por `"css": "src/styles/index.css"`. Mantenha os aliases como estão (`@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`).

- [ ] **Passo 4: corrigir o Storybook (o `@storybook/addon-themes` foi removido do package.json)**

Em `.storybook/main.ts`, remova a linha `'@storybook/addon-themes',` do array `addons`.

Substitua `.storybook/preview.ts` por:

```ts
import type { Preview } from '@storybook/react-vite'
import { themes } from 'storybook/theming'

import '../src/styles/index.css'

document.documentElement.classList.add('dark')

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    docs: {
      theme: themes.dark,
    },
  },
}

export default preview
```

- [ ] **Passo 5: ajustar dependências**

```bash
pnpm remove react-icons react-spinners markdown-to-jsx @storybook/addons
pnpm install
pnpm up
```

Mantenha `@mdx-js/react` (o Storybook usa) e `next-themes` (o componente `sonner` do shadcn usa).

- [ ] **Passo 6: adicionar os componentes do shadcn**

```bash
pnpm dlx shadcn@latest add button switch alert-dialog badge scroll-area separator sonner
```

Esperado: os arquivos aparecem em `src/components/ui/`. Se o CLI perguntar se pode sobrescrever `src/styles/index.css`, responda **não**. Confira com `git diff src/styles/index.css`: o arquivo não pode ter perdido as variáveis de tema existentes.

- [ ] **Passo 7: criar as páginas HTML**

`popup.html`:

```html
<!doctype html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meet Captions</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/entries/popup.tsx"></script>
  </body>
</html>
```

`meetings.html`: igual, com `<title>Reuniões · Meet Captions</title>` e `src="/src/entries/meetings.tsx"`.

- [ ] **Passo 8: criar entradas provisórias** (as tarefas 11, 12, 14 e 15 substituem)

`src/entries/popup.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <p className="p-4">Meet Captions</p>
  </StrictMode>
)
```

`src/entries/meetings.tsx`: igual, com o texto `Reuniões`.

`src/entries/background.ts`: `export {}`.

`src/entries/content-script.ts`: `export {}`.

- [ ] **Passo 9: reescrever `vite.config.ts`**

Mantenha o bloco `test` existente, com duas mudanças: dê ao projeto jsdom o nome `unit` e defina o fuso horário. Troque o bloco `build` e remova `rootNamed` e `index.html`.

```ts
// dentro de defineConfig({...})
build: {
  sourcemap: true,
  rollupOptions: {
    input: {
      popup: path.resolve(__dirname, 'popup.html'),
      meetings: path.resolve(__dirname, 'meetings.html'),
      background: path.resolve(__dirname, 'src/entries/background.ts'),
    },
    output: {
      entryFileNames: (chunk) =>
        chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash][extname]',
    },
  },
},
```

No projeto jsdom dentro de `test.projects`:

```ts
{
  extends: true,
  test: {
    name: 'unit',
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    env: { TZ: 'America/Sao_Paulo' },
  },
},
```

- [ ] **Passo 10: criar `vite.content.config.ts`**

O content script precisa ser um arquivo único, sem `import`, porque o Chrome carrega content scripts como scripts clássicos. Por isso ele tem um build próprio no formato IIFE.

```ts
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/entries/content-script.ts'),
      formats: ['iife'],
      name: 'MeetCaptionsContent',
      fileName: () => 'content-script.js',
    },
  },
})
```

Em `tsconfig.node.json`, troque `"include": ["vite.config.ts"]` por `"include": ["vite.config.ts", "vite.content.config.ts"]`.

Em `package.json`, troque o script `build` por:

```json
"build": "tsc -b && vite build && vite build --config vite.content.config.ts",
```

- [ ] **Passo 11: reescrever `public/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Google Meet Captions Downloader",
  "description": "Grava as legendas do Google Meet para consultar depois.",
  "version": "2.0.0",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Meet Captions"
  },
  "permissions": ["storage", "unlimitedStorage"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "js": ["content-script.js"],
      "matches": ["https://meet.google.com/*"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Passo 12: escrever o teste do fake do Chrome** (`src/test/chrome-fake.test.ts`)

```ts
import { describe, expect, test, vi } from 'vitest'
import { getStorageSnapshot } from './chrome-fake'

describe('chrome fake', () => {
  test('guarda e lê valores do storage', async () => {
    await chrome.storage.local.set({ a: 1, b: { c: 2 } })
    expect(await chrome.storage.local.get('a')).toEqual({ a: 1 })
    expect(await chrome.storage.local.get(['a', 'b'])).toEqual({
      a: 1,
      b: { c: 2 },
    })
    expect(await chrome.storage.local.get(null)).toEqual({ a: 1, b: { c: 2 } })
  })

  test('remove valores', async () => {
    await chrome.storage.local.set({ a: 1, b: 2 })
    await chrome.storage.local.remove('a')
    expect(getStorageSnapshot()).toEqual({ b: 2 })
  })

  test('avisa mudanças pelo onChanged', async () => {
    const listener = vi.fn()
    chrome.storage.onChanged.addListener(listener)
    await chrome.storage.local.set({ a: 1 })
    await Promise.resolve()
    expect(listener).toHaveBeenCalledWith(
      { a: { oldValue: undefined, newValue: 1 } },
      'local'
    )
  })

  test('começa vazio em cada teste', () => {
    expect(getStorageSnapshot()).toEqual({})
  })
})
```

- [ ] **Passo 13: rodar o teste e confirmar que falha**

Run: `pnpm vitest run --project unit src/test/chrome-fake.test.ts`
Esperado: FAIL (o módulo `./chrome-fake` não existe).

- [ ] **Passo 14: criar `src/test/chrome-fake.ts`**

```ts
import { vi } from 'vitest'

type StorageChanges = Record<string, chrome.storage.StorageChange>
type ChangeListener = (changes: StorageChanges, areaName: string) => void

let data: Record<string, unknown> = {}
const listeners = new Set<ChangeListener>()

function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value)
}

function emit(changes: StorageChanges) {
  if (Object.keys(changes).length === 0) return
  queueMicrotask(() => {
    listeners.forEach((listener) => listener(changes, 'local'))
  })
}

const local = {
  async get(keys?: string | string[] | null): Promise<Record<string, unknown>> {
    if (keys === undefined || keys === null) return clone(data)
    const list = Array.isArray(keys) ? keys : [keys]
    const result: Record<string, unknown> = {}
    for (const key of list) {
      if (key in data) result[key] = clone(data[key])
    }
    return result
  },
  async set(items: Record<string, unknown>): Promise<void> {
    const changes: StorageChanges = {}
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: clone(data[key]), newValue: clone(value) }
      data[key] = clone(value)
    }
    emit(changes)
  },
  async remove(keys: string | string[]): Promise<void> {
    const list = Array.isArray(keys) ? keys : [keys]
    const changes: StorageChanges = {}
    for (const key of list) {
      if (key in data) {
        changes[key] = { oldValue: clone(data[key]) }
        delete data[key]
      }
    }
    emit(changes)
  },
  async clear(): Promise<void> {
    const keys = Object.keys(data)
    await local.remove(keys)
  },
}

export const chromeFake = {
  storage: {
    local,
    onChanged: {
      addListener: (listener: ChangeListener) => listeners.add(listener),
      removeListener: (listener: ChangeListener) => listeners.delete(listener),
    },
  },
  action: {
    setBadgeText: vi.fn(async () => {}),
    setBadgeBackgroundColor: vi.fn(async () => {}),
    setTitle: vi.fn(async () => {}),
  },
  runtime: {
    getURL: (path: string) => `chrome-extension://test-id/${path}`,
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
  },
  tabs: {
    create: vi.fn(async () => ({})),
  },
}

export function installChromeFake() {
  ;(globalThis as unknown as { chrome: typeof chromeFake }).chrome = chromeFake
}

export function resetChromeFake() {
  data = {}
  listeners.clear()
  chromeFake.action.setBadgeText.mockClear()
  chromeFake.action.setBadgeBackgroundColor.mockClear()
  chromeFake.action.setTitle.mockClear()
  chromeFake.runtime.onInstalled.addListener.mockClear()
  chromeFake.runtime.onStartup.addListener.mockClear()
  chromeFake.tabs.create.mockClear()
}

export function getStorageSnapshot(): Record<string, unknown> {
  return clone(data)
}
```

- [ ] **Passo 15: instalar o fake em `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { installChromeFake, resetChromeFake } from './src/test/chrome-fake'

installChromeFake()

beforeEach(() => {
  resetChromeFake()
})

afterEach(() => {
  cleanup()
})
```

- [ ] **Passo 16: rodar os testes e confirmar que passam**

Run: `pnpm vitest run --project unit src/test/chrome-fake.test.ts`
Esperado: PASS (4 testes).

- [ ] **Passo 17: conferir build e lint**

Run: `pnpm build && ls dist`
Esperado: o build termina sem erro e `dist` contém `background.js`, `content-script.js`, `popup.html`, `meetings.html`, `manifest.json`, `icons/` e `assets/`.

Run: `pnpm lint`
Esperado: sem erros.

- [ ] **Passo 18: commit**

```bash
git add -A
git commit -m "refactor: reset project base for v2 (build, manifest, shadcn, chrome fake)"
```

---

### Tarefa 2: tipos compartilhados e storage

**Arquivos:**

- Criar: `src/shared/types.ts`, `src/shared/time.ts`, `src/shared/storage.ts`
- Teste: `src/shared/storage.test.ts`, `src/shared/time.test.ts`

**Interfaces:**

- Produz: todos os tipos de `types.ts`, `sameLocalDay`, e as funções de `storage.ts` listadas abaixo. Todas as tarefas seguintes usam estes nomes.

- [ ] **Passo 1: criar `src/shared/types.ts`** (código completo)

```ts
export type Utterance = {
  id: string
  speaker: string
  startedAt: number
  text: string
  final: boolean
}

export type Session = {
  startedAt: number
  endedAt: number
}

export type Meeting = {
  id: string
  code: string
  title: string
  customTitle?: string
  startedAt: number
  sessions: Session[]
  utterances: Utterance[]
  legacy?: boolean
}

export type MeetingSummary = {
  id: string
  code: string
  title: string
  customTitle?: string
  startedAt: number
  endedAt: number
  utteranceCount: number
  legacy?: boolean
}

export type Settings = {
  enabled: boolean
  diagnostics: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  diagnostics: false,
}

export type LiveState = 'recording' | 'captions-off' | 'captions-unavailable'

export type LiveStatus = {
  meetingId: string | null
  code: string
  title: string
  since: number
  heartbeatAt: number
  state: LiveState
  utteranceCount: number
  tabToken: string
}

export type CaptionsState = 'on' | 'off' | 'unknown'

export type ObservedBlock = {
  key: object
  speaker: string
  text: string
}

export type DiagnosticBlock = {
  k: number
  speaker: string
  text: string
}

export type DiagnosticEvent =
  | { t: number; kind: 'blocks'; blocks: DiagnosticBlock[] }
  | { t: number; kind: 'html'; html: string }
  | { t: number; kind: 'state'; state: string }

export type DiagnosticLog = {
  meetingId: string
  code: string
  startedAt: number
  userAgent: string
  language: string
  truncated: boolean
  events: DiagnosticEvent[]
}

export type DiagnosticSummary = {
  meetingId: string
  code: string
  startedAt: number
  eventCount: number
  truncated: boolean
}
```

- [ ] **Passo 2: escrever os testes de `time.ts`** (`src/shared/time.test.ts`)

```ts
import { describe, expect, test } from 'vitest'
import { sameLocalDay } from './time'

describe('sameLocalDay', () => {
  test('mesmo dia no fuso local', () => {
    expect(
      sameLocalDay(
        new Date('2026-11-14T00:05:00-03:00').getTime(),
        new Date('2026-11-14T23:55:00-03:00').getTime()
      )
    ).toBe(true)
  })

  test('dias diferentes no fuso local, mesmo que no mesmo dia UTC', () => {
    expect(
      sameLocalDay(
        new Date('2026-11-14T23:30:00-03:00').getTime(),
        new Date('2026-11-15T00:10:00-03:00').getTime()
      )
    ).toBe(false)
  })
})
```

- [ ] **Passo 3: criar `src/shared/time.ts`**

```ts
export function sameLocalDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}
```

- [ ] **Passo 4: escrever os testes do storage** (`src/shared/storage.test.ts`)

```ts
import { describe, expect, test, vi } from 'vitest'
import type { DiagnosticLog, LiveStatus, Meeting } from './types'
import {
  STORAGE_KEYS,
  clearLiveStatus,
  deleteMeeting,
  findLatestMeetingByCode,
  getDiagnostics,
  getLiveStatus,
  getMeeting,
  getSettings,
  listDiagnostics,
  listMeetings,
  onSettingsChange,
  saveDiagnostics,
  saveMeeting,
  setLiveStatus,
  updateSettings,
} from './storage'

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'abc-defg-hij_1000',
    code: 'abc-defg-hij',
    title: 'Daily',
    startedAt: 1000,
    sessions: [{ startedAt: 1000, endedAt: 5000 }],
    utterances: [
      { id: 'u1', speaker: 'Ana', startedAt: 1200, text: 'oi', final: true },
    ],
    ...overrides,
  }
}

function live(overrides: Partial<LiveStatus> = {}): LiveStatus {
  return {
    meetingId: 'abc-defg-hij_1000',
    code: 'abc-defg-hij',
    title: 'Daily',
    since: 1000,
    heartbeatAt: 10_000,
    state: 'recording',
    utteranceCount: 1,
    tabToken: 'tab-1',
    ...overrides,
  }
}

describe('settings', () => {
  test('usa os valores padrão quando não há nada salvo', async () => {
    expect(await getSettings()).toEqual({ enabled: true, diagnostics: false })
  })

  test('updateSettings mescla e salva', async () => {
    expect(await updateSettings({ diagnostics: true })).toEqual({
      enabled: true,
      diagnostics: true,
    })
    expect(await getSettings()).toEqual({ enabled: true, diagnostics: true })
  })

  test('onSettingsChange avisa com as configurações completas', async () => {
    const cb = vi.fn()
    const unsubscribe = onSettingsChange(cb)
    await updateSettings({ enabled: false })
    await Promise.resolve()
    expect(cb).toHaveBeenCalledWith({ enabled: false, diagnostics: false })
    unsubscribe()
  })
})

describe('meetings', () => {
  test('saveMeeting grava a reunião e o índice', async () => {
    await saveMeeting(meeting())
    expect(await getMeeting('abc-defg-hij_1000')).toEqual(meeting())
    expect(await listMeetings()).toEqual([
      {
        id: 'abc-defg-hij_1000',
        code: 'abc-defg-hij',
        title: 'Daily',
        customTitle: undefined,
        startedAt: 1000,
        endedAt: 5000,
        utteranceCount: 1,
        legacy: undefined,
      },
    ])
  })

  test('listMeetings ordena da mais recente para a mais antiga', async () => {
    await saveMeeting(meeting({ id: 'a', startedAt: 1000 }))
    await saveMeeting(meeting({ id: 'b', startedAt: 3000 }))
    await saveMeeting(meeting({ id: 'c', startedAt: 2000 }))
    expect((await listMeetings()).map((m) => m.id)).toEqual(['b', 'c', 'a'])
  })

  test('salvar de novo atualiza a entrada do índice sem duplicar', async () => {
    await saveMeeting(meeting())
    await saveMeeting(meeting({ title: 'Novo' }))
    const list = await listMeetings()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('Novo')
  })

  test('findLatestMeetingByCode devolve a mais recente com o código', async () => {
    await saveMeeting(meeting({ id: 'a', startedAt: 1000 }))
    await saveMeeting(meeting({ id: 'b', startedAt: 3000 }))
    await saveMeeting(
      meeting({ id: 'x', code: 'zzz-zzzz-zzz', startedAt: 9000 })
    )
    expect((await findLatestMeetingByCode('abc-defg-hij'))?.id).toBe('b')
    expect(await findLatestMeetingByCode('nao-exis-tee')).toBeUndefined()
  })

  test('deleteMeeting apaga reunião, índice e diagnóstico', async () => {
    await saveMeeting(meeting())
    await saveDiagnostics(diagLog())
    await deleteMeeting('abc-defg-hij_1000')
    expect(await getMeeting('abc-defg-hij_1000')).toBeUndefined()
    expect(await listMeetings()).toEqual([])
    expect(await getDiagnostics('abc-defg-hij_1000')).toBeUndefined()
  })
})

describe('live status', () => {
  test('devolve o status quando o heartbeat é recente', async () => {
    await setLiveStatus(live())
    expect(await getLiveStatus(10_000 + 44_000)).toEqual(live())
  })

  test('ignora status com heartbeat mais antigo que 45s', async () => {
    await setLiveStatus(live())
    expect(await getLiveStatus(10_000 + 45_001)).toBeUndefined()
  })

  test('clearLiveStatus com token só apaga se for da mesma aba', async () => {
    await setLiveStatus(live())
    await clearLiveStatus('outra-aba')
    expect(await getLiveStatus(10_000)).toBeDefined()
    await clearLiveStatus('tab-1')
    expect(await getLiveStatus(10_000)).toBeUndefined()
  })

  test('clearLiveStatus sem token sempre apaga', async () => {
    await setLiveStatus(live())
    await clearLiveStatus()
    expect(await getLiveStatus(10_000)).toBeUndefined()
  })
})

function diagLog(): DiagnosticLog {
  return {
    meetingId: 'abc-defg-hij_1000',
    code: 'abc-defg-hij',
    startedAt: 1000,
    userAgent: 'ua',
    language: 'pt-BR',
    truncated: false,
    events: [{ t: 1, kind: 'state', state: 'x' }],
  }
}

describe('diagnostics', () => {
  test('salva, lê e lista logs', async () => {
    await saveDiagnostics(diagLog())
    expect(await getDiagnostics('abc-defg-hij_1000')).toEqual(diagLog())
    expect(await listDiagnostics()).toEqual([
      {
        meetingId: 'abc-defg-hij_1000',
        code: 'abc-defg-hij',
        startedAt: 1000,
        eventCount: 1,
        truncated: false,
      },
    ])
  })

  test('as chaves seguem o padrão', () => {
    expect(STORAGE_KEYS.meeting('x')).toBe('meeting:x')
    expect(STORAGE_KEYS.diagnostics('x')).toBe('diagnostics:x')
  })
})
```

- [ ] **Passo 5: rodar os testes e confirmar que falham**

Run: `pnpm vitest run --project unit src/shared`
Esperado: FAIL nos testes do storage (módulo não existe). Os de `time` passam.

- [ ] **Passo 6: criar `src/shared/storage.ts`** (código completo)

```ts
import {
  DEFAULT_SETTINGS,
  type DiagnosticLog,
  type DiagnosticSummary,
  type LiveStatus,
  type Meeting,
  type MeetingSummary,
  type Settings,
} from './types'

export const STORAGE_KEYS = {
  settings: 'settings',
  index: 'meetingIndex',
  live: 'live',
  meeting: (id: string) => `meeting:${id}`,
  diagnostics: (id: string) => `diagnostics:${id}`,
}

const DIAGNOSTICS_PREFIX = 'diagnostics:'

export const LIVE_STALE_MS = 45_000

async function read<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key] as T | undefined
}

export function summarizeMeeting(meeting: Meeting): MeetingSummary {
  return {
    id: meeting.id,
    code: meeting.code,
    title: meeting.title,
    customTitle: meeting.customTitle,
    startedAt: meeting.startedAt,
    endedAt: meeting.sessions.at(-1)?.endedAt ?? meeting.startedAt,
    utteranceCount: meeting.utterances.length,
    legacy: meeting.legacy,
  }
}

export async function getSettings(): Promise<Settings> {
  const stored = await read<Partial<Settings>>(STORAGE_KEYS.settings)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function updateSettings(
  patch: Partial<Settings>
): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next })
  return next
}

export function onStorageKeysChange(
  keys: string[],
  callback: () => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local') return
    if (Object.keys(changes).some((key) => keys.includes(key))) callback()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export function onSettingsChange(
  callback: (settings: Settings) => void
): () => void {
  return onStorageKeysChange([STORAGE_KEYS.settings], () => {
    void getSettings().then(callback)
  })
}

async function readIndex(): Promise<MeetingSummary[]> {
  return (await read<MeetingSummary[]>(STORAGE_KEYS.index)) ?? []
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  const index = await readIndex()
  const next = [
    summarizeMeeting(meeting),
    ...index.filter((summary) => summary.id !== meeting.id),
  ].sort((a, b) => b.startedAt - a.startedAt)
  await chrome.storage.local.set({
    [STORAGE_KEYS.meeting(meeting.id)]: meeting,
    [STORAGE_KEYS.index]: next,
  })
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  return read<Meeting>(STORAGE_KEYS.meeting(id))
}

export async function listMeetings(): Promise<MeetingSummary[]> {
  return (await readIndex()).sort((a, b) => b.startedAt - a.startedAt)
}

export async function findLatestMeetingByCode(
  code: string
): Promise<MeetingSummary | undefined> {
  return (await listMeetings()).find((summary) => summary.code === code)
}

export async function deleteMeeting(id: string): Promise<void> {
  const index = await readIndex()
  await chrome.storage.local.set({
    [STORAGE_KEYS.index]: index.filter((summary) => summary.id !== id),
  })
  await chrome.storage.local.remove([
    STORAGE_KEYS.meeting(id),
    STORAGE_KEYS.diagnostics(id),
  ])
}

export async function getLiveStatus(
  now: number = Date.now()
): Promise<LiveStatus | undefined> {
  const status = await read<LiveStatus>(STORAGE_KEYS.live)
  if (!status) return undefined
  if (now - status.heartbeatAt > LIVE_STALE_MS) return undefined
  return status
}

export async function setLiveStatus(status: LiveStatus): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.live]: status })
}

export async function clearLiveStatus(tabToken?: string): Promise<void> {
  if (tabToken !== undefined) {
    const status = await read<LiveStatus>(STORAGE_KEYS.live)
    if (!status || status.tabToken !== tabToken) return
  }
  await chrome.storage.local.remove(STORAGE_KEYS.live)
}

export async function saveDiagnostics(log: DiagnosticLog): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.diagnostics(log.meetingId)]: log,
  })
}

export async function getDiagnostics(
  meetingId: string
): Promise<DiagnosticLog | undefined> {
  return read<DiagnosticLog>(STORAGE_KEYS.diagnostics(meetingId))
}

export async function listDiagnostics(): Promise<DiagnosticSummary[]> {
  const all = await chrome.storage.local.get(null)
  return Object.entries(all)
    .filter(([key]) => key.startsWith(DIAGNOSTICS_PREFIX))
    .map(([, value]) => {
      const log = value as DiagnosticLog
      return {
        meetingId: log.meetingId,
        code: log.code,
        startedAt: log.startedAt,
        eventCount: log.events.length,
        truncated: log.truncated,
      }
    })
    .sort((a, b) => b.startedAt - a.startedAt)
}
```

- [ ] **Passo 7: rodar os testes e confirmar que passam**

Run: `pnpm vitest run --project unit src/shared`
Esperado: PASS.

- [ ] **Passo 8: commit**

```bash
git add src/shared
git commit -m "feat: add shared types and extension storage layer"
```

---

### Tarefa 3: juntar correções e cortes do Meet (`merge-text`)

Atende R1.3 e R1.5. Função pura que decide o que fazer quando o texto de um bloco do Meet muda.

**Arquivos:**

- Criar: `src/features/recording/merge-text.ts`
- Teste: `src/features/recording/merge-text.test.ts`

**Interfaces:**

- Produz: `type MergeKind = 'replace' | 'extend' | 'split'`, `type MergeResult = { kind: MergeKind; text: string }`, `mergeCaptionText(stored: string, incoming: string): MergeResult`.

**Significado do resultado:**

- `replace`: é a mesma fala corrigida. O texto salvo vira `text`.
- `extend`: o Meet cortou o começo do bloco. `text` é o começo antigo mais o texto novo.
- `split`: o bloco começou uma fala nova. A atual fecha e uma nova começa com `text`.

- [ ] **Passo 1: escrever os testes**

```ts
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
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/merge-text.test.ts`
Esperado: FAIL (módulo não existe).

- [ ] **Passo 3: implementar `src/features/recording/merge-text.ts`** (algoritmo completo)

```ts
export type MergeKind = 'replace' | 'extend' | 'split'
export type MergeResult = { kind: MergeKind; text: string }

const ANCHOR_SIZE = 3
const MIN_WORDS_TO_SPLIT = 6
const MIN_SIMILARITY = 0.3

type Word = { raw: string; norm: string }

function toWords(text: string): Word[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({
      raw,
      norm: raw.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''),
    }))
    .filter((word) => word.norm.length > 0)
}

function commonPrefixLength(a: Word[], aStart: number, b: Word[]): number {
  let n = 0
  while (
    aStart + n < a.length &&
    n < b.length &&
    a[aStart + n].norm === b[n].norm
  ) {
    n++
  }
  return n
}

function similarity(stored: Word[], incoming: Word[]): number {
  const known = new Set(stored.map((word) => word.norm))
  const hits = incoming.filter((word) => known.has(word.norm)).length
  return hits / incoming.length
}

export function mergeCaptionText(
  stored: string,
  incoming: string
): MergeResult {
  const text = incoming.trim()
  if (!text) return { kind: 'replace', text: stored }

  const storedWords = toWords(stored)
  const incomingWords = toWords(text)
  if (storedWords.length === 0 || incomingWords.length === 0) {
    return { kind: 'replace', text }
  }

  const anchor = Math.min(ANCHOR_SIZE, incomingWords.length)

  // 1. Começa igual: é a mesma fala sendo corrigida ou crescendo.
  if (commonPrefixLength(storedWords, 0, incomingWords) >= anchor) {
    return { kind: 'replace', text }
  }

  // 2. O começo do texto novo aparece mais adiante no salvo: o Meet cortou o começo.
  //    Escolhe a posição com o maior trecho em comum (em empate, a última).
  let bestPos = -1
  let bestLen = 0
  for (let pos = 1; pos < storedWords.length; pos++) {
    const len = commonPrefixLength(storedWords, pos, incomingWords)
    if (len >= anchor && len >= bestLen) {
      bestPos = pos
      bestLen = len
    }
  }
  if (bestPos > 0) {
    const prefix = storedWords.slice(0, bestPos).map((word) => word.raw)
    return { kind: 'extend', text: [...prefix, text].join(' ') }
  }

  // 3. Sem âncora: correção grande da mesma fala, ou fala nova no mesmo bloco.
  if (
    storedWords.length < MIN_WORDS_TO_SPLIT ||
    commonPrefixLength(storedWords, 0, incomingWords) >= 1 ||
    similarity(storedWords, incomingWords) >= MIN_SIMILARITY
  ) {
    return { kind: 'replace', text }
  }
  return { kind: 'split', text }
}
```

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/merge-text.test.ts`
Esperado: PASS (10 testes).

- [ ] **Passo 5: commit**

```bash
git add src/features/recording/merge-text.ts src/features/recording/merge-text.test.ts
git commit -m "feat: merge Meet caption corrections and trimmed blocks"
```

---

### Tarefa 4: rastreador de falas abertas e fechadas (`caption-tracker`)

Atende R1.1 a R1.4. Recebe, a cada mudança, a lista de blocos visíveis no Meet e mantém a lista de falas.

**Arquivos:**

- Criar: `src/features/recording/caption-tracker.ts`
- Teste: `src/features/recording/caption-tracker.test.ts`

**Interfaces:**

- Consome: `mergeCaptionText` (Tarefa 3); `Utterance` e `ObservedBlock` (Tarefa 2).
- Produz:
  - `class CaptionTracker`
  - `constructor(createId: () => string)`
  - `sync(blocks: ObservedBlock[], now: number): boolean`: devolve `true` se alguma fala mudou
  - `finalizeAll(): boolean`
  - `load(existing: Utterance[]): void`: carrega falas de uma sessão anterior, todas como finais
  - `get utterances(): readonly Utterance[]`

**Regras:**

1. Bloco com chave nova e texto não vazio cria uma fala `{ id: createId(), speaker, startedAt: now, text, final: false }` no fim da lista.
2. Bloco com chave conhecida e texto diferente: aplica `mergeCaptionText`. Com `replace` ou `extend`, atualiza o texto. Com `split`, marca a fala atual como `final: true` e cria uma fala nova, que passa a ser a fala aberta dessa chave.
3. Bloco com chave conhecida e nome de falante não vazio diferente do salvo: atualiza o `speaker`.
4. Blocos com texto vazio (depois do `trim`) são ignorados e não contam como vistos.
5. Toda fala aberta cuja chave não apareceu no `sync` atual vira `final: true` e sai do mapa de falas abertas. **Não existe fechamento por tempo.**
6. Falas finais nunca mudam.

- [ ] **Passo 1: escrever os testes**

```ts
import { beforeEach, describe, expect, test } from 'vitest'
import { CaptionTracker } from './caption-tracker'

let n = 0
const createId = () => `u${++n}`
const block = (key: object, speaker: string, text: string) => ({
  key,
  speaker,
  text,
})

describe('CaptionTracker', () => {
  let tracker: CaptionTracker
  const a = {}
  const b = {}

  beforeEach(() => {
    n = 0
    tracker = new CaptionTracker(createId)
  })

  test('bloco novo cria uma fala aberta com horário de início', () => {
    expect(tracker.sync([block(a, 'Ana', 'bom dia')], 1000)).toBe(true)
    expect(tracker.utterances).toEqual([
      {
        id: 'u1',
        speaker: 'Ana',
        startedAt: 1000,
        text: 'bom dia',
        final: false,
      },
    ])
  })

  test('correções substituem o texto sem criar fala nova e mantêm o horário', () => {
    tracker.sync([block(a, 'Ana', 'a gente pode')], 1000)
    tracker.sync([block(a, 'Ana', 'a gente pode fazer isso amanhã')], 1500)
    tracker.sync([block(a, 'Ana', 'agente pode fazer isso amanhã cedo')], 2000)
    expect(tracker.utterances).toHaveLength(1)
    expect(tracker.utterances[0]).toMatchObject({
      startedAt: 1000,
      text: 'agente pode fazer isso amanhã cedo',
      final: false,
    })
  })

  test('mesmo texto não conta como mudança', () => {
    tracker.sync([block(a, 'Ana', 'oi')], 1000)
    expect(tracker.sync([block(a, 'Ana', 'oi')], 1100)).toBe(false)
  })

  test('dois blocos visíveis ficam abertos e recebem correções separadas', () => {
    tracker.sync([block(a, 'Ana', 'vamos fechar na')], 1000)
    tracker.sync(
      [block(a, 'Ana', 'vamos fechar na'), block(b, 'Pedro', 'combinado')],
      2000
    )
    tracker.sync(
      [
        block(a, 'Ana', 'vamos fechar na sexta'),
        block(b, 'Pedro', 'combinado'),
      ],
      2500
    )
    expect(tracker.utterances.map((u) => [u.speaker, u.text, u.final])).toEqual(
      [
        ['Ana', 'vamos fechar na sexta', false],
        ['Pedro', 'combinado', false],
      ]
    )
  })

  test('fala só fecha quando o bloco some', () => {
    tracker.sync([block(a, 'Ana', 'oi')], 1000)
    tracker.sync([block(a, 'Ana', 'oi'), block(b, 'Pedro', 'olá')], 2000)
    expect(tracker.utterances[0].final).toBe(false)
    tracker.sync([block(b, 'Pedro', 'olá')], 3000)
    expect(tracker.utterances[0].final).toBe(true)
    expect(tracker.utterances[1].final).toBe(false)
  })

  test('fala final não muda mais', () => {
    tracker.sync([block(a, 'Ana', 'oi')], 1000)
    tracker.sync([], 2000)
    tracker.sync([block(a, 'Ana', 'oi tudo bem')], 3000)
    expect(tracker.utterances.map((u) => u.text)).toEqual(['oi', 'oi tudo bem'])
    expect(tracker.utterances[0].final).toBe(true)
  })

  test('split fecha a fala atual e abre outra no mesmo bloco', () => {
    tracker.sync(
      [block(a, 'Ana', 'então a gente fecha isso na sexta combinado')],
      1000
    )
    tracker.sync(
      [block(a, 'Ana', 'agora vamos para o próximo item da pauta')],
      5000
    )
    expect(
      tracker.utterances.map((u) => [u.text, u.final, u.startedAt])
    ).toEqual([
      ['então a gente fecha isso na sexta combinado', true, 1000],
      ['agora vamos para o próximo item da pauta', false, 5000],
    ])
  })

  test('nome do falante que aparece depois é atualizado', () => {
    tracker.sync([block(a, '', 'oi')], 1000)
    tracker.sync([block(a, 'Ana', 'oi')], 1100)
    expect(tracker.utterances[0].speaker).toBe('Ana')
  })

  test('blocos com texto vazio são ignorados', () => {
    expect(tracker.sync([block(a, 'Ana', '   ')], 1000)).toBe(false)
    expect(tracker.utterances).toEqual([])
  })

  test('finalizeAll fecha todas as falas abertas', () => {
    tracker.sync([block(a, 'Ana', 'oi'), block(b, 'Pedro', 'olá')], 1000)
    expect(tracker.finalizeAll()).toBe(true)
    expect(tracker.utterances.every((u) => u.final)).toBe(true)
    expect(tracker.finalizeAll()).toBe(false)
  })

  test('load carrega falas anteriores e adiciona as novas depois', () => {
    tracker.load([
      { id: 'old', speaker: 'Ana', startedAt: 1, text: 'antes', final: false },
    ])
    tracker.sync([block(a, 'Pedro', 'depois')], 1000)
    expect(tracker.utterances.map((u) => [u.id, u.final])).toEqual([
      ['old', true],
      ['u1', false],
    ])
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/caption-tracker.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar `src/features/recording/caption-tracker.ts`**

```ts
import type { ObservedBlock, Utterance } from '@/shared/types'
import { mergeCaptionText } from './merge-text'

export class CaptionTracker {
  private list: Utterance[] = []
  private open = new Map<object, Utterance>()
  private readonly createId: () => string

  constructor(createId: () => string) {
    this.createId = createId
  }

  get utterances(): readonly Utterance[] {
    return this.list
  }

  load(existing: Utterance[]): void {
    this.list = existing.map((utterance) => ({ ...utterance, final: true }))
    this.open.clear()
  }

  sync(blocks: ObservedBlock[], now: number): boolean {
    let changed = false
    const seen = new Set<object>()

    for (const block of blocks) {
      const text = block.text.trim()
      if (!text) continue
      const speaker = block.speaker.trim()
      seen.add(block.key)

      const current = this.open.get(block.key)
      if (!current) {
        this.openUtterance(block.key, speaker, text, now)
        changed = true
        continue
      }

      if (speaker && speaker !== current.speaker) {
        current.speaker = speaker
        changed = true
      }
      if (text === current.text) continue

      const merged = mergeCaptionText(current.text, text)
      if (merged.kind === 'split') {
        current.final = true
        this.openUtterance(block.key, current.speaker, merged.text, now)
      } else {
        current.text = merged.text
      }
      changed = true
    }

    for (const [key, utterance] of this.open) {
      if (!seen.has(key)) {
        utterance.final = true
        this.open.delete(key)
        changed = true
      }
    }
    return changed
  }

  finalizeAll(): boolean {
    if (this.open.size === 0) return false
    for (const utterance of this.open.values()) utterance.final = true
    this.open.clear()
    return true
  }

  private openUtterance(
    key: object,
    speaker: string,
    text: string,
    now: number
  ) {
    const utterance: Utterance = {
      id: this.createId(),
      speaker,
      startedAt: now,
      text,
      final: false,
    }
    this.list.push(utterance)
    this.open.set(key, utterance)
  }
}
```

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/caption-tracker.test.ts`
Esperado: PASS (11 testes).

- [ ] **Passo 5: commit**

```bash
git add src/features/recording/caption-tracker.ts src/features/recording/caption-tracker.test.ts
git commit -m "feat: track open and closed caption utterances"
```

---

### Tarefa 5: identificação da reunião (`meeting-identity`)

Atende R2.1, R2.2, R2.4 e o ponto em aberto 2 da spec (reunião que passa da meia-noite).

**Arquivos:**

- Criar: `src/features/recording/meeting-identity.ts`
- Teste: `src/features/recording/meeting-identity.test.ts`

**Interfaces:**

- Consome: `sameLocalDay` (Tarefa 2), `MeetingSummary`.
- Produz: `parseMeetingCode(url: string): string | null`, `CONTINUE_GAP_MS`, `shouldContinueMeeting(previous: MeetingSummary | undefined, now: number): boolean`.

**Regras:**

- `parseMeetingCode`: pega o primeiro segmento do `pathname` da URL e devolve-o só se casar com `^[a-z]{3}-[a-z]{4}-[a-z]{3}$`. Ignora query string e hash. URL inválida devolve `null`.
- `shouldContinueMeeting` devolve `true` se `previous` existir **e** (`sameLocalDay(previous.startedAt, now)` **ou** `now - previous.endedAt <= CONTINUE_GAP_MS`). A segunda condição cobre a reunião que passa da meia-noite.

- [ ] **Passo 1: escrever os testes**

```ts
import { describe, expect, test } from 'vitest'
import type { MeetingSummary } from '@/shared/types'
import { parseMeetingCode, shouldContinueMeeting } from './meeting-identity'

const at = (iso: string) => new Date(iso).getTime()

function summary(startedAt: number, endedAt: number): MeetingSummary {
  return {
    id: 'x',
    code: 'abc-defg-hij',
    title: '',
    startedAt,
    endedAt,
    utteranceCount: 3,
  }
}

describe('parseMeetingCode', () => {
  test.each([
    ['https://meet.google.com/abc-defg-hij', 'abc-defg-hij'],
    [
      'https://meet.google.com/abc-defg-hij?authuser=1&hl=pt-BR',
      'abc-defg-hij',
    ],
    ['https://meet.google.com/abc-defg-hij#x', 'abc-defg-hij'],
    ['http://localhost:3000/abc-defg-hij', 'abc-defg-hij'],
  ])('%s -> %s', (url, code) => {
    expect(parseMeetingCode(url)).toBe(code)
  })

  test.each([
    'https://meet.google.com/',
    'https://meet.google.com/landing',
    'https://meet.google.com/lookup/abcdef',
    'https://meet.google.com/ABC-DEFG-HIJ',
    'não é url',
  ])('%s -> null', (url) => {
    expect(parseMeetingCode(url)).toBeNull()
  })
})

describe('shouldContinueMeeting', () => {
  test('sem reunião anterior: cria nova', () => {
    expect(
      shouldContinueMeeting(undefined, at('2026-11-14T10:00:00-03:00'))
    ).toBe(false)
  })

  test('mesmo link no mesmo dia, horas depois: continua', () => {
    const prev = summary(
      at('2026-11-14T09:00:00-03:00'),
      at('2026-11-14T09:30:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-14T14:05:00-03:00'))).toBe(
      true
    )
  })

  test('mesmo link em outro dia: cria nova', () => {
    const prev = summary(
      at('2026-11-13T09:00:00-03:00'),
      at('2026-11-13T09:30:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-14T09:00:00-03:00'))).toBe(
      false
    )
  })

  test('reunião que passou da meia-noite, voltando 5 min depois: continua', () => {
    const prev = summary(
      at('2026-11-14T23:30:00-03:00'),
      at('2026-11-15T00:05:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-15T00:10:00-03:00'))).toBe(
      true
    )
  })

  test('outro dia e saiu há mais de 15 min: cria nova', () => {
    const prev = summary(
      at('2026-11-14T23:30:00-03:00'),
      at('2026-11-14T23:50:00-03:00')
    )
    expect(shouldContinueMeeting(prev, at('2026-11-15T00:10:00-03:00'))).toBe(
      false
    )
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/meeting-identity.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar `src/features/recording/meeting-identity.ts`**

`parseMeetingCode`: `new URL(url)` dentro de `try/catch` (erro devolve `null`), `pathname.split('/')[1]` testado com a regex. `shouldContinueMeeting`: aplica a regra acima. Exporte `CONTINUE_GAP_MS = 15 * 60 * 1000`.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/meeting-identity.test.ts`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/recording/meeting-identity.ts src/features/recording/meeting-identity.test.ts
git commit -m "feat: identify meetings by code and same-day rule"
```

---

### Tarefa 6: leitura do HTML do Meet (`meet-dom`)

Atende R1.7, R1.8 e R1.10. Todo o conhecimento sobre a estrutura da página do Meet fica **só neste arquivo**, para ser corrigido num único lugar quando o Meet mudar.

**Arquivos:**

- Criar: `src/features/recording/meet-dom.ts`, `src/features/recording/__fixtures__/meet-dom.ts`
- Teste: `src/features/recording/meet-dom.test.ts`

**Interfaces:**

- Consome: `ObservedBlock`.
- Produz: `MEET_LABELS`, `findCaptionsRegion(doc: Document): HTMLElement | null`, `readCaptionBlocks(region: HTMLElement): ObservedBlock[]`, `findTurnOnCaptionsButton(doc: Document): HTMLElement | null`, `isCaptionsOn(doc: Document): boolean`, `isInCall(doc: Document): boolean`, `getMeetingTitle(doc: Document): string`.

**Premissa sobre o Meet (a confirmar com o modo de diagnóstico, R8.4):** cada bloco de legenda tem uma imagem de avatar (`<img>`), o nome de quem fala ao lado e o texto num elemento irmão. Os textos dos botões variam com o idioma, então são comparados com uma lista em inglês e português.

**Regras:**

- Comparação de `aria-label`: `trim()` e minúsculas.
  - Na região de legendas, a comparação é **exata**.
  - Nos botões, vale o rótulo exato **ou** o rótulo seguido de espaço ou `(` (o Meet às vezes acrescenta o atalho, ex.: `"Turn on captions (c)"`).
- `MEET_LABELS` (exatamente):

```ts
export const MEET_LABELS = {
  captionsRegion: ['captions', 'legendas'],
  turnOnCaptions: ['turn on captions', 'ativar legendas'],
  turnOffCaptions: ['turn off captions', 'desativar legendas'],
  leaveCall: ['leave call', 'sair da chamada'],
}
```

- `findCaptionsRegion`: procura primeiro em `[role="region"][aria-label]` e, se não achar, em qualquer `[aria-label]` que não seja `button`. Usa a comparação exata.
- `findTurnOnCaptionsButton`: `button[aria-label], [role="button"][aria-label]` com `turnOnCaptions`.
- `isCaptionsOn`: `true` se existir botão com `turnOffCaptions` **ou** se `findCaptionsRegion` achar a região.
- `isInCall`: existe botão com `leaveCall`.
- `getMeetingTitle`: no primeiro elemento `[data-meeting-title]`, devolve o valor do atributo se não for vazio. Se for, devolve a primeira linha não vazia do `textContent`. Sem elemento, devolve `''`.
- `readCaptionBlocks` (algoritmo completo abaixo): para cada `img` dentro da região, sobe pelos ancestrais até achar o bloco. Usa `textContent` (o jsdom não tem `innerText`) e normaliza espaços com `.replace(/\s+/g, ' ').trim()`. O mesmo elemento de bloco nunca aparece duas vezes. A `key` de cada `ObservedBlock` é o **próprio elemento do bloco**.

```ts
function textOf(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function blockFromAvatar(img: Element, region: Element) {
  let child: Element = img
  let parent = img.parentElement
  while (parent && region.contains(parent)) {
    const others = Array.from(parent.children).filter(
      (el) =>
        el !== child && !el.matches('button, [role="button"]') && textOf(el)
    )
    if (textOf(child) && others.length >= 1) {
      return {
        el: parent,
        speaker: textOf(child),
        text: others.map(textOf).join(' '),
      }
    }
    if (!textOf(child) && others.length >= 2) {
      const [name, ...rest] = others
      return {
        el: parent,
        speaker: textOf(name),
        text: rest.map(textOf).join(' '),
      }
    }
    child = parent
    parent = parent.parentElement
  }
  return null
}

export function readCaptionBlocks(region: HTMLElement): ObservedBlock[] {
  const seen = new Set<Element>()
  const blocks: ObservedBlock[] = []
  for (const img of Array.from(region.querySelectorAll('img'))) {
    const found = blockFromAvatar(img, region)
    if (!found || seen.has(found.el)) continue
    seen.add(found.el)
    blocks.push({ key: found.el, speaker: found.speaker, text: found.text })
  }
  return blocks
}
```

- [ ] **Passo 1: criar as fixtures** (`src/features/recording/__fixtures__/meet-dom.ts`)

```ts
export const CAPTIONS_REGION_EN = `
<div role="region" aria-label="Captions" tabindex="0">
  <div class="list">
    <div class="block" id="b1">
      <div class="who"><img src="a.png" alt="" /><div><span>Ana Souza</span></div></div>
      <div class="said"><span>então a gente</span> <span>fecha isso na sexta</span></div>
    </div>
    <div class="block" id="b2">
      <div class="who"><img src="p.png" alt="" /><span>Pedro</span></div>
      <div class="said">combinado</div>
    </div>
  </div>
  <button aria-label="Jump to bottom">↓</button>
</div>`

export const CAPTIONS_REGION_PT = CAPTIONS_REGION_EN.replace(
  'aria-label="Captions"',
  'aria-label="Legendas"'
).replace('aria-label="Jump to bottom"', 'aria-label="Ir para o final"')

export const MEET_IN_CALL_EN = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Turn off captions (c)"></button>
<button aria-label="Leave call"></button>
${CAPTIONS_REGION_EN}`

export const MEET_IN_CALL_PT = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Desativar legendas (c)"></button>
<button aria-label="Sair da chamada"></button>
${CAPTIONS_REGION_PT}`

export const MEET_CAPTIONS_OFF_EN = `
<div data-meeting-title="Daily do time">Daily do time</div>
<button aria-label="Turn on captions (c)"></button>
<button aria-label="Leave call"></button>`

export const MEET_LANDING = `<button aria-label="New meeting">Nova reunião</button>`

export const CAPTIONS_REGION_SEPARATE_AVATAR = `
<div role="region" aria-label="Captions">
  <div class="block" id="b1">
    <div class="avatar"><img src="a.png" alt="" /></div>
    <span class="name">Ana</span>
    <div class="said">oi pessoal</div>
  </div>
</div>`
```

- [ ] **Passo 2: escrever os testes** (`src/features/recording/meet-dom.test.ts`)

```ts
import { beforeEach, describe, expect, test } from 'vitest'
import {
  CAPTIONS_REGION_SEPARATE_AVATAR,
  MEET_CAPTIONS_OFF_EN,
  MEET_IN_CALL_EN,
  MEET_IN_CALL_PT,
  MEET_LANDING,
} from './__fixtures__/meet-dom'
import {
  findCaptionsRegion,
  findTurnOnCaptionsButton,
  getMeetingTitle,
  isCaptionsOn,
  isInCall,
  readCaptionBlocks,
} from './meet-dom'

function render(html: string) {
  document.body.innerHTML = html
}

describe('meet-dom', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test.each([
    ['inglês', MEET_IN_CALL_EN],
    ['português', MEET_IN_CALL_PT],
  ])('lê os blocos de legenda em %s', (_, html) => {
    render(html)
    const region = findCaptionsRegion(document)
    expect(region).not.toBeNull()
    const blocks = readCaptionBlocks(region!)
    expect(blocks.map(({ speaker, text }) => ({ speaker, text }))).toEqual([
      { speaker: 'Ana Souza', text: 'então a gente fecha isso na sexta' },
      { speaker: 'Pedro', text: 'combinado' },
    ])
    expect(blocks[0].key).toBe(document.getElementById('b1'))
    expect(blocks[1].key).toBe(document.getElementById('b2'))
  })

  test('a chave do bloco continua a mesma quando o texto muda', () => {
    render(MEET_IN_CALL_EN)
    const region = findCaptionsRegion(document)!
    const before = readCaptionBlocks(region)[0].key
    document.querySelector('#b1 .said')!.textContent =
      'então a gente fecha isso na sexta-feira'
    const after = readCaptionBlocks(region)[0]
    expect(after.key).toBe(before)
    expect(after.text).toBe('então a gente fecha isso na sexta-feira')
  })

  test('aceita avatar separado do nome', () => {
    render(CAPTIONS_REGION_SEPARATE_AVATAR)
    const blocks = readCaptionBlocks(findCaptionsRegion(document)!)
    expect(blocks.map(({ speaker, text }) => ({ speaker, text }))).toEqual([
      { speaker: 'Ana', text: 'oi pessoal' },
    ])
  })

  test('identifica se está numa chamada', () => {
    render(MEET_IN_CALL_PT)
    expect(isInCall(document)).toBe(true)
    render(MEET_LANDING)
    expect(isInCall(document)).toBe(false)
  })

  test('acha o botão de ligar legendas e o estado das legendas', () => {
    render(MEET_CAPTIONS_OFF_EN)
    expect(findTurnOnCaptionsButton(document)).not.toBeNull()
    expect(isCaptionsOn(document)).toBe(false)
    render(MEET_IN_CALL_EN)
    expect(findTurnOnCaptionsButton(document)).toBeNull()
    expect(isCaptionsOn(document)).toBe(true)
  })

  test('lê o título da reunião', () => {
    render(MEET_IN_CALL_EN)
    expect(getMeetingTitle(document)).toBe('Daily do time')
    render(MEET_LANDING)
    expect(getMeetingTitle(document)).toBe('')
  })

  test('não confunde botões com a região de legendas', () => {
    render('<button aria-label="Captions"></button>')
    expect(findCaptionsRegion(document)).toBeNull()
  })
})
```

- [ ] **Passo 3: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/meet-dom.test.ts`
Esperado: FAIL.

- [ ] **Passo 4: implementar `src/features/recording/meet-dom.ts`** seguindo as regras e o algoritmo acima.

- [ ] **Passo 5: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/meet-dom.test.ts`
Esperado: PASS.

- [ ] **Passo 6: commit**

```bash
git add src/features/recording/meet-dom.ts src/features/recording/meet-dom.test.ts src/features/recording/__fixtures__/meet-dom.ts
git commit -m "feat: read Meet captions from the page (en and pt)"
```

---

### Tarefa 7: ligar as legendas automaticamente (`captions-autostart`)

Atende R3.2 e R3.3, incluindo a correção do bug atual: depois que as legendas ligam uma vez na sessão, a extensão **nunca mais** clica no botão, mesmo que eu as desligue.

**Arquivos:**

- Criar: `src/features/recording/captions-autostart.ts`
- Teste: `src/features/recording/captions-autostart.test.ts`

**Interfaces:**

- Consome: `isCaptionsOn` e `findTurnOnCaptionsButton` (Tarefa 6).
- Produz:
  - `class CaptionsAutostart`
  - `constructor(now: () => number)`
  - `reset(): void`
  - `tick(doc: Document): void`
  - `get done(): boolean`
  - `AUTOSTART_RETRY_MS = 2_000`
  - `AUTOSTART_GIVE_UP_MS = 60_000`

**Regras de `tick`:**

1. Se `done`, não faz nada.
2. No primeiro `tick` depois de criar ou de `reset()`, registra o horário de início.
3. Se `isCaptionsOn(doc)`, marca `done = true` e para.
4. Se já passaram mais de `AUTOSTART_GIVE_UP_MS` desde o início, marca `done = true` e para.
5. Se existe o botão de ligar e o último clique foi há pelo menos `AUTOSTART_RETRY_MS`, clica (`button.click()`) e registra o horário.

- [ ] **Passo 1: escrever os testes**

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { MEET_CAPTIONS_OFF_EN, MEET_IN_CALL_EN } from './__fixtures__/meet-dom'
import { CaptionsAutostart } from './captions-autostart'

describe('CaptionsAutostart', () => {
  let now = 0
  let autostart: CaptionsAutostart
  const clicks = vi.fn()

  function renderOff() {
    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', clicks)
  }

  beforeEach(() => {
    now = 0
    clicks.mockClear()
    autostart = new CaptionsAutostart(() => now)
  })

  test('clica no botão de ligar legendas', () => {
    renderOff()
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
  })

  test('espera 2s entre tentativas', () => {
    renderOff()
    autostart.tick(document)
    now = 1999
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
    now = 2000
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(2)
  })

  test('depois que as legendas ligam, nunca mais clica, mesmo se eu desligar', () => {
    renderOff()
    autostart.tick(document)
    document.body.innerHTML = MEET_IN_CALL_EN
    now = 3000
    autostart.tick(document)
    expect(autostart.done).toBe(true)
    renderOff()
    now = 10_000
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
  })

  test('legendas já ligadas pelo Meet: não clica', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    autostart.tick(document)
    expect(autostart.done).toBe(true)
  })

  test('desiste depois de 60s', () => {
    document.body.innerHTML = '<button aria-label="Leave call"></button>'
    autostart.tick(document)
    now = 60_001
    autostart.tick(document)
    expect(autostart.done).toBe(true)
  })

  test('reset permite ligar de novo numa nova sessão', () => {
    document.body.innerHTML = MEET_IN_CALL_EN
    autostart.tick(document)
    autostart.reset()
    renderOff()
    autostart.tick(document)
    expect(clicks).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/captions-autostart.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar** seguindo as regras. Campos: `startedAt: number | null`, `lastClickAt = Number.NEGATIVE_INFINITY`, `finished = false`, `nowFn`.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/captions-autostart.test.ts`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/recording/captions-autostart.ts src/features/recording/captions-autostart.test.ts
git commit -m "fix: turn captions on once per session and respect manual off"
```

---

### Tarefa 8: modo de diagnóstico e cenários de teste (`diagnostics`, `replay`)

Atende R8.1 e R8.3, e parte do R10.1.

**Arquivos:**

- Criar: `src/features/recording/diagnostics.ts`, `src/features/recording/replay.ts`, `src/features/recording/__fixtures__/scenarios.ts`
- Teste: `src/features/recording/diagnostics.test.ts`, `src/features/recording/replay.test.ts`

**Interfaces:**

- Consome: `CaptionTracker` (Tarefa 4); tipos `DiagnosticLog`, `DiagnosticEvent`, `ObservedBlock`, `CaptionsState`, `Utterance`.
- Produz:
  - `class DiagnosticRecorder`
  - `constructor(meta: { meetingId: string; code: string; startedAt: number; userAgent: string; language: string }, existing?: DiagnosticLog)`
  - `record(blocks: ObservedBlock[] | null, region: Element | null, captionsState: CaptionsState, t: number): void`
  - `toLog(): DiagnosticLog`
  - `DIAGNOSTIC_MAX_EVENTS = 50_000`, `DIAGNOSTIC_MAX_HTML = 20_000`
  - `replayDiagnosticLog(log: DiagnosticLog): Utterance[]`
  - `SCENARIOS: Scenario[]`, com `type Scenario = { name: string; log: DiagnosticLog; expected: Array<{ speaker: string; text: string }> }`

**Regras de `record`:**

1. Cada objeto `key` recebe um número estável (1, 2, 3…) num `WeakMap<object, number>`. Se houver `existing`, a numeração continua a partir do maior `k` já usado.
2. Com `blocks === null`, adiciona `{ t, kind: 'state', state: 'region-missing:' + captionsState }`, mas só se for diferente do último evento `state` registrado.
3. Com blocos:
   - monta `mapped = blocks.map(b => ({ k, speaker, text }))`;
   - se o conjunto de chaves (`mapped.map(b => b.k).join(',')`) mudou desde a última vez e `region` não é nulo, adiciona antes um `{ t, kind: 'html', html: region.outerHTML.slice(0, DIAGNOSTIC_MAX_HTML) }`;
   - adiciona `{ t, kind: 'blocks', blocks: mapped }`, a menos que seja idêntico (`JSON.stringify`) ao último evento `blocks`.
4. Ao atingir `DIAGNOSTIC_MAX_EVENTS`, não adiciona mais nada e marca `truncated = true`.

**Regras de `replayDiagnosticLog`:** cria um `CaptionTracker` com ids `r1, r2…`. Mapeia cada `k` para um objeto fixo. Para cada evento `blocks`, chama `sync`. Para cada evento `state` que começa com `region-missing`, chama `sync([], t)`. Ignora eventos `html`. No fim, chama `finalizeAll()` e devolve uma cópia das falas.

- [ ] **Passo 1: criar os cenários** (`src/features/recording/__fixtures__/scenarios.ts`)

Monte cada log com um helper. Os cenários reproduzem o comportamento que já conhecemos do Meet. Quando houver logs reais (R8.4), eles entram aqui também.

```ts
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
```

- [ ] **Passo 2: escrever os testes do replay** (`src/features/recording/replay.test.ts`)

```ts
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
```

- [ ] **Passo 3: escrever os testes do recorder de diagnóstico** (`src/features/recording/diagnostics.test.ts`)

```ts
import { describe, expect, test } from 'vitest'
import { DIAGNOSTIC_MAX_EVENTS, DiagnosticRecorder } from './diagnostics'

const meta = {
  meetingId: 'm',
  code: 'abc-defg-hij',
  startedAt: 0,
  userAgent: 'ua',
  language: 'pt-BR',
}

describe('DiagnosticRecorder', () => {
  test('numera as chaves de forma estável e guarda o html quando o conjunto muda', () => {
    const region = document.createElement('div')
    region.innerHTML = '<p>x</p>'
    const k1 = {}
    const k2 = {}
    const rec = new DiagnosticRecorder(meta)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi' }], region, 'on', 1)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi gente' }], region, 'on', 2)
    rec.record(
      [
        { key: k1, speaker: 'Ana', text: 'oi gente' },
        { key: k2, speaker: 'Pedro', text: 'olá' },
      ],
      region,
      'on',
      3
    )
    expect(rec.toLog().events).toEqual([
      { t: 1, kind: 'html', html: '<div><p>x</p></div>' },
      { t: 1, kind: 'blocks', blocks: [{ k: 1, speaker: 'Ana', text: 'oi' }] },
      {
        t: 2,
        kind: 'blocks',
        blocks: [{ k: 1, speaker: 'Ana', text: 'oi gente' }],
      },
      { t: 3, kind: 'html', html: '<div><p>x</p></div>' },
      {
        t: 3,
        kind: 'blocks',
        blocks: [
          { k: 1, speaker: 'Ana', text: 'oi gente' },
          { k: 2, speaker: 'Pedro', text: 'olá' },
        ],
      },
    ])
  })

  test('não repete eventos idênticos', () => {
    const k1 = {}
    const rec = new DiagnosticRecorder(meta)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi' }], null, 'on', 1)
    rec.record([{ key: k1, speaker: 'Ana', text: 'oi' }], null, 'on', 2)
    rec.record(null, null, 'off', 3)
    rec.record(null, null, 'off', 4)
    expect(rec.toLog().events).toEqual([
      { t: 1, kind: 'blocks', blocks: [{ k: 1, speaker: 'Ana', text: 'oi' }] },
      { t: 3, kind: 'state', state: 'region-missing:off' },
    ])
  })

  test('continua a numeração de um log existente', () => {
    const existing = {
      ...meta,
      truncated: false,
      events: [
        {
          t: 1,
          kind: 'blocks' as const,
          blocks: [{ k: 7, speaker: 'Ana', text: 'oi' }],
        },
      ],
    }
    const rec = new DiagnosticRecorder(meta, existing)
    rec.record([{ key: {}, speaker: 'Pedro', text: 'olá' }], null, 'on', 2)
    expect(rec.toLog().events.at(-1)).toEqual({
      t: 2,
      kind: 'blocks',
      blocks: [{ k: 8, speaker: 'Pedro', text: 'olá' }],
    })
  })

  test('para de gravar no limite e marca como truncado', () => {
    const rec = new DiagnosticRecorder(meta)
    const key = {}
    for (let i = 0; i <= DIAGNOSTIC_MAX_EVENTS; i++) {
      rec.record([{ key, speaker: 'Ana', text: `t${i}` }], null, 'on', i)
    }
    const result = rec.toLog()
    expect(result.events).toHaveLength(DIAGNOSTIC_MAX_EVENTS)
    expect(result.truncated).toBe(true)
  })
})
```

- [ ] **Passo 4: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/diagnostics.test.ts src/features/recording/replay.test.ts`
Esperado: FAIL.

- [ ] **Passo 5: implementar `diagnostics.ts` e `replay.ts`** seguindo as regras. `toLog()` devolve `structuredClone` do log interno.

- [ ] **Passo 6: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/diagnostics.test.ts src/features/recording/replay.test.ts`
Esperado: PASS. Se algum cenário do replay falhar, o problema está nas Tarefas 3 ou 4: corrija lá, sem mudar o resultado esperado do cenário.

- [ ] **Passo 7: commit**

```bash
git add src/features/recording/diagnostics.ts src/features/recording/replay.ts src/features/recording/__fixtures__/scenarios.ts src/features/recording/diagnostics.test.ts src/features/recording/replay.test.ts
git commit -m "feat: add diagnostics recorder and replay scenarios"
```

---

### Tarefa 9: orquestração da gravação (`recorder`)

Atende R1.6, R1.9, R2.2, R2.3, R2.5 e os pontos de atenção 2 e 4.

**Arquivos:**

- Criar: `src/features/recording/recorder.ts`
- Teste: `src/features/recording/recorder.test.ts`

**Interfaces:**

- Consome:
  - de `@/shared/storage`: `saveMeeting`, `getMeeting`, `findLatestMeetingByCode`, `getLiveStatus`, `setLiveStatus`, `clearLiveStatus`, `saveDiagnostics`, `getDiagnostics`;
  - `shouldContinueMeeting` (Tarefa 5), `CaptionTracker` (Tarefa 4), `DiagnosticRecorder` (Tarefa 8).
- Produz:

```ts
export const SAVE_INTERVAL_MS = 1_000
export const HEARTBEAT_MS = 15_000
export const UNAVAILABLE_AFTER_MS = 20_000

export type RecorderOptions = {
  now: () => number
  createId: () => string
  tabToken: string
  diagnosticsEnabled: () => boolean
  userAgent: string
  language: string
}

export class Recorder {
  constructor(options: RecorderOptions)
  get active(): boolean // em uma reunião (gravando ou bloqueado por outra aba)
  get blocked(): boolean // outra aba já grava esta reunião
  get code(): string | null
  join(code: string, title: string): Promise<void>
  observe(
    blocks: ObservedBlock[] | null,
    captionsState: CaptionsState,
    region: Element | null
  ): void
  setTitle(title: string): void
  flush(): Promise<void>
  leave(): Promise<void>
}
```

**Estado interno:** `meeting: Meeting | null`, `persisted: boolean`, `tracker: CaptionTracker`, `lastSaveAt: number`, `saveTimer`, `heartbeatTimer`, `missingSince: number | null`, `state: LiveState`, `diagnostics: DiagnosticRecorder | null`, `blockedCode: string | null`.

**Regras de `join(code, title)`:**

1. `now = options.now()`. Lê `getLiveStatus(now)`. Se existir com o mesmo `code` e `tabToken` diferente, define `blockedCode = code` e termina, sem gravar (ponto de atenção 2).
2. `previous = await findLatestMeetingByCode(code)`.
   - Se `shouldContinueMeeting(previous, now)` e `getMeeting(previous.id)` existir: usa essa reunião, adiciona a sessão `{ startedAt: now, endedAt: now }`, `persisted = true` e `tracker.load(meeting.utterances)`.
   - Senão: cria `{ id: `${code}_${now}`, code, title, startedAt: now, sessions: [{ startedAt: now, endedAt: now }], utterances: [] }` com `persisted = false` e um `CaptionTracker` novo. **Não salva ainda** (R2.5).
3. Se `options.diagnosticsEnabled()`: `diagnostics = new DiagnosticRecorder({ meetingId, code, startedAt: now, userAgent, language }, await getDiagnostics(meetingId))`.
4. `state = 'recording'`, `missingSince = null`. Inicia `setInterval(heartbeat, HEARTBEAT_MS)` e chama `publishLive()`.

**Regras de `observe(blocks, captionsState, region)`:**

1. Sem `meeting`, não faz nada.
2. `diagnostics?.record(blocks, region, captionsState, now)`.
3. Com `blocks === null`:
   - `changed = tracker.sync([], now)`, porque a região sumiu e todas as falas fecham;
   - se `captionsState === 'off'`: `state = 'captions-off'` e `missingSince = null`;
   - senão: `missingSince ??= now`; se `now - missingSince >= UNAVAILABLE_AFTER_MS`, `state = 'captions-unavailable'`.
4. Com blocos: `missingSince = null`, `state = 'recording'`, `changed = tracker.sync(blocks, now)`.
5. Se `changed`, chama `scheduleSave()`. Se `state` mudou, chama `void publishLive()`.

**Regras de salvamento:**

- `scheduleSave()`: se já existe `saveTimer`, não faz nada. Senão, agenda `flush()` com `delay = Math.max(0, lastSaveAt + SAVE_INTERVAL_MS - now)`. Assim há no máximo um salvamento por segundo.
- `flush()`:
  - cancela o `saveTimer`; sem `meeting`, termina;
  - `lastSaveAt = now` e `persist(meeting)`.
- `persist(m)` (privado):
  - copia `tracker.utterances` para `m.utterances` (`map(u => ({ ...u }))`);
  - se `diagnostics`, chama `saveDiagnostics(diagnostics.toLog())`. Isso acontece **mesmo sem falas**, porque o diagnóstico é útil justamente quando a leitura falha;
  - se `!persisted && m.utterances.length === 0`, termina;
  - `persisted = true`, `await saveMeeting(structuredClone(m))` e `void publishLive()`.
- `heartbeat()`: atualiza `meeting.sessions.at(-1).endedAt = now`. Se `persisted`, chama `scheduleSave()`. Chama `publishLive()`.
- `publishLive()`: `setLiveStatus({ meetingId: persisted ? meeting.id : null, code, title: meeting.title, since: sessão atual.startedAt, heartbeatAt: now, state, utteranceCount: tracker.utterances.length, tabToken })`.

**Regras de `leave()`:**

1. Se `blockedCode`: zera e termina.
2. Guarda `m = meeting` e **zera `meeting` antes de qualquer `await`**. Isso garante que um timer pendente não salva depois.
3. Cancela os timers. `tracker.finalizeAll()`. `m.sessions.at(-1).endedAt = now`.
4. `await persist(m)` e depois `await clearLiveStatus(options.tabToken)`.

**`setTitle(title)`:** se houver `meeting` e `title` não vazio diferente do atual, atualiza `meeting.title` e chama `scheduleSave()` se `persisted`.

**`get code()`:** `meeting?.code ?? blockedCode ?? null`. **`get active()`:** `meeting !== null || blockedCode !== null`. **`get blocked()`:** `blockedCode !== null`.

- [ ] **Passo 1: escrever os testes**

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getLiveStatus,
  getMeeting,
  listMeetings,
  saveMeeting,
  setLiveStatus,
} from '@/shared/storage'
import type { Meeting, ObservedBlock } from '@/shared/types'
import { HEARTBEAT_MS, Recorder, UNAVAILABLE_AFTER_MS } from './recorder'

const CODE = 'abc-defg-hij'
const at = (iso: string) => new Date(iso).getTime()
let n = 0

function createRecorder(tabToken = 'tab-1', diagnostics = false) {
  return new Recorder({
    now: () => Date.now(),
    createId: () => `u${++n}`,
    tabToken,
    diagnosticsEnabled: () => diagnostics,
    userAgent: 'ua',
    language: 'pt-BR',
  })
}

const key = {}
const blocks = (text: string): ObservedBlock[] => [
  { key, speaker: 'Ana', text },
]

describe('Recorder', () => {
  beforeEach(() => {
    n = 0
    vi.useFakeTimers()
    vi.setSystemTime(at('2026-11-14T10:00:00-03:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('não cria reunião antes da primeira fala', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await listMeetings()).toEqual([])
    expect((await getLiveStatus())?.meetingId).toBeNull()
  })

  test('salva as falas no máximo uma vez por segundo', async () => {
    const setSpy = vi.spyOn(chrome.storage.local, 'set')
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    for (let i = 1; i <= 10; i++) {
      recorder.observe(blocks(`bom dia ${'pessoal '.repeat(i)}`), 'on', null)
      await vi.advanceTimersByTimeAsync(90)
    }
    await vi.advanceTimersByTimeAsync(1_000)
    const meetingWrites = setSpy.mock.calls.filter(([items]) =>
      Object.keys(items).some((k) => k.startsWith('meeting:'))
    )
    expect(meetingWrites.length).toBeLessThanOrEqual(2)
    const [summary] = await listMeetings()
    const saved = await getMeeting(summary.id)
    expect(saved?.utterances[0].text).toBe(
      `bom dia ${'pessoal '.repeat(10)}`.trim()
    )
  })

  test('cria a reunião com o id código_início e status ao vivo', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await vi.advanceTimersByTimeAsync(1_000)
    const id = `${CODE}_${at('2026-11-14T10:00:00-03:00')}`
    expect((await getMeeting(id))?.title).toBe('Daily')
    expect((await getLiveStatus())?.meetingId).toBe(id)
  })

  test('continua a reunião do mesmo dia com uma nova sessão', async () => {
    const previous: Meeting = {
      id: `${CODE}_1`,
      code: CODE,
      title: 'Daily',
      startedAt: at('2026-11-14T09:00:00-03:00'),
      sessions: [
        {
          startedAt: at('2026-11-14T09:00:00-03:00'),
          endedAt: at('2026-11-14T09:30:00-03:00'),
        },
      ],
      utterances: [
        {
          id: 'old',
          speaker: 'Pedro',
          startedAt: 1,
          text: 'antes',
          final: true,
        },
      ],
    }
    await saveMeeting(previous)
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('depois'), 'on', null)
    await vi.advanceTimersByTimeAsync(1_000)
    const saved = await getMeeting(`${CODE}_1`)
    expect(saved?.sessions).toHaveLength(2)
    expect(saved?.utterances.map((u) => u.text)).toEqual(['antes', 'depois'])
    expect(await listMeetings()).toHaveLength(1)
  })

  test('cria reunião nova quando a anterior é de outro dia', async () => {
    await saveMeeting({
      id: `${CODE}_1`,
      code: CODE,
      title: 'Daily',
      startedAt: at('2026-11-13T09:00:00-03:00'),
      sessions: [
        {
          startedAt: at('2026-11-13T09:00:00-03:00'),
          endedAt: at('2026-11-13T09:30:00-03:00'),
        },
      ],
      utterances: [
        {
          id: 'old',
          speaker: 'Pedro',
          startedAt: 1,
          text: 'ontem',
          final: true,
        },
      ],
    })
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('hoje'), 'on', null)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(await listMeetings()).toHaveLength(2)
  })

  test('heartbeat atualiza o fim da sessão', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await vi.advanceTimersByTimeAsync(HEARTBEAT_MS + 1_000)
    const [summary] = await listMeetings()
    expect(summary.endedAt).toBeGreaterThanOrEqual(
      at('2026-11-14T10:00:15-03:00')
    )
  })

  test('leave fecha as falas, salva e limpa o status ao vivo', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await recorder.leave()
    const [summary] = await listMeetings()
    const saved = await getMeeting(summary.id)
    expect(saved?.utterances[0].final).toBe(true)
    expect(await getLiveStatus()).toBeUndefined()
    expect(recorder.active).toBe(false)
  })

  test('depois de leave, um salvamento pendente não acontece', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(blocks('oi'), 'on', null)
    await recorder.leave()
    const [summary] = await listMeetings()
    await chrome.storage.local.remove(`meeting:${summary.id}`)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await getMeeting(summary.id)).toBeUndefined()
  })

  test('legendas desligadas por mim: estado captions-off', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(null, 'off', null)
    await vi.advanceTimersByTimeAsync(0)
    expect((await getLiveStatus())?.state).toBe('captions-off')
  })

  test('legendas sumindo por 20s sem motivo: estado captions-unavailable', async () => {
    const recorder = createRecorder()
    await recorder.join(CODE, 'Daily')
    recorder.observe(null, 'unknown', null)
    await vi.advanceTimersByTimeAsync(UNAVAILABLE_AFTER_MS - 1)
    recorder.observe(null, 'unknown', null)
    await vi.advanceTimersByTimeAsync(0)
    expect((await getLiveStatus())?.state).toBe('recording')
    await vi.advanceTimersByTimeAsync(1)
    recorder.observe(null, 'unknown', null)
    await vi.advanceTimersByTimeAsync(0)
    expect((await getLiveStatus())?.state).toBe('captions-unavailable')
  })

  test('não grava se outra aba já grava a mesma reunião', async () => {
    await setLiveStatus({
      meetingId: null,
      code: CODE,
      title: 'Daily',
      since: Date.now(),
      heartbeatAt: Date.now(),
      state: 'recording',
      utteranceCount: 0,
      tabToken: 'outra-aba',
    })
    const recorder = createRecorder('tab-1')
    await recorder.join(CODE, 'Daily')
    expect(recorder.blocked).toBe(true)
    recorder.observe(blocks('oi'), 'on', null)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(await listMeetings()).toEqual([])
    expect((await getLiveStatus())?.tabToken).toBe('outra-aba')
  })

  test('com diagnóstico ligado, salva o log mesmo sem falas', async () => {
    const recorder = createRecorder('tab-1', true)
    await recorder.join(CODE, 'Daily')
    recorder.observe(null, 'unknown', null)
    await recorder.flush()
    const all = await chrome.storage.local.get(null)
    expect(Object.keys(all).some((k) => k.startsWith('diagnostics:'))).toBe(
      true
    )
    expect(await listMeetings()).toEqual([])
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/recorder.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar `src/features/recording/recorder.ts`** seguindo todas as regras acima. Use `ReturnType<typeof setTimeout>` e `ReturnType<typeof setInterval>` nos timers.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/recorder.test.ts`
Esperado: PASS (12 testes).

- [ ] **Passo 5: commit**

```bash
git add src/features/recording/recorder.ts src/features/recording/recorder.test.ts
git commit -m "feat: orchestrate recording, sessions and live status"
```

---

### Tarefa 10: importar reuniões do formato antigo (`legacy-import`)

Atende o ponto em aberto 1 da spec: importar como estão, marcadas como formato antigo.

**Arquivos:**

- Criar: `src/features/recording/legacy-import.ts`
- Teste: `src/features/recording/legacy-import.test.ts`

**Interfaces:**

- Produz: `LEGACY_PREFIX = 'captionText_'`, `LEGACY_HISTORY_PREFIX = 'history_captionText_'`, `readLegacyMeetings(ls: Storage): { meetings: Meeting[]; keys: string[] }`, `importLegacyMeetings(ls: Storage, save: (meeting: Meeting) => Promise<void>): Promise<number>`.

**Regras:**

- Para cada chave `captionText_<timestamp>` cujo valor seja um JSON `{ text: string, title?: string }` com `text` não vazio, cria:

```ts
{
  id: `legacy_${ts}`,
  code: '',
  title: title || 'Reunião antiga',
  startedAt: ts,
  sessions: [{ startedAt: ts, endedAt: ts }],
  utterances: [{ id: `legacy_${ts}_1`, speaker: '', startedAt: ts, text, final: true }],
  legacy: true,
}
```

- `keys` inclui todas as chaves `captionText_*` processadas (válidas ou com texto vazio) e **todas** as `history_captionText_*`, inclusive as órfãs.
- JSON inválido: a chave é ignorada e fica no `localStorage`.
- `importLegacyMeetings` salva cada reunião com `save` e, só depois de todas salvas, remove as `keys` do `localStorage`. Devolve quantas reuniões importou. Se `save` falhar, não remove nada.

- [ ] **Passo 1: escrever os testes**

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { importLegacyMeetings, readLegacyMeetings } from './legacy-import'

describe('legacy import', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('converte as reuniões antigas', () => {
    localStorage.setItem(
      'captionText_1000',
      JSON.stringify({ text: 'Ana\noi', title: 'Daily' })
    )
    localStorage.setItem('history_captionText_1000', '[]')
    localStorage.setItem(
      'captionText_2000',
      JSON.stringify({ text: 'Pedro\nolá' })
    )
    localStorage.setItem('outra_chave', 'x')
    const { meetings, keys } = readLegacyMeetings(localStorage)
    expect(
      meetings.map((m) => [m.id, m.title, m.legacy, m.utterances[0].text])
    ).toEqual(
      expect.arrayContaining([
        ['legacy_1000', 'Daily', true, 'Ana\noi'],
        ['legacy_2000', 'Reunião antiga', true, 'Pedro\nolá'],
      ])
    )
    expect(keys.sort()).toEqual([
      'captionText_1000',
      'captionText_2000',
      'history_captionText_1000',
    ])
  })

  test('remove histórico órfão e ignora JSON inválido', () => {
    localStorage.setItem('history_captionText_3000', '[]')
    localStorage.setItem('captionText_4000', '{quebrado')
    const { meetings, keys } = readLegacyMeetings(localStorage)
    expect(meetings).toEqual([])
    expect(keys).toEqual(['history_captionText_3000'])
  })

  test('importa, salva e só então limpa o localStorage', async () => {
    localStorage.setItem(
      'captionText_1000',
      JSON.stringify({ text: 'oi', title: 'Daily' })
    )
    const save = vi.fn(async () => {})
    expect(await importLegacyMeetings(localStorage, save)).toBe(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('captionText_1000')).toBeNull()
  })

  test('se salvar falhar, não apaga nada', async () => {
    localStorage.setItem('captionText_1000', JSON.stringify({ text: 'oi' }))
    const save = vi.fn(async () => {
      throw new Error('falhou')
    })
    await expect(importLegacyMeetings(localStorage, save)).rejects.toThrow(
      'falhou'
    )
    expect(localStorage.getItem('captionText_1000')).not.toBeNull()
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/legacy-import.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar** seguindo as regras. Para listar as chaves, use `for (let i = 0; i < ls.length; i++) ls.key(i)` e copie a lista antes de remover.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording/legacy-import.test.ts`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/recording/legacy-import.ts src/features/recording/legacy-import.test.ts
git commit -m "feat: import meetings saved in the old format"
```

---

### Tarefa 11: controller do content script e entrada

Atende R1.1, R2.5, R3.2 a R3.4 e R3.6, e os pontos de atenção 1, 3 e 4. Liga as peças à página do Meet.

**Arquivos:**

- Criar: `src/features/recording/content-controller.ts`
- Reescrever: `src/entries/content-script.ts`
- Teste: `src/features/recording/content-controller.test.ts`

**Interfaces:**

- Consome: `getSettings`, `onSettingsChange` e `saveMeeting` (Tarefa 2); `parseMeetingCode`; tudo de `meet-dom`; `CaptionsAutostart`; `Recorder`; `importLegacyMeetings`.
- Produz:

```ts
export const POLL_MS = 1_000
export const OBSERVE_DEBOUNCE_MS = 100

export type ControllerDeps = {
  doc: Document
  win: Window
  now: () => number
  createId: () => string
  tabToken: string
}

export function startContentController(deps: ControllerDeps): {
  ready: Promise<void>
  dispose: () => Promise<void>
}
```

**Comportamento:**

1. `settings` começa como `DEFAULT_SETTINGS`. `ready = getSettings().then(s => { settings = s; return run() })`.
2. Fila serial: `run()` encadeia `evaluate` numa promise (`queue = queue.then(evaluate).catch(err => console.error('[meet-captions]', err))`) e devolve a fila. Nunca rode dois `evaluate` ao mesmo tempo.
3. `MutationObserver` no `doc.body` com `{ childList: true, subtree: true, characterData: true }`. A cada mudança, se não houver timer pendente, agenda `run()` em `OBSERVE_DEBOUNCE_MS`.
4. `setInterval(run, POLL_MS)`, para detectar mudança de URL e de estado da chamada mesmo sem mutações.
5. `onSettingsChange(s => { settings = s; void run() })`.
6. `win.addEventListener('pagehide', onPageHide)`, em que `onPageHide = () => { void recorder.leave() }`.
7. `evaluate()`:

```ts
async function evaluate() {
  if (!settings.enabled) {
    if (recorder.active) await recorder.leave()
    return
  }
  const code = parseMeetingCode(deps.win.location.href)
  const inCall = code !== null && isInCall(deps.doc)
  if (recorder.active && (!inCall || recorder.code !== code)) {
    await recorder.leave()
  }
  if (!recorder.active && inCall && code) {
    autostart.reset()
    await recorder.join(code, getMeetingTitle(deps.doc))
  }
  if (!recorder.active || recorder.blocked) return

  autostart.tick(deps.doc)
  const region = findCaptionsRegion(deps.doc)
  let blocks = region ? readCaptionBlocks(region) : null
  // Região com texto mas nenhum bloco reconhecido: a leitura falhou (o Meet mudou a página).
  if (
    region &&
    blocks &&
    blocks.length === 0 &&
    (region.textContent ?? '').trim()
  ) {
    blocks = null
  }
  const captionsState: CaptionsState = findTurnOnCaptionsButton(deps.doc)
    ? 'off'
    : region
      ? 'on'
      : 'unknown'
  recorder.observe(blocks, captionsState, region)
  const title = getMeetingTitle(deps.doc)
  if (title) recorder.setTitle(title)
}
```

8. `dispose()`: desconecta o observer, cancela os timers, remove o listener de `pagehide`, cancela a inscrição em settings, `await queue` e `await recorder.leave()`.

**`src/entries/content-script.ts`** (código completo):

```ts
import { saveMeeting } from '@/shared/storage'
import { startContentController } from '@/features/recording/content-controller'
import { importLegacyMeetings } from '@/features/recording/legacy-import'

startContentController({
  doc: document,
  win: window,
  now: () => Date.now(),
  createId: () => crypto.randomUUID(),
  tabToken: crypto.randomUUID(),
})

void importLegacyMeetings(window.localStorage, saveMeeting).catch(
  (error: unknown) => {
    console.error('[meet-captions] falha ao importar reuniões antigas', error)
  }
)
```

- [ ] **Passo 1: escrever os testes**

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getLiveStatus,
  getMeeting,
  getSettings,
  listMeetings,
  updateSettings,
} from '@/shared/storage'
import {
  MEET_CAPTIONS_OFF_EN,
  MEET_IN_CALL_EN,
  MEET_LANDING,
} from './__fixtures__/meet-dom'
import { startContentController } from './content-controller'

let n = 0
let controller: ReturnType<typeof startContentController> | null = null

function start() {
  controller = startContentController({
    doc: document,
    win: window,
    now: () => Date.now(),
    createId: () => `u${++n}`,
    tabToken: 'tab-1',
  })
  return controller.ready
}

function goTo(path: string) {
  window.history.pushState({}, '', path)
}

describe('content controller', () => {
  beforeEach(() => {
    n = 0
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-14T10:00:00-03:00'))
    document.body.innerHTML = ''
    goTo('/')
  })

  afterEach(async () => {
    await controller?.dispose()
    controller = null
    vi.useRealTimers()
  })

  test('grava as falas de uma reunião', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    const [summary] = await listMeetings()
    expect(summary.code).toBe('abc-defg-hij')
    expect(summary.title).toBe('Daily do time')
    expect(summary.utteranceCount).toBe(2)
  })

  test('extensão desligada: não grava e não clica em nada', async () => {
    await updateSettings({ enabled: false })
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    const click = vi.fn()
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', click)
    await start()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(click).not.toHaveBeenCalled()
    expect(await listMeetings()).toEqual([])
    expect(await getLiveStatus()).toBeUndefined()
  })

  test('liga as legendas uma vez e respeita quando eu desligo', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    const click = vi.fn(() => {
      document.body.innerHTML = MEET_IN_CALL_EN
    })
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', click)
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    expect(click).toHaveBeenCalledTimes(1)

    document.body.innerHTML = MEET_CAPTIONS_OFF_EN
    const secondClick = vi.fn()
    document
      .querySelector('[aria-label="Turn on captions (c)"]')!
      .addEventListener('click', secondClick)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(secondClick).not.toHaveBeenCalled()
    expect((await getLiveStatus())?.state).toBe('captions-off')
  })

  test('navegação sem recarregar: entra, sai e volta na mesma reunião', async () => {
    document.body.innerHTML = MEET_LANDING
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await getLiveStatus()).toBeUndefined()

    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await vi.advanceTimersByTimeAsync(1_500)
    expect((await getLiveStatus())?.code).toBe('abc-defg-hij')

    document.body.innerHTML = '<p>Você saiu da reunião</p>'
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await getLiveStatus()).toBeUndefined()

    vi.setSystemTime(new Date('2026-11-14T14:00:00-03:00'))
    document.body.innerHTML = MEET_IN_CALL_EN
    await vi.advanceTimersByTimeAsync(1_500)
    const meetings = await listMeetings()
    expect(meetings).toHaveLength(1)
    expect((await getMeeting(meetings[0].id))?.sessions).toHaveLength(2)
  })

  test('pagehide salva o que estava na tela imediatamente', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    document.querySelector('#b2 > div:last-child')!.textContent =
      'combinado então'
    await vi.advanceTimersByTimeAsync(150)
    window.dispatchEvent(new Event('pagehide'))
    await vi.advanceTimersByTimeAsync(0)
    const [summary] = await listMeetings()
    const saved = await getMeeting(summary.id)
    expect(saved?.utterances.map((u) => u.text)).toContain('combinado então')
  })

  test('desligar no meio da reunião para de gravar e limpa o status', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    await updateSettings({ enabled: false })
    await vi.advanceTimersByTimeAsync(100)
    expect(await getLiveStatus()).toBeUndefined()
    expect((await getSettings()).enabled).toBe(false)
  })

  test('descartar com salvamento pendente: a reunião não reaparece', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    const [summary] = await listMeetings()
    document.querySelector('#b2 > div:last-child')!.textContent =
      'combinado então'
    await vi.advanceTimersByTimeAsync(150)
    await updateSettings({ enabled: false })
    await vi.advanceTimersByTimeAsync(100)
    await chrome.storage.local.remove([`meeting:${summary.id}`, 'meetingIndex'])
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await getMeeting(summary.id)).toBeUndefined()
    expect(await listMeetings()).toEqual([])
  })

  test('ligar no meio da reunião começa a gravar a partir dali', async () => {
    await updateSettings({ enabled: false })
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await listMeetings()).toEqual([])
    await updateSettings({ enabled: true })
    await vi.advanceTimersByTimeAsync(1_500)
    expect(await listMeetings()).toHaveLength(1)
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/recording/content-controller.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar `content-controller.ts`** seguindo o comportamento acima, e reescrever `src/entries/content-script.ts` com o código completo.

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/recording`
Esperado: PASS em todos os testes da pasta.

- [ ] **Passo 5: conferir o build**

Run: `pnpm build && head -c 300 dist/content-script.js`
Esperado: o arquivo começa com uma função autoexecutável (`(function`, ou o `"use strict"` seguido dela) e não contém `import `. Confira com `grep -c "^import " dist/content-script.js`: esperado `0`.

- [ ] **Passo 6: commit**

```bash
git add src/features/recording/content-controller.ts src/features/recording/content-controller.test.ts src/entries/content-script.ts
git commit -m "feat: wire recording into the Meet page"
```

---

### Tarefa 12: selo do ícone e service worker

Atende R3.8.

**Arquivos:**

- Criar: `src/features/extension-toggle/badge.ts`
- Reescrever: `src/entries/background.ts`
- Teste: `src/features/extension-toggle/badge.test.ts`

**Interfaces:**

- Produz: `applyBadge(enabled: boolean): Promise<void>`.

**Regras de `applyBadge`:**

- Ligada: `setBadgeText({ text: '' })` e `setTitle({ title: 'Meet Captions: ligada' })`.
- Desligada: `setBadgeText({ text: 'OFF' })`, `setBadgeBackgroundColor({ color: '#6b7280' })` e `setTitle({ title: 'Meet Captions: desligada' })`.

**`src/entries/background.ts`** (código completo):

```ts
import { applyBadge } from '@/features/extension-toggle/badge'
import { getSettings, onSettingsChange } from '@/shared/storage'

async function syncBadge() {
  const settings = await getSettings()
  await applyBadge(settings.enabled)
}

chrome.runtime.onInstalled.addListener(() => {
  void syncBadge()
})

chrome.runtime.onStartup.addListener(() => {
  void syncBadge()
})

onSettingsChange((settings) => {
  void applyBadge(settings.enabled)
})
```

- [ ] **Passo 1: escrever os testes**

```ts
import { describe, expect, test } from 'vitest'
import { applyBadge } from './badge'

describe('applyBadge', () => {
  test('ligada: sem selo', async () => {
    await applyBadge(true)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'Meet Captions: ligada',
    })
  })

  test('desligada: selo OFF cinza', async () => {
    await applyBadge(false)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'OFF' })
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#6b7280',
    })
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      title: 'Meet Captions: desligada',
    })
  })
})
```

- [ ] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/extension-toggle/badge.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: implementar `badge.ts` e reescrever `background.ts`.**

- [ ] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/extension-toggle/badge.test.ts`
Esperado: PASS.

- [ ] **Passo 5: commit**

```bash
git add src/features/extension-toggle/badge.ts src/features/extension-toggle/badge.test.ts src/entries/background.ts
git commit -m "feat: show extension on/off state on the toolbar icon"
```

---

### Tarefa 13: formatação e componentes de transcrição compartilhados

Atende R2.3 (marcação de saída e volta) e cria os componentes que a página de reuniões usa agora e a janela flutuante vai reutilizar na etapa 3.

**Arquivos:**

- Criar: `src/lib/format.ts`, `src/lib/download.ts`, `src/components/transcript/utterance-item.tsx`, `src/components/transcript/transcript-view.tsx`, `src/components/transcript/transcript-view.stories.tsx`
- Teste: `src/lib/format.test.ts`, `src/components/transcript/transcript-view.test.tsx`

**Interfaces:**

- Produz:
  - `formatTime(ms: number): string`: `HH:mm` em pt-BR, ex.: `"10:02"`
  - `formatDateTime(ms: number): string`: ex.: `"14/11/2026 10:02"`
  - `formatDuration(ms: number): string`: menos de 60 min `"32 min"`; senão `"1h 05min"`; menos de 1 min `"0 min"`
  - `displayTitle(item: { customTitle?: string; title: string; code: string }): string`: `customTitle` não vazio, senão `title` não vazio, senão `"Reunião " + code` se houver código, senão `"Reunião sem título"`
  - `downloadTextFile(filename: string, content: string, mimeType: string): void`: cria um `Blob`, um `<a download>` temporário, clica, remove e revoga a URL
  - `<UtteranceItem utterance={Utterance} />`
  - `<TranscriptView utterances={Utterance[]} sessions={Session[]} />`

**Marcação do `UtteranceItem`** (os testes dependem de cada parte estar num elemento próprio):

```tsx
<li className="flex gap-2 leading-relaxed">
  <time className="text-muted-foreground tabular-nums shrink-0">
    {formatTime(u.startedAt)}
  </time>
  <p>
    {u.speaker && <strong className="font-semibold">{u.speaker}:</strong>}{' '}
    <span
      className={cn('whitespace-pre-wrap', !u.final && 'text-muted-foreground')}
    >
      {u.text}
    </span>
  </p>
</li>
```

Fala sem nome não mostra o nome nem os dois-pontos. Fala com `final === false`: o texto recebe a classe `text-muted-foreground` (R4.6, já pronto para a etapa 3). Use `whitespace-pre-wrap` no texto, porque reuniões antigas têm quebras de linha.

**Regras do `TranscriptView`:**

- `<ol>` com as falas na ordem recebida.
- Para cada sessão `i > 0`, insere antes da primeira fala com `startedAt >= sessions[i].startedAt` um `<li role="separator">` com o texto `Saiu às {formatTime(sessions[i-1].endedAt)} · voltou às {formatTime(sessions[i].startedAt)}`. Se nenhuma fala for posterior, a marcação vai no fim.
- Sem falas: `<p>` com `Nenhuma fala gravada ainda.`

- [ ] **Passo 1: escrever os testes de `format`**

```ts
import { describe, expect, test } from 'vitest'
import {
  displayTitle,
  formatDateTime,
  formatDuration,
  formatTime,
} from './format'

const at = (iso: string) => new Date(iso).getTime()

describe('format', () => {
  test('formatTime', () => {
    expect(formatTime(at('2026-11-14T10:02:59-03:00'))).toBe('10:02')
  })

  test('formatDateTime', () => {
    expect(formatDateTime(at('2026-11-14T10:02:00-03:00'))).toBe(
      '14/11/2026 10:02'
    )
  })

  test.each([
    [30_000, '0 min'],
    [32 * 60_000, '32 min'],
    [65 * 60_000, '1h 05min'],
  ])('formatDuration(%i) = %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })

  test('displayTitle', () => {
    expect(
      displayTitle({
        customTitle: 'Minha',
        title: 'Meet',
        code: 'abc-defg-hij',
      })
    ).toBe('Minha')
    expect(displayTitle({ title: 'Meet', code: 'abc-defg-hij' })).toBe('Meet')
    expect(displayTitle({ title: '', code: 'abc-defg-hij' })).toBe(
      'Reunião abc-defg-hij'
    )
    expect(displayTitle({ title: '', code: '' })).toBe('Reunião sem título')
  })
})
```

- [ ] **Passo 2: escrever os testes do `TranscriptView`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Session, Utterance } from '@/shared/types'
import { TranscriptView } from './transcript-view'

const at = (iso: string) => new Date(iso).getTime()
const u = (
  id: string,
  iso: string,
  speaker: string,
  text: string,
  final = true
): Utterance => ({
  id,
  speaker,
  startedAt: at(iso),
  text,
  final,
})

describe('TranscriptView', () => {
  test('mostra horário, nome e texto de cada fala', () => {
    render(
      <TranscriptView
        utterances={[u('1', '2026-11-14T10:02:00-03:00', 'Pedro', 'bom dia')]}
        sessions={[
          {
            startedAt: at('2026-11-14T10:00:00-03:00'),
            endedAt: at('2026-11-14T10:30:00-03:00'),
          },
        ]}
      />
    )
    expect(screen.getByText('10:02')).toBeInTheDocument()
    expect(screen.getByText('Pedro:')).toBeInTheDocument()
    expect(screen.getByText('bom dia')).toBeInTheDocument()
  })

  test('marca quando saí e voltei', () => {
    const sessions: Session[] = [
      {
        startedAt: at('2026-11-14T10:00:00-03:00'),
        endedAt: at('2026-11-14T10:20:00-03:00'),
      },
      {
        startedAt: at('2026-11-14T14:05:00-03:00'),
        endedAt: at('2026-11-14T14:30:00-03:00'),
      },
    ]
    render(
      <TranscriptView
        utterances={[
          u('1', '2026-11-14T10:02:00-03:00', 'Ana', 'manhã'),
          u('2', '2026-11-14T14:06:00-03:00', 'Ana', 'tarde'),
        ]}
        sessions={sessions}
      />
    )
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    const separator = screen.getByRole('separator')
    expect(separator).toHaveTextContent('Saiu às 10:20 · voltou às 14:05')
    expect(items[0]).toContain('manhã')
    expect(items[1]).toContain('tarde')
  })

  test('fala ainda aberta aparece mais clara', () => {
    render(
      <TranscriptView
        utterances={[
          u('1', '2026-11-14T10:02:00-03:00', 'Ana', 'digitando', false),
        ]}
        sessions={[]}
      />
    )
    expect(screen.getByText('digitando')).toHaveClass('text-muted-foreground')
  })

  test('sem falas', () => {
    render(<TranscriptView utterances={[]} sessions={[]} />)
    expect(screen.getByText('Nenhuma fala gravada ainda.')).toBeInTheDocument()
  })
})
```

Observação: `getAllByRole('listitem')` não inclui o separador, porque ele tem `role="separator"`.

- [ ] **Passo 3: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/lib src/components/transcript`
Esperado: FAIL.

- [ ] **Passo 4: implementar** `format.ts`, `download.ts`, `utterance-item.tsx` e `transcript-view.tsx`. Use `cn()` para as classes condicionais.

Em `format.ts`, monte as strings com os componentes da data (`getDate`, `getMonth`, `getFullYear`, `getHours`, `getMinutes`) e `padStart(2, '0')`, **não** com `Intl.DateTimeFormat`. O `Intl` em pt-BR coloca uma vírgula (`"14/11/2026, 10:02"`), e os testes esperam `"14/11/2026 10:02"`.

- [ ] **Passo 5: criar a story** `transcript-view.stories.tsx` com três estados: `Padrao` (algumas falas), `ComSaidaEVolta` (duas sessões) e `Vazio`.

- [ ] **Passo 6: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/lib src/components/transcript`
Esperado: PASS.

- [ ] **Passo 7: commit**

```bash
git add src/lib src/components/transcript
git commit -m "feat: add shared transcript components and formatters"
```

---

### Tarefa 14: menu da extensão (popup) com interruptor e confirmações

Atende R3.5, R3.7, R5.0a, R5.0b e o R1.9 no menu.

**Arquivos:**

- Criar: `src/features/extension-toggle/disable-extension.ts`, `src/features/extension-toggle/use-settings.ts`, `src/features/extension-toggle/use-live-status.ts`, `src/features/extension-toggle/extension-toggle.tsx`, `src/features/popup/live-status-line.tsx`, `src/features/popup/popup-app.tsx`
- Reescrever: `src/entries/popup.tsx`
- Teste: `src/features/extension-toggle/disable-extension.test.ts`, `src/features/extension-toggle/extension-toggle.test.tsx`, `src/features/popup/live-status-line.test.tsx`

**Interfaces:**

- Consome: `updateSettings`, `getSettings`, `onSettingsChange`, `getLiveStatus`, `clearLiveStatus`, `deleteMeeting`, `onStorageKeysChange`, `STORAGE_KEYS` (Tarefa 2); `displayTitle`, `formatTime` (Tarefa 13).
- Produz:
  - `DISABLE_WAIT_MS = 2_000`
  - `disableExtension(options: { discard: boolean; meetingId: string | null }): Promise<void>`
  - `useSettings(): { settings: Settings | null; update: (patch: Partial<Settings>) => Promise<void> }`
  - `useLiveStatus(): LiveStatus | undefined`: lê ao montar, relê a cada mudança da chave `live` e a cada 5 s (para notar heartbeat vencido)
  - `<ExtensionToggle enabled live onEnable onDisable />`
  - `<LiveStatusLine live now />`
  - `<PopupApp />`

**Regras de `disableExtension`:**

1. `await updateSettings({ enabled: false })`.
2. Espera até `DISABLE_WAIT_MS`, checando a cada 100 ms, até `getLiveStatus()` devolver `undefined`. Isso dá tempo para o content script salvar e sair.
3. `await clearLiveStatus()` (sem token), para limpar status de aba travada.
4. Se `discard && meetingId`, chama `await deleteMeeting(meetingId)`. A exclusão acontece **depois** de o content script parar, para a reunião não reaparecer.

**Props e fluxo do `ExtensionToggle`:**

```ts
type ExtensionToggleProps = {
  enabled: boolean
  live: LiveStatus | undefined
  onEnable: () => void | Promise<void>
  onDisable: (options: { discard: boolean }) => void | Promise<void>
}
```

- Um `Switch` do shadcn com `aria-label="Ligar ou desligar a extensão"` e, ao lado, o texto `Ligada` ou `Desligada`.
- Clicar quando desligada chama `onEnable()` direto, sem diálogo.
- Clicar quando ligada abre um `AlertDialog`. A etapa do diálogo é um estado `'closed' | 'confirm' | 'confirm-live' | 'keep-or-discard'`. "Há gravação" quer dizer `live !== undefined && live.meetingId !== null`.
  - Sem gravação, etapa `confirm`: título `Desligar a extensão?`, descrição `Ela deixará de ligar as legendas e de gravar as reuniões.`, botões `Cancelar` e `Desligar`. `Desligar` chama `onDisable({ discard: false })`.
  - Com gravação, etapa `confirm-live`: título `Há uma reunião sendo gravada`, descrição `Deseja desligar a extensão mesmo assim?`, botões `Cancelar` e `Desligar`. `Desligar` vai para `keep-or-discard`.
  - Etapa `keep-or-discard`: título `O que fazer com a gravação?`, descrição `"{displayTitle(live)}" já tem {live.utteranceCount} falas gravadas.`, botões `Cancelar`, `Descartar` (variante `destructive`) e `Manter gravação`. `Descartar` chama `onDisable({ discard: true })`. `Manter gravação` chama `onDisable({ discard: false })`.
  - `Cancelar` em qualquer etapa fecha o diálogo sem chamar nada.
  - **Importante:** o `AlertDialogAction` fecha o diálogo sozinho. Na etapa `confirm-live`, use um `Button` comum no lugar do `AlertDialogAction` para conseguir ir à próxima etapa.

**Textos do `LiveStatusLine`** (`live`, `now`):

- `live` indefinido: `Nenhuma reunião em andamento`
- `state === 'captions-unavailable'`: `Não foi possível ler as legendas desta reunião` (com classe `text-destructive`)
- `state === 'captions-off'`: `Legendas desligadas · gravação pausada`
- `meetingId === null`: `Na reunião {code} · aguardando legendas`
- Senão, duas linhas: `Gravando: {displayTitle(live)}` e `desde {formatTime(live.since)} · {Math.floor((now - live.since) / 60000)} min`

**`PopupApp`:** largura `w-80`, padding `p-4`, `gap-4`.

- Cabeçalho `Meet Captions`.
- Linha com o texto `Extensão` e o `ExtensionToggle`. `onEnable` chama `update({ enabled: true })`. `onDisable` chama `disableExtension({ discard, meetingId: live?.meetingId ?? null })`.
- `LiveStatusLine`, com `now` atualizado a cada 30 s.
- `Button` `Abrir reuniões salvas` com o ícone `ArrowRight` do lucide, que chama `chrome.tabs.create({ url: chrome.runtime.getURL('meetings.html') })`.
- Enquanto `settings` for `null`, não renderiza o interruptor.

**`src/entries/popup.tsx`:** igual ao provisório da Tarefa 1, mas renderizando `<PopupApp />`.

- [ ] **Passo 1: escrever os testes de `disableExtension`**

```ts
import { describe, expect, test } from 'vitest'
import {
  clearLiveStatus,
  getMeeting,
  getSettings,
  onSettingsChange,
  saveMeeting,
  setLiveStatus,
} from '@/shared/storage'
import type { Meeting } from '@/shared/types'
import { disableExtension } from './disable-extension'

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

async function simulateRecordingTab() {
  await saveMeeting(meeting)
  await setLiveStatus({
    meetingId: 'm1',
    code: 'abc-defg-hij',
    title: 'Daily',
    since: Date.now(),
    heartbeatAt: Date.now(),
    state: 'recording',
    utteranceCount: 1,
    tabToken: 'tab-1',
  })
  onSettingsChange((settings) => {
    if (!settings.enabled) setTimeout(() => void clearLiveStatus('tab-1'), 50)
  })
}

describe('disableExtension', () => {
  test('desliga e mantém a gravação', async () => {
    await simulateRecordingTab()
    await disableExtension({ discard: false, meetingId: 'm1' })
    expect((await getSettings()).enabled).toBe(false)
    expect(await getMeeting('m1')).toBeDefined()
  })

  test('desliga e descarta a gravação depois que a aba para', async () => {
    await simulateRecordingTab()
    await disableExtension({ discard: true, meetingId: 'm1' })
    expect(await getMeeting('m1')).toBeUndefined()
  })

  test('sem aba respondendo, termina depois do tempo limite', async () => {
    await saveMeeting(meeting)
    await setLiveStatus({
      meetingId: 'm1',
      code: 'abc-defg-hij',
      title: 'Daily',
      since: Date.now(),
      heartbeatAt: Date.now(),
      state: 'recording',
      utteranceCount: 1,
      tabToken: 'tab-travada',
    })
    await disableExtension({ discard: true, meetingId: 'm1' })
    expect(await getMeeting('m1')).toBeUndefined()
  }, 5_000)
})
```

- [ ] **Passo 2: escrever os testes do `ExtensionToggle`**

```tsx
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
```

Se `@testing-library/user-event` não estiver instalado, adicione: `pnpm add -D @testing-library/user-event`.

- [ ] **Passo 3: escrever os testes do `LiveStatusLine`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { LiveStatus } from '@/shared/types'
import { LiveStatusLine } from './live-status-line'

const since = new Date('2026-11-14T10:02:00-03:00').getTime()
const base: LiveStatus = {
  meetingId: 'm1',
  code: 'abc-defg-hij',
  title: 'Daily do time',
  since,
  heartbeatAt: since,
  state: 'recording',
  utteranceCount: 3,
  tabToken: 't',
}

describe('LiveStatusLine', () => {
  test('sem reunião', () => {
    render(<LiveStatusLine live={undefined} now={since} />)
    expect(screen.getByText('Nenhuma reunião em andamento')).toBeInTheDocument()
  })

  test('gravando', () => {
    render(<LiveStatusLine live={base} now={since + 14 * 60_000} />)
    expect(screen.getByText('Gravando: Daily do time')).toBeInTheDocument()
    expect(screen.getByText('desde 10:02 · 14 min')).toBeInTheDocument()
  })

  test('aguardando legendas', () => {
    render(<LiveStatusLine live={{ ...base, meetingId: null }} now={since} />)
    expect(
      screen.getByText('Na reunião abc-defg-hij · aguardando legendas')
    ).toBeInTheDocument()
  })

  test('legendas desligadas', () => {
    render(
      <LiveStatusLine live={{ ...base, state: 'captions-off' }} now={since} />
    )
    expect(
      screen.getByText('Legendas desligadas · gravação pausada')
    ).toBeInTheDocument()
  })

  test('legendas indisponíveis', () => {
    render(
      <LiveStatusLine
        live={{ ...base, state: 'captions-unavailable' }}
        now={since}
      />
    )
    expect(
      screen.getByText('Não foi possível ler as legendas desta reunião')
    ).toBeInTheDocument()
  })
})
```

- [ ] **Passo 4: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/extension-toggle src/features/popup`
Esperado: FAIL (exceto o `badge.test.ts`, que já passa).

- [ ] **Passo 5: implementar** todos os arquivos da tarefa seguindo as regras e textos acima.

- [ ] **Passo 6: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/extension-toggle src/features/popup`
Esperado: PASS.

- [ ] **Passo 7: commit**

```bash
git add src/features/extension-toggle src/features/popup src/entries/popup.tsx package.json pnpm-lock.yaml
git commit -m "feat: add extension menu with on/off toggle and confirmations"
```

---

### Tarefa 15: página de reuniões mínima (só leitura e diagnóstico)

Atende R5.1 a R5.3 e R5.5 (a lista e a leitura básica), R1.9 na página, R7.1 e R8.2. A etapa 2 acrescenta busca, renomear, apagar, exportação e configurações.

**Arquivos:**

- Criar: `src/features/meetings/use-meetings.ts`, `use-meeting.ts`, `use-diagnostics.ts`, `meeting-list.tsx`, `meeting-detail.tsx`, `live-banner.tsx`, `diagnostics-panel.tsx`, `meetings-app.tsx`, `meeting-list.stories.tsx`
- Reescrever: `src/entries/meetings.tsx`
- Teste: `src/features/meetings/meeting-list.test.tsx`, `src/features/meetings/meetings-app.test.tsx`

**Interfaces:**

- Consome: `listMeetings`, `getMeeting`, `listDiagnostics`, `getDiagnostics`, `onStorageKeysChange`, `STORAGE_KEYS` (Tarefa 2); `useSettings`, `useLiveStatus` (Tarefa 14); `TranscriptView`, `displayTitle`, `formatDateTime`, `formatDuration`, `downloadTextFile` (Tarefa 13).
- Produz:
  - `useMeetings(): MeetingSummary[] | null`: relê quando muda `meetingIndex`
  - `useMeeting(id: string | null): Meeting | null`: relê quando muda `meeting:<id>`
  - `useDiagnostics(): DiagnosticSummary[]`: relê a cada 10 s
  - `<MeetingList meetings selectedId liveMeetingId onSelect />`
  - `<MeetingDetail meeting />`
  - `<LiveBanner live />`
  - `<DiagnosticsPanel enabled onToggle logs onDownload />`
  - `<MeetingsApp />`

**Layout do `MeetingsApp`** (opção A aprovada): tela inteira `h-screen flex`.

- Coluna esquerda `w-80 border-r` com o título `Reuniões` e o `MeetingList` dentro de um `ScrollArea`. Embaixo dela, o `DiagnosticsPanel`.
- Coluna direita `flex-1` com o `LiveBanner` no topo (quando houver) e o `MeetingDetail` da reunião selecionada dentro de um `ScrollArea`.
- Ao abrir, seleciona a primeira reunião da lista.
- Sem reuniões: texto `Nenhuma reunião gravada ainda.` na coluna direita.

**`MeetingList`:** `<ul>`. Cada item é um `<button>` com:

- `displayTitle(m)`;
- a linha `formatDateTime(m.startedAt) · formatDuration(m.endedAt - m.startedAt)`;
- `Badge` `Ao vivo` quando `m.id === liveMeetingId`;
- `Badge` (variante `secondary`) `Formato antigo` quando `m.legacy`.

O item selecionado tem `aria-current="true"` e fundo `bg-accent`.

**`MeetingDetail`:** cabeçalho com `displayTitle`, a linha `formatDateTime(startedAt)` e `Participantes: {nomes únicos não vazios de speaker, na ordem em que aparecem, separados por ", "}` (omitir a linha se não houver). Abaixo, o `TranscriptView`.

**`LiveBanner`:** só aparece com `live.state === 'captions-unavailable'` (texto `Não foi possível ler as legendas da reunião em andamento. Verifique se as legendas estão ligadas no Meet.`, estilo `border-destructive text-destructive`) ou `live.state === 'captions-off'` (texto `Legendas desligadas na reunião em andamento · gravação pausada`). Nos outros casos, não renderiza nada.

**`DiagnosticsPanel`:**

- `Switch` com o rótulo `Modo de diagnóstico` e a descrição `Grava as mudanças das legendas para análise.`;
- abaixo, para cada log: `{código ou "sem código"} · {formatDateTime(startedAt)} · {eventCount} eventos` (mais ` · truncado` se for o caso) e um botão `Baixar` com o ícone `Download`;
- `onDownload(meetingId)` lê `getDiagnostics` e chama `downloadTextFile('diagnostico-{code}-{startedAt}.json', JSON.stringify(log, null, 2), 'application/json')`.

**`src/entries/meetings.tsx`:** igual ao provisório, renderizando `<MeetingsApp />`.

- [ ] **Passo 1: escrever os testes da lista**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { MeetingSummary } from '@/shared/types'
import { MeetingList } from './meeting-list'

const at = (iso: string) => new Date(iso).getTime()
const meetings: MeetingSummary[] = [
  {
    id: 'b',
    code: 'abc-defg-hij',
    title: 'Daily do time',
    startedAt: at('2026-11-14T10:00:00-03:00'),
    endedAt: at('2026-11-14T10:32:00-03:00'),
    utteranceCount: 5,
  },
  {
    id: 'a',
    code: '',
    title: 'Reunião antiga',
    startedAt: at('2026-11-12T09:00:00-03:00'),
    endedAt: at('2026-11-12T09:00:00-03:00'),
    utteranceCount: 1,
    legacy: true,
  },
]

describe('MeetingList', () => {
  test('mostra título, data, duração e selos', () => {
    render(
      <MeetingList
        meetings={meetings}
        selectedId="b"
        liveMeetingId="b"
        onSelect={() => {}}
      />
    )
    expect(screen.getByText('Daily do time')).toBeInTheDocument()
    expect(screen.getByText('14/11/2026 10:00 · 32 min')).toBeInTheDocument()
    expect(screen.getByText('Ao vivo')).toBeInTheDocument()
    expect(screen.getByText('Formato antigo')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Daily do time/ })
    ).toHaveAttribute('aria-current', 'true')
  })

  test('selecionar uma reunião', async () => {
    const onSelect = vi.fn()
    render(
      <MeetingList
        meetings={meetings}
        selectedId="b"
        liveMeetingId={null}
        onSelect={onSelect}
      />
    )
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /Reunião antiga/ }))
    expect(onSelect).toHaveBeenCalledWith('a')
  })
})
```

- [ ] **Passo 2: escrever o teste de integração da página**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { saveMeeting } from '@/shared/storage'
import { MeetingsApp } from './meetings-app'

const at = (iso: string) => new Date(iso).getTime()

describe('MeetingsApp', () => {
  test('lista as reuniões e mostra a mais recente aberta', async () => {
    await saveMeeting({
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
          speaker: 'Pedro',
          startedAt: at('2026-11-14T10:02:00-03:00'),
          text: 'bom dia',
          final: true,
        },
        {
          id: 'u2',
          speaker: 'Ana',
          startedAt: at('2026-11-14T10:03:00-03:00'),
          text: 'vamos lá',
          final: true,
        },
      ],
    })
    render(<MeetingsApp />)
    expect(await screen.findByText('bom dia')).toBeInTheDocument()
    expect(screen.getByText('Participantes: Pedro, Ana')).toBeInTheDocument()
  })

  test('sem reuniões', async () => {
    render(<MeetingsApp />)
    expect(
      await screen.findByText('Nenhuma reunião gravada ainda.')
    ).toBeInTheDocument()
  })
})
```

- [ ] **Passo 3: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/meetings`
Esperado: FAIL.

- [ ] **Passo 4: implementar** todos os arquivos da tarefa seguindo o layout e os textos acima. Componentes de interface só do shadcn (`ScrollArea`, `Badge`, `Switch`, `Button`, `Separator`).

- [ ] **Passo 5: criar a story** `meeting-list.stories.tsx` com os estados `Padrao`, `ComAoVivo` e `Vazia`.

- [ ] **Passo 6: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/meetings`
Esperado: PASS.

- [ ] **Passo 7: suíte completa, lint e build**

Run: `pnpm vitest run && pnpm lint && pnpm build`
Esperado: todos os testes passam (unidade e Storybook), lint sem erros e build sem erros.

- [ ] **Passo 8: commit**

```bash
git add src/features/meetings src/entries/meetings.tsx
git commit -m "feat: add minimal meetings page with diagnostics"
```

---

### Tarefa 16: verificação manual no Chrome

Sem código novo. Confirma que tudo funciona no Meet de verdade. **Precisa do usuário** para entrar numa reunião real. Se você é um agente sem acesso ao navegador, entregue esta lista ao usuário e espere o resultado.

- [ ] **Passo 1: build e carregar a extensão**

Run: `pnpm build`
Depois, em `chrome://extensions`, com o modo de desenvolvedor ativado: remova a versão antiga, clique em "Carregar sem compactação" e selecione `dist`.

- [ ] **Passo 2: roteiro de verificação** (anote o resultado de cada item)

1. Clicar no ícone abre o menu com o interruptor `Ligada`, `Nenhuma reunião em andamento` e o botão `Abrir reuniões salvas`.
2. Entrar numa reunião com o Meet em **português**: as legendas ligam sozinhas e o menu mostra `Gravando: …` depois da primeira fala.
3. Falar por mais de 1 minuto seguido. Depois, na página de reuniões, a fala aparece inteira, sem repetições.
4. Desligar as legendas pelo botão do Meet: elas continuam desligadas e o menu mostra `Legendas desligadas · gravação pausada`. Religar: a gravação continua.
5. Recarregar a aba no meio da reunião: na página de reuniões continua uma reunião só, com a marcação de saída e volta.
6. Desligar a extensão pelo menu durante a reunião: aparecem as duas confirmações. Testar `Manter gravação` numa reunião e `Descartar` em outra.
7. Com a extensão desligada, o ícone mostra `OFF` e entrar numa reunião não liga as legendas.
8. Repetir os itens 2 e 3 com o Meet em **inglês**.
9. Ligar o `Modo de diagnóstico` na página de reuniões, participar de uma reunião e baixar o arquivo de diagnóstico. **Enviar esse arquivo para análise** (R8.4).
10. Reuniões gravadas pela versão antiga aparecem na lista com o selo `Formato antigo`, depois de abrir qualquer página do Meet uma vez.

- [ ] **Passo 3: registrar problemas**

Para cada item que falhar, anote o que aconteceu. Se o problema for na leitura das legendas (itens 2, 3 ou 8), o arquivo de diagnóstico do item 9 é o que permite corrigir: o ajuste vai em `src/features/recording/meet-dom.ts`, e o log real vira um novo cenário em `__fixtures__/scenarios.ts`.

---

## Fora desta etapa (fica para as próximas)

- **Etapa 2:** busca, renomear, apagar (uma, várias, anteriores a uma data), exportar `.md` e `.txt`, configurações com limpeza automática.
- **Etapa 3:** janela flutuante (Picture-in-Picture) e esconder as legendas do Meet.
- **Etapa 4:** CI no GitHub, README e revisão final de dependências.
