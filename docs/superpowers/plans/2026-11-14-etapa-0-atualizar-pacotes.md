# Etapa 0: atualizar todos os pacotes (plano de implementação)

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** deixar todas as dependências e ferramentas do projeto nas últimas versões estáveis, com lint, testes e build funcionando, antes de qualquer mudança de funcionalidade.

**Por quê:** o projeto foi criado há cerca de 14 meses e está defasado (por exemplo, usa o Vite 7 e o Vite já está na versão 8). As etapas seguintes devem ser escritas já sobre as versões novas.

**Spec:** [docs/superpowers/specs/2026-11-14-melhorias-extensao-requisitos.md](../specs/2026-11-14-melhorias-extensao-requisitos.md). Leia também o [CLAUDE.md](../../../CLAUDE.md).

**Branch:** `feat/v2-melhorias` (já existe). Trabalhe nela.

**Próxima etapa:** [etapa 1](2026-11-14-etapa-1-gravacao-completa.md).

---

## Regras desta etapa

- **Não mude nenhuma funcionalidade.** Esta etapa só atualiza pacotes e ajusta configuração.
- **Mantenha as ferramentas:** ESLint, Prettier, Husky, lint-staged, o validador de commits, TypeScript, Vite, Vitest, Storybook, Tailwind, shadcn/ui e pnpm. Atualizar, sim. Trocar por outra ferramenta ou remover, não.
- **Não desative regras de lint, testes ou hooks** para fazer algo passar. Nunca use `--no-verify`.
- **Não volte um pacote para uma versão antiga** só porque a nova deu erro. Leia o guia de migração e ajuste a configuração. Só mantenha uma versão mais antiga quando dois pacotes forem de fato incompatíveis entre si, e registre isso na seção "Pendências" no fim deste arquivo.
- **Não confie na memória para números de versão nem para mudanças de API.** As versões mudam. Descubra a versão atual com os comandos deste plano e leia o guia de migração oficial de cada pacote que mudou de versão principal.
- **O código da aplicação atual vai ser apagado na etapa 1** (`src/ui/`, `src/features/`, `src/scripts/`, `src/entries/`, `src/constants.ts`). Por isso:
  - se uma versão nova quebrar esse código e o conserto for de uma ou duas linhas, conserte;
  - se o conserto for maior, **não gaste tempo**: apague o teste ou a story que quebrou, anote em "Pendências" e siga. O que não pode quebrar é a configuração (build, lint, testes, Storybook).
- O hook de `commit-msg` está quebrado (aponta para outro projeto) e imprime um erro de `cat`. Isso não impede o commit. O conserto está na etapa 4.

---

### Tarefa 0.1: registrar o ponto de partida

**Arquivos:**

- Modificar: `.storybook/main.ts`, `.storybook/preview.ts`

O `package.json` já não lista o `@storybook/addon-themes`, mas o Storybook ainda o usa. Depois de um `pnpm install` limpo, o Storybook quebra. Conserte isso primeiro, para ter uma base que funciona.

- [x] **Passo 1: anotar as versões do ambiente** (Node v26.12.1, pnpm 12.15.0)

Run: `node --version && pnpm --version`
Anote os dois números. Eles são usados na Tarefa 0.2.

- [x] **Passo 2: tirar o addon de temas do Storybook**

Em `.storybook/main.ts`, remova a linha `'@storybook/addon-themes',` do array `addons`.

Substitua `.storybook/preview.ts` por:

