# Etapa 4: qualidade (plano de implementação)

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

**Objetivo:** consertar a validação das mensagens de commit, rodar lint, testes e build no GitHub, remover o que não é usado, reescrever o README e fazer a verificação final.

**Pré-requisito:** [etapa 3](2026-11-14-etapa-3-janela-flutuante.md) concluída.

**Requisitos atendidos:** R10.2 a R10.5.

---

---

### Tarefa 31: consertar a validação das mensagens de commit

Atende R10.5.

**Situação atual:** o `.husky/commit-msg` chama `.git/hooks/commit-msg $1`, e esse arquivo aponta para a pasta de outro projeto (`meeting-record-extension`). O resultado é um erro de `cat` e nenhuma validação.

- [x] **Passo 1: confirmar o problema**

Run: `cat .husky/commit-msg; cat .git/hooks/commit-msg | head -5; ls node_modules/git-commit-msg-linter/`
Anote onde fica o script principal do pacote (esperado: `node_modules/git-commit-msg-linter/commit-msg-linter.js`).

- [x] **Passo 2: apontar o hook para o pacote instalado neste projeto**

Substitua o conteúdo de `.husky/commit-msg` por (ajuste o caminho se o Passo 1 mostrou outro nome de arquivo):

```sh
node -e "require(require.resolve('commit-msg-linter/commit-msg-linter.js', { paths: [require.resolve('git-commit-msg-linter')] }))"
```

- [x] **Passo 3: verificar com uma mensagem errada**

Run: `git commit --allow-empty -m "mensagem fora do padrão"`
Esperado: o commit é **recusado**, com a explicação do formato.

- [x] **Passo 4: verificar com uma mensagem certa**

Run: `git add .husky/commit-msg && git commit -m "chore: fix commit message validation hook"`
Esperado: o commit é aceito, sem erro de `cat`.

Se o Passo 3 aceitar a mensagem errada, o script não lê o caminho do arquivo pelo argumento. Nesse caso, pare e mostre ao usuário a saída dos Passos 1 e 3.

---

### Tarefa 32: testes automáticos no GitHub

Atende R10.2.

**Arquivos:**

- Criar: `.github/workflows/ci.yml`

- [x] **Passo 1: criar o workflow** (código completo)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: package.json
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm lint
      - run: pnpm vitest run
      - run: pnpm build
```

O workflow lê a versão do Node do campo `engines.node` e a do pnpm do campo `packageManager`, os dois no `package.json`. A etapa 0 já preencheu esses campos. Confira que existem antes de continuar. Se a etapa 0 atualizou as ações do GitHub para versões principais mais novas (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`), use a última versão de cada uma.

- [x] **Passo 2: conferir localmente os mesmos comandos**

Run: `pnpm install --frozen-lockfile && pnpm lint && pnpm vitest run && pnpm build`
Esperado: tudo passa.

- [x] **Passo 3: commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run lint, tests and build on GitHub"
```

Depois que o usuário enviar a branch ao GitHub, peça para ele conferir se o workflow passou. Não faça `git push` sem ele pedir.

---

### Tarefa 33: limpeza final e README

Atende R10.3 e R10.4.

**Arquivos:**

- Modificar: `package.json`, `README.md`, e o que a limpeza encontrar

- [x] **Passo 1: procurar dependências e código sem uso**

Run: `pnpm dlx knip`
Para cada dependência ou arquivo apontado como não usado, confirme com uma busca (`grep -rn "nome" src .storybook *.ts`) antes de remover. **Não remova:** `@mdx-js/react` (o Storybook usa), `next-themes` (o `sonner` do shadcn usa), `tw-animate-css` (o CSS importa) e os componentes de `src/components/ui` em uso.

- [x] **Passo 2: conferir as permissões**

Run: `cat public/manifest.json`
Esperado: `permissions` é exatamente `["storage", "unlimitedStorage", "alarms"]`, e não existem `host_permissions` nem `web_accessible_resources`.

- [x] **Passo 3: procurar restos**

Run: `grep -rn "console.log\|TODO\|FIXME\|resize-video\|captionText_" src --include=*.ts --include=*.tsx`
Esperado: só as ocorrências de `captionText_` em `legacy-import.ts` e no teste dele. Remova o resto.

- [x] **Passo 4: reescrever o `README.md`**

Mantenha o título, o gif (se ainda representar a extensão; senão, remova a seção e avise o usuário para gravar outro), a seção de instalação e o autor. Reescreva o resto com estas seções, em português:

1. **O que faz:** grava as legendas do Google Meet inteiras, com nome e horário de cada fala, para ler depois na própria extensão.
2. **Funcionalidades:** gravação completa com as correções do Meet; menu com interruptor liga/desliga; parar de gravar só uma reunião; tela de reuniões com busca, renomear, apagar e baixar em `.md` ou `.txt`; janela flutuante de legendas sempre por cima; limpeza automática opcional; backup; modo de diagnóstico.
3. **Como usar:** passo a passo curto (entrar na reunião, abrir o menu, abrir as reuniões salvas, abrir a janela flutuante).
4. **Limitações conhecidas:** funciona com o Meet em português e inglês; não escolhe o idioma das legendas; a janela flutuante só abre por um clique dentro do Meet e fecha com a aba; se o Meet mudar a página, a leitura pode parar e a extensão avisa pelo ícone.
5. **Onde ficam os dados:** só no navegador, dentro da extensão. Remover a extensão apaga tudo, por isso existe o backup.
6. **Desenvolvimento:** comandos (`pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm storybook`), como carregar a pasta `dist` em `chrome://extensions`, e os links para o documento de requisitos e o `CLAUDE.md`.
7. **Quando a leitura das legendas parar de funcionar:** ligar o modo de diagnóstico, participar de uma reunião, baixar o arquivo, e ajustar `src/features/recording/meet-dom.ts`, acrescentando o arquivo como cenário de teste.

- [x] **Passo 5: conferir tudo**

Run: `pnpm vitest run && pnpm lint && pnpm build`
Esperado: tudo passa.

- [x] **Passo 6: commit**

```bash
git add -A
git commit -m "chore: remove unused code and rewrite README"
```

---

### Tarefa 34: verificação final

Sem código novo. **Precisa do usuário.**

- [ ] **Passo 1:** `pnpm build` e recarregar a extensão em `chrome://extensions`.
- [ ] **Passo 2:** repetir os roteiros das Tarefas 16, 27 e 30 (Passo 10) de uma vez, numa reunião real, com o Meet em português.
- [ ] **Passo 3:** conferir a lista "O que não pode acontecer" do documento de requisitos (seção 3), item por item, contra o que foi visto na reunião.
- [ ] **Passo 4:** se o usuário enviou o arquivo de diagnóstico (R8.4), acrescentar o log real como cenário em `src/features/recording/__fixtures__/scenarios.ts`, com a transcrição esperada conferida por ele, e ajustar `merge-text.ts`, `caption-tracker.ts` ou `meet-dom.ts` até o cenário passar. Decidir com o usuário o ponto pendente das **falas muito longas** (seção 5 dos requisitos).
- [ ] **Passo 5:** entregar ao usuário a lista do que passou e do que falhou. Não declare o trabalho concluído com itens falhando.
