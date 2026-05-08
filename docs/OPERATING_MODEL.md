# Modelo operacional - ClickUp Acme

Este documento e gerado a partir de `config/activity-catalog.json` e `config/diagnostic-output-contract.json`.

## Regras operacionais aplicadas

- Uma entidade vive em uma unica lista.
- Atividade pertence ao ponto da jornada onde o trabalho acontece.
- Artefato nasce da atividade que o produz.
- Diagnostico aprovado gera proposta, setup e backlog de delivery correspondentes.
- Atividades especificas de agentic_saas (SHADOW/ASSISTED/AUTONOMOUS, prompts, unit economics de inferencia) so sao obrigatorias quando delivery_type=agentic_saas ou ai_enabled=true.
- Atividades de platform (rollout, smoke, piloto, aceite, promocao para CANONICAL) so sao obrigatorias quando delivery_type=platform ou hybrid com bloco platform.

## Tipos de entrega (delivery_type)

Suportados: `agentic_saas`, `platform`, `automation`, `hybrid`.

- `any`: Atividade aplicavel a qualquer delivery_type. Ex: lead novo, qualificacao BANT, faturamento mensal, relacionamento, churn.
- `agentic_saas`: Atividade especifica de SaaS2 com agente. Inclui prompts, evals, SHADOW/ASSISTED/AUTONOMOUS, unit economics de inferencia, LLM-as-judge.
- `platform`: Atividade especifica de plataforma multi-modulo. Inclui rollout, smoke test, piloto com usuario interno, comparacao legado vs nova, aceite humano e promocao para CANONICAL.
- `automation`: Atividade especifica de automacao pontual. Sem fases de promocao. Critico: rodar com dados reais 1x e registrar evidencia.
- `hybrid`: Atividade que pode ocorrer em entrega hibrida; cada bloco usa atividades do seu delivery_type.

## Atividades por Space

## 01 Pipeline Comercial

| # | Delivery type | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|---|
| 1 | `any` | Pre-venda / Captacao | Identificacao de lead | Comercial | 01 Pipeline Comercial / Leads | novo |  |
| 2 | `any` | Pre-venda / Captacao | Primeira conversa de descoberta | Comercial | 01 Pipeline Comercial / Leads | conversa |  |
| 3 | `any` | Pre-venda / Captacao | Qualificacao BANT | Comercial | 01 Pipeline Comercial / Leads | conversa |  |
| 4 | `any` | Pre-venda / Captacao | Decisao: vender Diagnostico ou descartar | Comercial + CEO | 01 Pipeline Comercial / Leads | qualificado |  |
| 5 | `any` | Pre-venda / Captacao | Apresentar pitch do Diagnostico Fase 0 | Comercial | 01 Pipeline Comercial / Leads | qualificado |  |
| 6 | `any` | Pre-venda / Captacao | Negociar fee do Diagnostico | Comercial | 01 Pipeline Comercial / Leads | qualificado |  |
| 7 | `any` | Pre-venda / Captacao | Cliente assina e paga Diagnostico | Comercial + Financeiro | 01 Pipeline Comercial / Diagnosticos Fase 0 | vendido | comprovante_pagamento |
| 8 | `any` | Diagnostico Fase 0 | Sessao estruturada 90min com CEO | Tech Lead + CEO Acme | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | ceo_session_notes |
| 9 | `any` | Diagnostico Fase 0 | Entrevistas 30min com 2-3 pessoas-chave | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | stakeholder_interview_notes |
| 10 | `any` | Diagnostico Fase 0 | Auditoria express dados/ferramentas | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | data_tooling_audit |
| 11 | `agentic_saas` | Diagnostico Fase 0 | Analise: 3 candidatos + criterios SaaS2 | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | automation_candidate_matrix |
| 12 | `agentic_saas` | Diagnostico Fase 0 | Calculo unit economics de inferencia por candidato | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | unit_economics_model |
| 13 | `any` | Diagnostico Fase 0 | Redacao do relatorio 5-10pp PDF | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | diagnostic_report_pdf |
| 14 | `any` | Diagnostico Fase 0 | Sessao de devolucao 1h | Tech Lead + CEO Acme + cliente | 01 Pipeline Comercial / Diagnosticos Fase 0 | entregue | playback_notes |
| 15 | `any` | Diagnostico Fase 0 | Aguardar decisao do cliente | Comercial | 01 Pipeline Comercial / Diagnosticos Fase 0 | aguardando decisao |  |
| 16 | `any` | Contratacao | Redigir proposta personalizada | Comercial + Tech Lead | 01 Pipeline Comercial / Propostas | enviada | proposal_doc |
| 17 | `agentic_saas` | Contratacao | Negociar clausula de outcome | Comercial | 01 Pipeline Comercial / Propostas | em negociacao |  |
| 18 | `agentic_saas` | Contratacao | Negociar pricing plataforma + outcome + cap + SLA | Comercial + CEO | 01 Pipeline Comercial / Propostas | em negociacao |  |
| 18.1 | `platform` | Contratacao | Negociar pricing de plataforma (assinatura mensal + setup fee + escopo de modulos) | Comercial + CEO | 01 Pipeline Comercial / Propostas | em negociacao |  |
| 19 | `any` | Contratacao | Coletar assinatura digital | Comercial | 01 Pipeline Comercial / Propostas | em negociacao | signed_contract |
| 20 | `any` | Contratacao | Coletar setup fee | Financeiro | 01 Pipeline Comercial / Propostas | assinada | setup_fee_receipt |

