# Etapa 3: janela flutuante de legendas (plano de implementação)

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

**Objetivo:** mostrar as legendas ao vivo numa janela sempre por cima (Picture-in-Picture), aberta por um botão dentro do Meet, e esconder as legendas da página enquanto ela está aberta.

**Pré-requisito:** [etapa 2](2026-11-14-etapa-2-tela-de-reunioes-e-configuracoes.md) concluída.

**Requisitos atendidos:** seção 4.4 (R4.1 a R4.11).

---

Atende a seção 4.4. A janela usa a API **Document Picture-in-Picture** do Chrome (`documentPictureInPicture.requestWindow`), que cria uma janela sempre por cima das outras, inclusive em tela cheia.

**Riscos desta etapa, para saber antes de começar:**

- A API só pode ser chamada em resposta a um clique do usuário, dentro da página do Meet. Por isso o botão é colocado na página pelo content script.
- Não dá para testar a abertura da janela no jsdom. A Tarefa 30 começa com uma checagem manual. Se ela falhar, **pare e avise o usuário**. Não tente outra abordagem por conta própria.
- Esconder as legendas do Meet é simples. Fazer o vídeo ocupar o espaço delas depende do Meet (R4.8) e pode não acontecer. O mínimo aceitável é as legendas sumirem.

---

### Tarefa 28: fonte de dados ao vivo para a janela

Atende R4.4 e R4.7: a janela mostra exatamente o que está sendo gravado, sem esperar o salvamento.

**Arquivos:**

- Criar: `src/features/floating-captions/captions-store.ts`
- Modificar: `src/features/recording/recorder.ts`, `src/features/recording/content-controller.ts`
- Teste: `src/features/floating-captions/captions-store.test.ts`; acrescentar em `recorder.test.ts` e `content-controller.test.ts`

**Interfaces:**

- Produz:

```ts
// captions-store.ts
export type FloatingStatus = 'idle' | LiveState
export type FloatingSnapshot = {
  status: FloatingStatus
  utterances: Utterance[]
  sessions: Session[]
}
export type CaptionsStore = {
  getSnapshot: () => FloatingSnapshot
  subscribe: (listener: () => void) => () => void
  set: (next: FloatingSnapshot) => void
}
export const IDLE_SNAPSHOT: FloatingSnapshot
export function createCaptionsStore(): CaptionsStore
```

- No `Recorder`:
  - `get version(): number`: começa em `0` e aumenta em 1 sempre que algo visível muda: no `join`, no `leave`, quando `observe` altera falas (`changed`) e quando `state` muda;
  - `snapshot(): { utterances: Utterance[]; sessions: Session[]; state: LiveState } | null`: `null` sem reunião. As listas são **cópias** (`map(u => ({ ...u }))`).
- `startContentController` passa a devolver também `store: CaptionsStore`.

**Regras:**

- `createCaptionsStore`: começa com `IDLE_SNAPSHOT = { status: 'idle', utterances: [], sessions: [] }`. `set` troca o snapshot e avisa todos os inscritos. `getSnapshot` devolve **o mesmo objeto** até o próximo `set`, o que o `useSyncExternalStore` do React exige.
- Controller: no fim de **cada** `evaluate`, inclusive nos caminhos com `return` antecipado, calcule o estado e atualize a store só se mudou. Use um `try/finally` em volta do corpo do `evaluate` para não esquecer nenhum caminho:

```ts
let lastStoreKey = ''

function syncStore(status: FloatingStatus) {
  const key = `${status}:${recorder.version}`
  if (key === lastStoreKey) return
  lastStoreKey = key
  const snap = recorder.snapshot()
  store.set(
    snap && status !== 'idle' && status !== 'stopped'
      ? {
          status: snap.state,
          utterances: snap.utterances,
          sessions: snap.sessions,
        }
      : { status, utterances: [], sessions: [] }
  )
}
```

O `status` passado é: `'stopped'` quando a gravação desta reunião está parada (Tarefa 26); `'idle'` quando a extensão está desligada, não há chamada ou a aba está bloqueada por outra; senão, `'recording'` (o `syncStore` troca pelo estado real do recorder).

- [x] **Passo 1: escrever os testes**

`captions-store.test.ts`:

```ts
import { expect, test, vi } from 'vitest'
import { IDLE_SNAPSHOT, createCaptionsStore } from './captions-store'

test('começa ocioso e mantém o mesmo objeto entre leituras', () => {
  const store = createCaptionsStore()
  expect(store.getSnapshot()).toBe(IDLE_SNAPSHOT)
  expect(store.getSnapshot()).toBe(store.getSnapshot())
})

test('set troca o snapshot e avisa os inscritos', () => {
  const store = createCaptionsStore()
  const listener = vi.fn()
  const unsubscribe = store.subscribe(listener)
  const next = { status: 'recording' as const, utterances: [], sessions: [] }
  store.set(next)
  expect(store.getSnapshot()).toBe(next)
  expect(listener).toHaveBeenCalledTimes(1)
  unsubscribe()
  store.set({ ...next })
  expect(listener).toHaveBeenCalledTimes(1)
})
```

Acrescente em `recorder.test.ts`:

```ts
test('version aumenta quando algo muda e snapshot devolve cópias', async () => {
  const recorder = createRecorder()
  expect(recorder.snapshot()).toBeNull()
  await recorder.join(CODE, 'Daily')
  const v1 = recorder.version
  recorder.observe(blocks('oi'), 'on', null)
  const v2 = recorder.version
  expect(v2).toBeGreaterThan(v1)
  recorder.observe(blocks('oi'), 'on', null)
  expect(recorder.version).toBe(v2)
  const snap = recorder.snapshot()
  expect(snap?.utterances.map((u) => u.text)).toEqual(['oi'])
  snap!.utterances[0].text = 'alterado'
  expect(recorder.snapshot()?.utterances[0].text).toBe('oi')
})
```

Acrescente em `content-controller.test.ts`:

```ts
test('a store acompanha as falas ao vivo', async () => {
  goTo('/abc-defg-hij')
  document.body.innerHTML = MEET_IN_CALL_EN
  await start()
  await vi.advanceTimersByTimeAsync(300)
  expect(controller!.store.getSnapshot().status).toBe('recording')
  expect(controller!.store.getSnapshot().utterances).toHaveLength(2)
  document.querySelector('#b2 > div:last-child')!.textContent =
    'combinado então'
  await vi.advanceTimersByTimeAsync(300)
  expect(
    controller!.store.getSnapshot().utterances.map((u) => u.text)
  ).toContain('combinado então')
})

test('a store fica ociosa fora de reunião', async () => {
  document.body.innerHTML = MEET_LANDING
  await start()
  await vi.advanceTimersByTimeAsync(1_500)
  expect(controller!.store.getSnapshot().status).toBe('idle')
})
```

- [x] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/floating-captions src/features/recording`
Esperado: FAIL nos testes novos.

- [x] **Passo 3: implementar.**

- [x] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/floating-captions src/features/recording`
Esperado: PASS.

- [x] **Passo 5: commit**

```bash
git add src/features/floating-captions src/features/recording
git commit -m "feat: expose live captions through a store"
```

---

### Tarefa 29: conteúdo da janela flutuante

Atende R4.4 a R4.6 e R4.9 a R4.11.

**Arquivos:**

- Criar: `src/features/floating-captions/use-stick-to-bottom.ts`, `src/features/floating-captions/floating-captions.tsx`, `src/features/floating-captions/floating-captions.stories.tsx`
- Teste: `src/features/floating-captions/use-stick-to-bottom.test.ts`, `src/features/floating-captions/floating-captions.test.tsx`

**Interfaces:**

- Consome: `CaptionsStore`, `FloatingSnapshot` (Tarefa 28); `TranscriptView` (Tarefa 18).
- Produz:
  - `FONT_MIN = 12`, `FONT_MAX = 32`, `FONT_STEP = 2`
  - `isNearBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }, threshold?: number): boolean` (limite padrão `40`)
  - `useStickToBottom(dependency: unknown): { ref: React.RefObject<HTMLDivElement | null>; stuck: boolean; onScroll: () => void; scrollToBottom: () => void }`
  - `<FloatingCaptions store myName fontSize onFontSizeChange />`

**Regras do `useStickToBottom`:**

