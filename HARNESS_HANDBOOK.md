# Harness Handbook — Novais Digital (clickup-novais-digital-governance)

> Gerado por /handbook em 2026-07-23. Commit base: `cc510f4` (resync 2026-07-23).
> Regra de uso: leia L1; desça para L2/L3 só quando a tarefa exigir. Âncoras ⚠️ FROZEN precisam de verificação antes do uso.

## L1 — Visão do sistema

Backend de governança que mantém o ClickUp da Novais Digital como espelho do estado real de engenharia: recebe webhooks do ClickUp para gerar backlog técnico a partir de solicitações de agente, e roda daemons de sincronização que leem evidências (artefatos AIOS no filesystem, PRs/branches/CI no GitHub, repo marketing-ai-agents) e atualizam status/comentários das tasks. Sem banco de dados próprio: todo estado vive no ClickUp, em arquivos JSON de config e no filesystem dos repos consumidores.

- **Arquitetura**: servidor HTTP de webhook (`server.mjs`); daemons de sync (`scripts/sync-all-daemon.mjs`, `scripts/aios-sync-daemon.mjs`); scripts CLI de geração/seed (idempotentes, com `--dry-run`/`--live`); biblioteca compartilhada em `scripts/lib/`; contratos e catálogos em `config/*.json`.
- **Modelo de execução (webhook)**: ClickUp taskUpdated → `POST /webhooks/clickup` → verifica HMAC → busca task na lista "Solicitacoes de agente" → status == "escopo pronto"? → gera tasks `[TECH]` no backlog → comenta + muda status para "gerado".
- **Modelo de execução (sync)**: daemon tick (15 min) → por fonte: setup opcional (bootstrap do repo) → lista tasks da plataforma no ClickUp → coleta evidência (filesystem + GitHub) → decide status canônico → PUT status + comentário → rollup no parent.
- **Estágios**: [1. Inicialização e configuração](#estágio-1-inicialização-e-configuração) · [2. Recebimento e triggers](#estágio-2-recebimento-e-triggers) · [3. Geração de estrutura e backlog](#estágio-3-geração-de-estrutura-e-backlog) · [4. Coleta de evidências](#estágio-4-coleta-de-evidências) · [5. Decisão e sincronização de status](#estágio-5-decisão-e-sincronização-de-status) · [6. Persistência e resposta](#estágio-6-persistência-e-resposta) · [Transversal: validação e docs gerados](#estágio-transversal-validação-e-docs-gerados)
- **Fluxo de dados global**: entra por webhook ClickUp, payloads JSON (`examples/*.payload.json`) ou filesystem de repos consumidores; contratos/catálogos em `config/*.json` moldam o que é criado; tudo persiste no ClickUp (tasks, status, comentários, campos `key=value` embutidos na description); GitHub é fonte read-only de evidência.

## L2 — Estágios

### Estágio 1: Inicialização e configuração
- **Propósito**: carregar credenciais, .env e contratos JSON antes de qualquer ação.
- **Gatilho**: início de qualquer processo (server, daemon, script CLI).
- **Input/Output**: `.env` + `config/*.json` → `process.env`, objetos de contrato, clientes HTTP.
- **Estados que lê/escreve**: `CLICKUP_TOKEN`/`NOVAIS_INTERNAL_CLICKUP_TOKEN`, `CLICKUP_TEAM_ID`/`NOVAIS_INTERNAL_WORKSPACE_ID`, `GITHUB_TOKEN`/`GH_TOKEN`, `CLICKUP_WEBHOOK_SECRET`, `NODE_ENV`, `PORT`, `NOVAIS_SOCIAL_PATH`.
- **Depende de**: nada.
- **Unidades**: env.mjs, createClickUpClient, createGitHubClient, deploy Railway.

### Estágio 2: Recebimento e triggers
- **Propósito**: pontos de entrada em runtime — webhook HTTP e loops de daemon.
- **Gatilho**: evento `taskStatusUpdated`/`taskUpdated` do ClickUp; timer de 15 min nos daemons.
- **Input/Output**: request HTTP assinado / tick → invocação dos estágios 3-6.
- **Estados que lê/escreve**: lê header `x-signature`; lê `SOURCES` (lista hardcoded de fontes a sincronizar, com setup opcional por fonte).
- **Depende de**: Estágio 1.
- **Unidades**: server.mjs (webhook), sync-all-daemon.mjs, aios-sync-daemon.mjs, register-clickup-webhook.mjs.

### Estágio 3: Geração de estrutura e backlog
- **Propósito**: criar no ClickUp spaces/folders/lists/tasks a partir de contratos e payloads (idempotente por nome/marker).
- **Gatilho**: webhook com solicitação "escopo pronto" (automático) ou npm scripts `bootstrap`, `*:generate`, `*:seed` (manual).
- **Input/Output**: payload (task de solicitação, `--payload-file`, catálogo JSON) → tasks `[TECH]`, parents de módulo `<key> · <título>` + subtasks de stage, tasks de SKU Novais Digital Social.
- **Estados que lê/escreve**: escreve tasks/tags/dependências no ClickUp; escreve campos `key=value` na seção "Controle automatico" das descriptions; lê `config/tech-platform-catalog.json`, `config/aios-module-catalog.json`, `config/clickup-governance.blueprint.json` etc.
- **Depende de**: Estágios 1-2; Transversal (contratos validados).
- **Unidades**: agentRequestToPayload, createTechTasksFromPayload, generate-tech-tasks.mjs, generate-aios-modules.mjs, bootstrap-clickup.mjs, seeds (activities/custom-fields/templates/week-field), generate-aicfo-frontend-list.mjs, update-aicfo-descriptions.mjs.

### Estágio 4: Coleta de evidências
- **Propósito**: observar o mundo real (filesystem de repos consumidores + GitHub API) para saber o estado de cada entrega.
- **Gatilho**: chamado pelos scripts de sync do Estágio 5 para cada task.
- **Input/Output**: metadados parseados da task (`module_key`, `stage_key`, `project_root`, `repository_url`, termos de match) → objeto de evidência `{found, reviewApproved, reviewBlocked}` + `{prs, branches, ci}`.
- **Estados que lê/escreve**: lê `docs/specs/*.md` do repo consumidor (local ou via GitHub Contents API); lê PRs/branches/check-runs no GitHub; não escreve nada.
- **Depende de**: Estágio 1 (tokens); bootstrap-marketing-ai-agents-repo.mjs (filesystem atualizado).
- **Unidades**: collectAiosEvidence, collectEvidence, getCiState, parseGitHubRepository, parseTechTask, parseAiosTask, bootstrap-marketing-ai-agents-repo.mjs, discovery do marketing-ai-agents.

### Estágio 5: Decisão e sincronização de status
- **Propósito**: transformar evidência em status canônico e propagar para o ClickUp (subtask → rollup no parent).
- **Gatilho**: daemons (Estágio 2) ou npm scripts `tech:sync`, `aios:sync[:live]`, `aicfo:sync[:live]`, `marketing-ai-agents:sync`.
- **Input/Output**: evidência (Estágio 4) → `nextStatus` ∈ {to do, em desenvolvimento, em revisão, bloqueado, complete} (AIOS) ou {a fazer, em desenvolvimento, em revisao, bloqueado, concluido} (tech).
- **Estados que lê/escreve**: lê status atual da task; escreve novo status + comentário de evidência; BLOCKER (CI failing ou `_review_*.md` com BLOCKER) tem prioridade absoluta.
- **Depende de**: Estágios 1, 2, 4.
- **Unidades**: sync-tech-status.mjs, sync-aios-status.mjs, sync-marketing-ai-agents-from-foundry.mjs, decideStatus, decideStatusFromAiosEvidence, decideStatusForManualTask, rollupParentStatus, canonicalAiosStatus/canonicalStatus, read-tech-progress.mjs.

### Estágio 6: Persistência e resposta
- **Propósito**: efetivar mudanças no ClickUp e responder ao chamador; garantir idempotência.
- **Gatilho**: fim do processamento de webhook ou de cada task no sync.
- **Input/Output**: resultado da geração/decisão → PUT status, POST comment, resposta JSON HTTP (200/202/4xx/5xx).
- **Estados que lê/escreve**: comentário-lock `[idempotency-lock] generation_in_progress=<taskId>`; status `gerado` na solicitação; comentários automáticos de evidência; marker `<!-- foundry:sku:<id> -->`.
- **Depende de**: Estágios 3 e 5.
- **Unidades**: handleClickUpWebhook (resposta), hasIdempotencyLock/placeIdempotencyLock, formatAiosEvidenceComment, formatEvidenceComment.

### Estágio Transversal: validação e docs gerados
- **Propósito**: manter os contratos JSON coerentes entre si e gerar documentação derivada.
- **Gatilho**: `npm run validate`, `npm test`, `npm run contracts:generate`, `npm run model:generate`, `npm run tech:model`.
- **Input/Output**: `config/*.json` + `examples/*.json` → lista de erros de consistência / `docs/EVENT_CONTRACTS.md`, `docs/OPERATING_MODEL.md`, `docs/TECH_OPERATING_MODEL.md`.
- **Estados que lê/escreve**: só filesystem local (docs/).
- **Depende de**: nada em runtime (roda offline).
- **Unidades**: validate.mjs, geradores de docs, tests/.

## L3 — Unidades
<!-- Uma entrada por unidade relevante. Âncora SEMPRE verificada contra o código atual. -->

### env.mjs (credenciais e .env)
- **Âncora**: `scripts/lib/env.mjs:loadLocalEnv` · `scripts/lib/env.mjs:clickUpCredentials` · `scripts/lib/env.mjs:githubToken`
- **Comportamento**: parseia `.env` da raiz sem sobrescrever env já setado; resolve aliases de credenciais (`CLICKUP_TOKEN` ↔ `NOVAIS_INTERNAL_CLICKUP_TOKEN`, `CLICKUP_TEAM_ID` ↔ `NOVAIS_INTERNAL_WORKSPACE_ID`). Exporta `root` (raiz do projeto).
- **Estados**: escreve `process.env`.
- **Casos excepcionais**: `.env` ausente (ENOENT) é silencioso.

### createClickUpClient
- **Âncora**: `scripts/lib/clickup.mjs:createClickUpClient`
- **Comportamento**: cliente fetch para `https://api.clickup.com/api/v2` com header `Authorization: <token>`; único ponto de I/O ClickUp das libs.
- **Casos excepcionais**: lança em não-2xx com detalhe (`err`/`message`); lança em resposta 2xx não-JSON (HTML de manutenção/gateway).

### findListByTarget / listTasks
- **Âncora**: `scripts/lib/clickup.mjs:findListByTarget` · `scripts/lib/clickup.mjs:listTasks`
- **Comportamento**: resolve `{space, list}` por nome (lista folderless do space); pagina tasks (100/página, máx 50 páginas).
- **Casos excepcionais**: lança se space/list não existir.

### handleClickUpWebhook (fluxo principal do server)
- **Âncora**: `server.mjs:handleClickUpWebhook` · rotas em `server.mjs:132-152`
- **Comportamento**: valida assinatura → extrai taskId (`server.mjs:taskIdFromWebhook`) → confirma que a task pertence a "Solicitacoes de agente" e status "escopo pronto" → gera backlog `[TECH]` → comenta resumo e marca solicitação como `gerado`. Rota `GET /health` responde `{ok:true}`.
- **Estados**: lê task/list no ClickUp; escreve tasks, comentário e status.
- **Casos excepcionais**: 401 assinatura inválida, 400 JSON inválido, 202 (skip) para task fora da lista/status errado/lock ativo, 500 com mensagem mascarada em produção; recusa boot em produção sem `CLICKUP_WEBHOOK_SECRET` (`server.mjs:16-19`).

### verifyClickUpSignature
- **Âncora**: `server.mjs:verifyClickUpSignature`
- **Comportamento**: HMAC-SHA256 do body cru com `CLICKUP_WEBHOOK_SECRET`, comparação via `timingSafeEqual`; aceita prefixo `sha256=`.
- **Casos excepcionais**: sem secret → retorna true (dev only, com warn no boot).

### sync-all-daemon.mjs (worker Railway)
- **Âncora**: `scripts/sync-all-daemon.mjs:SOURCES` (L19) · `scripts/sync-all-daemon.mjs:tick` · `scripts/sync-all-daemon.mjs:syncSource`
- **Comportamento**: a cada 15 min (`--interval-ms=`) roda em paralelo as fontes: Plataforma SchoolPlatform e Plataforma Aicfo (via sync-aios-status) e Novais Digital Social (setup bootstrap-marketing-ai-agents-repo + sync-marketing-ai-agents-from-foundry), cada uma em child process `spawn`. Dentro de cada fonte: setup → sync (sequencial).
- **Casos excepcionais**: exit code != 0 de um filho só gera warn; daemon segue vivo.

### aios-sync-daemon.mjs
- **Âncora**: `scripts/aios-sync-daemon.mjs:tick`
- **Comportamento**: loop de uma única plataforma; repassa args extras para sync-aios-status (`npm run aios:daemon` / `aicfo:daemon`).

### register-clickup-webhook.mjs
- **Âncora**: `scripts/register-clickup-webhook.mjs` (L28-31)
- **Comportamento**: registra `POST /team/{teamId}/webhook` apontando para `<url>/webhooks/clickup` com eventos `taskStatusUpdated` e `taskUpdated`; URL vem de `--url=`, `WEBHOOK_PUBLIC_URL` ou `RAILWAY_PUBLIC_DOMAIN`.

### agentRequestToPayload
- **Âncora**: `scripts/lib/agent-request.mjs:agentRequestToPayload`
- **Comportamento**: converte custom fields da task de solicitação ("Cliente", "Plataformas tecnicas", "Prazo desejado"...) no payload tech (`delivery_type: agentic_saas`); `customFieldValue` resolve dropdowns e datas.
- **Estados**: lê `task.custom_fields`.

### findAgentRequestTask / shouldProcessAgentRequest
- **Âncora**: `scripts/lib/agent-request.mjs:findAgentRequestTask` · `scripts/lib/agent-request.mjs:shouldProcessAgentRequest`
- **Comportamento**: garante que a task está na lista `agentRequestTarget` ("05 Institucional Novais Digital" / "Solicitacoes de agente"); processa apenas status `escopo pronto` (`readyStatus`).

### createTechTasksFromPayload (+ lock de idempotência)
- **Âncora**: `scripts/lib/agent-request.mjs:createTechTasksFromPayload` · `:hasIdempotencyLock` · `:placeIdempotencyLock`
- **Comportamento**: valida payload contra contrato, expande plataformas do catálogo em tasks planejadas, pula nomes já existentes na lista destino, cria com tags. Antes de criar, checa/planta comentário-lock `[idempotency-lock] generation_in_progress=<key>` na task de origem.
- **Casos excepcionais**: retorna `{alreadyGenerating:true}` se lock presente; dry-run não cria nada real.

### tech-tasks.mjs (contrato de nomes/descriptions [TECH])
- **Âncora**: `scripts/lib/tech-tasks.mjs:taskName` · `:taskDescription` · `:parseTechTask` · `:validatePayload` · `:selectedPlatforms` · `:canonicalStatus` · `:statusWeight`
- **Comportamento**: padrão `[TECH] {cliente} / {plataforma} / {título}`; description carrega bloco "Controle automatico" `key=value` que `parseTechTask` lê de volta. `canonicalStatus` mapeia aliases EN→PT (a fazer/em desenvolvimento/em revisao/bloqueado/concluido); `statusWeight` pondera progresso via `contract.progressRules`.
- **Casos excepcionais**: `selectedPlatforms` lança em plataforma desconhecida.

### generate-tech-tasks.mjs (CLI)
- **Âncora**: `scripts/generate-tech-tasks.mjs:createTechTasks`
- **Comportamento**: mesma geração do webhook, mas por CLI com `--payload=`/`--payload-file=` (sem lock de idempotência; dedup por nome via `existingTaskNames`).

### aios-modules.mjs (planejamento de módulos AIOS)
- **Âncora**: `scripts/lib/aios-modules.mjs:validateAiosPayload` · `:planTasksForModule` · `:isManualModule`
- **Comportamento**: valida módulos (tier, week); tiers com stages expandem via `tierRules` do catálogo (spec→backend→frontend→tests→review→merge); módulo manual vira 1 task `manual_implementation`.

### aios-modules.mjs (descriptions e parse)
- **Âncora**: `scripts/lib/aios-modules.mjs:moduleParentDescription` · `:stageSubtaskDescription` · `:parseAiosTask`
- **Comportamento**: gera descriptions ricas com bloco "Controle automatico" (`module_key`, `stage_key`, `module_role=parent|stage`, `project_root`, `artifact_path`, `evidence_source`); `parseAiosTask` reconstrói esses campos a partir da description em runtime.

### generate-aios-modules.mjs (CLI)
- **Âncora**: `scripts/generate-aios-modules.mjs:generate`
- **Comportamento**: 3 fases — parents (1 task por módulo, nome `<key> · <título>`), subtasks de stage (com due_date), dependências entre stages (`depends_on` do catálogo). Idempotente: reusa folder/list/tasks existentes (`indexParentsByModuleKey`); `[skip]` em tasks já existentes sem atualizar descriptions.
- **Casos excepcionais**: dependência duplicada (DEP_001 / "already exists") é skip (`scripts/generate-aios-modules.mjs:224-225`).

### aios-platform.mjs (estrutura folder/list + rollup)
- **Âncora**: `scripts/lib/aios-platform.mjs:findOrCreatePlatformFolder` · `:findOrCreateModuleList` · `:rollupParentStatus` · `:currentStageFromSubtasks` · `:listAllTasks`
- **Comportamento**: find-or-create de folder no space e list na folder (com statuses default `DEFAULT_LIST_STATUSES`); rollup de status do parent a partir dos status canônicos das subtasks (bloqueado tem prioridade).
- **Casos excepcionais**: dry-run evita chamada de API com ID fake.

### collectAiosEvidence
- **Âncora**: `scripts/lib/aios-evidence.mjs:collectAiosEvidence` · mapa `STAGE_TO_PATH` (L5)
- **Comportamento**: procura o artefato do stage (`docs/specs/{m}.md`, `_backend_{m}.md`, `_frontend_{m}.md`, `_tests_{m}.md`, `_review_{m}.md`) primeiro no filesystem (`project_root`), depois via GitHub Contents API; para stage review, parseia aprovação ("APROVADO PARA MERGE") e BLOCKER.
- **Casos excepcionais**: stage sem artefato (merge/manual) → `{found:false}`; 404 GitHub distinto de outros erros.

### decideStatusFromAiosEvidence / decideStatusForManualTask
- **Âncora**: `scripts/lib/aios-evidence.mjs:decideStatusFromAiosEvidence` · `:decideStatusForManualTask` · `:isBlockedSignal`
- **Comportamento**: máquina de decisão de status AIOS: BLOCKER/CI failing → `bloqueado`; merge/review/demais stages têm regras próprias combinando artefato encontrado, PR aberto/merged e CI. Versão manual usa só evidência GitHub.

### github-evidence.mjs (evidência GitHub)
- **Âncora**: `scripts/lib/github-evidence.mjs:collectEvidence` · `:getMatchingPullRequests` · `:getCiState` · `:parseGitHubRepository` · `:decideStatus` · `:searchTerms`
- **Comportamento**: casa PRs/branches por termos (cliente, platform/module key, task/stage key, client_task_id) em título/body/branch; `getCiState` agrega check-runs + commit statuses em failing/pending/passing; `decideStatus` é a versão tech (statuses PT sem acento).
- **Casos excepcionais**: repo não-GitHub ou modo offline registram em `evidence.errors` sem lançar.

### sync-tech-status.mjs (CLI/daemon-alvo)
- **Âncora**: `scripts/sync-tech-status.mjs:syncTask` · `:loadTasks`
- **Comportamento**: para cada task `[TECH]` da lista do contrato: coleta evidência GitHub → decide status → PUT status + comentário se mudou (ou `--comment-always`). Suporta `--offline --fixture=` (default `examples/clickup-tech-tasks.fixture.json`) e `--client=`.
- **Casos excepcionais**: `--live` + `--offline` é erro.

### sync-aios-status.mjs (o sync mais completo)
- **Âncora**: `scripts/sync-aios-status.mjs:syncSubtask` · `:rollupParent` · `:loadPlatformTasks`
- **Comportamento**: carrega tasks da folder `--platform=` (list "Modulos"), sincroniza cada subtask de stage (evidência AIOS + GitHub) e depois faz rollup de status nos parents. Tier C (manual) com `_review_*.md` aprovado simula PR merged (`scripts/sync-aios-status.mjs:122-126`) para poder chegar a `complete`.
- **Casos excepcionais**: status inexistente na list (STATUS_001) vira warn e mantém status (`scripts/sync-aios-status.mjs:152`); `--live` + `--offline` é erro; filtros `--module=`, `--fixture=`.

### sync-marketing-ai-agents-from-foundry.mjs (auto-discovery)
- **Âncora**: `scripts/sync-marketing-ai-agents-from-foundry.mjs:run` (L760) · `:discoverSkusFromFoundry` (L475) · `:detectWaves` (L239) · `:clickUpStatusForParent` (L748)
- **Comportamento**: lê o repo marketing-ai-agents (`NOVAIS_SOCIAL_PATH` → `./marketing-ai-agents` → path local dev) — `project.json`, filesystem de código, lifecycle/unit-economics — e materializa 7 SKUs como tasks pai + subtasks de Wave na folder "Novais Digital Social Agentes" (list "Agentes"), com due_dates em dias úteis (`addBusinessDays`, L978). Pais são identificados pelo marker `<!-- foundry:sku:<id> -->` na description (fallback: nomes legacy).
- **Estados**: lê filesystem do repo; escreve tasks/status/due_date/tags no ClickUp.

### bootstrap-marketing-ai-agents-repo.mjs
- **Âncora**: `scripts/bootstrap-marketing-ai-agents-repo.mjs:main`
- **Comportamento**: garante clone raso atualizado do repo `novais-digital/marketing-ai-agents` antes do sync (clone se ausente; fetch + reset --hard se repo git; skip com warn se pasta não-git). Injeta `GITHUB_TOKEN` na URL https (`buildAuthenticatedUrl`).
- **Casos excepcionais**: pull falho não é fatal (usa versão local).

### bootstrap-clickup.mjs
- **Âncora**: `scripts/bootstrap-clickup.mjs:main` · `:ensureSpace` · `:ensureList`
- **Comportamento**: cria a estrutura de governança do workspace a partir de `config/clickup-governance.blueprint.json` (spaces, lists, tags, task de navegação com `docs/HOW_TO_NAVIGATE_CLICKUP.md`). Não usa `scripts/lib` (client HTTP próprio).

### Seeds de configuração ClickUp
- **Âncora**: `scripts/seed-clickup-custom-fields.mjs:fieldPayload` · `scripts/seed-clickup-templates.mjs:ensureTemplate` · `scripts/seed-activities.mjs:ensureActivity` · `scripts/aios-seed-week-field.mjs`
- **Comportamento**: aplicam `config/clickup-custom-fields.json`, `config/clickup-task-templates.json` e `config/activity-catalog.json` nas lists; `aios-seed-week-field` cria/preenche o campo "Semana" nos parents da Plataforma SchoolPlatform a partir de `examples/edix-modules.payload.json` (nome de arquivo legacy).

### Scripts Aicfo específicos
- **Âncora**: `scripts/generate-aicfo-frontend-list.mjs:FRONTEND_MODULES` (L36) · `scripts/update-aicfo-descriptions.mjs`
- **Comportamento**: o primeiro cria a list "Frontend" na folder "Plataforma Aicfo" com 1 task por módulo com UI; o segundo reescreve descriptions das tasks existentes (o generate faz skip em tasks já criadas) a partir de `examples/aicfo-modules.payload.json` + `config/aios-module-functionalities.json`.

### seed-marketing-ai-agents-tasks.mjs (legacy)
- **Âncora**: `scripts/seed-marketing-ai-agents-tasks.mjs:SKUS` (L37)
- **Comportamento**: versão anterior com estado dos 7 SKUs hardcoded, criando na list "Solicitacoes de agente". Substituído pelo sync-marketing-ai-agents-from-foundry (auto-discovery); não está no `sync-all-daemon` nem em npm script.

### validate.mjs
- **Âncora**: `scripts/validate.mjs` (checks a partir da L87)
- **Comportamento**: valida consistência cruzada de todos os JSON de `config/` e `examples/`: requiredFields ↔ fields, delivery_types permitidos, targets existentes no blueprint, unicidade de keys, stages/tiers do catálogo AIOS, shape dos payloads de exemplo. Sai com exit 1 listando erros.

### read-tech-progress.mjs
- **Âncora**: `scripts/read-tech-progress.mjs:summarize`
- **Comportamento**: relatório read-only de progresso por cliente (% via `statusWeight`, contagem de bloqueadas) das tasks `[TECH]`.

### Geradores de documentação
- **Âncora**: `scripts/generate-event-contracts.mjs` · `scripts/generate-operating-model-docs.mjs` · `scripts/generate-tech-operating-doc.mjs`
- **Comportamento**: renderizam `docs/EVENT_CONTRACTS.md`, `docs/OPERATING_MODEL.md` e `docs/TECH_OPERATING_MODEL.md` a partir dos JSON de config. Nunca editar esses .md à mão.

### Deploy Railway
- **Âncora**: `railway.json` · `railway.worker.json` · `package.json:scripts.start/worker`
- **Comportamento**: serviço web roda `npm start` (server.mjs) ou `npm run worker` (sync-all-daemon) conforme env `WORKER=true` (`railway.json:startCommand`); worker dedicado usa `railway.worker.json`.

## Registro de estados compartilhados
| Estado | Onde vive | Escrito por | Lido por |
|---|---|---|---|
| Credenciais/env (tokens ClickUp/GitHub, secret, paths) | `.env` / `process.env` | `env.mjs:loadLocalEnv` | todos os scripts e server |
| Contratos e catálogos | `config/*.json` | manual (validado por validate.mjs) | generate/sync/seed/server |
| Tasks, status, tags, due_dates, comentários | ClickUp (API v2) | estágios 3, 5, 6 | estágios 2, 4, 5 |
| Bloco "Controle automatico" (`key=value` na description) | descriptions das tasks ClickUp | `taskDescription`, `stageSubtaskDescription`, `moduleParentDescription` | `parseTechTask`, `parseAiosTask` |
| Lock de idempotência `[idempotency-lock] generation_in_progress=<id>` | comentário na task de solicitação | `placeIdempotencyLock` | `hasIdempotencyLock` |
| Marker `<!-- foundry:sku:<id> -->` | description das tasks pai Novais Digital Social | sync-marketing-ai-agents-from-foundry | sync-marketing-ai-agents-from-foundry (matching) |
| Artefatos AIOS `docs/specs/*.md` | filesystem do repo consumidor / GitHub | agentes AIOS (externo) | `collectAiosEvidence` |
| Repo marketing-ai-agents clonado | `NOVAIS_SOCIAL_PATH` / `./marketing-ai-agents` | `bootstrap-marketing-ai-agents-repo.mjs` (git) | `sync-marketing-ai-agents-from-foundry.mjs` |
| PRs, branches, CI | GitHub (read-only) | — | `github-evidence.mjs` |
| Docs derivados | `docs/*.md` | geradores de documentação | humanos |

## Mapa comportamento → código
- **Webhook não processa uma solicitação / responde 202**: `server.mjs:handleClickUpWebhook`, `scripts/lib/agent-request.mjs:findAgentRequestTask`, `scripts/lib/agent-request.mjs:shouldProcessAgentRequest` (status precisa ser `escopo pronto`).
- **Erro 401 de assinatura no webhook**: `server.mjs:verifyClickUpSignature`, env `CLICKUP_WEBHOOK_SECRET`.
- **Adicionar/alterar plataforma técnica ou suas tasks geradas**: `config/tech-platform-catalog.json`, `scripts/lib/tech-tasks.mjs:selectedPlatforms`, `scripts/lib/tech-tasks.mjs:taskName`.
- **Status AIOS calculado errado (subtask)**: `scripts/lib/aios-evidence.mjs:collectAiosEvidence`, `scripts/lib/aios-evidence.mjs:decideStatusFromAiosEvidence`, `scripts/sync-aios-status.mjs:syncSubtask`.
- **Status do parent (rollup) errado**: `scripts/lib/aios-platform.mjs:rollupParentStatus`, `scripts/sync-aios-status.mjs:rollupParent`.
- **Status tech `[TECH]` calculado errado**: `scripts/lib/github-evidence.mjs:decideStatus`, `scripts/sync-tech-status.mjs:syncTask`.
- **Sync de list alternativa / tasks flat (ex: "Frontend" Aicfo)**: `scripts/sync-aios-status.mjs:39-40` (flags `--list=`/`--repository-url=`), `scripts/sync-aios-status.mjs:107` (`githubOnly`, `evidence_source=github`), `scripts/sync-aios-status.mjs:211-212` (tasks flat `module_role=stage`), `scripts/generate-aicfo-frontend-list.mjs` (gerador da list).
- **PR/branch não é encontrado como evidência**: `scripts/lib/github-evidence.mjs:searchTerms`, `scripts/lib/github-evidence.mjs:getMatchingPullRequests`, campo `github_match_terms` na description.
- **Tasks duplicadas / geração repetida**: `scripts/lib/agent-request.mjs:hasIdempotencyLock`, dedup por nome em `createTechTasksFromPayload`, `scripts/generate-aios-modules.mjs:generate` (skip por nome/marker).
- **Adicionar nova fonte ao worker de 15 min**: `scripts/sync-all-daemon.mjs:SOURCES` (L19, com `setup` opcional por fonte).
- **Adicionar/alterar SKU do Novais Digital Social**: `scripts/sync-marketing-ai-agents-from-foundry.mjs:SKU_LAYOUT` (L55) + repo marketing-ai-agents (`project.json`).
- **Adicionar módulo/stage/tier no pipeline AIOS**: `config/aios-module-catalog.json`, `scripts/lib/aios-modules.mjs:planTasksForModule`, payload em `examples/*-modules.payload.json`.
- **Aliases/normalização de status (EN↔PT, acentos)**: `scripts/lib/aios-evidence.mjs:canonicalAiosStatus`, `scripts/lib/tech-tasks.mjs:canonicalStatus`.
- **Mudar estrutura de spaces/lists do workspace**: `config/clickup-governance.blueprint.json`, `scripts/bootstrap-clickup.mjs:main`.
- **Repo marketing-ai-agents desatualizado/ausente no worker**: `scripts/bootstrap-marketing-ai-agents-repo.mjs:main`, envs `NOVAIS_SOCIAL_PATH` e `GITHUB_TOKEN`.
- **Config JSON inconsistente quebrando geração**: `scripts/validate.mjs` (rodar `npm run validate` antes).

## Não coberto / Não resolvido
- `hooks/session-start/foundry-context.sh`, `hooks/stop/*.sh` — hooks do Claude Code/Foundry (injeção de contexto, gate report, learning snapshot); não fazem parte do runtime do backend.
- `.claude/` (CONSTITUTION.md, agents, skills), `GOVERNANCE.md`, `docs/foundry/` — governança/agentes para sessões de IA, não código executável do harness.
- `scripts/seed-marketing-ai-agents-tasks.mjs` — legacy, sem npm script apontando para ele; candidato a remoção.
- `scripts/lib/agent-request.mjs:platformRequestTarget` e `:generatingStatus` — exportados mas sem nenhum consumidor no repo.
- `examples/edix-modules.payload.json` — nome de arquivo pré-rebrand (SchoolPlatform); ainda é o payload usado por `aios-seed-week-field.mjs` e pelo npm script `aios:*`.
- `tests/` (tech-tasks, aios-modules, validate) — cobertura offline das libs; não mapeados em estágio de runtime.
