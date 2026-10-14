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
