# AI Project-Governance Bot for ClickUp

From a briefing task in ClickUp to full, structured project documentation in about 12 minutes and roughly R$5 per project, with human approval gates at every promotion point.

This repository turns ClickUp into the operational backbone of an AI delivery team. A versioned blueprint defines the workspace (Spaces, lists, statuses, tags, custom fields); a webhook backend listens for briefing tasks and generates the technical backlog automatically; sync daemons keep task status honest by reading real evidence (filesystem artifacts, GitHub PRs, CI) instead of relying on manual updates.

## What it does

1. A briefing task is created in an intake list (`Solicitacoes de agente` or `Solicitacoes de plataforma`) and its custom fields are filled in: client, business problem, expected outcome, channels, technical platforms, autonomy level, deadline.
2. A human reviews the briefing and moves the status to `escopo pronto` (scope ready). That status change is the first approval gate.
3. The webhook backend receives the event, reads the task, and generates the corresponding technical backlog or a full multi-module platform structure (Folder + module tasks + stage subtasks + dependencies), then marks the request as `gerado`.
4. Sync daemons continuously reconcile ClickUp status with reality: spec files, review artifacts, open/merged PRs, CI state. Blocked work gets an explicit comment with the evidence so a non-technical stakeholder can understand why without opening the repo.

The governance model flows top-down: **Strategic** (business vision, client journey, delivery types) → **Tactical** (activity catalog, templates, event contracts) → **Operational** (generated tasks, gates, incidents, audits). Every promotion between lifecycle phases requires an explicit human decision.

## Human approval gates

| Gate | Where | What a human decides |
|---|---|---|
| Scope gate | Intake lists, status `escopo pronto` | Briefing is complete and correct; generation may run |
| Outcome gates (ASSISTED mode) | `Gates pendentes` list | Approve or reject each agent outcome before it reaches the client |
| Promotion gate | `Promocoes de modo` / PILOT acceptance | Promote SHADOW → ASSISTED → AUTONOMOUS, or PILOT → CANONICAL, only with recorded human sign-off |

## Delivery types

| `delivery_type` | Use for | Lifecycle |
|---|---|---|
| `agentic_saas` | AI agent billed by outcome | SHADOW → ASSISTED → AUTONOMOUS |
| `platform` | Multi-module SaaS platform | DRAFT → STAGING → PILOT → CANONICAL → DEPRECATED |
| `automation` | One-off script/integration/RPA | to do → in progress → done |
| `hybrid` | Combination of the above | Lifecycle per block |

## Repository map

| Path | Purpose |
|---|---|
| `config/clickup-governance.blueprint.json` | Versioned blueprint of Spaces, lists, entities, statuses and tags |
| `config/clickup-task-templates.json` | Task templates with typed custom fields (the briefing forms) |
| `config/activity-catalog.json` | Master catalog of 74 activities per Space/list |
| `config/diagnostic-output-contract.json` | Output contract of the Phase-0 diagnostic that seeds activities |
| `config/tech-platform-catalog.json` | Technical platform catalog and auto-generated tasks per platform |
| `config/aios-module-catalog.json` | 6-stage module pipeline (spec → backend → frontend → tests → review → merge) + tier rules |
| `scripts/` | Bootstrap, seeding, generation and sync scripts (all with dry-run mode) |
| `server.mjs` | Webhook backend (HMAC-verified) that turns approved briefings into backlogs |
| `docs/` | Generated operating model, event contracts, sync pattern rationale |
| `examples/` | Sample payloads (generic fictitious clients) |
| `tests/` | Unit tests for generation and sync logic |

## Quick start

Requires Node >= 18. No external dependencies (`npm install` is a no-op; the project uses only the Node standard library).

