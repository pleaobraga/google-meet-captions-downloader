# 🎯 Google Meet Captions Downloader

Extensão do Chrome que grava as legendas do Google Meet inteiras, com o nome de quem falou e o horário de cada fala, para você ler depois na própria extensão.

## 🚀 O que ela faz

- **Gravação completa:** guarda a reunião do início ao fim, não só as últimas falas da tela. Aceita as correções que o Meet faz enquanto a pessoa fala, sem duplicar frases.
- **Liga as legendas sozinha** ao entrar numa reunião. Se você desligar pelo botão do Meet, elas ficam desligadas.
- **Menu da extensão:** interruptor para ligar e desligar (com confirmação), a reunião sendo gravada agora e o botão para parar de gravar só aquela reunião.
- **Tela de reuniões:** lista das reuniões salvas, transcrição com horário e nome, busca em todas as reuniões e dentro de cada uma (ignora acentos e maiúsculas), renomear, apagar uma, várias ou todas antes de uma data, e baixar em `.md` ou `.txt`.
- **Janela flutuante de legendas:** acompanha a conversa ao vivo numa janela sempre por cima, até com o Meet em tela cheia. Dá para arrastar, redimensionar e levar para outro monitor.
- **Configurações:** seu nome no lugar de "Você", limpeza automática opcional de reuniões antigas, backup e modo de diagnóstico.

## 💡 Como usar

1. Entre numa reunião do Google Meet. Com a extensão ligada, as legendas ligam sozinhas e a gravação começa na primeira fala.
2. Clique no ícone da extensão na barra do Chrome para ver se ela está gravando, parar a gravação daquela reunião ou desligar a extensão.
3. No mesmo menu, clique em **Abrir reuniões salvas** para ler, buscar, renomear, apagar ou baixar as reuniões.
4. Durante a reunião, clique no botão **⧉**, ao lado do botão de legendas do Meet, para abrir a janela flutuante.

O ícone da extensão mostra o estado atual: `REC` enquanto grava, `OFF` quando está desligada e `!` quando não consegue ler as legendas.

## ⚠️ Limitações conhecidas

- Funciona com o Meet em português e em inglês.
- A extensão liga as legendas, mas não escolhe o idioma delas. Se o Meet estiver legendando no idioma errado, ajuste nas configurações de legenda do próprio Meet.
- A janela flutuante só abre por um clique dentro da página do Meet e fecha junto com a aba. Ela não funciona ao mesmo tempo que o vídeo flutuante do próprio Meet.
- As legendas são lidas da página do Meet. Se o Google mudar a página, a leitura pode parar. Nesse caso, a extensão avisa pelo ícone e pelo menu.

## 🔒 Onde ficam os dados

Tudo fica só no seu navegador, dentro da extensão. Nada é enviado para fora do computador.

**Remover a extensão do Chrome apaga todas as reuniões.** Antes de remover, use **Configurações → Exportar tudo** para guardar um backup, que depois pode ser trazido de volta com **Importar backup**.

## 📥 Instalação

```bash
git clone https://github.com/pleaobraga/google-meet-captions-downloader.git
cd google-meet-captions-downloader
pnpm install
pnpm build
```

Depois, no Chrome:

1. Abra `chrome://extensions/`.
2. Ative o **Modo do desenvolvedor**, no canto superior direito.
3. Clique em **Carregar sem compactação** e selecione a pasta `dist`.

Para atualizar depois de mudar o código, rode `pnpm build` de novo e clique no botão de recarregar no cartão da extensão em `chrome://extensions/`.

## 🛠️ Desenvolvimento

```bash
pnpm install       # instala as dependências
pnpm build         # gera a extensão em dist/
pnpm test          # roda os testes (Vitest)
pnpm lint          # roda o ESLint
pnpm storybook     # abre o Storybook dos componentes
```

Feita com React, TypeScript, Vite, Tailwind e shadcn/ui.

- Requisitos da versão atual: [docs/superpowers/specs/2026-11-14-melhorias-extensao-requisitos.md](docs/superpowers/specs/2026-11-14-melhorias-extensao-requisitos.md)
- Orientações para quem mexe no código: [CLAUDE.md](CLAUDE.md)

## 🩺 Quando a leitura das legendas parar de funcionar

1. Abra a tela de reuniões, vá em **Configurações** e ligue o **Modo de diagnóstico**.
2. Participe de uma reunião com as legendas ligadas.
3. Nas configurações, baixe o arquivo de diagnóstico dessa reunião.
4. Ajuste a leitura em `src/features/recording/meet-dom.ts` e acrescente o arquivo como cenário de teste em `src/features/recording/__fixtures__/scenarios.ts`.

## 👤 Autor

**[pleaobraga](https://github.com/pleaobraga)**
