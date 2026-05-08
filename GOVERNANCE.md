# ClickUp Acme — Governança Operacional

> **Versão**: 0.2 — 2026-05-08
> **Audiência**: você (decisor técnico) + CEO (decisor executivo)
> **Status**: proposta v0.2 — multi-delivery (agentic_saas + platform + automation + hybrid)

---

## 1. Sumário executivo

O ClickUp Acme é a **governança operacional interna para múltiplos tipos de entrega** que a Acme conduz. Nem todo cliente recebe um agente de IA. Alguns recebem uma plataforma SaaS operacional; outros recebem automações pontuais; outros, uma combinação.

Para refletir isso, o sistema reconhece quatro **tipos de entrega** (`delivery_type`):

- `agentic_saas` — outcomes vendidos por agente de IA (modelo SaaS², com SHADOW/ASSISTED/AUTONOMOUS).
- `platform` — plataforma SaaS multi-módulo que substitui um sistema legado ou atende uma operação inteira (lifecycle DRAFT → STAGING → PILOT → CANONICAL → DEPRECATED).
- `automation` — script/integração ou robô RPA pontual; entrega pequena, sem ciclo de vida de plataforma.
- `hybrid` — combina dois ou mais tipos no mesmo cliente (ex: plataforma com módulo agentic embutido).

O modelo **Service-as-a-Software (SaaS²)** continua suportado e é a forma natural do `agentic_saas`: vender outcomes entregues por agentes de IA, não software para o cliente operar. Mas ele é **um caso suportado, não o único default**.

O ClickUp continua sendo o **journey log canônico** desse trabalho. Não é onde o cliente loga (o cliente nunca loga). É onde o time Acme prova o que aconteceu, em ordem, com quem fez, quando, e qual foi o resultado — independente do tipo de entrega.

Este documento descreve como o ClickUp deve ser estruturado para que:

- A CEO consiga, em 1 dashboard, responder "estamos vendendo? entregando? operando bem?"
- O time consiga, em 1 lugar, ver "o que precisa de mim agora?"
- Um novo membro do time entenda, em 1 hora, "como o trabalho flui aqui"
- Cada cliente seja modelado pelo `delivery_type` certo, sem forçar ritos agentic em entregas de plataforma.

---

## 2. Filosofia em 6 frases

1. **ClickUp é interno.** Cliente final nunca acessa.
2. **Reflete a jornada, não a tabela.** A estrutura segue o caminho do cliente, não o schema do banco.
3. **Uma entidade vive em uma única lista.** Lead, Diagnóstico, Cliente, Subscription/Plataforma são entidades distintas em listas distintas — não viram pasta-por-cliente.
4. **Atividades padrão nascem com a entidade.** Quando um Diagnóstico é vendido, suas 6 atividades padrão (sessão CEO, entrevistas, auditoria, análise, redação, devolução) já aparecem.
5. **Status conta a história.** O ciclo de vida de cada entidade está nos status da lista, lido como fluxograma. O lifecycle escolhido depende do `delivery_type`.
6. **Começa simples, expande por demanda.** Custom fields, automações, dashboards entram quando o time pede — não preventivamente.

---

## 2.A — Tipos de entrega (`delivery_type`)

Toda entrega da Acme é classificada em **um e apenas um** dos quatro tipos abaixo. Esse campo determina:

- qual **lifecycle** a entrega segue (ver §2.B);
- quais **listas** do ClickUp são usadas;
- quais **atividades** são obrigatórias;
- quais **artefatos** (prompts, evals, smoke tests, aceite operacional) precisam existir antes de promover de fase.

| `delivery_type` | Quando usar | Exemplo | Lifecycle |
|---|---|---|---|
| `agentic_saas` | Vendemos outcomes entregues por **agente de IA** com cobrança por evento (SaaS²). Cliente paga por lead qualificado, ticket resolvido, etc. | "Qualificador de leads B2B" para Acme | SHADOW → ASSISTED → AUTONOMOUS |
| `platform` | Entregamos uma **plataforma SaaS multi-módulo** que substitui sistema legado ou cobre uma operação inteira. Pode ter ou não módulos com IA. | SchoolPlatform (operação escolar), Aicfo (CFO-IA self-serve) | DRAFT → STAGING → PILOT → CANONICAL → DEPRECATED |
| `automation` | Script, integração ou robô **pontual** — entrega pequena, sem evolução em fases. | "Importar planilha mensal de comissões para o ERP" | a fazer → em desenvolvimento → em revisão → bloqueado → concluído |
| `hybrid` | A mesma entrega combina dois ou mais tipos. Cada bloco (módulo, agente) declara o **próprio** `delivery_type`; o pai herda `hybrid`. | Plataforma SchoolPlatform com módulo `tele_pesquisa` em modo agentic_saas | Lifecycle por bloco |

### Campos obrigatórios por tipo

| Campo | `agentic_saas` | `platform` | `automation` | `hybrid` |
|---|---|---|---|---|
| `recommended_agentic_mode` (SHADOW/ASSISTED/AUTONOMOUS) | obrigatório | n/a | n/a | só nos blocos agentic |
| `recommended_platform_stage` (DRAFT/STAGING/PILOT/CANONICAL/DEPRECATED) | n/a | obrigatório | n/a | só nos blocos platform |
| `prompts` versionados, `agent_eval_suite`, `unit_economics` de inferência | obrigatório | só se `ai_enabled: true` | só se `ai_enabled: true` | conforme bloco |
| Langfuse/observabilidade de inferência | obrigatório | só se `ai_enabled: true` | só se `ai_enabled: true` | conforme bloco |
| Critérios de aceite operacional + smoke test do módulo | recomendado | obrigatório | obrigatório | obrigatório |
| Promoção formal por aceite humano antes de virar fonte canônica | n/a | obrigatório (PILOT → CANONICAL) | n/a | só nos blocos platform |

> **Regra de leitura**: `agentic_saas` é otimizado para **outcomes vendidos por evento**. `platform` é otimizado para **operação contínua que substitui um sistema**. Se a frase "vendemos lead/ticket/proposta" descreve a entrega, use `agentic_saas`. Se a frase "essa plataforma vai virar a fonte da verdade da operação X" descreve, use `platform`.

