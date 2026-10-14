# Detonado — roadmap de funcionalidades

Data: 13/10/2026.

## Objetivo e escopo

Evoluir a biblioteca pessoal para facilitar a escolha, o acompanhamento e a retomada dos jogos. Sem feed, amigos, perfil público ou funcionalidades sociais.

Este documento reúne todas as sugestões da conversa. A ordem considera utilidade imediata, esforço e dependências; não representa funcionalidades já disponíveis. O usuário autorizou a execução de todas as etapas, nesta ordem. Cada funcionalidade terá branch própria, commit e push, seguida de integração em produção após validação.

## Ordem de prioridade

| Ordem | Mudança | Entrega inicial e critérios de aceite | Dependências |
| --- | --- | --- | --- |
| 1 | Plataforma preferida | Preferência opcional por conta, persistida no servidor; opção Sem preferência; preenchimento inicial ao adicionar um jogo compatível; escolha manual preservada; nenhuma alteração retroativa. | Conta, catálogo de plataformas e modal de adicionar. |
| 2 | Filtros combináveis e salvos | Combinar status, plataforma, gênero e duração; limpar filtros; salvar uma combinação e restaurá-la; tratar jogos sem estimativa explicitamente. Incluir atalho para a plataforma preferida quando houver configuração. | Preferência de plataforma; persistência das buscas salvas. |
| 3 | Registro de sessões | Registrar data, duração e comentário opcional; editar/excluir sessão; total de horas consistente; distinguir horas anteriores do histórico de sessões para evitar duplicação; mostrar última sessão. | Definição da migração de horas manuais. |
| 4 | O que jogar agora? | Retornar até três sugestões da própria biblioteca por plataforma, gênero e duração total desejada; explicar cada escolha; respeitar a preferência sem excluir escolhas manuais; tratar ausência de resultados. Duração total não significa duração de uma sessão. | Filtros e tempos HLTB; sessões podem melhorar a seleção depois. |
| 5 | Coleções e tags pessoais | Criar, renomear e excluir agrupamentos; adicionar/remover jogos; um jogo pode pertencer a vários; excluir coleção não exclui jogos. | Novos dados por usuário e filtros. |
| 6 | Objetivo de conclusão por jogo | Escolher Principal, + Extras ou Completista; exibir a estimativa correspondente; checklist pessoal opcional; horas HLTB não viram percentual real de progresso. | Ficha e estimativas existentes. |
| 7 | Campanhas e rejogadas | Criar nova campanha preservando datas, horas, notas e conclusão da anterior; distinguir campanha ativa de histórico; definir agregação em estatísticas. | Sessões e objetivo de conclusão. |
| 8 | Importação em lote por CSV | Prévia antes de gravar, validação por linha, resolução de correspondências, duplicados identificados e resumo de erros; não sobrescrever registros sem escolha explícita. A exportação de conta existente continua disponível. | Identificação de jogos e regras de deduplicação. |
| 9 | Origem e disponibilidade | Registrar loja, mídia física, assinatura ou empréstimo; vencimento opcional; permitir mais de uma origem; filtrar disponibilidade sem confundir loja com plataforma. | Modelo de acesso/posse por entrada. |
| 10 | Diário de progresso | Entradas datadas, edição/exclusão e marcação de spoilers; preservar as notas atuais na transição; permitir consultar onde parou. | Sessões e campanhas. |
| 11 | Retrospecto por período | Selecionar mês/ano, acompanhar sessões e conclusões e comparar períodos; definir fuso, intervalos e tratamento de dados históricos sem sessões. | Sessões e campanhas. |
| 12 | Edição em lote | Selecionar jogos e atualizar status, plataforma ou tags; apresentar resultado parcial quando necessário; preservar regras de fila e conclusão. | Filtros, tags e regras de atualização existentes. |
| 13 | Integração Steam | Investigar acesso e limites da API, visibilidade da biblioteca e correspondência Steam–IGDB; importar com prévia e resolução de duplicados. Sincronização automática é etapa separada. | Pipeline de importação e investigação técnica. |
| 14 | Modo offline | Consultar dados previamente carregados e registrar sessões; sinalizar pendências; sincronizar sem duplicação e resolver conflitos; limpar dados locais ao sair da conta. | Sessões estáveis, estratégia de sincronização e armazenamento local. |

## Etapa 1 — contrato de plataforma preferida

