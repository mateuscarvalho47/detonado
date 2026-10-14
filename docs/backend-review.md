# Avaliação do backend — 2026-10-13

Revisão estática dos módulos, integrações, plugins, bootstrap, schemas e gerador
de módulos, após a correção HLTB. Não é resultado de teste de carga ou auditoria
de produção. A reprodução de coerções abaixo usou o schema real exportado pelo
pacote shared. Este diagnóstico registra o estado antes da implementação. As correções posteriores estão em backend-improvements.md.

## Conclusão

A stack atende ao produto. O principal problema de leitura é a distância entre
intenção e execução: indireções mecânicas, tipos de persistência nos serviços,
políticas escondidas no repository e regras de patch expressas em spreads.
Não resolver criando mais camadas nem comprimindo tudo em um único arquivo.

## Achados de legibilidade

1. Controllers de games/library frequentemente só repassam parâmetros e enviam
   a resposta. Unir handlers simples às rotas elimina uma troca de arquivo sem
   eliminar a separação entre HTTP e regras. Auth tem comportamento HTTP real
   (sessão, cookies, exportação); sua separação pode continuar útil.
2. `LibraryService.update` combina data, plataforma, status e fila, com tipos
   triplos `number | null | undefined` e spreads condicionais. Construir mudanças
   explicitamente e dar nome às regras preserva as diferenças entre omitir,
   limpar e substituir. Não usar truthiness: zero é valor válido.
3. `LibraryRepository.getStats` devolve estruturas Prisma (`_sum`, `_count`) e
   bigint; o service conhece esses detalhes. Um módulo de consulta de estatísticas
   pode executar e mapear resultados com tipos próprios, mantendo o paralelismo.
   Evitar extração de uma classe para cada query pequena.
4. `Parameters<UserRepository['updateAccount']>[1]` e
   `Omit<UpdateLibraryEntryInput, 'completedAt'> & {...}` obrigam o leitor a
   navegar tipos técnicos. Nomear contratos usados de verdade e manter o
   formato HTTP separado das mudanças persistidas quando forem diferentes.
5. `UserRepository.updateAccount` incrementa sessionVersion ao detectar
   passwordHash. A regra de invalidar sessões deveria ser explícita na operação
   de troca de senha; a escrita atômica deve permanecer no repository.
6. Ordem de parâmetros varia: `(id, userId)` e `(userId, id)`. Uniformizar ou usar
   objeto em operações com identificadores de mesmo tipo. Melhorar `repo`, `agg`,
   `g`, `r` onde o significado não for localmente evidente; não renomear tudo.
7. Auth/password-reset fazem parse no controller depois da validação da rota;
   library usa bodies tipados. Usar uma convenção e inferência Zod/Fastify. Não
   remover validação de fronteiras que possam receber dados não validados.
8. `packages/shared/src/index.ts` agrega domínios e o frontend não o consome.
   Separar schemas por domínio e decidir se contratos devem ser compartilhados
   com frontend ou permanecer no backend. Não manter duas fontes por inércia.
9. Schemas HLTB, status e tipos de jogo reaparecem em shared, lib e resposta.
   Diferenciar dados brutos do provedor, dados do produto e formato HTTP; derivar
   os tipos quando forem iguais. Remover aliases de compatibilidade sem uso.
10. Gerador impõe seis arquivos, revalidação e consultas redundantes de existência;
    gera rotas sem auth e response z.any. Não é um template seguro e completo de
    recurso privado. Revisar o gerador e as instruções junto do padrão adotado.
11. `game.repository.ts` é vazio; cron só escreve heartbeat; `LibraryListQuery`
    vazio não participa de um contrato útil. Remover após checar consumidores.
12. Serviços dependem de classes concretas com membros privados; mocks recorrem
    a `as never`. Contratos pequenos com Pick ou interfaces de capacidades podem
    permitir mocks tipados. E-mail é global e importa env ao carregar o módulo;
    injetar envio/logger facilita testar fluxos sem mock global de módulo.

## Correções de comportamento prioritárias

### Alta: consumir verificação de e-mail atomicamente

`AuthService.verifyEmail` lê token/expiração e depois chama
`UserRepository.verifyEmail(userId)`, que filtra só o id. Uma troca de e-mail ou
reenvio entre leitura e escrita pode permitir que a operação antiga confirme o
estado novo. Atualizar filtrando id, hash e validade ainda vigente, consumindo o
token na mesma operação. Avaliação por leitura; reproduzir concorrência em teste.

### Alta: remover tokens de URLs registradas em logs

`app.ts` usa logger padrão Fastify sem serializer/redaction de URL. O serializer
instalado registra `req.url`, e verify-email recebe token na query. Redigir a
query sensível antes do log. Não é evidência de acesso indevido a logs existentes;
é um caminho de exposição presente no código.

