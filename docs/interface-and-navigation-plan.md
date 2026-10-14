# Detonado — plano de simplificação da interface e navegação

Data: 14/10/2026.

Status: implementação local autorizada e executada em 14/10/2026; validação e limites registrados abaixo.

## Objetivo

Organizar o aplicativo em torno de três tarefas: escolher um jogo, acompanhar o progresso e consultar o histórico. Reduzir a quantidade de ferramentas expostas simultaneamente, mantendo os recursos existentes acessíveis pelo contexto adequado.

Este plano complementa `product-roadmap.md`: as funcionalidades entregues continuam existindo, mas sua apresentação e seus pontos de acesso serão reorganizados.

## Limites de escopo

- Não excluir dados, funcionalidades ou endpoints nesta reorganização.
- Não converter automaticamente notas em sessões, inventar datas de registros legados ou recalcular horas por causa da mudança de interface.
- Não adicionar funcionalidades sociais, novas integrações, analytics ou dependências sem uma necessidade demonstrada.
- Preservar tema escuro, tokens, tipografia, CSS Modules e linguagem definidos em `design-brief.md`.
- Reaproveitar APIs, hooks e serviços existentes antes de propor novos contratos.
- Não implementar, criar branches, fazer commits, publicar ou executar migrations como parte da criação deste documento.
- A implementação futura depende de autorização do usuário. A autorização anterior de publicação não transforma este pedido de planejamento em autorização para executar o plano.

## Diagnóstico do estado atual

- A sidebar tem Agora, Biblioteca e Retrospecto, além de busca e controles de conta.
- A barra mobile já tem cinco posições: Agora, Biblioteca, Retrospecto, Buscar e Conta. Não há espaço para acrescentar todos os novos destinos diretamente.
- A biblioteca concentra filtros, gerenciamento de coleções/tags, importação CSV, importação Steam e edição em lote.
- A ficha apresenta o formulário principal e seis painéis adicionais: campanhas, objetivo/checklist, coleções/tags, origens, sessões e diário.
- Onde parei, comentários das sessões e diário oferecem três lugares para escrever sobre progresso, com diferenças pouco evidentes na apresentação.
- Parte dos filtros avançados fica no estado local de `useLibraryFilters`; sair da tela pode perder o contexto.
- A sidebar e a barra mobile declaram seus itens separadamente, facilitando divergências entre as duas navegações.

Esses achados vêm da estrutura implementada. A decisão de remover definitivamente algum recurso exigiria avaliação de uso; este plano propõe reorganização e consolidação da interface.

## 1. Arquitetura da informação

| Funcionalidade | Destino proposto | Comportamento |
| --- | --- | --- |
| Agora | Navegação principal | Continuar jogos e escolher o próximo. |
| Biblioteca | Navegação principal | Consultar jogos, status, filtros e ordenação. |
| Coleções | Navegação principal | Consultar e gerenciar agrupamentos em página própria. |
| Retrospecto | Navegação principal | Consultar progresso por período e estatísticas gerais. |
| Importar jogos | Acesso secundário | Página própria com Steam e CSV. |
| Configurações | Rodapé da sidebar e menu Mais | Conta, preferência de plataforma, Steam, privacidade e dados. |
| Filtros salvos | Biblioteca | Atalho junto dos filtros, sem novo destino principal. |
| Edição em lote | Biblioteca | Ferramentas aparecem após entrar no modo de seleção. |
| Sessões, diário e campanhas | Ficha do jogo | Operações associadas ao jogo e ao seu histórico. |
| Checklist, tags e origens | Opções avançadas do contexto correspondente | Acesso secundário, preservando os registros existentes. |
| Pendências offline | Aviso contextual | Acesso quando houver pendências ou falta de conexão. |

Não criar destinos independentes na sidebar para Tags, Checklist, Origens, Sessões ou Diário. Não listar todas as coleções e buscas salvas no menu nesta primeira versão.

### Rotas propostas

| Rota | Decisão |
| --- | --- |
| `/` | Preservar landing anônima e Agora autenticada. |
| `/library` | Preservar biblioteca e representar critérios relevantes na URL. |
| `/library/:igdbId` | Preservar ficha e o contexto de retorno à lista. |
| `/collections` | Nova página frontend para coleções e gerenciamento avançado de tags. |
| `/imports` | Nova página frontend para importações Steam e CSV. |
| `/stats` | Preservar rota e rótulo Retrospecto. |
| `/account` e `/account/data` | Preservar configurações e gerenciamento dos dados. |
| `/onboarding` | Proposta para a etapa posterior de personalização do primeiro acesso. |