- `stuck` começa `true`.
- `onScroll`: `setStuck(isNearBottom(ref.current))`.
- Num `useLayoutEffect` que depende de `dependency`: se `stuck`, faz `el.scrollTop = el.scrollHeight`.
- `scrollToBottom`: faz o mesmo e `setStuck(true)`.

**Layout do `FloatingCaptions`** (ocupa a janela inteira: `flex h-screen flex-col bg-background text-foreground`):

1. **Cabeçalho** (`flex items-center justify-between border-b px-3 py-2`): o texto `Legendas` e dois botões `ghost` pequenos: `A−` com `aria-label="Diminuir letra"` e `A+` com `aria-label="Aumentar letra"`.
   - Chamam `onFontSizeChange(fontSize - FONT_STEP)` e `onFontSizeChange(fontSize + FONT_STEP)`.
   - Ficam `disabled` ao chegar em `FONT_MIN` e `FONT_MAX`.
2. **Corpo** (`div` com `ref` do hook, `onScroll`, `className="relative flex-1 overflow-y-auto px-3 py-2"` e `style={{ fontSize }}`):
   - com falas: `<TranscriptView utterances sessions myName={myName} />`;
   - sem falas, uma mensagem centralizada conforme o status:

| `status`               | Mensagem                           |
| ---------------------- | ---------------------------------- |
| `idle`                 | `Nenhuma reunião em andamento`     |
| `recording`            | `Aguardando legendas…`             |
| `captions-off`         | `Legendas desligadas`              |
| `stopped`              | `Gravação parada nesta reunião`    |
| `captions-unavailable` | `Não foi possível ler as legendas` |

3. **Aviso no rodapé**, quando **há** falas e o status não é `recording`: uma faixa (`border-t px-3 py-1 text-sm`) com a mesma mensagem da tabela. Com `captions-unavailable`, use `text-destructive`.
4. **Botão `Voltar ao vivo`** (ícone `ArrowDown`), flutuando no canto inferior do corpo, visível só quando `stuck === false`. Chama `scrollToBottom`.

Leia a store com `useSyncExternalStore(store.subscribe, store.getSnapshot)`. Passe ao `useStickToBottom` uma dependência que mude a cada atualização das falas, por exemplo o próprio snapshot.

- [x] **Passo 1: escrever os testes**

`use-stick-to-bottom.test.ts`:

```ts
import { expect, test } from 'vitest'
import { isNearBottom } from './use-stick-to-bottom'

test('isNearBottom', () => {
  expect(
    isNearBottom({ scrollHeight: 1000, scrollTop: 700, clientHeight: 300 })
  ).toBe(true)
  expect(
    isNearBottom({ scrollHeight: 1000, scrollTop: 665, clientHeight: 300 })
  ).toBe(true)
  expect(
    isNearBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 300 })
  ).toBe(false)
})
```

`floating-captions.test.tsx`:

```tsx
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
```

- [x] **Passo 2: rodar e confirmar que falha**

Run: `pnpm vitest run --project unit src/features/floating-captions`
Esperado: FAIL.

- [x] **Passo 3: implementar** o hook e o componente. Crie a story com os estados `Aguardando`, `ComFalas` e `LegendasDesligadas`, usando uma store criada na própria story.

- [x] **Passo 4: rodar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/floating-captions`
Esperado: PASS.

- [x] **Passo 5: commit**

```bash
git add src/features/floating-captions
git commit -m "feat: add floating captions view"
```

---

### Tarefa 30: abrir a janela, botão no Meet e esconder as legendas

Atende R4.1 a R4.3 e R4.8.

**Arquivos:**

- Criar: `src/features/floating-captions/pip.d.ts`, `meet-button.ts`, `hide-captions.ts`, `open-floating-window.tsx`
- Modificar: `src/features/recording/meet-dom.ts`, `src/features/recording/content-controller.ts`, `src/entries/content-script.ts`, `vite.content.config.ts`
- Teste: `src/features/floating-captions/meet-button.test.ts`, `hide-captions.test.ts`; acrescentar em `content-controller.test.ts`

- [ ] **Passo 1: checagem manual da API (antes de escrever código)** _(pendente: precisa do usuário)_

Peça ao usuário para abrir uma reunião no Meet, abrir o DevTools (F12), ir na aba Console, trocar o contexto de `top` para o da extensão (o seletor ao lado do filtro, opção `Google Meet Captions Downloader`) e rodar:

```js
'documentPictureInPicture' in window
```

Esperado: `true`. Se der `false`, **pare aqui e avise o usuário**: a API não está disponível para o content script nesta versão do Chrome, e a abordagem precisa ser revista com ele.

- [x] **Passo 2: tipos da API** (`src/features/floating-captions/pip.d.ts`)

```ts
export {}

