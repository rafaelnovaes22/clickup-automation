# Como navegar este ClickUp

Este ClickUp e o journey log interno da Acme. O cliente final nunca acessa.

## Regra principal

Cada entidade vive em uma unica lista. Nao criar pasta por cliente.

Exemplos:

- Lead mora em `01 Pipeline Comercial / Leads`.
- Diagnostico mora em `01 Pipeline Comercial / Diagnosticos Fase 0`.
- Cliente ativo mora em `03 Clientes / Clientes ativos`.
- Incidente mora em `04 Saude Operacional / Incidentes`.

## Tipos de entrega (delivery_type)

A Acme conduz quatro tipos de entrega. Cada lista declara quais delivery_types ela aceita.

| `delivery_type` | Quando usar | Lifecycle | Espaco/lista exclusivo |
|---|---|---|---|
| `agentic_saas` | Agente de IA cobrado por outcome (SaaS2). | SHADOW -> ASSISTED -> AUTONOMOUS | `02 Implantacao / SHADOWs ativos`, `02 Implantacao / ASSISTEDs ativos`, `04 Saude Operacional / Gates pendentes`, `04 Saude Operacional / SLA breaches`. |
| `platform` | Plataforma SaaS multi-modulo que substitui sistema legado. | DRAFT -> STAGING -> PILOT -> CANONICAL -> DEPRECATED | `02 Implantacao / Rollouts em andamento`, `02 Implantacao / Pilotos ativos`, `03 Clientes / Fontes canonicas`, `04 Saude Operacional / Aceites operacionais`, `05 Institucional Acme / Solicitacoes de plataforma`. |
| `automation` | Script/integracao/RPA pontual. | a fazer -> em desenvolvimento -> em revisao -> bloqueado -> concluido | Sem listas exclusivas. Usa `05 Institucional Acme / Backlog tecnico`. |
| `hybrid` | Combina dois ou mais tipos no mesmo cliente. | Lifecycle por bloco. | Pai vive na lista mais geral; cada bloco interno usa as listas do seu delivery_type. |

> **Importante**: SHADOW/ASSISTED/AUTONOMOUS sao exclusivos de `agentic_saas`. PILOT/CANONICAL/DEPRECATED sao exclusivos de `platform`. Nao misture.

## Spaces

| Space | Quando usar |
|---|---|
| `01 Pipeline Comercial` | Antes do contrato: leads, diagnosticos e propostas. Aplica-se a qualquer delivery_type. |
| `02 Implantacao` | Do contrato assinado ate a entrega entrar em operacao. Setup eh universal; depois a rota se divide entre listas agentic (SHADOWs/ASSISTEDs) e platform (Rollouts/Pilotos). |
| `03 Clientes` | Operacao continua, faturamento, relacionamento, expansao, renovacao e churn. `Fontes canonicas` so aceita modulos `platform` em CANONICAL. |
| `04 Saude Operacional` | Tudo que pede atencao operacional: gates (so agentic), aceites operacionais (so platform/automation), incidentes, auditorias, promocoes e SLA. |
| `05 Institucional Acme` | Decisoes internas, catalogo de SKUs, backlog, time e auditorias da propria Acme. `Solicitacoes de agente` so para agentic_saas; `Solicitacoes de plataforma` so para platform. |

## Tags transversais

- `ia-gerado`: atividade criada por automacao ou agente.
- `revisao-humana`: precisa de olhar humano antes de seguir.
- `aprovado`: revisado e liberado.
- `rejeitado`: revisado e recusado.
- `urgente`: demanda acao rapida.
- `delivery:agentic_saas` / `delivery:platform` / `delivery:automation` / `delivery:hybrid`: marca o tipo de entrega.
- `ai-enabled`: marca que aquele bloco usa IA por dentro mesmo nao sendo agentic_saas (exige eval/prompt/observabilidade de IA).

## Como decidir onde criar uma task

1. Pergunte qual entidade a task representa.
2. Identifique o `delivery_type` da entrega (agentic_saas, platform, automation ou hybrid).
3. Encontre a lista dessa entidade que aceita o `delivery_type` correto.
4. Use status para indicar ciclo de vida.
5. Use tags para contexto transversal (incluindo `delivery:<tipo>`).
6. Se a task depender de outra entidade, relacione ou linke a task original.

## O que evitar

- Nao criar pasta por cliente.
- Nao duplicar a mesma entidade em varias listas.
- Nao criar status novo sem revisar o blueprint.
- Nao usar task gigante como documento de projeto. Linke docs maiores quando necessario.
- Nao colocar entrega `platform` em `SHADOWs ativos` ou `ASSISTEDs ativos` - essas listas sao exclusivas de `agentic_saas`.
- Nao colocar entrega `agentic_saas` em `Rollouts em andamento`, `Pilotos ativos` ou `Fontes canonicas` - sao exclusivas de `platform`.