---

## 2.B — Lifecycle por tipo de entrega

### `agentic_saas` — SaaS² clássico

```
SHADOW → ASSISTED → AUTONOMOUS
```

- **SHADOW**: agente roda mas não materializa output para o cliente. Calibração — mínimo 30 outcomes comparados com humano antes de promover. Cobrança variável **não acontece** ainda.
- **ASSISTED**: cada outcome do agente passa por aprovação humana antes de ir ao cliente. Cobrança variável começa quando contratualmente definido. Threshold típico para promover: ~90% de aprovação humana.
- **AUTONOMOUS**: agente entrega outcomes diretamente; humano audita amostra mensal (LLM-as-judge + revisão humana 5–10%).

**Exigências obrigatórias** para `agentic_saas`: prompts versionados, `agent_eval_suite`, observabilidade de inferência (Langfuse ou equivalente), unit economics de inferência (custo por outcome ≤ 25% do preço por outcome), guardrails e regra de handoff humano.

### `platform` — plataforma operacional multi-módulo

```
DRAFT → STAGING → PILOT → CANONICAL → DEPRECATED
```

- **DRAFT**: spec do módulo escrita, código inicial pode estar em desenvolvimento. Sem ambiente.
- **STAGING**: módulo está implantado em ambiente isolado (staging), passou em smoke test técnico, mas **ainda não** roda contra dados reais do cliente.
- **PILOT**: módulo é exposto a usuários reais (geralmente internos do cliente, em paralelo ao sistema legado). Coleta de evidência operacional. **Aceite humano obrigatório** antes de avançar. Para módulos `ai_enabled: true`, evals e observabilidade de inferência também são obrigatórios aqui.
- **CANONICAL**: módulo é a **fonte canônica da verdade** para aquela operação. Sistema legado pode ser desligado. Incidentes vão direto para a operação real.
- **DEPRECATED**: módulo está sendo desativado (sucessor existe ou função saiu de escopo). Ainda em produção apenas para leitura/migração.

**"PILOT antes de virar fonte canônica"** é a regra equivalente, em `platform`, ao "SHADOW antes de cobrar" do `agentic_saas`. Em ambos os casos, é o gate humano que valida que o sistema é confiável o suficiente para assumir responsabilidade real.

**Exigências obrigatórias** para `platform`: critérios de aceite operacional documentados, smoke test por módulo, comparação **dados legado vs plataforma** quando há substituição, registro de aceite humano, monitoramento de incidentes pós-CANONICAL.

### `automation` — entrega pontual

```
a fazer → em desenvolvimento → em revisão → bloqueado → concluído
```

Sem fases extras. Critério de pronto: rodou contra dados reais 1×, evidência registrada, dono identificado se quebrar.

### `hybrid`

Não tem lifecycle próprio — cada bloco interno declara seu próprio `delivery_type` e roda no lifecycle correspondente. A task pai serve só de aglutinador.

---

## 3. A jornada do cliente Acme (visão CEO)

```
                  ┌──────────────────────────────────────┐
                  │  Cliente potencial não nos conhece    │
                  └──────────────────────────────────────┘
                                    │
                              [primeiro contato]
                                    ▼
   ╔══════════════════════════════════════════════════════════════╗
   ║   1. PIPELINE COMERCIAL                                       ║
   ║   ─────────────────────                                       ║
   ║   • Lead novo                                                 ║
   ║   • Conversa em curso                                         ║
   ║   • Lead qualificado (BANT validado)                          ║
   ║                                                               ║
   ║   ▼ aceita pagar Diagnóstico Fase 0                           ║
   ║                                                               ║
   ║   • Diagnóstico em execução  (5 dias úteis)                   ║
   ║   • Diagnóstico entregue                                       ║
   ║   • Aguardando decisão do cliente                             ║
   ║                                                               ║
   ║   ▼ assina contrato SaaS²                                      ║
   ╚══════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
   ╔══════════════════════════════════════════════════════════════╗
   ║   2. IMPLANTAÇÃO  (rota varia por delivery_type)              ║
   ║   ─────────────                                                ║
   ║   delivery_type=agentic_saas:                                  ║
   ║   • Setup técnico  (briefing, canal, baseline)                ║
   ║   • SHADOW         (calibração, mín 30 outcomes)              ║
   ║   • ASSISTED       (gates humanos, time aprova cada outcome)  ║
   ║                                                               ║
   ║   delivery_type=platform:                                      ║
   ║   • DRAFT          (spec executável + setup ambiente)         ║
   ║   • STAGING        (smoke test técnico, sem dados reais)      ║
   ║   • PILOT          (usuários reais, paralelo ao legado)       ║
   ║                                                               ║
   ║   ▼ agentic_saas: atinge SLA + concordância humano-vs-agente  ║
   ║   ▼ platform: aceite operacional + comparação legado×nova     ║
   ╚══════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
   ╔══════════════════════════════════════════════════════════════╗
   ║   3. OPERAÇÃO CONTÍNUA                                        ║
   ║   ────────────────────                                         ║
   ║   delivery_type=agentic_saas:                                  ║
   ║   • AUTONOMOUS                                                 ║
   ║   • Auditoria mensal (LLM-as-judge + amostra humana)          ║
   ║   • Faturamento mensal (plataforma + outcomes — cap, SLA)     ║
   ║                                                               ║
   ║   delivery_type=platform:                                      ║
   ║   • CANONICAL (módulo é fonte da verdade da operação)         ║
   ║   • Monitoramento de incidentes pós-canonical                 ║
   ║   • Auditoria operacional (não LLM-as-judge por padrão)       ║
   ║                                                               ║
   ║   • Check-in mensal com cliente (em ambos os casos)           ║
   ║                                                               ║
   ║   ▼ tempo passa                                                ║
   ╚══════════════════════════════════════════════════════════════╝
                                    │
                  ┌─────────────────┼──────────────────┐
                  ▼                 ▼                  ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐
   │  4a. EXPANSÃO     │  │  4b. RENOVAÇÃO   │  │  4c. CHURN       │
   │  Wave 2/3 +       │  │  Recontratação    │  │  Encerramento    │
   │  upsell de SKU    │  │  anual            │  │  + post-mortem   │
   └──────────────────┘  └──────────────────┘  └─────────────────┘

   Em paralelo (acompanha 2 + 3):
   ╔══════════════════════════════════════════════════════════════╗
   ║   SAÚDE OPERACIONAL                                            ║
   ║   • Gates pendentes  • Incidentes  • Auditorias  • SLA breaches║
   ╚══════════════════════════════════════════════════════════════╝
```