Busca global continua sendo uma ação que abre o modal existente. Na execução autorizada, adotadas `/collections`, `/imports` e `/onboarding`, sem rotas alternativas duplicadas.

## 2. Sidebar desktop

Ordem proposta:

```text
Buscar jogos

Agora
Biblioteca
Coleções
Retrospecto

Importar jogos

──────────────
Configurações
Sair
```

### Regras

- Buscar jogos abre o catálogo global; manter Ctrl/Cmd+K.
- Destinos usam links; buscar e sair usam botões.
- Ficha do jogo mantém Biblioteca como área ativa.
- Coleções abre uma página de agrupamentos, sem reproduzir o gerenciador completo na biblioteca.
- Tags ficam como organização avançada nessa página e nos contextos em que já são usadas.
- Status como Jogando, Fila e Zerado continuam como filtros da biblioteca.
- Manter recolhimento da sidebar e permitir rolagem em telas baixas.
- Usar a mesma definição de destinos para desktop e mobile, com diferenças explícitas de apresentação.

## 3. Navegação mobile

Barra inferior proposta, mantendo cinco posições:

```text
Agora · Biblioteca · Buscar · Retrospecto · Mais
```

Mais substitui Conta e abre um painel inferior com Coleções, Importar jogos, Configurações, Privacidade, Termos de Uso e Sair.

### Painel Mais

- Fechar após escolher um destino.
- Fechar por botão de voltar, Escape, botão de fechar ou toque fora.
- Prender o foco enquanto aberto e devolvê-lo ao botão Mais ao fechar.
- Permitir rolagem própria em telas baixas.
- Indicar o destino secundário ativo; distinguir estado de menu aberto de página ativa.
- Respeitar áreas seguras e não cobrir o fim das páginas.
- Reaproveitar as primitivas Radix existentes; avaliar necessidade antes de adicionar dependência.

### Barra superior e teclado

- Exibir título da tela e botão de voltar na ficha.
- Exibir estado de sincronização quando houver informação relevante.
- Manter a busca global na barra inferior.
- Renomear o campo local para Filtrar minha biblioteca.
- Definir e testar o comportamento da barra inferior com teclado virtual aberto, evitando disputa de espaço com formulários.
- Usar um breakpoint consistente para alternar as navegações; partir do limite atual de 1024 px e ajustar somente se a validação de layout justificar.
- Manter alvos de toque confortáveis, rótulos visíveis e foco perceptível.

## 4. Simplificação das telas

| Tela | Conteúdo principal | Conteúdo secundário |
| --- | --- | --- |
| Agora | Jogando, Onde parei e próximos da fila | Ajustes das sugestões. |
| Biblioteca | Jogos, status, filtro local e ordenação | Filtros avançados e edição em lote. |
| Ficha | Status, plataforma, horas, avaliação e Onde parei | Histórico, organização e opções avançadas. |
| Retrospecto | Período selecionado e seus resultados | Gráficos da biblioteca completa. |
| Configurações | Preferências e integrações | Segurança e gerenciamento dos dados. |

### Biblioteca

- Remover os painéis de importação Steam e CSV da listagem e reuni-los em Importar jogos.
- Mover o gerenciamento completo de coleções/tags para Coleções.
- Preservar filtro por coleção/tag e buscas salvas.
- Manter busca local, status e ordenação acessíveis; recolher critérios avançados.
- Exibir critérios ativos e oferecer limpeza explícita.
- Mostrar edição em lote apenas no modo de seleção, preservando confirmação e resultados por jogo.
- Preservar filtros, ordenação e contexto ao abrir uma ficha e voltar, inclusive a partir de uma coleção.

### Ficha do jogo

- Destacar status, plataforma, horas, avaliação e Onde parei.
- Apresentar sessões e diário em um histórico único, identificando o tipo de registro.
- Manter edição/exclusão pelos endpoints e regras de origem; a união da apresentação não funde os modelos de dados.
- Preservar proteção de spoilers e indicação de data original desconhecida em notas legadas.
- Manter Onde parei como resumo independente, sem sobrescrita automática pelo histórico.
- Mostrar total de horas com clareza, registro de sessão próximo e ajuste manual como ação secundária explicada.
- Apresentar Jogar novamente no menu de ações, principalmente para jogos concluídos, com confirmação e proteção de alterações ainda não salvas.
- Consultar campanhas anteriores dentro do histórico, preservando seus vínculos e cálculos.
- Aproximar objetivo de conclusão das estimativas HLTB.
- Recolher checklist, tags e origens em opções avançadas.
- Exibir coleções do jogo por chips ou seletor compacto, sem gerenciamento completo de agrupamentos na ficha.