```ts
import type { Preview } from '@storybook/react-vite'
import { themes } from 'storybook/theming'

import '../src/ui/index.css'

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

- [x] **Passo 3: conferir que tudo funciona antes de atualizar**

Run: `pnpm install && pnpm exec playwright install chromium && pnpm lint && pnpm vitest run && pnpm build`
Esperado: tudo passa. Se algo falhar **aqui**, o problema já existia antes da atualização: pare e mostre o erro ao usuário.

- [x] **Passo 4: guardar a lista de pacotes desatualizados**

Run: `pnpm outdated`
Copie a saída para a seção "Antes da atualização", no fim deste arquivo.

- [x] **Passo 5: commit**

```bash
git add .storybook docs/superpowers/plans/2026-11-14-etapa-0-atualizar-pacotes.md
git commit -m "chore: remove storybook themes addon usage"
```

---

### Tarefa 0.2: ajustar as versões de Node e pnpm exigidas

**Arquivos:**

- Modificar: `package.json`

O `package.json` exige exatamente o Node `22.18.0` e o pnpm `^10.15.0`, que não são mais os instalados.

- [ ] **Passo 1: atualizar o campo `engines` e acrescentar `packageManager`**

Use os números anotados na Tarefa 0.1. Se o Node instalado for, por exemplo, `v26.12.1` e o pnpm `12.15.0`:

```json
"engines": {
  "node": ">=26",
  "pnpm": ">=12"
},
"packageManager": "pnpm@12.15.0",
```

Em `engines`, use só o número principal. Em `packageManager`, use a versão completa do pnpm.

- [ ] **Passo 2: conferir**

Run: `pnpm install`
Esperado: termina sem aviso de versão de Node ou de pnpm incompatível.

- [ ] **Passo 3: commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: update required node and pnpm versions"
```

---

### Tarefa 0.3: atualizar os pacotes

**Arquivos:**

- Modificar: `package.json`, `pnpm-lock.yaml`

- [ ] **Passo 1: remover um pacote obsoleto**

O `@storybook/addons` é um pacote antigo, preso na versão 7, que não acompanha o Storybook atual.

Run: `grep -rn "@storybook/addons" src .storybook *.ts *.js`
Esperado: nenhuma ocorrência. Então:

Run: `pnpm remove @storybook/addons`

- [ ] **Passo 2: atualizar o Storybook com a ferramenta dele**

Run: `pnpm dlx storybook@latest upgrade`
Aceite as migrações automáticas que ela oferecer. Se ela perguntar algo que este plano não cobre, escolha a opção padrão.

- [ ] **Passo 3: atualizar todo o resto**

Run: `pnpm up --latest`

- [ ] **Passo 4: conferir que não sobrou nada desatualizado**

Run: `pnpm install && pnpm outdated`
Esperado: `pnpm outdated` não lista nenhum pacote. Se listar, rode `pnpm up --latest <pacote>` para cada um.

- [ ] **Passo 5: listar os pacotes que mudaram de versão principal**

Run: `git diff package.json`
Para cada pacote cujo **primeiro número** da versão mudou (por exemplo `vite` de `^7` para `^8`), anote o nome. Essa lista guia a Tarefa 0.4. Fique atento a estes, que são os que mais costumam exigir ajuste de configuração: `vite`, `@vitejs/plugin-react-swc`, `vitest` e `@vitest/*`, `storybook` e `@storybook/*`, `typescript`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `tailwindcss` e `@tailwindcss/vite`, `react` e `react-dom`, `jsdom`, `playwright`, `husky`, `lint-staged`.

**Não faça commit ainda.** O commit vem no fim da Tarefa 0.4, com tudo funcionando.

---

### Tarefa 0.4: fazer tudo voltar a funcionar

**Arquivos:**

- Modificar: o que as versões novas exigirem, em geral `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.storybook/*`, `vitest.setup.ts`, `vitest.shims.d.ts`, `.husky/*`, `.lintstagedrc`

Faça os passos **nesta ordem**. Cada um depende do anterior estar passando.

Para cada erro: descubra de qual pacote ele vem, abra o guia de migração oficial da versão nova desse pacote (procure "migration guide" ou "upgrade guide" na documentação dele, ou o `CHANGELOG` no repositório) e aplique a mudança que o guia indica. Não adivinhe.

- [ ] **Passo 1: tipos**

Run: `pnpm exec tsc -b`
Esperado: sem erros.

- [ ] **Passo 2: lint**

Run: `pnpm lint`
Esperado: sem erros. Avisos novos são aceitáveis. Não desative regras.

- [ ] **Passo 3: testes**

Run: `pnpm exec playwright install chromium && pnpm vitest run`
Esperado: todos passam, os de unidade e os do Storybook.

- [ ] **Passo 4: build da extensão**

Run: `pnpm build && ls dist`
Esperado: sem erro, e `dist` contém `background.js`, `save-caption-script.js`, `index.html`, `manifest.json` e `assets/`.