Esse é o **caminho do cliente**. A estrutura ClickUp espelha isso.

---

## 4. Os 5 Spaces do ClickUp Acme

Decisão deliberada: **menos é mais**. O blueprint anterior tinha 6 Spaces e 13 listas só na primeira camada — antes de qualquer cliente real existir. Aqui são **5 Spaces** que cobrem todo o ciclo, com listas mínimas mas suficientes.

### 4.1 — Visão geral

```
┌─────────────────────────────────────────────────────────────────┐
│  WORKSPACE Acme — interno                                      │
│                                                                  │
│  📈 1. PIPELINE      🛠️ 2. IMPLANTAÇÃO    👥 3. CLIENTES        │
│      COMERCIAL                                                   │
│                                                                  │
│  🚨 4. SAÚDE         🧠 5. INSTITUCIONAL                         │
│      OPERACIONAL         Acme                                  │
└─────────────────────────────────────────────────────────────────┘
```

| # | Space | Finalidade | Audiência primária |
|---|---|---|---|
| 1 | 📈 Pipeline Comercial | Funil de aquisição: do lead ao contrato assinado | Comercial + CEO |
| 2 | 🛠️ Implantação | Onboarding técnico do cliente: do contrato ao AUTONOMOUS | Time de delivery |
| 3 | 👥 Clientes | Operação contínua dos clientes ativos: faturamento, expansão, renovação | Time de relacionamento + CEO |
| 4 | 🚨 Saúde Operacional | Cockpit reativo: gates, incidentes, auditorias, SLA | Time todo + CEO |
| 5 | 🧠 Institucional Acme | Estratégia, catálogo, decisões, time interno | CEO + Tech Lead |

**Regra operacional aplicada**: dentro de cada Space, **1 entidade = 1 lista**. Não há pasta-por-cliente. Um cliente em operação é uma task na lista "Clientes ativos" do Space 3, vinculada por relacionamento a tasks em outros Spaces (subscriptions, faturas, etc.).

---

### 4.2 — 📈 Space 1: Pipeline Comercial

Cobre **fase pré-venda + diagnóstico + contratação**.

#### Listas

| Lista | Entidade | O que mora aqui |
|---|---|---|
| **Leads** | Lead | Toda pessoa/empresa em contato comercial (1 task por lead) |
| **Diagnósticos Fase 0** | Diagnóstico | 1 task por Diagnóstico vendido — segue o ciclo de 5 dias |
| **Propostas** | Proposta | 1 task por proposta enviada ao cliente após Diagnóstico |

#### Status por lista (ciclo de vida)

```
Leads:           novo  →  conversa  →  qualificado  →  perdido
                                            │
                                            ▼
Diagnósticos:    vendido  →  em execução  →  entregue  →  aguardando decisão  →  convertido | recusado
                                                                                       │
                                                                                       ▼
Propostas:       enviada  →  em negociação  →  assinada  →  rejeitada
                                                   │
                                                   ▼
                                          [vira Cliente no Space 2]
```

#### O que aparece automaticamente quando…

- **Lead novo entra** (form externo, indicação manual): task em "Leads / novo"
- **Diagnóstico vendido**: task em "Diagnósticos / vendido" + 6 sub-tasks padrão (sessão CEO, entrevistas, auditoria dados, análise, redação, devolução)
- **Diagnóstico entregue + cliente aprova**: task em "Propostas / enviada"
- **Proposta assinada**: cria task em "Clientes ativos" no Space 3 e marca proposta como `assinada`

---

### 4.3 — 🛠️ Space 2: Implantação

Cobre **setup técnico + ramp-up até produção**. O caminho difere por `delivery_type`:

- `agentic_saas`: Setup → SHADOW → ASSISTED → (entra em AUTONOMOUS no Space 3).
- `platform`: Rollout → STAGING → PILOT → (entra em CANONICAL no Space 3).
- `automation`: Setup → execução → entrega.

#### Listas

| Lista | Entidade | `delivery_type` aplicável | O que mora aqui |
|---|---|---|---|
| **Setups em andamento** | Setup (genérico) | qualquer | 1 task pai por cliente/entrega em onboarding, com sub-tasks de cada passo. |
| **Rollouts em andamento** | Rollout de plataforma | `platform`, `hybrid` | 1 task pai por plataforma sendo implantada. Cobre DRAFT → STAGING. |
| **SHADOWs ativos** | Subscription em SHADOW | **só** `agentic_saas` | 1 task por subscription rodando em modo SHADOW. |
| **ASSISTEDs ativos** | Subscription em ASSISTED | **só** `agentic_saas` | 1 task por subscription em modo ASSISTED. |
| **Pilotos ativos** | Módulo/plataforma em PILOT | `platform`, `hybrid` | 1 task por plataforma/módulo rodando em piloto contra usuários reais. |

> **Importante**: as listas `SHADOWs ativos` e `ASSISTEDs ativos` só recebem entregas com `delivery_type: agentic_saas`. Não force entregas tipo `platform` para essas listas — use `Rollouts em andamento` e `Pilotos ativos`.

#### Status por lista

```
Setups:        kickoff  →  briefing  →  canal conectado  →  baseline capturado  →  prompts aprovados  →  shadow ligado / staging pronto

# delivery_type: agentic_saas
SHADOWs:       calibrando  →  30 outcomes coletados  →  análise concluída  →  promovido para ASSISTED
                                                                                          │
                                                                                          ▼
ASSISTEDs:    operando  →  threshold atingido  →  promovido para AUTONOMOUS
                                                          │
                                                          ▼
                                               [vai para Space 3, Clientes ativos / AUTONOMOUS]

# delivery_type: platform
Rollouts:      draft  →  ambiente provisionado  →  smoke test verde  →  staging  →  promovido para PILOT
                                                                                            │
                                                                                            ▼
Pilotos:       piloto aberto  →  comparação legado×nova rodando  →  aceite humano coletado  →  promovido para CANONICAL
                                                          │
                                                          ▼
                                               [vai para Space 3, Fontes canônicas]
```