- `User.preferredPlatform`: nome canônico de plataforma IGDB ou `null`; contas existentes começam com `null`.
- Catálogo autenticado: `GET /api/games/platforms` retorna `{ platforms: string[] }`, ordenadas e sem duplicados; nomes devem ser compatíveis com os nomes presentes em `GameSearchResult.platforms`.
- Atualização autenticada: `PATCH /api/auth/preferences`, corpo `{ preferredPlatform: string | null }`, resposta `{ preferredPlatform: string | null }`.
- `GET /api/auth/me` e a resposta de login incluem `preferredPlatform`; a exportação da conta também inclui o campo.
- Validar nome não vazio e comprimento máximo de 200; validar pertencimento ao catálogo ao salvar uma plataforma. `null` remove a preferência sem consultar o catálogo externo.
- A atualização usa a sessão atual e CSRF; não pede senha, não altera e-mail, senha ou versão de sessão.
- A interface apresenta seletor com rótulo Plataforma preferida e opção Sem preferência, estados de carregamento, erro, salvamento e sucesso.
- No cadastro de jogo, preferência compatível seleciona a plataforma. Com preferência incompatível, iniciar sem plataforma; sem preferência, preservar o comportamento atual de selecionar a primeira plataforma disponível.
- Nunca sobrescrever uma seleção manual quando a preferência ou o catálogo terminar de carregar. Trocar de jogo deve recalcular os valores iniciais sem carregar a escolha do jogo anterior.
- Plataforma da entrada permanece editável. Alterar ou remover a preferência não modifica entradas existentes.
- Lista ordenada de prioridades, atalho de filtro e recomendações ficam para as próximas etapas.

## Regras de execução dos agentes

### Comuns

Ler `CLAUDE.md` da raiz e da aplicação, `design-brief.md`, este documento e qualquer `AGENTS.md` aplicável. Preservar alterações do usuário. Seguir a arquitetura e o estilo existentes; não adicionar dependências sem necessidade. Não editar arquivos gerados manualmente nem executar reset/seed destrutivo. O usuário autorizou branch, commit, push e produção por funcionalidade; o agente principal centraliza essas operações para evitar conflitos entre agentes. A migração deve ser aditiva. Não expor segredos em saídas. Comunicar mudanças de contrato antes de implementá-las.

Cada agente implementa a etapa corrente dentro de sua área e pausa antes da próxima até o agente principal concluir a entrega. Todas as etapas estão autorizadas. Reportar arquivos, decisões, verificações e limitações. Usar testes de comportamento relevantes, executar lint e build da aplicação e corrigir regressões causadas pelas mudanças. A revisão final valida integração, documentação e consistência dos contratos.

### Frontend

Responsável por `apps/frontend/**`. Manter React, TanStack Query/Router, formulários Zod, CSS Modules e tokens existentes; componentes chamam hooks e hooks chamam services. Estado do servidor fica no Query, não no Zustand. Tipos locais em `src/types/api.ts`, sem dependência de shared. Usar cliente HTTP existente com CSRF. Atualizar cache de usuário após salvar e preservar preferências no login. Garantir acessibilidade e comportamento em telas pequenas. Seguir tom e visual do brief. Se precisar de inspiração, carregar `.agents/skills/revenue-centric-design/SKILL.md` e a referência adequada, sem ampliar o escopo. Após editar múltiplos TSX, aplicar a skill `vercel:react-best-practices`.

### Backend

Responsável por `apps/backend/**` e `packages/shared/**`. Ler também `docs/backend-improvements.md`. Respeitar routes/controller → service → repository, Zod, imports ESM com `.js`, autenticação, CSRF, isolamento por usuário e limites de chamada. Integrar catálogo pelo cliente IGDB existente com timeout/cache apropriados. Manter contratos de resposta completos, sem vazar campos sensíveis. Criar migração aditiva e regenerar Prisma; não aplicar migrations diretamente no banco da aplicação localmente. O usuário confirmou que Railway executa prisma migrate deploy antes de iniciar e produção acompanha main automaticamente. Testar persistência, remoção, validação, respostas de sessão/login/exportação e proteção HTTP. Testes de banco apenas com `BACKEND_TEST_DATABASE_URL` explícita.

## Registro de execução

- [x] Inspecionar funcionalidades e regras existentes.
- [x] Documentar todas as propostas em ordem de prioridade.
- [x] Escopo confirmado pelo usuário: todas as funcionalidades; branch/push/produção por funcionalidade.
- [ ] Implementar backend da etapa autorizada.
- [ ] Implementar frontend da etapa autorizada.
- [ ] Revisar integração e executar verificações.
- [ ] Atualizar brief/README e registrar resultado, migrações e limitações.

## Publicação por funcionalidade

O usuário confirmou que frontend e backend acompanham `main` e que Railway executa `prisma migrate deploy` antes de iniciar. O agente principal cria `feature/<funcionalidade>`, revisa frontend e backend, executa checks, faz commit/push da branch e merge/push em main. Não usar force push. Registrar hashes e resultado em cada etapa; push em main dispara produção, mas só declarar deploy saudável quando houver verificação real. A conexão Vercel disponível retornou 403 ao consultar o projeto; acompanhar via Git e smoke HTTP quando possível.