### Agora

- Priorizar continuar jogos e acessar próximos da fila.
- Mostrar sugestões prontas quando houver candidatos.
- Recolher os critérios em Ajustar sugestões.
- Continuar explicando os motivos das sugestões e que duração HLTB é estimativa total, não tempo restante ou duração de uma sessão.

### Retrospecto

- Priorizar seleção do período e seus resultados.
- Manter gráficos gerais sob Biblioteca completa, como conteúdo secundário.
- Preservar a distinção entre sessões datadas e horas manuais sem data.
- Não alterar agregações ou regras de campanhas durante a reorganização visual.

### Configurações e offline

- Agrupar preferências, integrações, segurança e dados com acessos claros.
- Manter conexão/desconexão Steam em Configurações; importação fica em Importar jogos, com ligação entre os dois fluxos.
- Manter exportação e exclusão em Gerenciar meus dados.
- Tornar o aviso offline compacto sem esconder pendências, erros ou conflitos.
- Preservar confirmação de descarte, idempotência, isolamento por conta e limpeza entre abas.
- Não criar uma nova área principal de navegação para offline nem ampliar suas funcionalidades nesta etapa.

## 5. Cadastro, personalização e privacidade

Implementar esta etapa depois de estabilizar a organização da interface.

Fluxo proposto:

1. Criar conta com os dados essenciais e confirmar o e-mail.
2. No primeiro acesso autenticado, escolher plataforma preferida opcionalmente.
3. Oferecer conexão Steam opcional e uma forma clara de continuar sem conectar.
4. Entrar na biblioteca com uma ação para adicionar ou importar jogos.

O catálogo atual de plataformas exige autenticação. A personalização após confirmar o e-mail permite reaproveitar esse contrato sem expor um novo catálogo público.

### Transparência Steam

Antes de conectar, explicar de forma destacada:

- Dados consultados: SteamID, jogos e horas acumuladas.
- Finalidade: verificar a conta e preparar a importação da biblioteca.
- Quais informações só entram na biblioteca após revisão e confirmação.
- Duração real do vínculo da sessão e do cache de consulta.
- Compartilhamento necessário com provedores para autenticação e correspondência dos jogos.
- Como desconectar e como remover os jogos já importados.

A autorização Steam deve ficar separada do aceite geral do cadastro e não pode ser obrigatória para usar a biblioteca. A política de privacidade deve refletir também preferência de plataforma, histórico de progresso e armazenamento offline.

O contrato de autorização, registro de versão/data e eventual revogação deve ser especificado antes da implementação dessa etapa. A revogação precisa ser aplicada no servidor, inclusive a sessões já abertas, se a autorização for persistida por conta. Não considerar uma checkbox isolada como garantia de conformidade jurídica.