Se o Vite avisar que uma opção do `vite.config.ts` mudou de nome ou foi descontinuada, troque pelo nome novo que o aviso indica.

- [ ] **Passo 5: build do Storybook**

Run: `pnpm build-storybook`
Esperado: sem erro. Depois apague a pasta gerada: `rm -rf storybook-static`.

- [ ] **Passo 6: hooks do git**

Run: `cat .husky/pre-commit .lintstagedrc`
Confira no guia de migração do Husky e do lint-staged se o formato desses arquivos continua válido na versão nova. Ajuste se o guia pedir.

- [ ] **Passo 7: registrar o resultado neste arquivo**

Run: `pnpm list --depth 0`
Copie a saída para a seção "Depois da atualização", no fim deste arquivo. Preencha "Pendências" com o que ficou para trás, ou escreva `Nenhuma`.

- [ ] **Passo 8: commit**

```bash
git add -A
git commit -m "chore: update all dependencies to latest versions"
```

O hook de `pre-commit` roda Prettier, ESLint e os testes. Se ele falhar, conserte a causa e tente de novo.

---

### Tarefa 0.5: conferência rápida no Chrome

Sem código. **Precisa do usuário.** A extensão ainda é a antiga, e o objetivo é só confirmar que o build atualizado carrega.

- [ ] **Passo 1:** em `chrome://extensions`, com o modo de desenvolvedor ativado, clique em "Carregar sem compactação" e selecione a pasta `dist`.
- [ ] **Passo 2:** confirme que a extensão carrega sem erro na página de extensões e que clicar no ícone abre a janela dela.

Se carregar, a etapa 0 está concluída. Siga para a [etapa 1](2026-11-14-etapa-1-gravacao-completa.md).

---

## Registro (preenchido durante a execução)

### Antes da atualização

