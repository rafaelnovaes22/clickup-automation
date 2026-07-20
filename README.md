# ClickUp Novais Digital - Governanca

Plano unico de como o ClickUp deve ser estruturado para refletir todo o trabalho do time Novais Digital, do primeiro lead ao churn do cliente.

Substitui o blueprint anterior (`novais-digital-governanca-ia/docs/clickup-blueprint.md`), que cresceu antes de ter mapa do ciclo completo do time.

## O que esta aqui

| Arquivo | Quem le | O que tem |
|---|---|---|
| [`GOVERNANCE.md`](./GOVERNANCE.md) | Voce + CEO | Plano completo: visao de negocio, estrutura ClickUp, atividades por fase, dashboards, plano de implementacao |

## Principios fundadores

1. ClickUp e 100% interno Novais Digital. Cliente final nunca acessa.
2. Reflete a jornada do cliente. Cada Space corresponde a um momento dela.
3. Uma entidade nasce e morre em uma unica lista. Nada de pasta-por-cliente.
4. Simplicidade > completude. E melhor comecar com poucas listas que o time usa do que muitas que ninguem abre.
5. Visao de negocio antes de tecnica. Se a CEO nao entende a estrutura em 5 minutos, esta errada.
6. "Se nao esta no ClickUp, nao aconteceu." Ele e o journey log canonico do time.

## Status

v0.2 - governanca multi-delivery (2026-05-08): suporte a `agentic_saas`, `platform`, `automation` e `hybrid`. Ver [`GOVERNANCE.md §2.A`](./GOVERNANCE.md) para o modelo completo.

## Tipos de entrega (delivery_type)

Este projeto governa quatro tipos de entrega. Cada template, atividade e lista declara qual tipo aceita:

| `delivery_type` | Quando usar | Lifecycle | Entrar por |
|---|---|---|---|
| `agentic_saas` | Agente de IA cobrado por outcome. | SHADOW → ASSISTED → AUTONOMOUS | `Solicitacoes de agente` |
| `platform` | Plataforma SaaS multi-modulo. | DRAFT → STAGING → PILOT → CANONICAL → DEPRECATED | `Solicitacoes de plataforma` |
| `automation` | Script/integracao/RPA pontual. | a fazer → em desenvolvimento → concluido | `Backlog tecnico` |
| `hybrid` | Combina tipos acima no mesmo cliente. | Lifecycle por bloco. | Lista mais geral |

Ver [`GOVERNANCE.md §2.A`](./GOVERNANCE.md) e [`docs/HOW_TO_NAVIGATE_CLICKUP.md`](./docs/HOW_TO_NAVIGATE_CLICKUP.md) para regras completas.

## Aplicacao da Onda 1

Este repositorio agora tem um bootstrap executavel para aplicar a estrutura minima no ClickUp:

| Arquivo | Para que serve |
|---|---|
| [`config/clickup-governance.blueprint.json`](./config/clickup-governance.blueprint.json) | Blueprint versionado dos Spaces, listas, entidades, status e tags |
| [`docs/HOW_TO_NAVIGATE_CLICKUP.md`](./docs/HOW_TO_NAVIGATE_CLICKUP.md) | Documento curto para fixar no Space Institucional |
| [`scripts/bootstrap-clickup.mjs`](./scripts/bootstrap-clickup.mjs) | Script que cria Spaces, listas, tags e a task "Como navegar este ClickUp" |
| [`config/clickup-task-templates.json`](./config/clickup-task-templates.json) | Catalogo inicial de templates de atividades da Onda 2 |
| [`config/activity-catalog.json`](./config/activity-catalog.json) | Catalogo mestre das 74 atividades por Space/lista |
| [`config/diagnostic-output-contract.json`](./config/diagnostic-output-contract.json) | Contrato de saida do Diagnostico Fase 0 para gerar atividades e artefatos |
| [`config/tech-platform-catalog.json`](./config/tech-platform-catalog.json) | Catalogo de plataformas tecnicas e tarefas automaticas por plataforma |
| [`config/tech-automation-contract.json`](./config/tech-automation-contract.json) | Contrato de entrada para automacao das tarefas tech |
| [`config/tech-operational-repository.json`](./config/tech-operational-repository.json) | Repositorio operacional detalhado da area Tech |
| [`scripts/seed-clickup-templates.mjs`](./scripts/seed-clickup-templates.mjs) | Script que cria tasks `[TEMPLATE]` com subtasks padrao no ClickUp |
| [`scripts/seed-activities.mjs`](./scripts/seed-activities.mjs) | Script que cria tasks `[ATIVIDADE NNN]` nas listas correspondentes |
| [`docs/EVENT_CONTRACTS.md`](./docs/EVENT_CONTRACTS.md) | Contratos de campos/eventos gerados para orientar os hooks do backend |
| [`docs/OPERATING_MODEL.md`](./docs/OPERATING_MODEL.md) | Modelo operacional gerado a partir do catalogo mestre |
| [`.env.example`](./.env.example) | Modelo das variaveis necessarias para rodar contra a API do ClickUp |

