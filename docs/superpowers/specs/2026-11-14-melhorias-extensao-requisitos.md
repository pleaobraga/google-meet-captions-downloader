# Melhorias da extensão Google Meet Captions Downloader: requisitos

Data: 14/11/2026
Status: aprovado em 14/11/2026, revisado no mesmo dia (pontas soltas fechadas)

Este documento descreve **o que** a extensão deve fazer depois das melhorias, e não **como** será implementada. As decisões técnicas ficam nos planos de implementação.

Todos os itens estão decididos. As decisões que nasceram de sugestões durante a conversa estão listadas na seção 5.

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
- Escolher o idioma das legendas do Meet (ver a limitação em 4.1).

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
- **R1.7** As legendas são lidas da própria página do Meet, ou seja, do HTML.
- **R1.8** Funciona com o Meet em português e em inglês.
- **R1.9** Se a extensão não conseguir ler as legendas durante uma reunião (o Meet mudou a página, as legendas sumiram, etc.), mostra um aviso visível em **todos** estes lugares:
  - no ícone da extensão na barra do Chrome (ver R3.8), para eu perceber mesmo sem nenhuma janela da extensão aberta;
  - no menu da extensão;
  - na janela flutuante;
  - na tela de reuniões.
- **R1.10** O nome de quem falou vem da própria legenda do Meet. O texto não é usado para adivinhar quem está falando.

Limitação conhecida: a extensão liga as legendas, mas não escolhe o idioma delas. Se o Meet estiver configurado para legendar em inglês numa reunião em português, a transcrição sai errada. O idioma é ajustado nas configurações de legenda do próprio Meet.

### 4.2 Identificação da reunião

- **R2.1** A reunião é identificada pelo código do link (ex.: `abc-defg-hij`).
- **R2.2** Mesmo link **no mesmo dia** é a mesma reunião. Recarregar a página, a conexão cair ou sair e voltar mais tarde no mesmo dia continua a mesma transcrição.
- **R2.3** Quando eu saio e volto, a transcrição mostra uma marcação, por exemplo "saiu às 10:20, voltou às 14:05".
- **R2.4** Mesmo link em outro dia é uma reunião nova (ex.: daily com link fixo). Exceção: uma reunião em andamento não é dividida pela meia-noite. Se eu voltar até **15 minutos** depois de ter saído, continua a mesma reunião, mesmo que o dia tenha mudado.
- **R2.5** O registro da reunião só é criado quando a primeira fala é gravada. Não criam registro:
  - páginas do Meet que não são reunião (página inicial, sala de espera);
  - reuniões em que ninguém falou.
  - Enquanto a primeira fala não chega, a reunião aparece só no menu da extensão, como "aguardando legendas". Ela entra na lista da tela de reuniões a partir da primeira fala.
- **R2.6** Se a mesma reunião estiver aberta em duas abas, só uma delas grava. A outra não interfere.

### 4.3 Ligar e desligar a extensão

- **R3.1** A extensão tem um interruptor para ligar e desligar.
- **R3.2** **Ligada:** toda vez que eu entro numa reunião, as legendas são ligadas automaticamente e a gravação começa.
- **R3.3** **O botão de legendas do Meet continua funcionando.** Se eu desligar as legendas durante a reunião, elas ficam desligadas e a extensão não liga de novo. Hoje a extensão religa sozinha, e isso é um bug a corrigir.
  - Enquanto as legendas estiverem desligadas, a gravação pausa. Se eu ligar de novo, a gravação continua na mesma reunião.
  - A escolha vale para aquela reunião: se eu recarregar a página ou sair e voltar na mesma reunião (R2.2), as legendas continuam desligadas.
  - Numa reunião diferente, as legendas voltam a ser ligadas automaticamente.
  - Com as legendas desligadas por mim, o menu e a janela flutuante mostram "legendas desligadas", e não o aviso de erro do R1.9.
- **R3.4** **Desligada:** a extensão não faz nada nas reuniões. Não liga legendas, não grava, mesmo que eu ligue as legendas manualmente no Meet, e não mostra o botão da janela flutuante. As reuniões já salvas continuam disponíveis na tela de reuniões.
- **R3.5** **Desligar sempre pede confirmação:**
  - Sem reunião sendo gravada: uma pergunta só, "Deseja desligar a extensão?".
  - Com uma reunião sendo gravada naquele momento: primeiro confirma se quero mesmo desligar. Se eu confirmar, pergunta se quero **manter** o que já foi gravado dessa reunião ou **descartar**.
  - Cancelar em qualquer etapa deixa a extensão ligada e a gravação continua normalmente.
  - Descartar apaga a reunião em andamento inteira, incluindo trechos gravados antes no mesmo dia (R2.2). As outras reuniões salvas não são afetadas.