```text
┌───────────────────────────────────┬─────────┬─────────┐
│ Package                           │ Current │ Latest  │
├───────────────────────────────────┼─────────┼─────────┤
│ @mdx-js/react                     │ 3.1.0   │ 3.1.1   │
├───────────────────────────────────┼─────────┼─────────┤
│ @testing-library/dom (dev)        │ 10.4.1  │ 10.4.2  │
├───────────────────────────────────┼─────────┼─────────┤
│ @testing-library/react (dev)      │ 16.3.0  │ 16.3.3  │
├───────────────────────────────────┼─────────┼─────────┤
│ git-commit-msg-linter (dev)       │ 5.0.8   │ 5.0.10  │
├───────────────────────────────────┼─────────┼─────────┤
│ react-spinners                    │ 0.17.0  │ 0.17.1  │
├───────────────────────────────────┼─────────┼─────────┤
│ sonner                            │ 2.0.7   │ 2.0.8   │
├───────────────────────────────────┼─────────┼─────────┤
│ @radix-ui/react-separator         │ 1.1.7   │ 1.2.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ @radix-ui/react-slot              │ 1.2.3   │ 1.5.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ @tailwindcss/vite                 │ 4.1.11  │ 4.3.5   │
├───────────────────────────────────┼─────────┼─────────┤
│ @types/chrome (dev)               │ 0.1.4   │ 0.3.7   │
├───────────────────────────────────┼─────────┼─────────┤
│ @types/react (dev)                │ 19.1.9  │ 19.3.0  │
├───────────────────────────────────┼─────────┼─────────┤
│ @types/react-dom (dev)            │ 19.1.7  │ 19.3.0  │
├───────────────────────────────────┼─────────┼─────────┤
│ eslint-plugin-react-refresh (dev) │ 0.4.20  │ 0.5.7   │
├───────────────────────────────────┼─────────┼─────────┤
│ playwright (dev)                  │ 1.54.2  │ 1.65.1  │
├───────────────────────────────────┼─────────┼─────────┤
│ prettier (dev)                    │ 3.6.2   │ 3.10.1  │
├───────────────────────────────────┼─────────┼─────────┤
│ react                             │ 19.1.1  │ 19.3.1  │
├───────────────────────────────────┼─────────┼─────────┤
│ react-dom                         │ 19.1.1  │ 19.3.1  │
├───────────────────────────────────┼─────────┼─────────┤
│ react-icons                       │ 5.5.0   │ 5.7.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ tailwind-merge                    │ 3.3.1   │ 3.7.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ tailwindcss                       │ 4.1.11  │ 4.3.5   │
├───────────────────────────────────┼─────────┼─────────┤
│ tw-animate-css (dev)              │ 1.3.6   │ 1.4.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ typescript-eslint (dev)           │ 8.38.0  │ 8.72.2  │
├───────────────────────────────────┼─────────┼─────────┤
│ @chromatic-com/storybook (dev)    │ 4.1.1   │ 5.6.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ @eslint/js (dev)                  │ 9.32.0  │ 10.0.1  │
├───────────────────────────────────┼─────────┼─────────┤
│ @storybook/addon-a11y (dev)       │ 9.1.7   │ 10.6.7  │
├───────────────────────────────────┼─────────┼─────────┤
│ @storybook/addon-docs (dev)       │ 9.1.7   │ 10.6.7  │
├───────────────────────────────────┼─────────┼─────────┤
│ @storybook/addon-onboarding (dev) │ 9.1.7   │ 10.6.7  │
├───────────────────────────────────┼─────────┼─────────┤
│ @storybook/addon-vitest (dev)     │ 9.1.7   │ 10.6.7  │
├───────────────────────────────────┼─────────┼─────────┤
│ @storybook/react-vite (dev)       │ 9.1.7   │ 10.6.7  │
├───────────────────────────────────┼─────────┼─────────┤
│ @testing-library/jest-dom (dev)   │ 6.8.0   │ 7.0.1   │
├───────────────────────────────────┼─────────┼─────────┤
│ @types/node (dev)                 │ 24.1.0  │ 26.6.6  │
├───────────────────────────────────┼─────────┼─────────┤
│ @vitejs/plugin-react-swc (dev)    │ 3.11.0  │ 4.3.3   │
├───────────────────────────────────┼─────────┼─────────┤
│ @vitest/browser (dev)             │ 3.2.4   │ 5.1.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ @vitest/coverage-v8 (dev)         │ 3.2.4   │ 5.1.0   │
├───────────────────────────────────┼─────────┼─────────┤
│ eslint (dev)                      │ 9.32.0  │ 10.15.0 │
├───────────────────────────────────┼─────────┼─────────┤
│ eslint-plugin-react-hooks (dev)   │ 5.2.0   │ 7.1.1   │
├───────────────────────────────────┼─────────┼─────────┤
│ eslint-plugin-storybook (dev)     │ 9.1.7   │ 10.6.7  │
├───────────────────────────────────┼─────────┼─────────┤
│ globals (dev)                     │ 16.3.0  │ 17.14.0 │
├───────────────────────────────────┼─────────┼─────────┤
│ jsdom (dev)                       │ 26.1.0  │ 31.0.1  │
├───────────────────────────────────┼─────────┼─────────┤
│ lint-staged (dev)                 │ 16.1.4  │ 17.6.0  │
├───────────────────────────────────┼─────────┼─────────┤
│ lucide-react                      │ 0.536.0 │ 1.72.0  │
├───────────────────────────────────┼─────────┼─────────┤
│ markdown-to-jsx                   │ 7.7.13  │ 9.10.6  │
├───────────────────────────────────┼─────────┼─────────┤
│ storybook (dev)                   │ 9.1.7   │ 10.6.7  │
├───────────────────────────────────┼─────────┼─────────┤
│ typescript (dev)                  │ 5.8.3   │ 7.0.2   │
├───────────────────────────────────┼─────────┼─────────┤
│ vite (dev)                        │ 7.0.6   │ 8.3.8   │
├───────────────────────────────────┼─────────┼─────────┤
│ vitest (dev)                      │ 3.2.4   │ 5.1.0   │
└───────────────────────────────────┴─────────┴─────────┘
```

### Depois da atualização

_Cole aqui a saída de `pnpm list --depth 0` (Tarefa 0.4, Passo 7)._

### Pendências

_Liste aqui pacotes que não puderam ir para a última versão, com o motivo, e testes ou stories do código antigo que foram apagados. Se não houver, escreva `Nenhuma`._
