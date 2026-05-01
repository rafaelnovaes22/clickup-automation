# Como navegar este ClickUp

Este ClickUp e o journey log interno da Acme. O cliente final nunca acessa.

## Regra principal

Cada entidade vive em uma unica lista. Nao criar pasta por cliente.

Exemplos:

- Lead mora em `01 Pipeline Comercial / Leads`.
- Diagnostico mora em `01 Pipeline Comercial / Diagnosticos Fase 0`.
- Cliente ativo mora em `03 Clientes / Clientes ativos`.
- Incidente mora em `04 Saude Operacional / Incidentes`.

## Spaces

| Space | Quando usar |
|---|---|
| `01 Pipeline Comercial` | Antes do contrato: leads, diagnosticos e propostas. |
| `02 Implantacao` | Do contrato assinado ate o modo AUTONOMOUS. |
| `03 Clientes` | Operacao continua, faturamento, relacionamento, expansao, renovacao e churn. |
| `04 Saude Operacional` | Tudo que pede atencao operacional: gates, incidentes, auditorias, promocoes e SLA. |
| `05 Institucional Acme` | Decisoes internas, catalogo de SKUs, backlog, time e auditorias da propria Acme. |

## Tags transversais

- `ia-gerado`: atividade criada por automacao ou agente.
- `revisao-humana`: precisa de olhar humano antes de seguir.
- `aprovado`: revisado e liberado.
- `rejeitado`: revisado e recusado.
- `urgente`: demanda acao rapida.

## Como decidir onde criar uma task

1. Pergunte qual entidade a task representa.
2. Encontre a lista dessa entidade.
3. Use status para indicar ciclo de vida.
4. Use tags para contexto transversal.
5. Se a task depender de outra entidade, relacione ou linke a task original.

## O que evitar

- Nao criar pasta por cliente.
- Nao duplicar a mesma entidade em varias listas.
- Nao criar status novo sem revisar o blueprint.
- Nao usar task gigante como documento de projeto. Linke docs maiores quando necessario.