- **R3.6** Desligar vale na hora, depois das confirmações. Ligar vale na hora e não pede confirmação. Se eu ligar no meio de uma reunião, as legendas são ligadas e a gravação começa a partir daquele momento.
- **R3.7** O interruptor fica no menu da extensão, o menu pequeno que abre ao clicar no ícone na barra do Chrome (ver 4.5).
- **R3.8** O ícone da extensão na barra do Chrome mostra o estado atual:
  - desligada;
  - gravando uma reunião;
  - problema para ler as legendas (R1.9);
  - ligada e sem reunião: ícone normal, sem marcação.
- **R3.9** **Parar de gravar só uma reunião**, sem desligar a extensão:
  - durante uma reunião, o menu tem o botão "Parar de gravar esta reunião";
  - ao clicar, pergunta se quero **manter** ou **descartar** o que já foi gravado dela, como no R3.5;
  - a extensão continua ligada para as outras reuniões;
  - a escolha vale para aquela reunião naquele dia (R2.2), mesmo se eu recarregar a página. O botão vira "Retomar gravação", que volta a gravar a partir daquele momento.

### 4.4 Janela flutuante de legendas ao vivo

- **R4.1** Um botão da extensão dentro do Meet abre uma janela flutuante com as legendas. O botão fica na barra de controles, perto do botão de legendas.
- **R4.2** A janela fica sempre por cima das outras, inclusive com o Meet em tela cheia.
- **R4.3** Dá para arrastar, redimensionar e levar a janela para outro monitor.
- **R4.4** A janela mostra a conversa inteira desde o início, incluindo o que foi gravado antes no mesmo dia (R2.2), cada fala com horário e nome, e acompanha a fala ao vivo.
- **R4.5** Se eu rolar para cima para reler, a janela para de acompanhar e aparece um botão "voltar ao vivo".
- **R4.6** Falas que ainda podem ser corrigidas pelo Meet aparecem com um visual diferente (ex.: tom mais claro) até ficarem definitivas.
- **R4.7** O conteúdo da janela é exatamente o que está sendo salvo.
- **R4.8** Com a janela aberta, as legendas somem da página do Meet e o vídeo passa a ocupar o espaço que elas usavam. Ao fechar a janela, tudo volta ao normal. As legendas continuam ligadas no Meet, porque são a fonte do texto.
  - **Risco conhecido:** fazer o vídeo ocupar o espaço das legendas depende de como o Meet monta a página, e a tentativa anterior (`resize-video`) não funcionou. Se não for possível ampliar o vídeo de forma confiável, o mínimo aceitável é esconder as legendas da página, para elas não cobrirem o vídeo. Nesse caso, a faixa que o Meet reserva para elas pode continuar vazia.
- **R4.9** Botões para aumentar e diminuir a letra. O tamanho escolhido é lembrado.
- **R4.10** Visual escuro, combinando com o Meet.
- **R4.11** A janela mostra uma mensagem própria em cada situação sem falas:
  - "aguardando legendas", antes da primeira fala;
  - "legendas desligadas", quando eu desliguei (R3.3);
  - "gravação parada nesta reunião", quando usei o R3.9;
  - o aviso de erro do R1.9.

Limitações aceitas:

- A janela só abre por um clique dentro da página do Meet.
- Ela fecha quando a aba do Meet fecha.
- Não funciona ao mesmo tempo que o vídeo flutuante do próprio Meet.

### 4.5 Menu da extensão e tela de reuniões

Menu da extensão:

- **R5.0a** Clicar no ícone da extensão na barra do Chrome abre um menu pequeno logo abaixo dele.
- **R5.0b** O menu tem:
  - o interruptor para ligar e desligar a extensão (4.3). As confirmações para desligar aparecem no próprio menu;
  - a reunião sendo gravada agora, se houver, com título e há quanto tempo está gravando;
  - o botão "Parar de gravar esta reunião" ou "Retomar gravação" (R3.9), durante uma reunião;
  - os avisos de "legendas desligadas" (R3.3) e de erro (R1.9);
  - um botão "Abrir reuniões salvas", que abre a tela de reuniões.

```text
┌──────────────────────────────┐
│ Meet Captions                │
│ Extensão          [● Ligada] │
│ 🔴 Gravando: Daily do time   │
│    desde 10:02 · 14 min      │
│ [ Parar de gravar esta      ]│
│ [ reunião                   ]│
│ [ Abrir reuniões salvas → ]  │
└──────────────────────────────┘
```

A tela de reuniões abre numa **aba do navegador**, com a lista de reuniões à esquerda e a transcrição à direita.

Lista:

- **R5.1** A tela abre a partir de qualquer aba, sem depender de uma aba do Meet aberta.
- **R5.2** A lista mostra as reuniões das mais recentes para as mais antigas, cada uma com título, data e duração. A duração é a **soma do tempo em que estive na reunião**: se fiquei das 10:00 às 10:20 e das 14:05 às 14:30, a duração é 45 minutos.
- **R5.3** A reunião em andamento aparece marcada como "ao vivo" e se atualiza sozinha, a partir da primeira fala (R2.5).

Leitura:

- **R5.4** Ao abrir uma reunião, o topo mostra título, data, horário de início e fim e quem participou (quem falou).
- **R5.5** Abaixo vem cada fala com horário e nome de quem falou.

Busca:

- **R5.6** Uma busca em todas as reuniões mostra em quais aparece o termo. Ela procura nas falas, nos títulos e nos nomes de quem falou.
- **R5.7** Uma busca dentro da reunião aberta destaca as ocorrências.
- **R5.7a** As duas buscas ignoram maiúsculas e acentos: "reuniao" encontra "Reunião".

Ações:

- **R5.8** Dá para renomear o título da reunião, já que o Meet muitas vezes só tem o código. O título que eu escolhi nunca é trocado pelo título do Meet.
- **R5.9** Dá para apagar uma reunião, com confirmação antes. Apagar é definitivo: não tem lixeira nem desfazer.
- **R5.9a** Dá para marcar várias reuniões na lista e apagar todas de uma vez. A confirmação mostra quantas serão apagadas.
- **R5.9b** Dá para apagar todas as reuniões anteriores a uma data escolhida. A confirmação mostra quantas serão apagadas.
- **R5.9c** A reunião que está sendo gravada não pode ser apagada pela lista. Para descartá-la, uso "Parar de gravar esta reunião" (R3.9) ou desligo a extensão (R3.5).
- **R5.10** Um botão para baixar a reunião, com a escolha entre `.md` e `.txt`.
- **R5.11** Um acesso às configurações (ex.: ícone de engrenagem).
- **R5.12** A interface fica em português.

### 4.6 Exportação

- **R6.1** A reunião pode ser baixada em dois formatos: `.md` e `.txt`.
- **R6.2** Os dois arquivos têm o mesmo conteúdo:
  - um cabeçalho com título, data, horário e participantes;
  - uma linha por fala, com horário, nome e texto;
  - as marcações de saída e volta (R2.3).
- **R6.3** No `.md`, cada fala fica no formato `**10:02 Pedro:** texto`, para ler bem num app de notas.
- **R6.4** No `.txt`, cada fala fica no formato `10:02 Pedro: texto`, sem nenhuma marcação de formatação.
- **R6.5** O nome do arquivo é a data seguida do título, por exemplo `2026-11-14 Daily do time.md`. Caracteres que não podem aparecer em nomes de arquivo são removidos.

### 4.7 Configurações

- **R7.1** Ligar ou desligar o modo de diagnóstico (ver 4.8).
- **R7.2** **Apagar reuniões antigas automaticamente:**
  - opções: "Nunca", "Com mais de 30 dias", "Com mais de 90 dias" e "Com mais de 180 dias";
  - o padrão é "Nunca", para nada sumir sem eu escolher;
  - ao escolher um prazo, uma confirmação mostra quantas reuniões serão apagadas agora;
  - a idade é contada pela data da reunião, e a reunião sendo gravada nunca é apagada;
  - a limpeza roda quando o Chrome abre e, com ele aberto, uma vez por dia;
  - as gravações de diagnóstico dessas reuniões são apagadas junto.
- **R7.3** **Meu nome:** o Meet mostra as minhas falas como "Você" ou "You". Se eu preencher o meu nome nas configurações, ele aparece no lugar na tela de reuniões, na janela flutuante e nos arquivos exportados. Se o campo ficar vazio, continua aparecendo como o Meet mostra.
- **R7.4** **Backup:** as reuniões ficam guardadas só dentro da extensão. Remover a extensão do Chrome apaga tudo. Por isso:
  - um botão "Exportar tudo" baixa um único arquivo com todas as reuniões;
  - um botão "Importar backup" lê esse arquivo e traz as reuniões de volta;
  - na importação, reuniões que já existem na extensão são mantidas como estão, sem duplicar;
  - a tela de configurações avisa que remover a extensão apaga as reuniões.
- O interruptor que liga e desliga a extensão (4.3) fica no menu da extensão, fora das configurações.

### 4.8 Modo de diagnóstico