declare global {
  interface DocumentPictureInPicture {
    requestWindow(options?: {
      width?: number
      height?: number
    }): Promise<Window>
    readonly window: Window | null
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}
```

- [x] **Passo 3: ajustar o build do content script** (`vite.content.config.ts`)

O content script passa a incluir React e o CSS do Tailwind. Acrescente os plugins e a definição de `process.env.NODE_ENV`. Sem essa definição, o React falha no navegador com `process is not defined`, porque o modo biblioteca do Vite não a cria sozinho.

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
// ...
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  // resolve e build continuam como estão
})
```

- [x] **Passo 4: escrever os testes do botão e de esconder as legendas**

**Interfaces desta parte:**

- Em `meet-dom.ts`: `findCaptionsToggleButton(doc: Document): HTMLElement | null`, que devolve o botão de ligar **ou** o de desligar legendas, o que existir.
- `meet-button.ts`:
  - `FLOATING_BUTTON_ID = 'meet-captions-floating-button'`
  - `ensureFloatingButton(doc: Document, onClick: () => void): HTMLButtonElement`
  - `removeFloatingButton(doc: Document): void`
- `hide-captions.ts`:
  - `HIDE_STYLE_ID = 'meet-captions-hide-style'`
  - `HIDDEN_ATTR = 'data-meet-captions-hidden'`
  - `hideCaptions(doc: Document): void`
  - `showCaptions(doc: Document): void`

**Regras do botão:**

- `ensureFloatingButton` não cria um segundo botão: se já existe um elemento com o id **e ele ainda está no documento**, devolve o mesmo.
- O botão é um `<button type="button">` com `id`, `aria-label` e `title` iguais a `Abrir legendas em janela flutuante`, e o texto `⧉`.
- Estilo **inline**, porque dentro da página do Meet não existe o nosso Tailwind. Esta é a única exceção à regra de estilizar só com Tailwind: `width: 40px; height: 40px; border-radius: 50%; border: none; background: #3c4043; color: #fff; font-size: 18px; cursor: pointer; margin: 0 6px;`.
- Posição: se `findCaptionsToggleButton(doc)` achar o botão de legendas e ele tiver `parentElement`, insira o nosso logo depois dele (`anchor.insertAdjacentElement('afterend', button)`). Senão, acrescente ao `body` com `position: fixed; right: 16px; bottom: 96px; z-index: 2147483647;`.
- O clique chama `onClick`. Guarde o `onClick` mais recente (por exemplo numa propriedade do módulo), para um botão já existente chamar a função atual.
- `removeFloatingButton` remove o elemento, se existir.

**Regras de esconder:**

- `hideCaptions`: garante um `<style id={HIDE_STYLE_ID}>` no `head` com `[data-meet-captions-hidden] { display: none !important; }` e põe o atributo `HIDDEN_ATTR` na região de legendas (`findCaptionsRegion`). Pode ser chamada várias vezes: o Meet recria a região, então o controller chama de novo a cada ciclo.
- `showCaptions`: remove o `<style>` e o atributo de todos os elementos que o tiverem.
- As legendas continuam sendo lidas normalmente depois de escondidas, porque a leitura usa `textContent`, que não depende do CSS.

`meet-button.test.ts`:

```ts
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
```

`hide-captions.test.ts`:

```ts
import { beforeEach, expect, test } from 'vitest'
import { MEET_IN_CALL_EN } from '@/features/recording/__fixtures__/meet-dom'
import {
  findCaptionsRegion,
  readCaptionBlocks,
} from '@/features/recording/meet-dom'
import {
  HIDDEN_ATTR,
  HIDE_STYLE_ID,
  hideCaptions,
  showCaptions,
} from './hide-captions'

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = MEET_IN_CALL_EN
})

test('esconde a região e continua lendo as falas', () => {
  hideCaptions(document)
  hideCaptions(document)
  const region = findCaptionsRegion(document)!
  expect(region).toHaveAttribute(HIDDEN_ATTR)
  expect(document.querySelectorAll(`#${HIDE_STYLE_ID}`)).toHaveLength(1)
  expect(readCaptionBlocks(region)).toHaveLength(2)
})