### Entrega 1 — plataforma preferida

Implementada no frontend/backend, com migration aditiva `20261013200000_add_preferred_platform`. Catálogo IGDB paginado, validado, limitado a 20 páginas e cacheado por um dia, com consultas simultâneas compartilhadas. Regras de validação em PreferencesService; endpoints autenticados e limitados. UI preserva seleção manual e estado por jogo. Checks: backend lint/build/TypeScript e 192 testes com PostgreSQL17 descartável; frontend lint/build e 86 testes. Nenhum banco de aplicação foi usado nos testes. Branch `feature/preferred-platform`; promoção via merge em main após push.

### Contrato da entrega 2 — filtros combináveis e salvos

CRUD autenticado em `/api/library/filters` e `/:id`, registros `{id,name,filters,createdAt,updatedAt}`. Filtros strict: statuses sem duplicatas (até seis), platform/genre até200, search até100, maxHours positivo até99999.9, includeUnknownDuration boolean opcional. Plataforma é a registrada na entrada, não qualquer plataforma suportada pelo jogo. Os critérios se combinam por AND; múltiplos status por OR. Com maxHours, jogos sem HLTB só entram por inclusão explícita. Sem limite, ausência de HLTB não exclui. Aplicação client-side; persistência user-owned relacional com filtros JSON validado. Exportação inclui filtros. Migration `20261013210000_add_saved_filters`.

### Entrega 2 — filtros combináveis e salvos

Implementados CRUD, filtros por status/plataforma registrada/gênero/Principal/busca, inclusão explícita de duração desconhecida e atalho da plataforma preferida. Restaurar busca e limpar filtros preservam critérios coerentes; movimentação da fila fica oculta quando filtros escondem vizinhos. Validação: 194 testes backend com PostgreSQL17 descartável, lint/build/TypeScript; 91 testes frontend, lint/build. Branch `feature/library-filters`. Entrega1 confirmada: main `2929d4a`, checks GitHub e deploys Vercel/Railway success; smoke `/health`200 e `/api/games/platforms`401 sem sessão.

### Entrega 3 — registro de sessões

Sessões CRUD em `/api/library/:id/sessions` e `/:sessionId`, com `{clientId,playedAt,durationMinutes,notes}`. Data ISO com offset, duração inteira1..1440 minutos, comentário até4000. UUID por usuário garante replay sem duplicação; payload divergente responde409. `baseHours` preserva saldo anterior e `hoursPlayed` passa a ser total arredondado em décimos; `lastSessionAt` registra última sessão. Ajustar total manual altera apenas saldo anterior e rejeita total abaixo das sessões. Escritas usam lock do usuário/transação; excesso de horas reverte sessão e total. Migration `20261013220000_add_play_sessions`. UI possui CRUD/confirmar exclusão, datas locais e cache sincronizado; autosave não reenvia horas não editadas. Exportação inclui sessões. Checks:196 testes backend (10 PostgreSQL),95 frontend, lint/build/TypeScript. Branch `feature/play-sessions`. Entrega2 produção/CI confirmados success, health200.

### Entrega 4 — o que jogar agora?

Seção na Agora sugere até três jogos de Fila/Pausado, com filtros por plataforma registrada, gênero e duração total Principal. Preferência ordena candidatos sem excluir outros, e seleção manual de plataforma prevalece. Desempate determinístico por fila/nome/id; razões explicam status, plataforma e duração. Sem HLTB, candidato fica fora apenas quando há limite, com contagem explicativa. Não estima horas restantes nem duração de sessão. Implementação frontend sem nova API. Checks:100 testes, lint/build e revisão React. Branch `feature/play-next-suggestions`.

### Correção de compatibilidade das sessões

O teste de navegador real confirmou preferência e filtros pela API/DB, mas detectou ausência de `crypto.randomUUID` em HTTP de rede local. Gerador UUIDv4 agora usa `getRandomValues` quando randomUUID não existe, preservando os identificadores de retry. Branch `feature/session-id-compatibility`;101 testes frontend, lint e build passaram.

### Entrega 5 — coleções e tags

CRUD autenticado `/api/library/collections` e `/api/library/tags`, corpo `{name}` e listas `{collections:[]}`/`{tags:[]}`. Nome até100, unicidade por usuário com distinção de maiúsculas. `PATCH /api/library/:id/organization` substitui `{collectionIds,tagIds}` sob transação/lock, valida todos os agrupamentos do proprietário e não grava parcialmente. Entradas retornam arrays de IDs; filtros salvos aceitam collectionId/tagId. Exclusão remove só vínculos e agrupamento. Migration `20261013230000_add_collections_and_tags`; export inclui grupos/vínculos. UI integra gerenciamento na biblioteca, vínculos na ficha e filtros combináveis/salvos. Frontend103 testes, lint/build. Smoke real das entregas1–3 passou após correção UUID: preferência, filtro salvo e sessões create/edit/delete preservando total/base, sem overflow horizontal mobile.