#### O que aparece automaticamente quando…

- **Cliente novo nasce** (proposta assinada): cria 1 task pai "Setup [cliente]" com sub-tasks padrão. Quando `delivery_type: agentic_saas`, sub-tasks incluem briefing, canal, baseline, prompts, ativação shadow, smoke test. Quando `delivery_type: platform`, sub-tasks incluem ambiente, migrations, smoke test técnico, dados de homologação.
- **Setup completo (`agentic_saas`)**: vira task em "SHADOWs ativos / calibrando".
- **Setup completo (`platform`)**: vira task em "Rollouts em andamento / staging" e, quando o módulo passa em smoke test e tem aceite técnico, vira task em "Pilotos ativos".
- **30 outcomes coletados (`agentic_saas`)**: notificação automática ao time pra analisar.
- **Promoção SHADOW→ASSISTED aprovada**: task se move pra lista ASSISTEDs, registrada em "Promoções de Modo" (Space 4).
- **Promoção ASSISTED→AUTONOMOUS aprovada**: subscription vira task em "Clientes ativos" (Space 3) e some daqui.
- **Aceite operacional do PILOT registrado (`platform`)**: módulo é promovido para "Fontes canônicas" no Space 3 e some de "Pilotos ativos".

---

### 4.4 — 👥 Space 3: Clientes

Cobre **operação contínua + relacionamento + expansão + renovação + churn**. É o Space mais "vivo": a maioria dos clientes vai estar aqui no longo prazo.

#### Listas

| Lista | Entidade | `delivery_type` aplicável | O que mora aqui |
|---|---|---|---|
| **Clientes ativos** | Cliente | qualquer | 1 task por cliente em operação (qualquer `delivery_type`). Status reflete saúde geral do cliente. |
| **Fontes canônicas** | Plataforma/módulo em CANONICAL | `platform`, `hybrid` | 1 task por plataforma/módulo que assumiu o papel de fonte da verdade — substituiu sistema legado. |
| **Faturamento mensal** | Fatura | qualquer | 1 task por (cliente × mês). Nasce no fechamento do mês. |
| **Relacionamento** | Touchpoint | qualquer | Reuniões, check-ins, QBRs, NPS — 1 task por evento de contato |
| **Expansões** | Wave / upsell / novo módulo | qualquer | 1 task por nova Wave, upsell de SKU ou novo módulo em delivery |
| **Renovações** | Renovação | qualquer | 1 task por renovação anual em curso |
| **Pós-churn** | Cliente encerrado | qualquer | 1 task por cliente que saiu — com motivo e post-mortem |

#### Status principais

```
Clientes ativos:    saudável  →  em alerta  →  em risco  →  pausado  →  encerrado
                                                                          │
                                                                          ▼
                                                                  [migra para "Pós-churn"]

Faturamento:        em curso  →  fechado  →  emitido  →  pago  →  inadimplente

Relacionamento:     próximo  →  realizado  →  cancelado

Expansões:          identificada  →  proposta  →  contratada  →  em delivery  →  concluída

Renovações:         a vencer 90d  →  conversa iniciada  →  proposta enviada  →  renovada  →  perdida
```

#### O que aparece automaticamente quando…

- **Cliente promovido para AUTONOMOUS** (Space 2): nasce task em "Clientes ativos / saudável"
- **Fim do mês**: cria 1 task por cliente ativo em "Faturamento mensal / em curso", com `lineItems` e cap aplicado
- **45 dias antes da renovação**: cria task em "Renovações / a vencer 90d"
- **3 incidentes P1/P2 num mês** (ou drift detectado): muda status do Cliente para "em risco" e cria task em "Relacionamento / próximo" para conversa

---

### 4.5 — 🚨 Space 4: Saúde Operacional

Cobre **gates + incidentes + auditorias + breaches + aceites operacionais**. É o cockpit reativo do time. **Acompanha** Spaces 2 e 3 — qualquer entrega em operação pode gerar atividade aqui, em qualquer `delivery_type`.

#### Listas

| Lista | Entidade | `delivery_type` aplicável | O que mora aqui |
|---|---|---|---|
| **Gates pendentes** | Gate | **só** `agentic_saas` (e blocos agentic em `hybrid`) | 1 task por outcome em modo ASSISTED esperando decisão humana — ou AUTONOMOUS abaixo do threshold de confiança |
| **Aceites operacionais** | Aceite | `platform`, `automation`, `hybrid` | 1 task por aceite operacional pendente: validação de critérios de aceite por usuário interno do cliente, comparação legado×nova, registro de assinatura humana antes de promover PILOT → CANONICAL |
| **Incidentes** | Incidente | qualquer | 1 task por incidente operacional (P1/P2/P3). Em `agentic_saas`: pode ser drift do agente. Em `platform`: pode ser dado divergente do legado. |
| **Auditorias mensais** | Auditoria | qualquer | 1 task por (cliente × mês). Em `agentic_saas`: LLM-as-judge + amostra humana. Em `platform`: auditoria operacional / consistência canonical vs legado em paralelo. |
| **Promoções de modo** | Promoção | qualquer | 1 task por promoção. `agentic_saas`: SHADOW→ASSISTED ou ASSISTED→AUTONOMOUS. `platform`: STAGING→PILOT ou PILOT→CANONICAL. |
| **SLA breaches** | Breach | `agentic_saas` (e blocos agentic em `hybrid`) | 1 task por mês em que cliente `agentic_saas` não atingiu SLA contratual (variável não cobrado) |

#### Status

```
Gates:          aguardando  →  aprovado  →  rejeitado    (SLA interno: 4h pra resolver)
                                                  ↑
                                                  └─ se 4h+ → escala para "escalado"

Incidentes:     aberto  →  investigando  →  mitigado  →  resolvido  →  postmortem

Auditorias:     agendada  →  em revisão  →  concluída  →  anexada à fatura

Promoções:      solicitada  →  aguardando aprovação  →  aprovada | rejeitada

SLA breaches:   detectado  →  comunicado ao cliente  →  fatura ajustada  →  fechado
```