## 03 Clientes

| # | Delivery type | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|---|
| 21 | `any` | Contratacao | Criar Cliente no sistema | Tech Lead | 03 Clientes / Clientes ativos | saudavel |  |
| 39 | `agentic_saas` | ASSISTED | Analise semanal de taxa de aprovacao | Tech Lead | 03 Clientes / Clientes ativos | saudavel | weekly_approval_rate |
| 45 | `any` | Operacao continua | Gerar fatura mensal | Financeiro | 03 Clientes / Faturamento mensal | em curso | monthly_invoice |
| 46 | `any` | Operacao continua | Verificar pagamento e cobrar inadimplencia | Financeiro | 03 Clientes / Faturamento mensal | pago |  |
| 47 | `any` | Operacao continua | Emitir NF e enviar relatorio executivo | Financeiro + Tech Lead | 03 Clientes / Faturamento mensal | pago | executive_monthly_report |
| 51 | `any` | Pos-venda / Relacionamento | Check-in semanal nas primeiras 4 semanas pos-go-live | CEO Acme | 03 Clientes / Relacionamento | proximo |  |
| 52 | `any` | Pos-venda / Relacionamento | Check-in mensal recorrente | CEO Acme + cliente | 03 Clientes / Relacionamento | proximo |  |
| 53 | `any` | Pos-venda / Relacionamento | NPS trimestral | Comercial | 03 Clientes / Relacionamento | proximo | nps_response |
| 54 | `any` | Pos-venda / Relacionamento | QBR | CEO Acme + CEO cliente | 03 Clientes / Relacionamento | proximo | qbr_deck |
| 55 | `any` | Pos-venda / Relacionamento | Identificar oportunidades de expansao | CEO Acme | 03 Clientes / Expansoes | identificada |  |
| 56 | `any` | Expansao | Documentar oportunidade de expansao (Wave/modulo) | Tech Lead | 03 Clientes / Expansoes | identificada | wave_opportunity_note |
| 57 | `any` | Expansao | Preparar proposta de expansao | Comercial | 03 Clientes / Expansoes | proposta | wave_proposal |
| 58 | `any` | Expansao | Cliente assina expansao | Comercial | 03 Clientes / Expansoes | contratada | wave_signed_contract |
| 59 | `any` | Expansao | Delivery da expansao | Delivery | 03 Clientes / Expansoes | em delivery |  |
| 60 | `any` | Expansao | Expansao entregue, em producao | Tech Lead | 03 Clientes / Expansoes | concluida |  |
| 61 | `any` | Renovacao anual | Trigger 90 dias antes do vencimento | Sistema | 03 Clientes / Renovacoes | a vencer 90d |  |
| 62 | `any` | Renovacao anual | Conversa de renovacao | CEO Acme | 03 Clientes / Renovacoes | conversa iniciada |  |
| 63 | `any` | Renovacao anual | Preparar proposta de renovacao | Comercial | 03 Clientes / Renovacoes | proposta enviada | renewal_proposal |
| 64 | `any` | Renovacao anual | Cliente assina renovacao | Comercial | 03 Clientes / Renovacoes | renovada | renewal_signed_contract |
| 65 | `any` | Renovacao anual | Cliente decide nao renovar | Comercial | 03 Clientes / Renovacoes | perdida |  |
| 66 | `any` | Churn / Sunset | Analise de causa do churn | Tech Lead + CEO Acme | 03 Clientes / Pos-churn | encerrado | churn_cause_analysis |
| 67 | `any` | Churn / Sunset | Conversa de retencao | CEO Acme | 03 Clientes / Pos-churn | retencao tentada |  |
| 68 | `any` | Churn / Sunset | Encerramento tecnico | Delivery + Financeiro | 03 Clientes / Pos-churn | fechado | technical_sunset_checklist |
| 120 | `platform` | Operacao canonical | Promover modulo para CANONICAL e desligar legado paralelo | Tech Lead | 03 Clientes / Fontes canonicas | canonical | canonical_cutover_note |
| 123 | `platform` | Operacao canonical | Depreciar modulo (CANONICAL -> DEPRECATED) | Tech Lead | 03 Clientes / Fontes canonicas | depreciado | deprecation_note |

