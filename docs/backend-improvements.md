# Referência de melhorias do backend

Este documento orienta agentes que continuarem o trabalho. Leia também `CLAUDE.md`
e `apps/backend/CLAUDE.md`. Atualize os estados e registre validações ao concluir
cada etapa. Não trate itens pendentes como implementados.

## Objetivo e legibilidade

A avaliação completa de leitura, contratos, concorrência e operação está em
[backend-review.md](backend-review.md). Ela registra achados e propostas; os
itens dessa avaliação ainda não foram implementados.

Restabelecer o HLTB, simplificar o backend e tornar o código fácil de entender.
Legibilidade faz parte de todas as etapas, não é uma revisão estética ao final:

- Use nomes que expressem o domínio e funções com uma responsabilidade clara.
- Prefira fluxo explícito, retornos antecipados e poucas condições aninhadas.
- Evite abstrações genéricas, arquivos vazios e camadas sem responsabilidade.
- Comente decisões e limitações; não repita em comentários o que o código já diz.
- Valide dados externos e de cache nas fronteiras; não substitua validação por casts.
- Mantenha imports ESM com `.js`, formatação Biome e dependências entre camadas.
- Refatore junto da correção quando isso reduzir complexidade; evite reescritas amplas.
- Teste comportamentos e regressões, incluindo falhas, sem depender da rede na suíte.

## Diagnóstico confirmado em 2026-10-13

- `howlongtobeat-ts@1.1.1` chamou `/api/bleed/init`, recebeu 404 e retornou
  `success: false` na busca por Hollow Knight.
- O cliente local converteu a falha em `MISS` e a guardou por uma hora.
- O cache IGDB também incorpora HLTB e mantém `MISS` por 24 horas.
- `1.3.1`, testada isoladamente, usou `/api/search/site/init` e `/api/search/site`;
  recebeu 200 e retornou os tempos do jogo em menos de um segundo.
- O refresh atual pode apagar tempos válidos quando o provedor falha.
- Baseline: 163 testes em 21 arquivos e checagem TypeScript passaram.

## Etapa 1 — HLTB e cache (concluída)

- [x] Atualizar a dependência para a versão validada.
- [x] Distinguir `FAILED` de `MISS`; registrar o motivo retornado pelo provedor.
- [x] Usar cancelamento real com prazo total; remover o wrapper de timeout manual.
- [x] Separar cache IGDB de HLTB e versionar chaves para ignorar falsos misses antigos.
- [x] Validar cache HLTB; JSON inválido deve provocar nova consulta.
- [x] Compartilhar consultas simultâneas do mesmo nome no processo.
- [x] Limitar a rota de refresh por sessão/usuário autenticado.
- [x] Preservar tempos persistidos quando o refresh falhar.
- [x] Cobrir falha explícita, timeout, cache inválido, concorrência e recuperação.
- [x] Validar suíte, TypeScript, lint dos arquivos alterados e busca real isolada.

Critérios: falha nunca vira ausência; HLTB não fica congelado no TTL IGDB; não há
limpeza global do Redis; sessões não são afetadas. Entradas antigas no PostgreSQL
continuam como estavam até o usuário usar o refresh existente. Uma recuperação em
lote é trabalho separado e deve ter seleção explícita, limite de taxa e retomada.

## Etapa 2 — Banco e fila (concluída)

- Reduzir queries nas atualizações usando operação que devolva o registro e filtre
  o proprietário. Preservar os erros de recurso ausente e isolamento entre usuários.
- Evitar regravar toda a fila ao mover uma entrada.
- Proteger cálculo e gravação de posições contra concorrência; uma transação sem
  isolamento/lock apropriado não resolve sozinha a disputa por `máximo + 1`.
- Revisar o retry que sobrescreve `Pool.query`/`Pool.connect`: separar aquisição de
  conexão de repetição de escritas cujo commit pode ter ocorrido.
- Validar mudanças de concorrência com PostgreSQL real, além de testes unitários.

## Etapa 3 — Simplificação e evolução (parcial)

- Remover heartbeat cron e dependência se não houver outra utilização.
- Remover repository vazio de games e compatibilidades sem consumidores.
- Avaliar enriquecimento HLTB posterior ao cadastro; definir antes contrato de
  estado, execução durável, retry e atualização da interface.