#### O que aparece automaticamente quando…

- **Outcome em ASSISTED** chega ao gate: task em "Gates / aguardando" (com link Langfuse + payload)
- **Pipeline falha** ou **drift detectado**: task em "Incidentes / aberto"
- **Fim do mês**: 1 task em "Auditorias / agendada" por cliente em operação
- **% SLA do mês < threshold**: task em "SLA breaches / detectado" + flag no Cliente do Space 3
- **Time clica "Aprovar promoção"** numa task: gera registro em "Promoções / aprovada"

---

### 4.6 — 🧠 Space 5: Institucional Acme

Cobre **estratégia + catálogo + decisões + backlog interno**. Não é cliente-específico. É como o time Acme opera **a si mesmo**.

#### Listas

| Lista | Entidade | O que mora aqui |
|---|---|---|
| **Catálogo de SKUs** | SKU | 1 task por SKU (em produção / em dev / depreciado) |
| **Decisões e ADRs** | Decisão | Constitution, ADRs, decisões D1-D7 da Onda 0, etc. |
| **Backlog técnico** | Iniciativa | Forge-N, Onda-N, refactors, pesquisas |
| **Time Acme** | Pessoa | 1 task por membro do time, com role, áreas, links de doc interno |
| **Auditoria DeepAgents** | Relatório | 1 task por relatório mensal do reviewer externo |

#### Status

```
Catálogo SKUs:     dev  →  piloto  →  produção  →  maduro  →  depreciado  →  sunset

Decisões:          em curso  →  aguardando aprovação  →  aprovada  →  vigente  →  superada

Backlog técnico:   bloqueado  →  em curso  →  em revisão  →  concluído

Auditoria reviewer: em curso  →  publicada  →  ações em andamento  →  fechada
```

---

## 5. Catálogo completo: atividades por fase do ciclo

> **Esta é a tabela mestre.** Cada linha é uma atividade real que o time faz. Cada uma sabe onde mora no ClickUp.

### 5.1 — Fase: Pré-venda / Captação

| # | Atividade | Quem faz | Onde | Quando aparece |
|---|---|---|---|---|
| 1 | Identificação de lead | Comercial | 📈 / Leads / novo | Form externo, indicação, evento |
| 2 | Primeira conversa de descoberta | Comercial | 📈 / Leads / conversa | Após contato inicial |
| 3 | Qualificação BANT | Comercial | 📈 / Leads / conversa | Conforme conversa avança |
| 4 | Decisão: vender Diagnóstico ou descartar | Comercial + CEO | 📈 / Leads / qualificado ou perdido | Decisão consciente |
| 5 | Apresentar pitch do Diagnóstico Fase 0 | Comercial | 📈 / Leads / qualificado (sub-task) | Após qualificar |
| 6 | Negociar fee do Diagnóstico | Comercial | 📈 / Leads / qualificado (sub-task) | Conforme cliente engaja |
| 7 | Cliente assina e paga Diagnóstico | Comercial + Financeiro | 📈 / Diagnósticos / vendido | Pagamento confirmado |

### 5.2 — Fase: Diagnóstico Fase 0 (5 dias úteis)

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 8 | Sessão estruturada 90min com CEO | Tech Lead + CEO Acme | 📈 / Diagnósticos / em execução (sub-task D+1) | Dia 1 |
| 9 | Entrevistas 30min com 2-3 pessoas-chave | Tech Lead | 📈 / Diagnósticos / em execução (sub-task D+1) | Dia 1 |
| 10 | Auditoria express dados/ferramentas | Tech Lead | 📈 / Diagnósticos / em execução (sub-task D+2) | Dia 2 |
| 11 | Análise: 3 candidatos + critérios SaaS² | Tech Lead | 📈 / Diagnósticos / em execução (sub-task D+3) | Dia 3 |
| 12 | Cálculo unit economics por candidato | Tech Lead | 📈 / Diagnósticos / em execução (sub-task D+3) | Dia 3 |
| 13 | Redação do relatório (5-10pp PDF) | Tech Lead | 📈 / Diagnósticos / em execução (sub-task D+4) | Dia 4 |
| 14 | Sessão de devolução 1h | Tech Lead + CEO Acme + cliente | 📈 / Diagnósticos / entregue | Dia 5 |
| 15 | Aguardar decisão do cliente (7 dias) | — | 📈 / Diagnósticos / aguardando decisão | Imediatamente após D+5 |

### 5.3 — Fase: Contratação

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 16 | Redigir proposta personalizada | Comercial + Tech Lead | 📈 / Propostas / enviada | Cliente sinaliza interesse |
| 17 | Negociar cláusula de outcome | Comercial | 📈 / Propostas / em negociação | Cliente questiona definição |
| 18 | Negociar pricing (plataforma + outcome + cap + SLA) | Comercial + CEO | 📈 / Propostas / em negociação | Conforme conversa |
| 19 | Coletar assinatura digital | Comercial | 📈 / Propostas / em negociação | Acordo fechado |
| 20 | Coletar setup fee (R$ 8-25k) | Financeiro | 📈 / Propostas / assinada | Após assinatura |
| 21 | Criar Cliente no sistema | Tech Lead | 👥 / Clientes ativos / saudável | Setup fee pago |

### 5.4 — Fase: Setup técnico (Implantação)

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 22 | Reunião de kickoff com cliente | Tech Lead + cliente | 🛠️ / Setups / kickoff | Cliente nasceu |
| 23 | Coletar briefing institucional (DNA, ICP, glossário, tone) | Delivery | 🛠️ / Setups / briefing (sub-task) | Pós-kickoff |
| 24 | Mapear processo "agent-ready" (input → regras → output) | Tech Lead | 🛠️ / Setups / briefing (sub-task) | Briefing aprovado |
| 25 | Conectar canal de entrada (WhatsApp/email/webhook) | Delivery | 🛠️ / Setups / canal conectado | Briefing pronto |
| 26 | Capturar baseline cost humano | Delivery + cliente | 🛠️ / Setups / baseline capturado | Em paralelo |
| 27 | Aprovar tone of voice + prompts iniciais com cliente | Delivery + cliente | 🛠️ / Setups / prompts aprovados | Pré-shadow |
| 28 | Smoke test end-to-end | Delivery | 🛠️ / Setups / shadow ligado (sub-task) | Antes de ligar SHADOW |
| 29 | Ativar SHADOW no sistema | Tech Lead | 🛠️ / Setups / shadow ligado | Smoke test verde |