## 02 Implantacao

| # | Delivery type | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|---|
| 22 | `any` | Setup tecnico | Reuniao de kickoff com cliente | Tech Lead + cliente | 02 Implantacao / Setups em andamento | kickoff | kickoff_notes |
| 23 | `any` | Setup tecnico | Coletar briefing institucional | Delivery | 02 Implantacao / Setups em andamento | briefing | institutional_briefing |
| 24 | `agentic_saas` | Setup tecnico | Mapear processo agent-ready | Tech Lead | 02 Implantacao / Setups em andamento | briefing | agent_ready_process_map |
| 25 | `agentic_saas` | Setup tecnico | Conectar canal de entrada | Delivery | 02 Implantacao / Setups em andamento | canal conectado |  |
| 26 | `agentic_saas` | Setup tecnico | Capturar baseline cost humano | Delivery + cliente | 02 Implantacao / Setups em andamento | baseline capturado | human_cost_baseline |
| 27 | `agentic_saas` | Setup tecnico | Aprovar tone of voice + prompts iniciais | Delivery + cliente | 02 Implantacao / Setups em andamento | prompts aprovados | prompt_pack_v1 |
| 28 | `any` | Setup tecnico | Smoke test end-to-end | Delivery | 02 Implantacao / Setups em andamento | shadow ligado | smoke_test_evidence |
| 29 | `agentic_saas` | Setup tecnico | Ativar SHADOW no sistema | Tech Lead | 02 Implantacao / Setups em andamento | shadow ligado |  |
| 30 | `agentic_saas` | SHADOW | Acompanhar primeiros outcomes diariamente | Delivery | 02 Implantacao / SHADOWs ativos | calibrando |  |
| 31 | `agentic_saas` | SHADOW | Coletar 30+ outcomes em SHADOW | Delivery + sistema | 02 Implantacao / SHADOWs ativos | calibrando | shadow_outcome_sample |
| 32 | `agentic_saas` | SHADOW | Comparar decisao humana vs decisao do agente | Delivery | 02 Implantacao / SHADOWs ativos | 30 outcomes coletados | human_agent_comparison |
| 33 | `agentic_saas` | SHADOW | Calcular concordancia e ajustar prompts | Tech Lead | 02 Implantacao / SHADOWs ativos | analise concluida | concordance_report |
| 34 | `agentic_saas` | SHADOW | Validar unit economics real de inferencia | Tech Lead | 02 Implantacao / SHADOWs ativos | analise concluida | real_unit_economics |
| 40 | `agentic_saas` | ASSISTED | Iterar prompts com base em feedback acumulado | Tech Lead | 02 Implantacao / ASSISTEDs ativos | operando | prompt_iteration_notes |
| 41 | `agentic_saas` | ASSISTED | Validar threshold de promocao 90%+ | Tech Lead | 02 Implantacao / ASSISTEDs ativos | threshold atingido |  |
| 100 | `platform` | Rollout de plataforma | Provisionar ambiente para a plataforma | Delivery + Tech Lead | 02 Implantacao / Rollouts em andamento | ambiente provisionado | environment_provisioning_evidence |
| 101 | `platform` | Rollout de plataforma | Rodar migrations e seed inicial | Delivery | 02 Implantacao / Rollouts em andamento | ambiente provisionado | migrations_evidence |
| 102 | `platform` | Rollout de plataforma | Rodar smoke test tecnico do modulo | Delivery | 02 Implantacao / Rollouts em andamento | smoke test verde | module_smoke_test_evidence |
| 103 | `platform` | Rollout de plataforma | Configurar observabilidade de plataforma | Delivery | 02 Implantacao / Rollouts em andamento | smoke test verde | platform_observability_setup |
| 105 | `platform` | Rollout de plataforma | Promover modulo para STAGING | Tech Lead | 02 Implantacao / Rollouts em andamento | staging | staging_promotion_note |
| 110 | `platform` | Piloto operacional | Abrir piloto com usuario interno do cliente | Delivery + cliente | 02 Implantacao / Pilotos ativos | piloto aberto | pilot_open_note |
| 111 | `platform` | Piloto operacional | Comparar dados legado vs plataforma | Delivery | 02 Implantacao / Pilotos ativos | comparando legado vs nova | legacy_vs_new_comparison |
| 112 | `platform` | Piloto operacional | Coletar feedback estruturado de usuarios | Delivery | 02 Implantacao / Pilotos ativos | comparando legado vs nova | user_pilot_feedback |

