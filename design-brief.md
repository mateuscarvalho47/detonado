# Detonado — brief de produto e interface

Documento do produto que o código faz hoje. Serve de referência para a interface e para uma apresentação técnica. O componente da home é `AgoraScreen.tsx`. O título visível é **Agora**.

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

Tema escuro, forçado. Tinta quente em cinco degraus (página, painel, faixa, fio, osso), um grotesco (IBM Plex Sans), números tabulares (IBM Plex Mono). A capa do jogo carrega a cor. O chrome não tem brilho, gradiente nem botão em degradê.

Status aparece como texto e um filete de 2 px. Na grade, esse texto fica numa placa da cor da página, com fio de osso, para continuar legível em cima da capa. Lista densa no desktop, grade no celular. A landing é estática e tem duas ações: **Criar conta** e **Já tenho conta**.

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

Entrada da biblioteca: ficha IGDB copiada, status, `userPlatform`, `rating` (inteiro 0–10), `hoursPlayed`, `notes`, `completedAt`, tempos do HowLongToBeat e `hltbStatus` (`FOUND`, `MISS` ou `FAILED`).

Hora `0` e plataforma vazia são gravadas. A data de conclusão só permanece com status Zerado; ao sair dele, a data sai junto. Nota `0` também é enviada.

`FOUND` mostra Principal, + Extras e Completista. `MISS` diz que não há tempo publicado. `FAILED` diz que a consulta falhou. Os três casos, e uma entrada antiga sem status, têm **Buscar de novo**. Uma falha não fica guardada no cache como se o jogo não existisse no HowLongToBeat.

Estatísticas (`GET /api/library/stats`): totais, contagem por status, gêneros, plataformas, distribuição de nota, linha do tempo de conclusões. A home não chama essa rota.

## Conta

- Registro exige consentimento e dispara e-mail de verificação. Se o envio falha, a conta é apagada e a API responde erro.
- O link de verificação vale 24 horas. O banco guarda o SHA-256 do token; o e-mail leva o valor cru. Token ausente, expirado, sem prazo ou ainda em texto puro responde o mesmo erro. Essas contas pedem um reenvio.
- Reenvio e troca de e-mail também falham a requisição se o e-mail não sai. Na troca, o endereço e a senha nova só são gravados depois do envio.
- Login exige e-mail verificado. Sessão no Redis, 7 dias, cookie `httpOnly`. Em produção o cookie é `Secure` e `SameSite=None`. Cada POST, PATCH e DELETE envia `x-csrf-token`, obtido em `GET /api/auth/csrf`.
- Redefinição de senha: código de 6 dígitos, 15 minutos. Se o e-mail não sai, o código recém-criado é invalidado e a API responde erro. E-mail desconhecido continua em silêncio.
- O seed `alice@example.com` e `bob@example.com` (senha `password123`) nasce com e-mail verificado. Rodar o seed de novo marca a conta existente como verificada, sem trocar a senha.
- Troca de senha invalida sessões anteriores.
- Exportação e exclusão de conta existem. A exclusão pede a senha. A exportação traz a conta e as entradas, com gêneros, plataformas, capa e tempos do HowLongToBeat. Hash de senha e token de verificação ficam de fora.

## Fora do produto

Feed, amigos, perfil público, listas além dos seis status, importação Steam, notificações. O cron do backend é um batimento horário, não um job de HowLongToBeat.

## O que uma leitura de dez minutos ainda encontra

- O frontend não importa `@detonado/shared`. Os tipos da interface ficam em `apps/frontend/src/types/api.ts`.
- Não há suíte HTTP. Os testes mockam o repositório.
- A ficha baixa a biblioteca inteira e acha o jogo pelo `igdbId`.
- O tema claro existe no CSS e a interface não o usa.
- `REFACTOR_PLAN.md` é histórico de tokens visuais. O título aponta para o Detonado e avisa que o restante não descreve a interface atual.
- O Swagger em `/docs` descreve a API. Um POST feito pelo “try it out” falha sem o header `x-csrf-token`.
- `TRUST_PROXY` nasce `false`. Atrás de um proxy, o limite de taxa vê o IP do proxy até `TRUST_PROXY=1`.