### Alta: limitar repetição de escritas no banco

`plugins/prisma.ts` sobrescreve pool.query/connect e repete erros de conexão.
Perder confirmação da resposta não prova que uma escrita não foi commitada.
Investigar quais chamadas do adapter passam por esse wrapper e restringir retry
a aquisição ou operações com idempotência demonstrada. Não há duplicação real
reproduzida nesta revisão.

### Média: fila atômica e atualizações menores

Máximo + 1 é lido separado da inserção. Reordenação lê toda a fila e atualiza
todas as entradas sequencialmente. Operações concorrentes podem disputar posições
ou sobrescrever uma ordem; transaction padrão não serializa essa regra. Definir
lock por usuário/isolamento e trocar só entradas envolvidas quando possível.

### Média: escritas que devolvem o registro

update e updateHltb fazem updateMany seguido de findFirst, depois de uma leitura
no service. Isso aumenta queries e cria intervalo entre escrita e resposta.
Buscar operação única que filtre proprietário e devolva a linha. Remoção não
precisa pré-leitura se deleteMany.count já distingue ausência.

### Média: validação numérica excessivamente permissiva

Reproduzido no schema real:

| Entrada | Aceita como |
| --- | --- |
| rating: true | rating: 1 |
| rating: "" | rating: 0 |
| hoursPlayed: true | hoursPlayed: 1 |
| hoursPlayed: [] | hoursPlayed: 0 |
| rating: 7.8 | rating: 8 |

Definir explicitamente se a API aceita número ou string numérica; rejeitar outros
tipos e documentar arredondamento. Revisar limites de userPlatform, senha atual,
PORT/timeouts e validação de APP_URL/EMAIL_FROM.

### Média: integrações e limites

- IGDB cancela o timer após receber headers; leitura res.json acontece depois.
  Fazer prazo incluir o corpo. Mapear payload inválido do provedor como erro de
  upstream, em vez de retornar automaticamente erro de entrada do usuário.
- Cache IGDB usa JSON.parse com casts, sem a proteção agora existente no HLTB.
- Busca/detalhe IGDB não têm rate limit próprio e renovação de token não
  compartilha chamadas simultâneas. Medir uso e adicionar limites adequados.
- Recuperação de senha limita por IP, mas não registra tentativas por código/
  conta. Invalidar/criar token ocorre em operações separadas e admite disputa
  entre solicitações. Planejar emissão atômica e orçamento de tentativas.
- Reenvio invalida o link anterior antes do envio; falha deixa o usuário sem o
  link anterior utilizável. Troca de e-mail envia antes de persistir; se a escrita
  falhar, o novo link não corresponde ao estado salvo. Definir uma política
  consistente de envio, estados pendentes e recuperação; não manter transação
  de banco aberta durante requisição ao provedor de e-mail.

## Operação e testes

- Preservar as proteções já existentes: CSRF, regeneração de sessão, Argon2,
  versões de sessão, tokens com hash e reset de senha transacional.
- Logger misto console/Pino dificulta correlação e inclui e-mails; padronizar
  eventos e contexto mínimo. Bootstrap conecta Redis fora do try de listen;
  shutdown não tem proteção contra sinais repetidos ou prazo máximo.
- Biblioteca/lista e exportação não têm limites/paginação; hoje isso pode ser
  aceitável para bibliotecas pequenas. Evoluir com contrato e interface juntos.
- Priorizar testes de fluxos completos de login/CSRF, proprietário incorreto,
  verificação concorrente e fila com PostgreSQL. Mocks não validam locks ou SQL.
- Evitar helpers genéricos de teste e refatorações de performance sem medição.

## Ordem proposta

1. Corrigir consumo de token, logs sensíveis e investigar retry de escrita.
2. Adotar uma operação da biblioteca como exemplo de leitura: handler curto,
   service com intenção explícita, tipos nomeados e escrita atômica.
3. Levar o padrão aos módulos conforme suas necessidades; atualizar gerador.
4. Tratar fila e suas garantias de concorrência, com teste de banco real.
5. Separar consulta de estatísticas, limpar contratos redundantes e fortalecer
   limites/validação/integrações.

Critério de sucesso: ler uma operação sem reconstruir mentalmente casts,
spreads e regras escondidas em outras camadas. Manter tratamento de erros,
isolamento entre usuários e comportamento de patches durante a simplificação.

## Estado após implementação

As correções de autenticação, logs, retry, fila, queries, coerção, cache/timeout
IGDB, emissão/tentativas de reset e estrutura de leitura foram implementadas.
Consulte o registro e as limitações em [backend-improvements.md](backend-improvements.md).
A política durável de envio de e-mail e as evoluções de produto permanecem separadas.