## 04 Saude Operacional

| # | Delivery type | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|---|
| 35 | `agentic_saas` | SHADOW | Solicitar promocao para ASSISTED | Tech Lead | 04 Saude Operacional / Promocoes de modo | solicitada |  |
| 36 | `agentic_saas` | SHADOW | CEO ou Tech Lead aprova promocao | CEO | 04 Saude Operacional / Promocoes de modo | aprovada |  |
| 37 | `agentic_saas` | ASSISTED | Aprovar/rejeitar gates conforme outcomes chegam | Delivery | 04 Saude Operacional / Gates pendentes | aguardando |  |
| 38 | `agentic_saas` | ASSISTED | Anotar feedback estruturado em gate rejeitado | Delivery | 04 Saude Operacional / Gates pendentes | rejeitado | gate_feedback |
| 42 | `agentic_saas` | ASSISTED | Solicitar promocao para AUTONOMOUS | Tech Lead | 04 Saude Operacional / Promocoes de modo | solicitada |  |
| 43 | `agentic_saas` | Operacao continua | Executar auditoria mensal LLM-as-judge + amostra humana | Delivery | 04 Saude Operacional / Auditorias mensais | em revisao | monthly_audit_report |
| 44 | `agentic_saas` | Operacao continua | Anexar relatorio de auditoria a fatura | Delivery | 04 Saude Operacional / Auditorias mensais | anexada a fatura |  |
| 48 | `any` | Operacao continua | Atender incidentes P1/P2/P3 | Delivery | 04 Saude Operacional / Incidentes | aberto |  |
| 49 | `any` | Operacao continua | Escrever post-mortem de P1/P2 | Tech Lead | 04 Saude Operacional / Incidentes | postmortem | incident_postmortem |
| 50 | `agentic_saas` | Operacao continua | Drift detection mensal do agente | Sistema | 04 Saude Operacional / Incidentes | aberto | drift_detection_report |
| 104 | `platform` | Rollout de plataforma | Validar criterios de aceite operacional | Tech Lead + cliente | 04 Saude Operacional / Aceites operacionais | em revisao | operational_acceptance_criteria |
| 113 | `platform` | Piloto operacional | Registrar aceite humano operacional | Cliente + Tech Lead | 04 Saude Operacional / Aceites operacionais | aprovado | human_operational_signoff |
| 114 | `platform` | Piloto operacional | Solicitar promocao PILOT -> CANONICAL | Tech Lead | 04 Saude Operacional / Promocoes de modo | solicitada | canonical_promotion_request |
| 115 | `platform` | Piloto operacional | CEO ou Tech Lead aprova promocao para CANONICAL | CEO + Tech Lead | 04 Saude Operacional / Promocoes de modo | aprovada | canonical_promotion_decision |
| 121 | `platform` | Operacao canonical | Monitorar incidentes pos-canonical | Delivery | 04 Saude Operacional / Incidentes | aberto | incident_postmortem |
| 122 | `platform` | Operacao canonical | Auditoria operacional mensal (consistencia canonical x legado quando ainda houver leitura paralela) | Delivery | 04 Saude Operacional / Auditorias mensais | em revisao | operational_consistency_report |

## 05 Institucional Acme