### 5.5 — Fase: SHADOW (calibração)

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 30 | Acompanhar primeiros outcomes diariamente (1ª semana) | Delivery | 🛠️ / SHADOWs / calibrando | Diariamente |
| 31 | Coletar 30+ outcomes em SHADOW | Delivery + sistema | 🛠️ / SHADOWs / calibrando | Conforme volume |
| 32 | Comparar decisão humana vs decisão do agente | Delivery | 🛠️ / SHADOWs / 30 outcomes coletados | Volume atingido |
| 33 | Calcular concordância e ajustar prompts | Tech Lead | 🛠️ / SHADOWs / análise concluída (sub-task) | Análise concluída |
| 34 | Validar unit economics real (custo ≤ 25% preço) | Tech Lead | 🛠️ / SHADOWs / análise concluída (sub-task) | Análise concluída |
| 35 | Solicitar promoção para ASSISTED | Tech Lead | 🚨 / Promoções / solicitada | Threshold atingido |
| 36 | CEO ou Tech Lead aprova promoção | CEO | 🚨 / Promoções / aprovada | Solicitação revisada |

### 5.6 — Fase: ASSISTED (gates humanos)

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 37 | Aprovar/rejeitar gates conforme outcomes chegam | Delivery | 🚨 / Gates / aguardando | Cada outcome |
| 38 | Anotar feedback estruturado em gate rejeitado | Delivery | 🚨 / Gates / rejeitado (descrição) | Rejeição |
| 39 | Análise semanal de taxa de aprovação | Tech Lead | 👥 / Clientes ativos / saudável (sub-task) | 1×/semana |
| 40 | Iterar prompts com base em feedback acumulado | Tech Lead | 🛠️ / ASSISTEDs / operando (sub-task) | Quinzenalmente |
| 41 | Validar threshold de promoção (90%+ aprovação) | Tech Lead | 🛠️ / ASSISTEDs / threshold atingido | Marco atingido |
| 42 | Solicitar promoção para AUTONOMOUS | Tech Lead | 🚨 / Promoções / solicitada | Threshold atingido |

### 5.7 — Fase: Operação contínua (AUTONOMOUS)

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 43 | Executar auditoria mensal (sample 5-10% outcomes) | Delivery | 🚨 / Auditorias / em revisão | Início de cada mês |
| 44 | Anexar relatório de auditoria à fatura do mês | Delivery | 🚨 / Auditorias / anexada à fatura | Auditoria pronta |
| 45 | Gerar fatura mensal (plataforma + outcomes - cap) | Financeiro | 👥 / Faturamento mensal / em curso → emitido | Início mês +1 |
| 46 | Verificar pagamento e cobrar inadimplência | Financeiro | 👥 / Faturamento mensal / pago ou inadimplente | Conforme prazo |
| 47 | Emitir NF e enviar relatório executivo | Financeiro + Tech Lead | 👥 / Faturamento mensal / pago (sub-task) | Pagamento confirmado |
| 48 | Atender incidentes P1/P2/P3 | Delivery | 🚨 / Incidentes / aberto → resolvido | Conforme aparece |
| 49 | Escrever post-mortem de P1/P2 | Tech Lead | 🚨 / Incidentes / postmortem | Após resolução |
| 50 | Drift detection mensal | Sistema | 🚨 / Incidentes / aberto (auto) | Cron mensal |

### 5.8 — Fase: Pós-venda / Relacionamento

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 51 | Check-in semanal nas primeiras 4 semanas pós-AUTONOMOUS | CEO Acme | 👥 / Relacionamento / próximo | Semanal |
| 52 | Check-in mensal recorrente | CEO Acme + cliente | 👥 / Relacionamento / próximo (recorrente) | 1×/mês |
| 53 | NPS trimestral | Comercial | 👥 / Relacionamento / próximo | Trimestralmente |
| 54 | QBR (Quarterly Business Review) | CEO Acme + CEO cliente | 👥 / Relacionamento / próximo | Trimestralmente |
| 55 | Identificar oportunidades de expansão | CEO Acme | 👥 / Expansões / identificada | Conforme conversa |

### 5.9 — Fase: Expansão (Wave 2+, upsell)

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 56 | Documentar oportunidade de Wave 2 (novo agente) | Tech Lead | 👥 / Expansões / identificada | Sinal do cliente |
| 57 | Preparar proposta de Wave (R$ 8-25k) | Comercial | 👥 / Expansões / proposta | Validado |
| 58 | Cliente assina Wave | Comercial | 👥 / Expansões / contratada | Aceitação |
| 59 | Delivery da Wave (mini-projeto 4-8 sem) | Delivery | 👥 / Expansões / em delivery | Pós-assinatura |
| 60 | Wave entregue, agente em produção | Tech Lead | 👥 / Expansões / concluída | Entrega validada |

### 5.10 — Fase: Renovação anual

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 61 | Trigger 90 dias antes do vencimento | Sistema | 👥 / Renovações / a vencer 90d | Auto |
| 62 | Conversa de renovação (escutar dores recentes) | CEO Acme | 👥 / Renovações / conversa iniciada | Após trigger |
| 63 | Preparar proposta de renovação (com ajustes) | Comercial | 👥 / Renovações / proposta enviada | Pós-conversa |
| 64 | Cliente assina renovação | Comercial | 👥 / Renovações / renovada | Aceitação |
| 65 | Cliente decide não renovar | Comercial | 👥 / Renovações / perdida | Recusa |