test('mostrar desfaz tudo', () => {
  hideCaptions(document)
  showCaptions(document)
  expect(findCaptionsRegion(document)).not.toHaveAttribute(HIDDEN_ATTR)
  expect(document.getElementById(HIDE_STYLE_ID)).toBeNull()
})
```

- [x] **Passo 5: rodar e confirmar que falha, implementar e confirmar que passa**

Run: `pnpm vitest run --project unit src/features/floating-captions`
Esperado: primeiro FAIL; depois de implementar `meet-button.ts`, `hide-captions.ts` e `findCaptionsToggleButton`, PASS.

- [x] **Passo 6: abrir a janela** (`src/features/floating-captions/open-floating-window.tsx`, código completo)

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useSettings } from '@/features/extension-toggle/use-settings'
import css from '@/styles/index.css?inline'
import type { CaptionsStore } from './captions-store'
import { FONT_MAX, FONT_MIN, FloatingCaptions } from './floating-captions'

export type FloatingWindowHandle = {
  close: () => void
}

function FloatingRoot({ store }: { store: CaptionsStore }) {
  const { settings, update } = useSettings()
  if (!settings) return null
  return (
    <FloatingCaptions
      store={store}
      myName={settings.myName}
      fontSize={settings.floatingFontSize}
      onFontSizeChange={(size) => {
        void update({
          floatingFontSize: Math.min(FONT_MAX, Math.max(FONT_MIN, size)),
        })
      }}
    />
  )
}

export async function openFloatingWindow(options: {
  win: Window
  store: CaptionsStore
  onClose: () => void
}): Promise<FloatingWindowHandle | null> {
  const api = options.win.documentPictureInPicture
  if (!api) return null

  const pip = await api.requestWindow({ width: 420, height: 320 })
  const doc = pip.document
  doc.documentElement.lang = 'pt-BR'
  doc.documentElement.className = 'dark'
  doc.title = 'Legendas'

  const style = doc.createElement('style')
  style.textContent = css
  doc.head.append(style)

  const container = doc.createElement('div')
  doc.body.append(container)
  doc.body.style.margin = '0'

  const root = createRoot(container)
  root.render(
    <StrictMode>
      <FloatingRoot store={options.store} />
    </StrictMode>
  )

  let closed = false
  const finish = () => {
    if (closed) return
    closed = true
    root.unmount()
    options.onClose()
  }
  pip.addEventListener('pagehide', finish)

  return {
    close: () => {
      pip.close()
      finish()
    },
  }
}
```

Este arquivo não tem teste de unidade, porque o jsdom não tem a API. Ele é conferido no Passo 10.

- [x] **Passo 7: ligar no controller**

`ControllerDeps` ganha um campo **opcional**:

```ts
openFloatingWindow?: (options: {
  win: Window
  store: CaptionsStore
  onClose: () => void
}) => Promise<FloatingWindowHandle | null>
```

Novo estado no controller: `floating: FloatingWindowHandle | null = null`.

```ts
function onFloatingButtonClick() {
  if (floating) {
    floating.close()
    return
  }
  if (!deps.openFloatingWindow) return
  // Chamada direta dentro do clique: a API exige um gesto do usuário.
  void deps
    .openFloatingWindow({
      win: deps.win,
      store,
      onClose: () => {
        floating = null
        showCaptions(deps.doc)
      },
    })
    .then((handle) => {
      floating = handle
      if (handle) hideCaptions(deps.doc)
    })
}

function closeFloating() {
  floating?.close()
  removeFloatingButton(deps.doc)
}
```

No `evaluate`:

- no caminho normal (gravando, depois do `recorder.observe`): `ensureFloatingButton(deps.doc, onFloatingButtonClick)` e, se `floating` não for nulo, `hideCaptions(deps.doc)`. A região pode ter sido recriada pelo Meet;
- nos caminhos em que a extensão está desligada, não há chamada, a aba está bloqueada ou a gravação desta reunião está parada: `closeFloating()`.

No `dispose`: `closeFloating()`.