### Revisar antes de criar

```bash
npm run bootstrap:dry
```

Esse comando nao chama a API. Ele imprime tudo que sera criado e tambem mostra o checklist de status para revisao no ClickUp.

### Aplicar no ClickUp

Defina as variaveis:

```bash
set CLICKUP_TOKEN=pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
set CLICKUP_TEAM_ID=123456789
```

O script tambem aceita os aliases usados no backend Novais Digital:

```bash
set NOVAIS_INTERNAL_CLICKUP_TOKEN=pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
set NOVAIS_INTERNAL_WORKSPACE_ID=123456789
```

Depois rode:

```bash
npm run bootstrap
```

O script e conservador: se um Space, lista ou task de navegacao ja existir com o mesmo nome, ele reaproveita em vez de recriar.

### Observacao sobre as 23 listas

O `GOVERNANCE.md` cita "23 listas", mas as listas detalhadas nas secoes dos 5 Spaces somam 22:

- Pipeline Comercial: 3
- Implantacao: 3
- Clientes: 6
- Saude Operacional: 5
- Institucional Novais Digital: 5

O bootstrap aplica as 22 listas descritas nominalmente no documento. A 23a lista deve ser uma decisao explicita antes de entrar no blueprint.

## Preparacao da Onda 2

Para revisar os templates que serao criados:

```bash
npm run templates:dry
```

Para criar as tasks `[TEMPLATE]` no ClickUp:

```bash
npm run templates:seed
```

Esses templates sao a ponte para os hooks do backend: cada evento tera uma task pai concisa e subtasks padrao.

Para revisar e criar os campos customizados de entrada operacional, incluindo a lista `05 Institucional Novais Digital / Solicitacoes de agente`:

```bash
npm run fields:dry
npm run fields:seed
```

Com esses campos aplicados, a CEO/comercial cria uma task em `Solicitacoes de agente` e ja encontra os campos de preenchimento: cliente, problema de negocio, outcome esperado, tipo de agente, canal, plataformas tecnicas, autonomia, handoff humano, prazo, responsavel, repositorio e ambiente. Quando o status virar `escopo pronto`, essa task passa a ser a entrada para gerar o backlog tecnico correspondente.

Para regenerar a documentacao dos campos/eventos:

```bash
npm run contracts:generate
```

Para regenerar o modelo operacional:

```bash
npm run model:generate
```

Para revisar e aplicar as 74 atividades no ClickUp:

```bash
npm run activities:dry
npm run activities:seed
```

## Automacao da area tech

Para revisar as tarefas tech que seriam criadas para o payload exemplo:

```bash
npm run tech:dry
```

Para gerar tarefas reais no Backlog tecnico, passe um payload JSON:

```bash
npm run tech:generate -- --payload="{\"client_name\":\"Novais Digital\",\"client_task_id\":\"86xxx\",\"technical_platforms\":[\"ai_agent\",\"whatsapp\",\"node_backend\"],\"tech_owner\":\"AI Engineer\",\"delivery_due_date\":\"2026-05-15\",\"environment\":\"dev\"}"
```

No PowerShell, prefira arquivo de payload:

```bash
npm run tech:generate -- --payload-file=examples/tech-scope.sample.json
```

Para ler a evolucao das tarefas tech:

```bash
npm run tech:progress
npm run tech:progress -- --client=Novais Digital
```

Para sincronizar o status das tarefas tech sem atualizacao manual do time, usando evidencias de GitHub/CI:

```bash
npm run tech:sync
npm run tech:sync -- --client=Novais Digital
npm run tech:sync -- --live --client=Novais Digital
```

Por padrao o comando roda em dry-run: ele le o ClickUp, consulta o repositorio GitHub indicado na descricao da task e mostra qual status aplicaria. Com `--live`, ele atualiza a task e comenta as evidencias encontradas. O matching procura termos do cliente, `platform_key`, `task_key` e `client_task_id` no titulo/corpo/branch do PR.

Para rodar sem rede e sem credenciais, usando fixture local:

```bash
npm run tech:sync -- --offline
```

## Solicitacao de nova plataforma

Para iniciar a governanca de um cliente `delivery_type=platform` (ex: SchoolPlatform, Aicfo), use o template de solicitacao de plataforma:

1. No ClickUp: `05 Institucional Novais Digital / Solicitacoes de plataforma` -> usar `[TEMPLATE] Solicitacao de plataforma`
2. Preencher: empresa, problema de negocio, sistema legado, numero de modulos, stage inicial
3. Mudar status para `escopo pronto`
4. O webhook gera a estrutura AIOS (Folder + List + modules) automaticamente

Para revisar o template antes de semear no ClickUp:

```bash
npm run templates:dry
```

## Automacao de plataformas SaaS multi-modulo (AIOS)

Para projetos onde 1 cliente = **plataforma SaaS multi-tenant com varios modulos** (ex: SchoolPlatform), o fluxo e diferente do `tech:*`. Em vez de tarefas flat no `Backlog tecnico`, criamos uma **Folder dedicada por plataforma** com uma List `Modulos`. Cada modulo e uma task pai com **subtasks por stage AIOS** (spec -> backend -> frontend -> tests -> review -> merge), dando visao de produto pra CEO.

```
05 Institucional Novais Digital / 
└── [Folder] Plataforma SchoolPlatform
    └── [List] Modulos
        ├── cadastros · Cadastros gerais (equipes, turnos, perfis...)
        │   ├── Spec - Definicao executavel
        │   ├── Backend - API + service + queries
        │   ├── Frontend - Telas + integracao
        │   ├── Tests - Vitest + Playwright
        │   ├── Review - Auditoria do review_agent
        │   └── Merge - PR final em main
        ├── ... 15 modulos no total
        └── cnab · Cobranca escritural / CNAB (alto risco, sem agentes)
            └── Implementacao manual (Rafael)
```

### Arquivos

| Arquivo | Para que serve |
|---|---|
| [`config/aios-module-catalog.json`](./config/aios-module-catalog.json) | 6 stages do pipeline AIOS + regras de tier (A/B/C) |
| [`config/aios-pipeline-contract.json`](./config/aios-pipeline-contract.json) | Contrato de entrada (modules[], platform_name, project_root, tier, week, ...) |
| [`config/aios-module-functionalities.json`](./config/aios-module-functionalities.json) | Mapeamento modulo -> resumo de produto + lista de funcionalidades (visivel pra CEO) |
| [`scripts/lib/aios-platform.mjs`](./scripts/lib/aios-platform.mjs) | Helpers de Folder/List + rollup de status no parent |
| [`scripts/generate-aios-modules.mjs`](./scripts/generate-aios-modules.mjs) | Cria Folder + List + 15 module parents + 70 stage subtasks + dependencias (idempotente) |
| [`scripts/lib/aios-evidence.mjs`](./scripts/lib/aios-evidence.mjs) | Le artefatos AIOS (`docs/specs/{module}.md`, `_review_*.md`) + decide status |
| [`scripts/sync-aios-status.mjs`](./scripts/sync-aios-status.mjs) | Sincroniza subtasks (filesystem + GitHub) e faz rollup para o parent |
| [`scripts/aios-sync-daemon.mjs`](./scripts/aios-sync-daemon.mjs) | Roda o sync em loop (default: a cada 15 min) |
| [`docs/AIOS_SYNC_PATTERN.md`](./docs/AIOS_SYNC_PATTERN.md) | Por que ClickUp puxa estado em vez de o AIOS empurrar |
| [`examples/edix-modules.payload.json`](./examples/edix-modules.payload.json) | Payload pronto para gerar os 15 modulos da plataforma SchoolPlatform |

### Status flow (5 estados)

A list `Modulos` usa cinco statuses, dando granularidade pra CEO ver exatamente onde cada modulo esta:

- `to do` - nada comecou (default ClickUp, mapeado de `pendente`/`a fazer`)
- `em desenvolvimento` - artefato AIOS existe / branch / PR aberto sem review
- `em revisão` - PR aberto em review **OU** stage `review` com `_review_*.md` gerado mas sem aprovacao
- `bloqueado` - `_review_*.md` contem `BLOCKER` **OU** CI failing
- `complete` - review aprovado (`APROVADO PARA MERGE: Sim`) + PR mergeado em main + CI verde (default ClickUp, mapeado de `concluido`)

> **Setup uma vez por list:** `to do` e `complete` ja existem por default no ClickUp. Para os 3 intermediarios (`em desenvolvimento`, `em revisão`, `bloqueado`), click direito na list `Modulos` -> Statuses -> adicionar manualmente. A API do ClickUp nao permite isso de forma confiavel em todos os planos.

Quando o sync detecta `bloqueado`, alem de mover o status, deixa um **comentario explicito** na task com a evidencia (ex: trecho do BLOCKER, link do PR, estado do CI) para a CEO conseguir clicar e entender o motivo sem precisar abrir o repo.

### Regras de tier