```bash
# 1. Preview everything the bootstrap would create (no API calls)
npm run bootstrap:dry

# 2. Set credentials
cp .env.example .env   # then fill in:
# CLICKUP_TOKEN=pk_xxxxxxxxxxxxxxxxxxxxxxxx
# CLICKUP_TEAM_ID=<your workspace id>

# 3. Apply the structure to your ClickUp workspace (idempotent)
npm run bootstrap

# 4. Seed templates, custom fields and the activity catalog
npm run templates:seed
npm run fields:seed
npm run activities:seed
```

Every mutating script has a `:dry` counterpart that prints exactly what would be created and skips anything that already exists.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `CLICKUP_TOKEN` | yes | ClickUp personal API token (`pk_...`) |
| `CLICKUP_TEAM_ID` | yes | ClickUp workspace (team) id |
| `CLICKUP_WEBHOOK_SECRET` | prod only | HMAC secret for webhook signature verification; the server refuses to start in production without it |
| `NODE_ENV` / `PORT` | no | Runtime config (default `development` / `3000`) |
| `GITHUB_TOKEN` (or `GH_TOKEN`) | no | Lets the sync consult PRs/branches/CI when deciding status; without it, sync runs offline/dry-run |

`NOVAIS_INTERNAL_CLICKUP_TOKEN` / `NOVAIS_INTERNAL_WORKSPACE_ID` are accepted aliases for the two required variables. See `.env.example` for the full commented list.

## Webhook backend

```bash
npm start
```

Endpoints:

- `GET /health`
- `POST /webhooks/clickup` (HMAC signature verified when `CLICKUP_WEBHOOK_SECRET` is set)

Flow: briefing task created → custom fields filled → status set to `escopo pronto` → webhook reads the task, generates the technical backlog, and moves the request to `gerado`.

After deploying (e.g. Railway — `railway.json` and `railway.worker.json` are included), register the webhook:

```bash
npm run webhook:register -- --url=https://your-deployment-url.example.com
```

## Technical backlog generation

```bash
npm run tech:dry                                        # preview with the sample payload
npm run tech:generate -- --payload-file=examples/tech-scope.sample.json
npm run tech:progress                                   # read progress back
npm run tech:sync                                       # dry-run status sync from GitHub evidence
npm run tech:sync -- --live                             # apply status + evidence comments
```

## Multi-module platforms (AIOS pipeline)

For clients that are a multi-module SaaS platform, the bot creates a dedicated Folder with a `Modulos` list: one parent task per module and one subtask per pipeline stage (spec → backend → frontend → tests → review → merge), with dependencies between stages.

```bash
npm run aios:dry -- --payload-file=examples/school-platform-modules.payload.json
npm run aios:generate -- --payload-file=examples/school-platform-modules.payload.json
npm run aios:sync            # dry-run: filesystem + GitHub evidence → status
npm run aios:sync:live       # apply status + rollup to parents + blocked comments
npm run aios:daemon          # continuous sync loop (default every 15 min)
```

Module status flow: `to do` → `em desenvolvimento` → `em revisão` → (`bloqueado`) → `complete`. A module only reaches `complete` with an approved review artifact, a merged PR and green CI. `docs/AIOS_SYNC_PATTERN.md` explains why ClickUp pulls state instead of receiving pushes.

Tier rules: Tier A/B modules go through the full 6-stage agent pipeline with human review; Tier C modules are implemented manually (high-risk modules are forced to the manual route regardless of tier).

## Quality

```bash
npm run validate   # JSON validity + cross-consistency between contracts, catalogs and example payloads
npm test           # 53 unit tests (generation, parsing, sync decisions)
```

## Regenerating derived docs

```bash
npm run contracts:generate   # docs/EVENT_CONTRACTS.md from the template config
npm run model:generate       # docs/OPERATING_MODEL.md from the activity catalog
npm run tech:model           # docs/TECH_OPERATING_MODEL.md
```

## License

Copyright (c) 2026 Rafael Novaes.

Licensed under [PolyForm Noncommercial License 1.0.0](./LICENSE.md) — reading, studying and noncommercial use permitted; commercial use requires the author's express authorization.