Em `src/entries/content-script.ts`, passe `openFloatingWindow` (importado de `@/features/floating-captions/open-floating-window`) nas dependências.

Acrescente em `content-controller.test.ts`. Mude o helper `start` para aceitar dependências extras: `function start(extra: Partial<Parameters<typeof startContentController>[0]> = {})` e espalhe `...extra` no objeto.

```ts
describe('janela flutuante', () => {
  test('o botão aparece durante a reunião e some com a extensão desligada', async () => {
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start()
    await vi.advanceTimersByTimeAsync(300)
    expect(
      document.getElementById('meet-captions-floating-button')
    ).not.toBeNull()
    await updateSettings({ enabled: false })
    await vi.advanceTimersByTimeAsync(300)
    expect(document.getElementById('meet-captions-floating-button')).toBeNull()
  })

  test('abrir esconde as legendas do Meet e fechar mostra de novo', async () => {
    let onClose = () => {}
    const close = vi.fn(() => onClose())
    const openFloatingWindow = vi.fn(
      async (options: { onClose: () => void }) => {
        onClose = options.onClose
        return { close }
      }
    )
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start({ openFloatingWindow })
    await vi.advanceTimersByTimeAsync(300)

    document.getElementById('meet-captions-floating-button')!.click()
    await vi.advanceTimersByTimeAsync(300)
    expect(openFloatingWindow).toHaveBeenCalledTimes(1)
    const region = document.querySelector('[aria-label="Captions"]')!
    expect(region).toHaveAttribute('data-meet-captions-hidden')

    document.getElementById('meet-captions-floating-button')!.click()
    await vi.advanceTimersByTimeAsync(300)
    expect(close).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector('[aria-label="Captions"]')
    ).not.toHaveAttribute('data-meet-captions-hidden')
  })

  test('com a janela aberta, as falas continuam sendo gravadas', async () => {
    const openFloatingWindow = vi.fn(async () => ({ close: () => {} }))
    goTo('/abc-defg-hij')
    document.body.innerHTML = MEET_IN_CALL_EN
    await start({ openFloatingWindow })
    await vi.advanceTimersByTimeAsync(300)
    document.getElementById('meet-captions-floating-button')!.click()
    await vi.advanceTimersByTimeAsync(300)
    document.querySelector('#b2 > div:last-child')!.textContent =
      'combinado então'
    await vi.advanceTimersByTimeAsync(1_500)
    const [summary] = await listMeetings()
    expect(
      (await getMeeting(summary.id))?.utterances.map((u) => u.text)
    ).toContain('combinado então')
  })
})
```

- [x] **Passo 8: rodar tudo**

Run: `pnpm vitest run --project unit && pnpm lint && pnpm build`
Esperado: PASS, lint e build sem erro. Confira também: `grep -c "^import " dist/content-script.js` deve dar `0`.

- [x] **Passo 9: commit**

```bash
git add src vite.content.config.ts
git commit -m "feat: open captions in a floating always-on-top window"
```

- [ ] **Passo 10: verificação manual** (**precisa do usuário**; recarregue a extensão antes)

1. Numa reunião, o botão `⧉` aparece perto do botão de legendas. Clicar abre a janela flutuante.
2. A janela mostra a conversa com horário e nome, acompanha a fala ao vivo e tem visual escuro.
3. Pôr o Meet em tela cheia: a janela continua por cima.
4. Arrastar a janela para outro lugar ou outro monitor, e redimensionar.
5. Rolar para cima: a janela para de acompanhar e aparece `Voltar ao vivo`.
6. `A+` e `A−` mudam o tamanho da letra. Fechar e abrir de novo mantém o tamanho.
7. Com a janela aberta, as legendas somem da página do Meet. **Anote se o vídeo passou a ocupar o espaço delas ou se ficou uma faixa vazia.** Fechar a janela traz as legendas de volta.
8. Desligar as legendas pelo Meet com a janela aberta: aparece `Legendas desligadas`.
9. Depois da reunião, a transcrição salva é igual ao que a janela mostrou.

Se no item 7 ficar uma faixa vazia, isso é o comportamento mínimo aceito pelo R4.8. Registre para o usuário e **não** tente corrigir sem um arquivo de diagnóstico que mostre a estrutura da página.

---