- Melhorar correspondência por nome, ano e plataforma com exemplos de remakes/DLC.
- Adicionar testes HTTP dos fluxos principais com Fastify.inject e documentar o
  que eles simulam e o que depende de infraestrutura real.

## Limites e decisões

Manter Fastify, Prisma, PostgreSQL, Redis, sessões, CSRF e Argon2. Não alterar
contratos públicos ou schema de banco sem necessidade demonstrada. Não executar
migrações destrutivas, recuperação em lote ou deploy para validar uma correção.

## Registro de execução

- Arquivo criado antes das alterações de implementação, com legibilidade incluída
  no escopo solicitado pelo usuário.

- Etapa 1 implementada: `howlongtobeat-ts@1.3.1`; falha explícita com log;
  deadline total por AbortSignal; cache independente; validação Zod; consultas
  simultâneas compartilhadas no processo; refresh limitado a 5/min por usuário;
  tempos persistidos preservados em falha.
- Chaves novas: `hltb:v2:name:<nome normalizado>` e `igdb:v2:game:<id>`.
  Chaves antigas expiram normalmente; não executar FLUSHDB/FLUSHALL. O cache de
  busca IGDB permanece igual, pois não inclui HLTB.
- `hltbStatus` na biblioteca descreve a tentativa mais recente: `FAILED` pode
  coexistir com tempos da última consulta bem-sucedida. `MISS` confirmado ainda
  substitui os tempos por null. A interface existente já exibe tempos preservados.
- Consultas compartilhadas valem por processo, não são um lock distribuído.
  O prazo inclui as chamadas de inicialização e busca; retries automáticos estão
  desativados para respeitar esse orçamento e evitar amplificar falhas.
- Validação: 175 testes em 23 arquivos passaram; TypeScript e Biome dos arquivos
  alterados passaram. Novo teste HTTP usa Fastify.inject, rate limiter em memória
  e Prisma/provedor simulados; não comprova integração com Redis/PostgreSQL real.
- Busca real pelo HltbClient atualizado, usando cache em memória: Hollow Knight
  retornou FOUND, 27h principal, 41,6h extras e 65,6h completista. Tempos do provedor
  podem mudar. Não houve deploy nem alteração de registros persistidos.
- Na conclusão da etapa 1, etapas 2 e 3 ainda estavam pendentes. Veja a atualização abaixo.
- A checagem TypeScript também inclui os testes. Seu tsconfig passou a incluir
  os fontes para carregar as declarações de sessão e plugins Fastify usadas pelo
  novo teste de rota.

## Atualização — correções e legibilidade do backend

Implementado após a avaliação completa:

- Verificação de e-mail atômica por hash/expiração; URLs de log sem query string.
- Remoção do retry de queries e do monkey-patch do pool. Falha de conexão continua
  retornando 503; não se repete uma escrita cujo resultado é desconhecido.
- Biblioteca: patches explícitos e tipo LibraryEntryChanges, lock por usuário para
  create/update/move/remove, updateManyAndReturn, remoção sem pré-leitura e troca
  somente das duas posições afetadas em filas válidas. Dados antigos com posições
  ausentes/repetidas são normalizados quando necessário.
- Games/library: handlers simples nas rotas, controllers intermediários removidos.
  Estatísticas em library.stats.ts; schemas shared separados por domínio; aliases,
  repository vazio, helper de validação sem uso e heartbeat/croner removidos.
- Serviços dependem das capacidades públicas utilizadas (Pick), com e-mail injetado
  sem carregar env/Resend nos serviços. Os testes de service dispensam as never.
- IGDB: validação de resposta/cache, timeout incluindo corpo, renovação de token
  compartilhada, credenciais no body e limite de 60/min por usuário em cada rota.
- Entradas numéricas rejeitam booleanos, arrays, objetos e strings vazias; números
  e strings numéricas continuam aceitos, com arredondamento e zero/null preservados.
- Reset: emissão serializada de um código ativo e orçamento atômico de dez chamadas
  check/verify por código. Falha de envio invalida só o código daquela solicitação.
