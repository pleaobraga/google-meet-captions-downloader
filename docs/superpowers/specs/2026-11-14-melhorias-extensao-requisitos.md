# Melhorias da extensão Google Meet Captions Downloader: requisitos

Data: 14/11/2026
Status: aprovado em 14/11/2026

Este documento descreve **o que** a extensão deve fazer depois das melhorias, e não **como** será implementada. As decisões técnicas ficam para o plano de implementação.

Itens marcados com **(proposta)** foram sugeridos durante a conversa e ainda não tiveram confirmação explícita. Podem ser alterados na revisão.

---

## 1. Objetivo

Guardar **tudo** o que foi dito numa reunião do Google Meet, para eu consultar depois dentro da própria extensão, e permitir acompanhar as legendas ao vivo sem que elas atrapalhem o vídeo.

Uso pessoal.

## 2. Fora do escopo

- Qualquer tipo de IA: resumos, tarefas, classificação ou correção de texto.
- Avisos de privacidade, consentimento ou política de privacidade.
- Publicação na Chrome Web Store.
- Sincronização na nuvem ou entre computadores.
- Outras plataformas de reunião (Zoom, Teams, etc.) e outros navegadores.
- Filtrar por pessoa e marcar trechos como favoritos. Pode entrar depois, se fizer falta.

## 3. O que não pode acontecer

Mesmo que o resto funcione, a extensão falhou se:

- perder trechos da reunião sem avisar;
- salvar frases repetidas ou versões meio corrigidas da mesma frase;
- depender de uma aba do Meet aberta para ver as reuniões salvas;
- me impedir de desligar as legendas pelo botão do Meet;
- enviar qualquer dado para fora do computador.

---

## 4. Requisitos

### 4.1 Gravação das legendas

- **R1.1** A extensão grava a reunião inteira, do início ao fim, e não só as últimas falas visíveis na tela.
- **R1.2** Cada fala é salva com:
  - o nome de quem falou;
  - o horário em que começou;
  - o texto.
- **R1.3** O Meet corrige palavras em tempo real conforme entende o contexto. A extensão aceita todas as correções enquanto a fala estiver visível na tela do Meet e salva a versão final de cada frase, sem duplicar.
- **R1.4** Uma fala só deixa de aceitar correções quando some da tela do Meet ou quando a reunião termina. Nunca por tempo.
- **R1.5** Se o Meet cortar o começo de uma fala longa, a extensão não perde o trecho cortado.
- **R1.6** Tudo é salvo continuamente durante a reunião. Se a aba fechar ou travar, perde-se no máximo a última correção.
- **R1.7** As legendas são lidas da própria página do Meet, ou seja, do HTML (decidido).
- **R1.8** Funciona com o Meet em português e em inglês.
- **R1.9** Se a extensão não conseguir ler as legendas durante uma reunião (o Meet mudou a página, as legendas sumiram, etc.), mostra um aviso visível na janela flutuante e na tela de reuniões.
- **R1.10** O nome de quem falou vem da própria legenda do Meet. O texto não é usado para adivinhar quem está falando.

### 4.2 Identificação da reunião

- **R2.1** A reunião é identificada pelo código do link (ex.: `abc-defg-hij`).
- **R2.2** Mesmo link **no mesmo dia** é a mesma reunião. Recarregar a página, a conexão cair ou sair e voltar mais tarde no mesmo dia continua a mesma transcrição.
- **R2.3** Quando eu saio e volto, a transcrição mostra uma marcação, por exemplo "saiu às 10:20, voltou às 14:05".
- **R2.4** Mesmo link em outro dia é uma reunião nova (ex.: daily com link fixo).
- **R2.5** Abrir páginas do Meet que não são reunião (página inicial, sala de espera sem legendas) não cria registro.

### 4.3 Ligar e desligar a extensão

- **R3.1** A extensão tem um interruptor para ligar e desligar.
- **R3.2** **Ligada:** toda vez que eu entro numa reunião, as legendas são ligadas automaticamente e a gravação começa.
- **R3.3** **O botão de legendas do Meet continua funcionando.** Se eu desligar as legendas durante a reunião, elas ficam desligadas e a extensão não liga de novo. Hoje a extensão religa sozinha, e isso é um bug a corrigir.
  - Enquanto as legendas estiverem desligadas, a gravação pausa. Se eu ligar de novo, a gravação continua na mesma reunião.
  - Na próxima reunião, as legendas voltam a ser ligadas automaticamente.
  - Com as legendas desligadas por mim, a janela flutuante mostra "legendas desligadas", e não o aviso de erro do R1.9.