Validação backend entrega5:198 testes incluindo12 PostgreSQL, build/runtime, lint, shared lint e TypeScript aprovados. FKs compostas também impedem vínculos entre usuários no banco. Repositório preserva retorno da linha escalar escrita e consulta apenas vínculos para montar resposta, pois updateManyAndReturn não inclui relações to-many.

### Entrega 6 — objetivo de conclusão e checklist

`completionGoal` enum MAIN/EXTRAS/COMPLETIONIST defaultMAIN em entradas novas/antigas e PATCH existente. Escolha exibe estimativa HLTB correspondente sem inferir progresso. Checklist CRUD `/api/library/:id/checklist` e `/:itemId`, `{text}` até500, PATCH `{text?,completed?}`, listas `{items:[]}`. Item e entrada pertencem ao mesmo usuário; marcar tarefas não muda status do jogo. Export inclui objetivo/checklist. Migration `20261013233000_add_completion_goals`. UI separa salvamento do objetivo do autosave e mantém horas/status. Frontend108 testes, lint/build. Branch `feature/completion-goals`.

Validação backend entrega6:200 testes (13 PostgreSQL, incluindo HTTP checklist), build/runtime, lint backend/shared e TypeScript aprovados. Migração aplicada somente no descartável.

## Retomada em 14/10/2026

Entregas1–6 publicadas por branches individuais e integradas à main; retomada na branch limpa `feature/campaign-history`, base80cb62a. Recriado PostgreSQL17 descartável para testes, sem usar o banco da aplicação. Restam entregas7–14.

### Contrato aprovado — campanhas e rejogadas

Campanha relacional por entrada/usuário com snapshot de status, horas anteriores/total, nota, notas, conclusão, objetivo e datas. A campanha ativa lê os valores atuais da entrada; campanhas arquivadas preservam snapshots. Nova campanha arquiva a anterior, inicia Jogando com zero horas, limpa nota/data de conclusão e desmarca tarefas; preserva HLTB e agrupamentos. Sessões mantêm campanha original. POST de sessão pode informar campaignId esperado: UUID novo em campanha divergente responde409; replay existente compara a campanha original antes de verificar a ativa. Histórico tem consulta por campaignId. Estatísticas somam horas arquivadas+ativas; linha do tempo conta campanhas concluídas sem duplicar snapshot ativo. Contagem por status continua por jogo. Exportação inclui histórico.

### Entrega 7 — campanhas e rejogadas

Implementada com migration `20261014003000_add_campaigns`, backfill de entradas/sessões existentes e FK composta adicional de campanha ativa para conferir entrada e proprietário. Campanha ativa usa a entrada como fonte; histórico armazena snapshots ao arquivar. Rejogada confirmada reinicia registro atual sem perder sessões/datas/notas/nota/objetivo anterior. Sessões históricas têm consulta por campaignId; edição/exclusão recalcula apenas campanha correspondente. Replay idempotente continua válido após trocar campanha; novo UUID em campanha desatualizada responde409. Estatísticas somam todas horas registradas em qualquer status, incluindo campanhas arquivadas, e contam conclusões sem duplicação. Exportação completa. Checks:202 testes backend (15 PostgreSQL/HTTP),113frontend, lint/build/TypeScript. Ensaio de migration com dados legados preservou horas/base/nota/notas/objetivo/status e vínculo de sessão. Branch `feature/campaign-history`.

### Entrega 8 — importação CSV

Prévia sem escrita em POST `/api/library/import/preview` até100 registros, validação por registro e estados READY/DUPLICATE/NEEDS_MATCH/INVALID. Parser aceita aspas/vírgulas/quebras escapadas, BOM/CRLF, rejeita cabeçalhos desconhecidos/repetidos e estrutura irregular; preserva células numéricas como texto para validar no backend, inclusive zero e IDs inválidos. Arquivo até1MB. Nome sem ID exige seleção explícita pela busca IGDB e nova prévia. Commit POST `/api/library/import` até10 por requisição, lotes com progresso/resultados parciais. Duplicatas ignoradas por padrão; UPDATE é opção explícita por registro e altera somente campos preenchidos. Status omitido só recebe BACKLOG em criação, sem reset de duplicata. Criação de entrada/campanha/progresso atômica, chamadas externas fora dos locks e proteção de horas de sessões existente. Sem migration. Checks206 testes backend(16 PostgreSQL/HTTP),129frontend, lint/build/TypeScript. Branch `feature/csv-library-import`.