- **Tier A**: agente AIOS gera tudo, Rafael revisa -> 6 stages encadeadas
- **Tier B**: agente AIOS gera, Rafael itera -> 6 stages encadeadas
- **Tier C**: Rafael implementa, agentes apenas assistem -> 1 task manual_implementation
- `module.key === "cnab"`: forca rota manual mesmo se tier mudar (modulo de risco) + tag `bloqueador-cnab`

### Scripts de plataforma

Os scripts `platform:*` sao aliases dos `aios:*` e funcionam com o payload padrao SchoolPlatform:

```bash
npm run platform:dry           # dry-run: Folder/List/modules que seriam criados
npm run platform:generate      # cria estrutura no ClickUp
npm run platform:sync          # dry-run do sync de status
npm run platform:sync:live     # aplica status + comentarios no ClickUp
```

Para outros clientes, use `--payload-file`:

```bash
npm run aios:dry -- --payload-file=examples/aicfo-modules.payload.json
npm run aicfo:dry             # alias pronto para o Aicfo
```

### Revisar antes de criar

```bash
npm run aios:dry -- --payload-file=examples/edix-modules.payload.json
```

Mostra Folder/List/parents/subtasks/dependencias que seriam criadas (ou ja existem). Se rodar com credenciais, le o estado real e indica `[skip]` para o que ja foi criado - idempotente.

### Aplicar no ClickUp

```bash
npm run aios:generate -- --payload-file=examples/edix-modules.payload.json
```

Cria Folder + List + 15 parents + 70 subtasks + 66 dependencias em uma unica execucao.

### Sincronizar status

O sync le artefatos do filesystem do projeto consumidor (caminho vem do campo `project_root` do payload) + estado do GitHub. Atualiza subtasks, depois faz rollup nos parents.

```bash
npm run aios:sync                                          # dry-run contra Plataforma SchoolPlatform
npm run aios:sync:live                                     # aplica status + comentarios no ClickUp
node scripts/sync-aios-status.mjs --live --platform="Plataforma SchoolPlatform" --module=cadastros
```

Para deixar o sync rodando continuamente em background:

```bash
npm run aios:daemon                                  # dry-run a cada 15 min
npm run aios:daemon -- --live                        # live a cada 15 min
npm run aios:daemon -- --live --interval-ms=300000   # a cada 5 min
```

A `docs/AIOS_SYNC_PATTERN.md` explica por que o ClickUp puxa estado em vez de receber webhook do AIOS.

## Qualidade local

Para validar JSON, consistencia cruzada entre contratos/catalogos e payloads de exemplo:

```bash
npm run validate
```

Para rodar os testes unitarios da automacao tech:

```bash
npm test
```

Este projeto agora e Node-only. Os arquivos Python gerados por scaffold foram removidos porque nao faziam parte do fluxo operacional.

## Backend de webhook

Para rodar localmente o backend que recebe eventos do ClickUp:

```bash
npm start
```

Endpoints:

- `GET /health`
- `POST /webhooks/clickup`

Fluxo automatizado:

1. Usuario cria task em `05 Institucional Novais Digital / Solicitacoes de agente`.
2. Usuario preenche os campos customizados.
3. Usuario muda status para `escopo pronto`.
4. Webhook recebe o evento, le a task, gera o backlog tecnico em `Backlog tecnico` e muda a solicitacao para `gerado`.

Variaveis necessarias no Railway:

```bash
NOVAIS_INTERNAL_CLICKUP_TOKEN=pk_xxx
NOVAIS_INTERNAL_WORKSPACE_ID=90171198309
CLICKUP_WEBHOOK_SECRET=...
```

Depois de publicar no Railway, registre o webhook do ClickUp com:

```bash
npm run webhook:register -- --url=https://sua-url.up.railway.app
```

Para regenerar o modelo operacional especifico da area Tech:

```bash
npm run tech:model
```

## Proximos passos

1. Rodar `npm run bootstrap:dry` para revisar as 27 listas (22 originais + 5 novas de platform).
2. Rodar `npm run bootstrap` com `CLICKUP_TOKEN` e `CLICKUP_TEAM_ID` para aplicar no ClickUp.
3. Ajustar status no UI conforme o checklist impresso.
4. Setar `CLICKUP_WEBHOOK_SECRET` no Railway (obrigatorio em producao).
5. Registrar o webhook apos publicar: `npm run webhook:register -- --url=https://sua-url.up.railway.app`.
6. Migrar clientes existentes: adicionar `delivery_type` nos payloads de cada cliente e rodar `npm run aios:generate`.

## Licença

Copyright (c) 2026 Rafael Novaes.

Licenciado sob [MIT License](./LICENSE) — © 2026 Rafael Novaes.