- **R3.4** **Desligada:** a extensão não faz nada nas reuniões. Não liga legendas, não grava, mesmo que eu ligue as legendas manualmente no Meet, e não mostra o botão da janela flutuante. As reuniões já salvas continuam disponíveis na tela de reuniões. (proposta)
- **R3.5** **Desligar sempre pede confirmação** (decidido):
  - Sem reunião sendo gravada: uma pergunta só, "Deseja desligar a extensão?".
  - Com uma reunião sendo gravada naquele momento: primeiro confirma se quero mesmo desligar. Se eu confirmar, pergunta se quero **manter** o que já foi gravado dessa reunião ou **descartar**.
  - Cancelar em qualquer etapa deixa a extensão ligada e a gravação continua normalmente.
  - Descartar apaga a reunião em andamento inteira, incluindo trechos gravados antes no mesmo dia (R2.2). As outras reuniões salvas não são afetadas. (proposta)
- **R3.6** Desligar vale na hora, depois das confirmações. Ligar vale na hora e não pede confirmação. Se eu ligar no meio de uma reunião, a gravação começa a partir daquele momento. (proposta)
- **R3.7** O interruptor fica no menu da extensão, o menu pequeno que abre ao clicar no ícone na barra do Chrome (decidido, ver 4.5).
- **R3.8** O ícone da extensão na barra do Chrome mostra se ela está ligada ou desligada. (proposta)

### 4.4 Janela flutuante de legendas ao vivo

- **R4.1** Um botão da extensão dentro do Meet abre uma janela flutuante com as legendas. (proposta: o botão fica na barra de controles, perto do botão de legendas)
- **R4.2** A janela fica sempre por cima das outras, inclusive com o Meet em tela cheia.
- **R4.3** Dá para arrastar, redimensionar e levar a janela para outro monitor.
- **R4.4** A janela mostra a conversa inteira desde o início, cada fala com horário e nome, e acompanha a fala ao vivo.
- **R4.5** Se eu rolar para cima para reler, a janela para de acompanhar e aparece um botão "voltar ao vivo".
- **R4.6** Falas que ainda podem ser corrigidas pelo Meet aparecem com um visual diferente (ex.: tom mais claro) até ficarem definitivas.
- **R4.7** O conteúdo da janela é exatamente o que está sendo salvo.
- **R4.8** Com a janela aberta, as legendas somem da página do Meet e o vídeo passa a ocupar o espaço que elas usavam. Ao fechar a janela, tudo volta ao normal. As legendas continuam ligadas no Meet, porque são a fonte do texto.
- **R4.9** Botões para aumentar e diminuir a letra. O tamanho escolhido é lembrado. (proposta)
- **R4.10** Visual escuro, combinando com o Meet. (proposta)

Limitações aceitas:

- A janela só abre por um clique dentro da página do Meet.
- Ela fecha quando a aba do Meet fecha.
- Não funciona ao mesmo tempo que o vídeo flutuante do próprio Meet.

### 4.5 Menu da extensão e tela de reuniões

Menu da extensão (decidido):

- **R5.0a** Clicar no ícone da extensão na barra do Chrome abre um menu pequeno logo abaixo dele.
- **R5.0b** O menu tem:
  - o interruptor para ligar e desligar a extensão (4.3). As confirmações para desligar aparecem no próprio menu;
  - a reunião sendo gravada agora, se houver, com título e há quanto tempo está gravando;
  - um botão "Abrir reuniões salvas", que abre a tela de reuniões.

```text
┌──────────────────────────────┐
│ Meet Captions                │
│ Extensão          [● Ligada] │
│ 🔴 Gravando: Daily do time   │
│    desde 10:02 · 14 min      │
│ [ Abrir reuniões salvas → ]  │
└──────────────────────────────┘
```

A tela de reuniões abre numa **aba do navegador**, com a lista de reuniões à esquerda e a transcrição à direita (decidido, opção A).

Lista:

- **R5.1** A tela abre a partir de qualquer aba, sem depender de uma aba do Meet aberta.
- **R5.2** A lista mostra as reuniões das mais recentes para as mais antigas, cada uma com título, data e duração.
- **R5.3** A reunião em andamento aparece marcada como "ao vivo" e se atualiza sozinha.

Leitura:

- **R5.4** Ao abrir uma reunião, o topo mostra título, data, horário de início e fim e quem participou (quem falou). (proposta)
- **R5.5** Abaixo vem cada fala com horário e nome de quem falou.

Busca:

- **R5.6** Uma busca em todas as reuniões mostra em quais aparece o termo. (proposta)
- **R5.7** Uma busca dentro da reunião aberta destaca as ocorrências. (proposta)

Ações:

- **R5.8** Dá para renomear o título da reunião, já que o Meet muitas vezes só tem o código. (proposta)
- **R5.9** Dá para apagar uma reunião, com confirmação antes. (proposta)
- **R5.9a** Dá para marcar várias reuniões na lista e apagar todas de uma vez. A confirmação mostra quantas serão apagadas (decidido).
- **R5.9b** Dá para apagar todas as reuniões anteriores a uma data escolhida. A confirmação mostra quantas serão apagadas (decidido).
- **R5.9c** A reunião que está sendo gravada não pode ser apagada pela lista. Para descartá-la, use o fluxo de desligar a extensão (R3.5). (proposta)
- **R5.10** Um botão para baixar a reunião, com a escolha entre `.md` e `.txt`.
- **R5.11** Um acesso às configurações (ex.: ícone de engrenagem). (proposta)
- **R5.12** A interface fica em português. (proposta)

### 4.6 Exportação

- **R6.1** A reunião pode ser baixada em dois formatos: `.md` e `.txt` (decidido).
- **R6.2** Os dois arquivos têm o mesmo conteúdo:
  - um cabeçalho com título, data, horário e participantes;
  - uma linha por fala, com horário, nome e texto;
  - as marcações de saída e volta (R2.3).
- **R6.3** No `.md`, cada fala fica no formato `**10:02 Pedro:** texto`, para ler bem num app de notas. (proposta)
- **R6.4** No `.txt`, cada fala fica no formato `10:02 Pedro: texto`, sem nenhuma marcação de formatação. (proposta)

### 4.7 Configurações

- **R7.1** Ligar ou desligar o modo de diagnóstico (ver 4.8).
- **R7.2** **Apagar reuniões antigas automaticamente** (decidido):
  - opções: "Nunca", "Com mais de 30 dias", "Com mais de 90 dias" e "Com mais de 180 dias" (proposta);
  - o padrão é "Nunca", para nada sumir sem eu escolher (proposta);
  - ao escolher um prazo, uma confirmação mostra quantas reuniões serão apagadas agora (proposta);
  - a idade é contada pela data da reunião, e a reunião sendo gravada nunca é apagada.
- O interruptor que liga e desliga a extensão (4.3) fica no menu da extensão, fora das configurações.

### 4.8 Modo de diagnóstico

- **R8.1** Quando ativado, grava todas as mudanças que o Meet faz na área de legendas durante uma reunião.
- **R8.2** Essa gravação pode ser baixada como arquivo.
- **R8.3** As gravações servem para:
  - confirmar como o Meet se comporta, ou seja, quando os blocos somem, se o texto é cortado e até onde as correções voltam;
  - criar testes automáticos que "reapresentam" uma reunião real e verificam se a transcrição saiu sem repetições e sem buracos.
- **R8.4** A primeira gravação real será feita por mim depois. A lógica da gravação (4.1) é construída antes dela, com as regras deste documento, e ajustada quando a gravação chegar.

### 4.9 O que sai

- **R9.1** O histórico de 5 em 5 minutos. Os horários em cada fala substituem ele.
- **R9.2** O botão "Download Current Transcription". A reunião em andamento já aparece na lista.
- **R9.3** A janela solta de 470×600 que abre hoje, substituída pela aba da tela de reuniões.
- **R9.4** A função de aumentar o vídeo que não é usada hoje, substituída pelo R4.8.
- **R9.5** As reuniões passam a ficar guardadas na extensão, não mais dentro do site do Meet.

### 4.10 Qualidade

- **R10.1** Testes automáticos para a gravação das legendas, incluindo correções, falas longas, sair e voltar, mudança de dia e desligar e religar as legendas no meio da reunião, desligar a extensão mantendo ou descartando a gravação, e a limpeza automática de reuniões antigas.
- **R10.2** Lint, testes e build rodam automaticamente a cada mudança enviada ao GitHub.
- **R10.3** Remover permissões, código e dependências que não forem mais usados.
- **R10.4** Atualizar o README para descrever o que a extensão faz de verdade.

---

## 5. Pontos em aberto

1. **Reuniões já salvas no formato atual:** importar para o novo formato ou descartar? Elas só têm as últimas falas, sem horário por fala. Proposta: importar como estão, marcadas como "formato antigo".
2. **Reunião que passa da meia-noite:** se cair às 00:10 numa reunião que começou às 23:30, continua a mesma? Proposta: sim. Uma reunião em andamento não é dividida pela mudança de dia.

## 6. Ordem sugerida das etapas

1. **Gravação completa:** seções 4.1, 4.2, 4.3, 4.8 e 4.10.R10.1, e as reuniões passam a ficar na extensão. É a base de todo o resto.
2. **Menu e tela de reuniões:** seções 4.5, 4.6 e 4.7.
3. **Janela flutuante:** seção 4.4.
4. **Limpeza e qualidade:** seção 4.9 e o resto da 4.10.

Cada etapa terá o seu próprio plano de implementação.