### 5.11 — Fase: Churn / Sunset

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 66 | Análise de causa do churn | Tech Lead + CEO Acme | 👥 / Pós-churn / encerrado (sub-task) | Cliente sinaliza saída |
| 67 | Conversa de retenção (última tentativa) | CEO Acme | 👥 / Pós-churn / encerrado (sub-task) | Antes de encerrar |
| 68 | Encerramento técnico (canal, dados, cobrança final) | Delivery + Financeiro | 👥 / Pós-churn / encerrado (sub-task) | Decisão final |
| 69 | Post-mortem público interno (lessons learned) | Tech Lead | 🧠 / Decisões e ADRs (em curso) | Pós-encerramento |

### 5.12 — Atividades transversais (Space 5)

| # | Atividade | Quem | Onde | Quando |
|---|---|---|---|---|
| 70 | Manter catálogo de SKUs atualizado | Tech Lead | 🧠 / Catálogo de SKUs | Conforme evolução |
| 71 | Tomar decisões estratégicas (D-N) | CEO + Tech Lead | 🧠 / Decisões e ADRs | Conforme demanda |
| 72 | Backlog técnico Forge / Ondas | Tech Lead | 🧠 / Backlog técnico | Planejamento |
| 73 | Onboarding de novo membro | Quem contratou | 🧠 / Time Acme | Contratação |
| 74 | Auditoria mensal DeepAgents | Reviewer externo | 🧠 / Auditoria DeepAgents | Cron mensal |

**Total**: ~74 atividades padrão cobrindo o ciclo completo do time. Não é exaustivo (incidentes específicos, conversas pontuais não estão), mas cobre as recorrentes.

---

## 6. Visão CEO: dashboards essenciais

Em vez de 1 cockpit gigante, **3 dashboards focados** — cada um responde uma pergunta única.

### 6.1 — Dashboard A: "Estamos vendendo?"

| Card | Métrica | Fonte |
|---|---|---|
| Pipeline | Leads por status (kanban) | 📈 / Leads |
| Diagnósticos no mês | Quantidade vendida | 📈 / Diagnósticos |
| Conversão Diagnóstico → Cliente | % de diagnósticos que viram cliente | 📈 / Propostas |
| MRR projetado | Soma plataforma + outcome cap dos clientes | 👥 / Clientes ativos |

### 6.2 — Dashboard B: "Está tudo bem com a operação?"

| Card | Métrica | Fonte |
|---|---|---|
| Gates pendentes agora | Lista atual ordenada por idade | 🚨 / Gates |
| Incidentes abertos P1/P2 | Lista priorizada | 🚨 / Incidentes |
| % SLA agregado do mês | Média de SLA por subscription | 🚨 / Auditorias |
| Clientes em risco | Lista filtrada por status "em risco" | 👥 / Clientes ativos |
| Promoções pendentes | Aguardando aprovação CEO | 🚨 / Promoções |

### 6.3 — Dashboard C: "Para onde estamos indo?"

| Card | Métrica | Fonte |
|---|---|---|
| Renovações próximas 90d | Lista | 👥 / Renovações |
| Expansões em curso | Lista | 👥 / Expansões |
| Churn projetado | Clientes em status "em risco" | 👥 / Clientes ativos |
| Catálogo de SKUs ativos | Tasks por status | 🧠 / Catálogo |
| NRR rolling 12m | Calculado a partir de Faturamento | 👥 / Faturamento |

---

## 7. Plano de implementação em 3 ondas

### Onda 1 — Estrutura mínima viável (1-2 dias)

**Objetivo**: ClickUp tem os 5 Spaces e listas vazias mas estruturalmente prontas.

Entregáveis:
- 5 Spaces criados com nomes acordados
- 23 listas (4-6 por Space) com paletas de status corretas
- Tags transversais (`ia-gerado`, `revisão-humana`, `aprovado`, `rejeitado`, `urgente`)
- 1 documento "Como navegar este ClickUp" fixado no Space 5

Sem custom fields, sem automações, sem dashboards.

**Critério de sucesso**: você e a CEO conseguem abrir o ClickUp e entender a estrutura sem precisar de explicação.

### Onda 2 — Atividades automáticas (3-5 dias)

**Objetivo**: as 74 atividades-padrão nascem automaticamente nos eventos certos.

Entregáveis:
- Templates de tasks por evento (lead novo, diagnóstico vendido, cliente nasce, setup completo, etc.)
- 6 sub-tasks padrão de Diagnóstico Fase 0
- 6 sub-tasks padrão de Setup técnico
- Hooks no backend que disparam criação (POST /admin/lead, /admin/diagnostic, /admin/subscription, etc.)
- Idempotência: re-execução não cria duplicado

**Critério**: cliente novo entra → 30 segundos depois, todas as 6 tasks de setup estão lá no ClickUp.

### Onda 3 — Dashboards e visão executiva (2-3 dias)

**Objetivo**: CEO consegue ver os 3 dashboards em 5 minutos por dia.

Entregáveis:
- Dashboard A, B, C configurados
- 4 views salvas para CEO ("Tudo que precisa de mim", "Promoções pendentes", "Incidentes P1/P2", "Renovações 90d")
- Notificações push para CEO em eventos críticos (P1, promoção solicitada, breach SLA)
- Relatório semanal automático em comentário fixo (Space 5)

**Critério**: CEO abre dashboard B e em 30 segundos sabe se hoje precisa intervir em algo.

---

## 8. O que NÃO está aqui (decisões intencionais)

| Item | Por quê não |
|---|---|
| Pasta-por-cliente | Anti-padrão operacional. Use lista única de Clientes com vínculo a outras entidades por relacionamento. |
| Custom fields complexos no Onda 1 | Inflam o setup sem ROI imediato. Adicionados na Onda 2/3 conforme demanda real. |
| Permissões granulares por Space | Time inteiro tem acesso. Cliente final nunca acessa. Granularidade vira problema com 10+ pessoas. |
| Spaces para cliente final | Premissa ADR-003: cliente nunca loga no ClickUp da Acme. |
| Automações nativas ClickUp | Toda lógica de criação fica no backend, auditável e versionada. ClickUp é só interface visual. |
| Migração do PMO clássico | Sunset programado em 90 dias com comunicação aos clientes legados (D3 da Onda 0). |
| Substituir Forge ou a metodologia operacional | Este documento implementa essas metodologias, não as substitui. |

---

## 9. Anti-padrões aprendidos com a tentativa anterior

