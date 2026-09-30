# Detonado — brief de produto e interface

Documento do produto que o código faz hoje. Serve de referência para a interface e para uma apresentação técnica. O arquivo de componente da home ainda se chama `DashboardScreen.tsx`. O título visível é **Agora**.

## O que é

**Detonado** é uma biblioteca pessoal de jogos, em português. A pessoa busca um jogo no IGDB, guarda uma ficha, marca um de seis status e anota plataforma, horas, nota e texto livre. Os três tempos do HowLongToBeat são copiados no momento em que o jogo entra na biblioteca.

A primeira frase da landing é “Sua biblioteca de jogos.” O nome Detonado fica; a frase deixa claro que isto é arquivo pessoal, e não um guia de jogo.

Domínio previsto: `https://detonado.carvalholabs.com.br/`. Contato: `sac@carvalholabs.com.br`.

## Tom

Registro seco. Palavras de jogador em português. Inglês só em nome próprio: IGDB, HowLongToBeat. Sem emoji, sem “grátis”, sem elogio automático ao tempo do HowLongToBeat.

| Código | Rótulo na interface |
| --- | --- |
| `WISHLIST` | Quero jogar |
| `BACKLOG` | Fila |
| `PLAYING` | Jogando |
| `PAUSED` | Pausado |
| `COMPLETED` | Zerado |
| `DROPPED` | Abandonado |

Navegação: **Agora**, **Biblioteca**, **Estatísticas**. Título da área logada: Biblioteca.

Tempos do HowLongToBeat na ficha e no modal de adicionar: **Principal**, **+ Extras**, **Completista**.

## Visual

Tema escuro, forçado. Carvão quente, um grotesco (IBM Plex Sans), números tabulares (IBM Plex Mono). A capa do jogo carrega a cor. O restante é grafite e osso, sem brilho, sem gradiente, sem botão em degradê.

Status aparece como texto e um filete de 2 px. Lista densa no desktop, grade no celular. A landing é estática e tem duas ações: **Criar conta** e **Já tenho conta**.

A home logada é a prateleira:

- cabeçalho **Agora**
- três contagens: Jogando, Na fila, Horas na fila
- listas “jogando agora” e “fila”
- estado vazio com um convite para adicionar o primeiro jogo

Horas na fila soma `hltbMain` das entradas em Fila. Quando alguma entrada da fila não tem tempo, a interface mostra a ressalva em texto pequeno. A ficha trata os três tempos como dado, sem comentário.

A barra de horas sobre 100 e a faixa de atividade saíram desta home. Zerados recentes e a quebra por status ficam em `/stats`.

Nota é inteiro de 0 a 10, também com status Jogando. O zero da nota é enviado no salvamento.

## Rotas da interface

| Rota | Quem vê | O que mostra |
| --- | --- | --- |
| `/` | anônimo | landing |
| `/` | autenticado | prateleira Agora |
| `/login`, `/register` | anônimo | cartão simples; registro pede consentimento |
| `/verify-email` | link do e-mail | confirma o token ou pede reenvio |
| `/forgot-password`, `/reset-password` | anônimo | código de 6 dígitos |
| `/library` | autenticado | lista (padrão) ou grade, filtro e ordenação |
| `/library/:igdbId` | autenticado | ficha; a tela baixa a biblioteca inteira e acha o jogo pelo `igdbId` |
| `/stats` | autenticado | totais, status, gêneros, plataformas, notas, conclusões |
| `/account` | autenticado | e-mail, senha, exportação, exclusão |

Busca é modal global (atalho Ctrl/Cmd+K na área logada), não uma rota `/search`.

## Dados que a interface usa

Usuário autenticado: `id`, `email`, `emailVerified`.

Jogo IGDB: `igdbId`, `name`, `coverUrl`, `releaseYear`, `platforms`, `genres`.

Entrada da biblioteca: ficha IGDB copiada, status, `userPlatform`, `rating` (inteiro 0–10), `hoursPlayed`, `notes`, `completedAt`, `hltbMain`, `hltbMainExtra`, `hltbCompletionist`.

Estatísticas (`GET /api/library/stats`): totais, contagem por status, gêneros, plataformas, distribuição de nota, linha do tempo de conclusões. A home não chama essa rota.

## Conta

- Registro exige consentimento e dispara e-mail de verificação.
- O link de verificação vale 24 horas. Token ausente, expirado ou sem prazo responde o mesmo erro. Conta antiga sem prazo precisa de um reenvio.
- Login exige e-mail verificado. Sessão no Redis, 7 dias, cookie `httpOnly`.
- Redefinição de senha: código de 6 dígitos, 15 minutos.
- Troca de senha invalida sessões anteriores.
- Exportação e exclusão de conta existem. A exclusão pede a senha. A exportação traz conta e entradas, sem gêneros, plataformas IGDB, capa e tempos HLTB.

## Fora do produto

Feed, amigos, perfil público, listas além dos seis status, importação Steam, notificações. O cron do backend é um batimento horário, não um job de HowLongToBeat.

## O que uma leitura de dez minutos ainda encontra

- O título do Swagger continua “API Boilerplate”.
- O seed `alice@example.com` / `bob@example.com` nasce com e-mail não verificado, então o login recusa.
- Hora `0` e plataforma vazia ainda saem do corpo do salvamento da ficha.
- O token de verificação é guardado em claro. O prazo de 24 horas está no código; o hash do token não.
- `apps/frontend/README.md` ainda é o texto do template do Vite.
- `REFACTOR_PLAN.md` é histórico de tokens visuais. O título aponta para o Detonado e avisa que o restante não descreve a interface atual.
