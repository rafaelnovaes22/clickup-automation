# ClickUp Acme - Governanca

Plano unico de como o ClickUp deve ser estruturado para refletir todo o trabalho do time Acme, do primeiro lead ao churn do cliente.

Substitui o blueprint anterior (`acme-governanca-ia/docs/clickup-blueprint.md`), que cresceu antes de ter mapa do ciclo completo do time.

## O que esta aqui

| Arquivo | Quem le | O que tem |
|---|---|---|
| [`GOVERNANCE.md`](./GOVERNANCE.md) | Voce + CEO | Plano completo: visao de negocio, estrutura ClickUp, atividades por fase, dashboards, plano de implementacao |

## Principios fundadores

1. ClickUp e 100% interno Acme. Cliente final nunca acessa.
2. Reflete a jornada do cliente. Cada Space corresponde a um momento dela.
3. Uma entidade nasce e morre em uma unica lista. Nada de pasta-por-cliente.
4. Simplicidade > completude. E melhor comecar com poucas listas que o time usa do que muitas que ninguem abre.
5. Visao de negocio antes de tecnica. Se a CEO nao entende a estrutura em 5 minutos, esta errada.
6. "Se nao esta no ClickUp, nao aconteceu." Ele e o journey log canonico do time.

## Status

v0.1 - proposta inicial (2026-05-01), agora com bootstrap da Onda 1.

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

O script tambem aceita os aliases usados no backend Acme:

```bash
set ACME_INTERNAL_CLICKUP_TOKEN=pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
set ACME_INTERNAL_WORKSPACE_ID=123456789
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
- Institucional Acme: 5

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
npm run tech:generate -- --payload="{\"client_name\":\"Acme\",\"client_task_id\":\"86xxx\",\"technical_platforms\":[\"ai_agent\",\"whatsapp\",\"node_backend\"],\"tech_owner\":\"AI Engineer\",\"delivery_due_date\":\"2026-05-15\",\"environment\":\"dev\"}"
```

No PowerShell, prefira arquivo de payload:

```bash
npm run tech:generate -- --payload-file=examples/tech-scope.sample.json
```

Para ler a evolucao das tarefas tech:

```bash
npm run tech:progress
npm run tech:progress -- --client=Acme
```

Para sincronizar o status das tarefas tech sem atualizacao manual do time, usando evidencias de GitHub/CI:

```bash
npm run tech:sync
npm run tech:sync -- --client=Acme
npm run tech:sync -- --live --client=Acme
```

Por padrao o comando roda em dry-run: ele le o ClickUp, consulta o repositorio GitHub indicado na descricao da task e mostra qual status aplicaria. Com `--live`, ele atualiza a task e comenta as evidencias encontradas. O matching procura termos do cliente, `platform_key`, `task_key` e `client_task_id` no titulo/corpo/branch do PR.

Para rodar sem rede e sem credenciais, usando fixture local:

```bash
npm run tech:sync -- --offline
```

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

Para regenerar o modelo operacional especifico da area Tech:

```bash
npm run tech:model
```

## Proximos passos

1. Rodar `npm run bootstrap:dry` com a CEO olhando a saida.
2. Definir se existe uma 23a lista ou se o numero correto da Onda 1 e 22.
3. Rodar `npm run bootstrap` com `CLICKUP_TOKEN` e `CLICKUP_TEAM_ID`.
4. Ajustar status no UI do ClickUp conforme o checklist impresso.
5. Avancar para Onda 2: templates e hooks backend.
