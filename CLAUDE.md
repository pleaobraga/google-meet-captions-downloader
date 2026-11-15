# CLAUDE.md

Extensão do Chrome (Manifest V3) que grava as legendas do Google Meet para consulta posterior. Uso pessoal.

## O que vamos construir

Os requisitos da nova versão estão em [docs/superpowers/specs/2026-11-14-melhorias-extensao-requisitos.md](docs/superpowers/specs/2026-11-14-melhorias-extensao-requisitos.md). Esse documento é a fonte da verdade sobre o comportamento esperado. Em caso de dúvida, ele vale mais que o código atual.

## O que fica e o que pode ser refeito

**Ferramentas do projeto: mantenha.** ESLint, Prettier, Husky (`pre-commit` e `commit-msg`), lint-staged, o validador de commits, TypeScript, Vite, Vitest, Storybook, Tailwind, shadcn/ui e pnpm continuam. Não remova, não troque por alternativas e não desative regras ou hooks. Pode atualizar as versões e adicionar ferramentas ou regras que façam sentido (por exemplo, mais plugins de ESLint).

**Código da aplicação: pode ser refeito.** Isso vale para a lógica, os componentes, o background, o content script e a estrutura de pastas dentro de `src/`. É o que a seção abaixo descreve.

## O código atual é só referência

- O código existente funciona, mas tem muitos bugs. Serve apenas como ponto de partida e referência de como o Meet e as APIs do Chrome se comportam.
- **Não é preciso manter nada dele.** Pode apagar arquivos, funções, tipos de mensagem, estrutura de pastas e componentes, e reescrever do zero quando for melhor do que adaptar.
- Não mantenha compatibilidade com o formato antigo, exceto onde o documento de requisitos pedir.
- **Nunca use, adapte ou se baseie em `src/features/resize-video/`** (nem no `APPLY_FULL_VIDEO_SCREEN` / `GET_FULL_VIDEO_SCREEN_STYLES` do background). Não funciona. Apague quando chegar a hora. Se precisar esconder as legendas e ampliar o vídeo (R4.8), faça uma solução nova.

## Stack

- React 19 + TypeScript (strict) + Vite
- Tailwind CSS v4
- shadcn/ui (estilo `new-york`, ícones `lucide-react`)
- Vitest (jsdom) + Testing Library; Storybook para componentes
- pnpm, Node 22.18.0

**Bibliotecas:** pode atualizar as bibliotecas atuais para versões mais novas e adicionar bibliotecas novas quando isso resolver o problema melhor do que código próprio. Antes de adicionar:

- prefira bibliotecas mantidas, bem adotadas e com tipos TypeScript;
- não adicione uma biblioteca para algo que a stack atual (React, shadcn, Tailwind, APIs do Chrome) já resolve bem;
- ao atualizar versões com mudanças incompatíveis (major), ajuste o código e confirme que `pnpm build`, `pnpm test` e `pnpm lint` passam;
- remova as bibliotecas que forem substituídas.

## Interface

- **Use shadcn/ui para todos os componentes de interface** (botões, switch, dialog, checkbox, input, select, toast, etc.). Antes de criar um componente na mão, veja se existe um equivalente no shadcn e adicione pelo CLI (`pnpm dlx shadcn@latest add <componente>`).
- **Estilize só com classes Tailwind.** Evite CSS solto e estilos inline. Use os tokens de tema do shadcn (`bg-background`, `text-muted-foreground`, etc.) em vez de cores fixas.
- O `components.json` aponta para `@/components` e `src/index.css`, mas hoje os componentes estão em `src/ui/components/chadcn` e o CSS em `src/ui/index.css`. Alinhe o `components.json` com a estrutura de pastas escolhida antes de adicionar componentes pelo CLI.
- **Reutilize componentes.** Se um padrão aparece em mais de um lugar (item de fala, cabeçalho de reunião, diálogo de confirmação, campo de busca), extraia um componente compartilhado. Por exemplo, a janela flutuante e a tela de reuniões mostram falas do mesmo jeito: use o mesmo componente nas duas.
- Para combinar classes, use `cn()` (`clsx` + `tailwind-merge`).
- Interface em português (pt-BR).
- Uma única biblioteca de ícones: `lucide-react`. Remova `react-icons` ao substituir os usos.

## Boas práticas

- TypeScript estrito, sem `any`. Defina tipos compartilhados (reunião, fala, configurações, mensagens entre partes da extensão) num único lugar e importe de lá.
- Separe a lógica de domínio (montar falas a partir das mudanças do Meet, identificar a reunião, formatar exportação, regras de limpeza) da interface e das APIs do Chrome. Essa lógica deve ser formada por funções puras e testáveis sem navegador.
- Componentes pequenos e focados. Lógica de estado em hooks próprios, não dentro do JSX.
- Mensagens entre background, content script e páginas da extensão devem ter tipos explícitos, sem objetos soltos com `type: string`.
- Siga a estrutura de pastas por funcionalidade (`features/<nome>`), com componentes, hooks, lógica e testes juntos.
- Nada de código morto ou comentado. Se não é usado, apague.
- Não deixe `console.log` de depuração. Erros que o usuário precisa saber aparecem na interface.
- Remova dependências e permissões do `manifest.json` que deixarem de ser usadas.
- Nenhum dado sai do computador e não existe integração com IA (requisito do projeto).

## Testes

- Escreva testes para toda a lógica de domínio, principalmente a gravação das legendas (correções do Meet, falas longas, sair e voltar, mudança de dia, ligar e desligar).
- Testes em TypeScript (`*.test.ts` / `*.test.tsx`).
- Componentes novos ganham story no Storybook quando tiverem estados visuais relevantes.

## Comandos

```bash
pnpm install
pnpm dev          # desenvolvimento
pnpm build        # gera dist/ (carregar em chrome://extensions como "unpacked")
pnpm test         # vitest
pnpm lint
pnpm storybook
```

## Convenções do repositório

- Commits no padrão Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`), validado pelo hook `commit-msg`.
- O hook `pre-commit` roda Prettier, ESLint e os testes. Não pule os hooks.
- Prettier: sem ponto e vírgula, aspas simples, largura 80.