Referência para transparência e consentimento específico: [Lei nº 13.709/2018 — LGPD, arts. 5º, 8º e 9º](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

Quando Steam não estiver configurada no servidor, oferecer continuidade normal no onboarding e acesso à busca/CSV, com explicação da indisponibilidade.

## 6. Estratégia técnica

- Centralizar a definição dos destinos usados pela sidebar, barra mobile e painel Mais.
- Preservar autenticação centralizada em `routes/__root.tsx` e revisar acesso/estrutura visual das novas rotas.
- Manter estado de servidor no TanStack Query e estado de interface no Zustand ou no componente correspondente.
- Não persistir abertura de menus, diálogos ou seleções temporárias.
- Representar filtros relevantes na URL com validação e limites existentes, permitindo links diretos e navegação de voltar/avançar previsível.
- Definir precedência entre URL, seleção manual e preferência de plataforma; abrir uma coleção deve aplicar seu critério explicitamente.
- Tratar coleção/busca removida sem trocar silenciosamente o filtro.
- Reaproveitar componentes de importação e organização nas novas páginas, ajustando sua apresentação.
- Compor o histórico pelos serviços existentes antes de considerar um novo endpoint agregado.
- Carregar painéis secundários quando necessários, sem esconder conteúdo que tenha erro, pendência ou ação em andamento.
- Ao usar carregamento sob demanda, preservar alterações em formulários e evitar desmontagem que descarte trabalho sem aviso.
- Regenerar rotas pelas ferramentas do projeto; não editar arquivos gerados manualmente.
- Revisar novos assets e rotas no service worker, preservando leitura offline dos dados já carregados.
- Mudanças de backend para onboarding/autorização Steam terão contrato e migration aditiva próprios, se necessárias. A reorganização inicial deve reaproveitar os contratos atuais.

## 7. Ordem de execução futura

| Ordem | Prioridade | Etapa | Dependências | Critério de conclusão |
| --- | --- | --- | --- | --- |
| 1 | P0 | Definir destinos, rotas e regras de navegação | Este plano | Cada funcionalidade tem um lugar claro em desktop e mobile; contrato de contexto/filtros definido. |
| 2 | P0 | Sidebar compartilhada e mobile com Mais | Etapa 1 | Todos os destinos acessíveis, estados ativos corretos, foco e comportamento de voltar funcionando. |
| 3 | P1 | Páginas Coleções e Importar jogos | Etapas 1–2 | Gerenciamento e importações saem da biblioteca sem perder recursos. |
| 4 | P1 | Simplificar biblioteca e preservar filtros | Etapas 1–3 | Abrir coleção, entrar num jogo e voltar preserva o contexto; filtros avançados e seleção continuam corretos. |
| 5 | P1 | Consolidar a ficha | Etapa 4 | Histórico integrado, ações principais claras e opções avançadas recolhidas, sem perda de dados. |
| 6 | P1 | Revisar Agora e Retrospecto | Navegação estabilizada | Ações principais aparecem antes dos ajustes e gráficos secundários. |
| 7 | P1 | Transparência e autorização Steam | Especificar contrato e atualizar política | Explicação e controles disponíveis antes de conectar; autorização separada e aplicada no servidor. |
| 8 | P2 | Personalização do primeiro acesso | Etapas 2–7 | Plataforma e Steam opcionais; possibilidade de concluir e começar a biblioteca sem integração. |

A etapa de transparência Steam pode ser antecipada quando a integração for ativada. Ela não deve aguardar o onboarding para oferecer informação antes da conexão.

## 8. Verificação e critérios de aceite

### Navegação e layout

- Verificar larguras de 320 px, 390 px, tablet e desktop, sem overflow horizontal.
- Verificar telas baixas, orientação horizontal e áreas seguras.
- Todos os destinos existentes e propostos são acessíveis no celular.
- Menu Mais fecha corretamente, mantém foco e indica o destino ativo.
- Barra inferior não cobre campos, ações, avisos ou o final das páginas.
- Busca global e filtro local têm funções e rótulos distinguíveis.
- Voltar/avançar, links diretos e retorno da ficha preservam o contexto esperado.
- Rótulos, estados ativos, teclado, foco e leitor de tela são verificados.

### Dados e regressões

- Coleções/tags mantêm vínculos, validações e proteção por usuário.
- CSV/Steam mantêm prévia, confirmação, duplicatas e resultados parciais.
- Sessões mantêm UUIDs, horas e campanha de origem.
- Campanhas preservam histórico e regras de nova campanha.
- Spoilers e notas legadas continuam identificados corretamente.
- Horas manuais e sessões não são duplicadas no histórico ou retrospecto.
- Navegação/carregamento sob demanda não perde alterações de formulários.
- Logout, troca de conta, respostas tardias e outras abas continuam isolados.
- Cache e sincronização offline continuam funcionando após a reorganização.
- Steam indisponível não bloqueia cadastro, personalização ou biblioteca.

Executar testes de comportamento pertinentes, lint, TypeScript, build e ensaios de navegador dos fluxos alterados. Não criar testes apenas para espelhar a estrutura dos componentes.

## 9. Arquivos e áreas prováveis

| Área | Referências atuais |
| --- | --- |
| Estrutura e navegação | `apps/frontend/src/routes/__root.tsx`, `shared/components/Sidebar.tsx`, `shared/components/BottomNav.tsx`, `styles/Shell.module.css`. |
| Estado e filtros | `apps/frontend/src/store/useAppStore.ts`, `features/library/hooks/useLibraryFilters.ts`, `features/library/components/LibraryFiltersPanel.tsx`. |
| Biblioteca | `apps/frontend/src/features/library/components/LibraryScreen.tsx`. |
| Organização e importação | `apps/frontend/src/features/organization/`, `features/import/`, `features/steam/` e novas rotas frontend. |
| Ficha e histórico | `apps/frontend/src/features/detail/`, `features/sessions/`, `features/journal/`, `features/campaigns/`, `features/completion/`, `features/sources/`. |
| Agora e Retrospecto | `apps/frontend/src/features/dashboard/`, `features/suggestions/`, `features/stats/`. |
| Conta e privacidade | `apps/frontend/src/features/auth/`, `routes/account/`, `routes/privacy.tsx`, integração Steam frontend/backend. |
| Referências do produto | `design-brief.md`, `docs/product-roadmap.md`, `README.md`. |

## Registro de execução

- [x] Inspecionar navegação e fluxos atuais.
- [x] Documentar destinos, simplificações, prioridades, dependências e critérios de aceite.
- [x] Obter autorização para iniciar implementação — pedido do usuário em 14/10/2026.
- [x] Implementar as etapas 1–8 e validar localmente, preservando os modelos e regras existentes.
- [x] Atualizar brief, README e roadmap com implementação, contratos e limites.
- [x] Registrar as alterações na branch `feature/interface-and-navigation` e integrar localmente à `main` com commit de merge, conforme pedido do usuário.
- [ ] Aplicar a migration no banco da aplicação e publicar — não realizado nesta execução.

A autorização de implementação veio do pedido explícito do usuário; as restrições de criação deste documento acima registram o escopo histórico do planejamento.


### Contratos adotados na execução

- Destinos e estados ativos centralizados em `shared/lib/navigation.ts`; Biblioteca permanece ativa na ficha. Mais usa diálogo Radix, histórico temporário para voltar e links que substituem essa entrada ao escolher o destino.
- `/library` e `/library/:igdbId` validam os mesmos campos de filtro, ordenação e formato. URL prevalece sobre preferência local; plataforma preferida só entra via atalho explícito. Texto substitui a entrada atual do histórico; mudanças de filtros criam entradas navegáveis. Coleção abre a biblioteca com `collectionId` explícito. Ficha e retorno carregam os mesmos critérios. Remover agrupamento não troca seu identificador silenciosamente.
- Histórico usa queries existentes por campanha e diário. Registros legados ficam separados da ordenação datada, com data original desconhecida. UUIDs, modelos, endpoints de edição/exclusão e cálculo de horas foram mantidos. Formulários secundários permanecem montados ao recolher; rascunhos e operações em andamento protegem navegação e nova campanha.
- Steam: `POST /api/library/steam/connect` recebe `authorizationVersion: "2026-10-14"` e `returnTo` opcional limitado a `/account` ou `/onboarding`. Versão e data de aceite ficam num registro Redis separado, vinculado ao usuário e à sessão, por até sete dias. Verificação e prévia exigem registro ativo; desconexão o revoga e respostas tardias não o recriam. A autorização não é persistida por conta: outras sessões são independentes e isso é explicado antes de conectar. Cache de consulta de jogos permanece em cinco minutos. Nenhum consentimento Steam é inferido do aceite do cadastro.
- Onboarding: `User.onboardingCompletedAt` é nulo para contas novas; `POST /api/auth/onboarding/complete`, autenticado e protegido por CSRF, registra a conclusão. Plataforma e Steam são opcionais. Contas existentes são marcadas como concluídas pela migration aditiva, sem mudar jogos ou preferências. O frontend direciona o primeiro acesso à personalização e salva a plataforma escolhida ao continuar.

### Validação e limites

- Lint, TypeScript, geração de rotas e build do monorepo.
- 183 testes frontend e 231 backend aprovados (414 no total), incluindo expiração/revogação Steam, critérios da URL, proteção por usuário, autenticação/CSRF e persistência do onboarding; suíte PostgreSQL executada em container descartável com todas as migrations. Também validado o backfill da migration com conta existente e o padrão nulo para conta nova, dentro de transação revertida no banco descartável.
- Chromium com respostas controladas de API: coleção → ficha → retorno com filtros/ordenação/formato; sessões e diário cronológicos; spoilers e notas legadas; exclusão de anotação; proteção de rascunhos; Mais com foco, Escape, voltar e seleção de destino; onboarding sem Steam. Layout de Agora, Biblioteca, Coleções, Importações, Ficha e Configurações em 320×568, 390×844, 768×600, 844×390 e 1280×800, sem overflow horizontal. Teclado validado por redução da viewport; aparelho físico e leitor de tela não foram ensaiados.
- A migration só foi aplicada no PostgreSQL descartável de testes. Banco da aplicação, produção e publicações não foram alterados. Login real Steam/provedores externos não foi exercitado; os contratos foram testados com respostas controladas.
- Service worker revisado: já inclui todos os chunks emitidos e usa o shell em navegação offline, cobrindo as novas rotas sem cachear respostas autenticadas de API no worker. Os testes de isolamento/cache/fila offline continuam aprovados.