| # | Delivery type | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|---|
| 69 | `any` | Churn / Sunset | Post-mortem publico interno | Tech Lead | 05 Institucional Acme / Decisoes e ADRs | em curso | internal_lessons_learned |
| 70 | `any` | Transversal | Manter catalogo de SKUs atualizado | Tech Lead | 05 Institucional Acme / Catalogo de SKUs | dev |  |
| 71 | `any` | Transversal | Tomar decisoes estrategicas | CEO + Tech Lead | 05 Institucional Acme / Decisoes e ADRs | em curso | adr |
| 72 | `any` | Transversal | Backlog tecnico Forge / Ondas | Tech Lead | 05 Institucional Acme / Backlog tecnico | em curso |  |
| 73 | `any` | Transversal | Onboarding de novo membro | Quem contratou | 05 Institucional Acme / Time Acme | onboarding |  |
| 74 | `agentic_saas` | Transversal | Auditoria mensal DeepAgents | Reviewer externo | 05 Institucional Acme / Auditoria DeepAgents | em curso | deepagents_review |

## Contrato de saida do Diagnostico Fase 0

Evento: `diagnostic_completed`

Campos obrigatorios:
- `company_name`
- `diagnostic_task_id`
- `selected_candidate.name`
- `selected_candidate.outcome_definition`
- `selected_candidate.sku`
- `selected_candidate.delivery_type`
- `selected_candidate.technical_platforms`
- `decision`

## Exigencias do diagnostico por delivery_type

### `agentic_saas`

Required: `input_channel`, `human_cost_baseline`, `estimated_agent_cost`, `price_per_outcome`, `monthly_cap`, `sla_threshold`, `recommended_agentic_mode`
Forbidden: `recommended_platform_stage`
Notas: Exige unit economics de inferencia, prompts versionados e plano SHADOW/ASSISTED.

### `platform`

Required: `platform_subscription_fee`, `recommended_platform_stage`
Forbidden: `price_per_outcome`, `monthly_cap`, `recommended_agentic_mode`
Notas: Exige criterios de aceite operacional, smoke test por modulo e plano DRAFT/STAGING/PILOT.

### `automation`

Required: nenhum extra.
Forbidden: `price_per_outcome`, `monthly_cap`, `recommended_agentic_mode`, `recommended_platform_stage`
Notas: Entrega pontual; sem fases formais de promocao.

### `hybrid`

Required: nenhum extra.
Forbidden: nenhum.
Notas: Cada bloco interno declara o proprio delivery_type; exigencias seguem o bloco.

## Regras de geracao pos-diagnostico

### decision=approved_for_proposal AND delivery_type=agentic_saas

Criar:
- Propostas / Proposta enviada
- Catalogo de SKUs / SKU em dev se SKU ainda nao existir
- Backlog tecnico / tarefas tech por plataforma identificada

Artefatos:
- proposal_doc
- unit_economics_model
- diagnostic_report_pdf

### decision=approved_for_proposal AND delivery_type=platform

Criar:
- Propostas / Proposta enviada
- Catalogo de SKUs / SKU em dev se SKU ainda nao existir
- Backlog tecnico / tarefas tech por modulo de plataforma

Artefatos:
- proposal_doc
- platform_pricing_model
- diagnostic_report_pdf
- operational_acceptance_criteria_template

### decision=approved_for_proposal AND delivery_type=automation

Criar:
- Propostas / Proposta enviada
- Backlog tecnico / tarefa de automacao pontual

Artefatos:
- proposal_doc
- diagnostic_report_pdf

### proposal.status=assinada

Criar:
- Clientes ativos / Cliente saudavel
- Setups em andamento / Setup tecnico iniciado

Artefatos:
- signed_contract
- setup_fee_receipt
- institutional_briefing

### setup.status=shadow ligado AND delivery_type=agentic_saas

Criar:
- SHADOWs ativos / SHADOW ativo
- Auditorias mensais / Auditoria agendada se cliente ja estiver em operacao

Artefatos:
- prompt_pack_v1
- smoke_test_evidence

### setup.status=staging pronto AND delivery_type=platform

Criar:
- Rollouts em andamento / Rollout em STAGING
- Aceites operacionais / Aceite aguardando antes de abrir piloto

Artefatos:
- module_smoke_test_evidence
- operational_acceptance_criteria

### rollout.status=promovido para piloto AND delivery_type=platform

Criar:
- Pilotos ativos / Piloto aberto
- Auditorias mensais / Auditoria operacional agendada

Artefatos:
- pilot_open_note
- legacy_vs_new_comparison

### pilot.aceite=aprovado AND delivery_type=platform

Criar:
- Promocoes de modo / Promocao PILOT->CANONICAL solicitada

Artefatos:
- human_operational_signoff
- canonical_promotion_request

### promotion.canonical=aprovada AND delivery_type=platform

Criar:
- Fontes canonicas / Modulo CANONICAL

Artefatos:
- canonical_cutover_note