- **R8.1** Quando ativado, grava todas as mudanças que o Meet faz na área de legendas durante uma reunião.
- **R8.2** Essa gravação pode ser baixada como arquivo.
- **R8.3** As gravações servem para:
  - confirmar como o Meet se comporta, ou seja, quando os blocos somem, se o texto é cortado e até onde as correções voltam;
  - criar testes automáticos que "reapresentam" uma reunião real e verificam se a transcrição saiu sem repetições e sem buracos.
- **R8.4** A primeira gravação real será feita por mim depois. A lógica da gravação (4.1) é construída antes dela, com as regras deste documento, e ajustada quando a gravação chegar.
- **R8.5** As gravações de diagnóstico não se acumulam para sempre:
  - cada uma tem um tamanho máximo e para de crescer ao atingi-lo;
  - a lista de gravações de diagnóstico tem um botão para apagar cada uma;
  - elas são apagadas junto com a reunião correspondente e pela limpeza automática (R7.2);
  - gravações de reuniões em que ninguém falou também aparecem na lista e podem ser apagadas.

### 4.9 O que sai

- **R9.1** O histórico de 5 em 5 minutos. Os horários em cada fala substituem ele.
- **R9.2** O botão "Download Current Transcription". A reunião em andamento já aparece na lista.
- **R9.3** A janela solta de 470×600 que abre hoje, substituída pelo menu e pela aba da tela de reuniões.
- **R9.4** A função de aumentar o vídeo que não é usada hoje, substituída pelo R4.8.
- **R9.5** As reuniões passam a ficar guardadas na extensão, não mais dentro do site do Meet.
- **R9.6** As reuniões já salvas no formato atual são importadas como estão para a extensão, marcadas como "formato antigo". Elas só têm as últimas falas, sem horário por fala.

### 4.10 Qualidade

- **R10.1** Testes automáticos para a gravação das legendas, incluindo:
  - correções e falas longas;
  - sair e voltar, e mudança de dia;
  - desligar e religar as legendas no meio da reunião, inclusive recarregando a página;
  - desligar a extensão mantendo ou descartando a gravação;
  - parar de gravar só uma reunião (R3.9);
  - a limpeza automática de reuniões antigas;
  - exportar e importar o backup.
- **R10.2** Lint, testes e build rodam automaticamente a cada mudança enviada ao GitHub.
- **R10.3** Remover permissões, código e dependências que não forem mais usados.
- **R10.4** Atualizar o README para descrever o que a extensão faz de verdade.
- **R10.5** Consertar o hook que valida as mensagens de commit, que hoje aponta para outro projeto e não valida nada.

---

## 5. Decisões registradas

Decisões que nasceram de sugestões durante a conversa e foram aceitas:

1. **Reuniões no formato antigo:** são importadas como estão (R9.6).
2. **Reunião que passa da meia-noite:** continua a mesma se eu voltar em até 15 minutos (R2.4).
3. **Legendas desligadas por mim:** continuam desligadas ao recarregar a mesma reunião (R3.3).
4. **Parar de gravar só uma reunião:** existe, pelo menu (R3.9).
5. **Meu nome** no lugar de "Você" (R7.3) e **backup** de todas as reuniões (R7.4).

A decidir depois da primeira gravação de diagnóstico (R8.4):

- **Falas muito longas:** quando uma pessoa fala por muitos minutos seguidos, a fala pode virar um bloco único com um só horário. Se isso acontecer no Meet real, avaliar quebrar a fala em parágrafos, cada um com o seu horário.

## 6. Ordem das etapas

Antes de tudo, a **etapa 0** atualiza todos os pacotes do projeto para as últimas versões, sem mudar nenhuma funcionalidade. O projeto tem cerca de 14 meses e está defasado.

1. **Gravação completa.** Base de todo o resto.
   - Gravação e identificação: seções 4.1 e 4.2.
   - Ligar e desligar: seção 4.3, **menos** o R3.9.
   - O menu da extensão (R5.0a e R5.0b, sem o botão do R3.9).
   - Uma versão **mínima** da tela de reuniões, só para ler (R5.1 a R5.5), que serve para conferir a gravação.
   - Modo de diagnóstico: R7.1 e seção 4.8, menos apagar gravações (R8.5, que fica na etapa 2).
   - Remoção do código antigo e importação do formato antigo (seção 4.9).
   - Os testes do R10.1 que correspondem a essas partes.
2. **Tela de reuniões completa e configurações.**
   - Busca, renomear, apagar e baixar: R5.6 a R5.12.
   - Exportação: seção 4.6.
   - Configurações: R7.2 a R7.4 e R8.5.
   - Parar de gravar só uma reunião: R3.9.
3. **Janela flutuante:** seção 4.4.
4. **Qualidade:** R10.2 a R10.5.

Cada etapa tem o seu próprio plano de implementação, em `docs/superpowers/plans/`.