A versão anterior (`acme-governanca-ia/docs/clickup-blueprint.md` + scripts) cresceu antes de termos clareza do ciclo. Lições:

1. **Não criar 17 paletas de status antes de testar com cliente real.** A API ClickUp não aplicou várias delas — o gap só foi descoberto em produção. **Lição**: começar com 2-3 paletas universais (`open / in-progress / done` + variantes), customizar depois.

2. **Não criar tabela `ClickUpEntity` no DB para mapeamento antes de saber quantos mapeamentos vão existir.** A tabela cresceu para 50+ logical keys; idempotência ficou correta mas a complexidade de mantê-la não compensa para 3-5 clientes. **Lição**: nas ondas 1 e 2, ClickUp + DB acoplam por chamada de API direta com retry. Tabela de mapeamento só na onda 3 quando volume justificar.

3. **Não tentar custom fields ricos e dashboards na primeira semana.** Time tem que **usar** primeiro, depois pedir o que falta.

4. **Não escrever templates de task com markdown gigante.** Cada task com 200 linhas de descrição vira ruído. Manter task concisa (5-15 linhas), com link pro doc maior se precisar.

5. **Não declarar status com acentos ou case-sensitive complexo.** `to do` / `in progress` / `done` lowercase é mais robusto. Status semântico vira tag, não status.

6. **Não construir bootstrap idempotente complexo antes de bootstrap funcionar.** Build forward, idempotente depois.

7. **Não acoplar ClickUp ao schema do banco.** O ClickUp reflete a **jornada**, não o **schema**. Subscription no banco vira task em Clientes ativos, não vira `Subscription` task isolada.

---

## 10. Glossário de negócio

| Termo | Significado |
|---|---|
| **Outcome** | Resultado entregue pelo agente que vira faturamento variável (ex: 1 lead qualificado = 1 outcome). Específico de `agentic_saas`. |
| **Outcome operacional** | Termo genérico para `platform`/`automation`: resultado verificável da operação (ex: módulo aceito por usuário interno, comparação legado×nova fechada com erro <X%, smoke test passando em produção). Não vira faturamento por evento — vira gate de promoção. |
| **delivery_type** | Classificação da entrega: `agentic_saas`, `platform`, `automation` ou `hybrid`. Define lifecycle, listas, atividades e artefatos obrigatórios. |
| **SHADOW** | (`agentic_saas`) Modo de operação em que o agente roda mas não materializa output para o cliente. Calibração. |
| **ASSISTED** | (`agentic_saas`) Modo em que cada outcome do agente passa por aprovação humana antes de ir ao cliente. |
| **AUTONOMOUS** | (`agentic_saas`) Modo em que o agente entrega outcomes diretamente; humano audita amostra. |
| **DRAFT/STAGING/PILOT/CANONICAL/DEPRECATED** | (`platform`) Lifecycle de plataforma operacional. PILOT antes de virar CANONICAL é o equivalente a SHADOW antes de cobrar do `agentic_saas`. |
| **PILOT antes de virar fonte canônica** | (`platform`) Regra: nenhum módulo é promovido a CANONICAL sem rodar piloto contra usuários reais e ter aceite humano formal. |
| **Aceite operacional** | (`platform`/`automation`) Registro humano de que o módulo cumpre os critérios de aceite contratuais. Requisito para promover PILOT → CANONICAL. |
| **ai_enabled** | Flag booleano em qualquer `delivery_type` que indica que aquele módulo/bloco usa IA por dentro. Quando `true`, exige prompts versionados, eval suite e observabilidade de inferência **mesmo se** o `delivery_type` for `platform` ou `automation`. |
| **Setup fee** | Pagamento único cobrado no início para cobrir CAC operacional (R$ 8-25k). |
| **Cap mensal** | Teto da fatura variável combinado contratualmente — segurança para o cliente. |
| **SLA threshold** | % mínimo de acurácia/qualidade abaixo do qual cliente não paga o variável do mês. |
| **Wave** | Engajamento comercial discreto que adiciona um agente novo a uma Subscription existente (R$ 8-25k cada). |
| **Diagnóstico Fase 0** | Produto pago de entrada (R$ 5-10k) que identifica processos automatizáveis e propõe SaaS². |
| **NRR** | Net Revenue Retention. Para SaaS² saudável > 120% (expansão > churn). |
| **QBR** | Quarterly Business Review com cliente — revisão estratégica trimestral. |
| **Drift** | Degradação silenciosa de qualidade do agente ao longo do tempo. |
| **Postmortem** | Análise estruturada após incidente para evitar recorrência. |
| **Reviewer DeepAgents** | Auditor externo (GPT-5.5) que valida princípios da Constitution mensalmente. |

---

## 11. Próximas decisões (para você + CEO)

Antes de implementar, decidir juntos:

| # | Decisão | Opções | Quem decide |
|---|---|---|---|
| 1 | Aprovar este plano ou ajustar antes da Onda 1 | Aprovar / ajustar / rejeitar | Você + CEO |
| 2 | Quem opera no ClickUp diariamente | Só você + CEO / + 1 delivery / + comercial | CEO |
| 3 | Confirmar Diagnóstico Fase 0 = porta de entrada paga | Sim (R$ ____) / Não / Outro modelo | CEO |
| 4 | Quem é o "Time Acme" inicialmente | Lista de pessoas com role | CEO |
| 5 | Cliente piloto entra por qual via | Diagnóstico Fase 0 pago / Diagnóstico grátis (design partner) / pula direto | CEO |
| 6 | Cadência de revisão deste documento | Mensal / Trimestral / Por demanda | Você |

---

## 12. Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-05-01 | Versão inicial — substitui `clickup-blueprint.md` do projeto anterior |
| 0.2 | 2026-05-08 | Multi-delivery: introduz `delivery_type` (`agentic_saas` / `platform` / `automation` / `hybrid`), lifecycle DRAFT→STAGING→PILOT→CANONICAL→DEPRECATED para `platform`, listas neutras `Rollouts em andamento`, `Pilotos ativos`, `Fontes canônicas`, `Aceites operacionais`. Condiciona SHADOW/ASSISTED/AUTONOMOUS a `agentic_saas`. |