- Reenvio de verificação restaura o token anterior em falha sem sobrescrever um
  token mais recente. Erros de envio usam logger injetado sem registrar destinatário.
- Gerador cria quatro arquivos para recurso privado, com filtro de proprietário e
  schemas de resposta explícitos. Bootstrap fecha recursos em falha de inicialização
  e shutdown tem proteção contra repetição e prazo de dez segundos.

### Migration necessária

`20261013180000_add_reset_attempts` adiciona attempts (default zero) em
password_reset_tokens. Foi aplicada somente ao PostgreSQL descartável dos testes.
Antes de iniciar a versão atual em outro banco, executar no ambiente alvo:

```sh
pnpm --filter backend exec prisma migrate deploy
```

### Testes com PostgreSQL

A suíte padrão pula backend.database.test.ts. Para executá-lo, forneça explicitamente
um banco descartável já migrado:

```sh
DATABASE_URL=postgresql://USER:PASS@HOST:PORT/TEST_DB pnpm --filter backend exec prisma migrate deploy
BACKEND_TEST_DATABASE_URL=postgresql://USER:PASS@HOST:PORT/TEST_DB pnpm --filter backend test
```

Os testes usam usuários com emails aleatórios e limpam somente os registros criados
pela suíte. Não há fallback para DATABASE_URL. A validação desta alteração usou
PostgreSQL 17 em container temporário, sem volumes e com porta local dinâmica.

### Evoluções que continuam separadas

- Recuperação HLTB em lote, enriquecimento assíncrono e matching por ano/plataforma.
- Paginação de biblioteca/exportação, com mudança conjunta do contrato e frontend.
- Outbox durável para e-mails. A troca de e-mail mantém envio antes da gravação
  para preservar o comportamento existente em falhas de entrega. Se a gravação
  posterior falhar, o link enviado pode não corresponder ao estado persistido;
  a atomicidade entre provedor e banco depende de um fluxo durável separado.
- Testes PostgreSQL não testam o Redis de produção; HTTP de sessão usa store em
  memória e clientes externos são simulados. Não houve teste de carga ou deploy.

### Validação final desta implementação

- 188 testes passaram em 26 arquivos, incluindo seis testes com PostgreSQL 17
  real, num container descartável com todas as 11 migrations aplicadas. O
  container foi encerrado ao final. Nenhum banco configurado na aplicação mudou.
- TypeScript dos fontes e testes, build do backend, Biome do backend inteiro e
  schemas shared, e git diff --check passaram.
- Gerador executado numa pasta temporária: quatro arquivos criados e sintaxe
  TypeScript verificada. O modelo de domínio ainda deve ser definido por quem
  gerar um módulo, conforme as instruções do template.
- Build agora limpa dist antes de compilar, evitando sobras de arquivos removidos;
  Biome exclui dist e o client Prisma gerado dos checks.

## Hotfix — inicialização de produção e pacote shared

O refactor separou os schemas, mas o package.json de shared ainda apontava para
src/index.ts. Esse arquivo reexportava auth.js/game.js/library.js, inexistentes
em src. Vitest/tsx resolveram .js para .ts durante os testes; Node puro em
produção encerrou com ERR_MODULE_NOT_FOUND. O Railway respondeu 502 sem header
CORS, causando a mensagem de CORS no navegador. Os logs de produção confirmaram
essa causa; a migration já havia sido aplicada com sucesso.

Correção: shared compila src em dist e exporta dist/index.js para runtime, mantendo
src/index.ts como entrada de tipos. Build, dev e testes do backend compilam shared
explicitamente. O build inclui check:runtime com Node puro, e o CI agora executa
o build completo. Não alterar CORS nem ampliar origens para resolver esse caso.

Validação do hotfix: importação com Node 22.23.3; servidor compilado iniciado
com Redis descartável, sessão 200, preflight 204 e library sem sessão 401, ambos
com CORS correto. Build, TypeScript, lint e 182 testes passaram (seis testes de
PostgreSQL não foram executados nesta checagem). Nenhuma migration adicional.
Em desenvolvimento, alterações em packages/shared/src precisam de um novo build
shared ou reinício do comando dev do backend.
