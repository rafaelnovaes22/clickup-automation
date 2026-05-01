# Modelo operacional - ClickUp Acme

Este documento e gerado a partir de `config/activity-catalog.json` e `config/diagnostic-output-contract.json`.

## Regras operacionais aplicadas

- Uma entidade vive em uma unica lista.
- Atividade pertence ao ponto da jornada onde o trabalho acontece.
- Artefato nasce da atividade que o produz.
- Diagnostico aprovado gera proposta, setup e backlog de delivery correspondentes.

## Atividades por Space

## 01 Pipeline Comercial

| # | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|
| 1 | Pre-venda / Captacao | Identificacao de lead | Comercial | 01 Pipeline Comercial / Leads | novo |  |
| 2 | Pre-venda / Captacao | Primeira conversa de descoberta | Comercial | 01 Pipeline Comercial / Leads | conversa |  |
| 3 | Pre-venda / Captacao | Qualificacao BANT | Comercial | 01 Pipeline Comercial / Leads | conversa |  |
| 4 | Pre-venda / Captacao | Decisao: vender Diagnostico ou descartar | Comercial + CEO | 01 Pipeline Comercial / Leads | qualificado |  |
| 5 | Pre-venda / Captacao | Apresentar pitch do Diagnostico Fase 0 | Comercial | 01 Pipeline Comercial / Leads | qualificado |  |
| 6 | Pre-venda / Captacao | Negociar fee do Diagnostico | Comercial | 01 Pipeline Comercial / Leads | qualificado |  |
| 7 | Pre-venda / Captacao | Cliente assina e paga Diagnostico | Comercial + Financeiro | 01 Pipeline Comercial / Diagnosticos Fase 0 | vendido | comprovante_pagamento |
| 8 | Diagnostico Fase 0 | Sessao estruturada 90min com CEO | Tech Lead + CEO Acme | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | ceo_session_notes |
| 9 | Diagnostico Fase 0 | Entrevistas 30min com 2-3 pessoas-chave | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | stakeholder_interview_notes |
| 10 | Diagnostico Fase 0 | Auditoria express dados/ferramentas | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | data_tooling_audit |
| 11 | Diagnostico Fase 0 | Analise: 3 candidatos + criterios SaaS2 | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | automation_candidate_matrix |
| 12 | Diagnostico Fase 0 | Calculo unit economics por candidato | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | unit_economics_model |
| 13 | Diagnostico Fase 0 | Redacao do relatorio 5-10pp PDF | Tech Lead | 01 Pipeline Comercial / Diagnosticos Fase 0 | em execucao | diagnostic_report_pdf |
| 14 | Diagnostico Fase 0 | Sessao de devolucao 1h | Tech Lead + CEO Acme + cliente | 01 Pipeline Comercial / Diagnosticos Fase 0 | entregue | playback_notes |
| 15 | Diagnostico Fase 0 | Aguardar decisao do cliente | Comercial | 01 Pipeline Comercial / Diagnosticos Fase 0 | aguardando decisao |  |
| 16 | Contratacao | Redigir proposta personalizada | Comercial + Tech Lead | 01 Pipeline Comercial / Propostas | enviada | proposal_doc |
| 17 | Contratacao | Negociar clausula de outcome | Comercial | 01 Pipeline Comercial / Propostas | em negociacao |  |
| 18 | Contratacao | Negociar pricing plataforma + outcome + cap + SLA | Comercial + CEO | 01 Pipeline Comercial / Propostas | em negociacao |  |
| 19 | Contratacao | Coletar assinatura digital | Comercial | 01 Pipeline Comercial / Propostas | em negociacao | signed_contract |
| 20 | Contratacao | Coletar setup fee | Financeiro | 01 Pipeline Comercial / Propostas | assinada | setup_fee_receipt |

## 03 Clientes

| # | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|
| 21 | Contratacao | Criar Cliente no sistema | Tech Lead | 03 Clientes / Clientes ativos | saudavel |  |
| 39 | ASSISTED | Analise semanal de taxa de aprovacao | Tech Lead | 03 Clientes / Clientes ativos | saudavel | weekly_approval_rate |
| 45 | Operacao continua | Gerar fatura mensal | Financeiro | 03 Clientes / Faturamento mensal | em curso | monthly_invoice |
| 46 | Operacao continua | Verificar pagamento e cobrar inadimplencia | Financeiro | 03 Clientes / Faturamento mensal | pago |  |
| 47 | Operacao continua | Emitir NF e enviar relatorio executivo | Financeiro + Tech Lead | 03 Clientes / Faturamento mensal | pago | executive_monthly_report |
| 51 | Pos-venda / Relacionamento | Check-in semanal nas primeiras 4 semanas pos-AUTONOMOUS | CEO Acme | 03 Clientes / Relacionamento | proximo |  |
| 52 | Pos-venda / Relacionamento | Check-in mensal recorrente | CEO Acme + cliente | 03 Clientes / Relacionamento | proximo |  |
| 53 | Pos-venda / Relacionamento | NPS trimestral | Comercial | 03 Clientes / Relacionamento | proximo | nps_response |
| 54 | Pos-venda / Relacionamento | QBR | CEO Acme + CEO cliente | 03 Clientes / Relacionamento | proximo | qbr_deck |
| 55 | Pos-venda / Relacionamento | Identificar oportunidades de expansao | CEO Acme | 03 Clientes / Expansoes | identificada |  |
| 56 | Expansao | Documentar oportunidade de Wave 2 | Tech Lead | 03 Clientes / Expansoes | identificada | wave_opportunity_note |
| 57 | Expansao | Preparar proposta de Wave | Comercial | 03 Clientes / Expansoes | proposta | wave_proposal |
| 58 | Expansao | Cliente assina Wave | Comercial | 03 Clientes / Expansoes | contratada | wave_signed_contract |
| 59 | Expansao | Delivery da Wave | Delivery | 03 Clientes / Expansoes | em delivery |  |
| 60 | Expansao | Wave entregue, agente em producao | Tech Lead | 03 Clientes / Expansoes | concluida |  |
| 61 | Renovacao anual | Trigger 90 dias antes do vencimento | Sistema | 03 Clientes / Renovacoes | a vencer 90d |  |
| 62 | Renovacao anual | Conversa de renovacao | CEO Acme | 03 Clientes / Renovacoes | conversa iniciada |  |
| 63 | Renovacao anual | Preparar proposta de renovacao | Comercial | 03 Clientes / Renovacoes | proposta enviada | renewal_proposal |
| 64 | Renovacao anual | Cliente assina renovacao | Comercial | 03 Clientes / Renovacoes | renovada | renewal_signed_contract |
| 65 | Renovacao anual | Cliente decide nao renovar | Comercial | 03 Clientes / Renovacoes | perdida |  |
| 66 | Churn / Sunset | Analise de causa do churn | Tech Lead + CEO Acme | 03 Clientes / Pos-churn | encerrado | churn_cause_analysis |
| 67 | Churn / Sunset | Conversa de retencao | CEO Acme | 03 Clientes / Pos-churn | retencao tentada |  |
| 68 | Churn / Sunset | Encerramento tecnico | Delivery + Financeiro | 03 Clientes / Pos-churn | fechado | technical_sunset_checklist |

## 02 Implantacao

| # | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|
| 22 | Setup tecnico | Reuniao de kickoff com cliente | Tech Lead + cliente | 02 Implantacao / Setups em andamento | kickoff | kickoff_notes |
| 23 | Setup tecnico | Coletar briefing institucional | Delivery | 02 Implantacao / Setups em andamento | briefing | institutional_briefing |
| 24 | Setup tecnico | Mapear processo agent-ready | Tech Lead | 02 Implantacao / Setups em andamento | briefing | agent_ready_process_map |
| 25 | Setup tecnico | Conectar canal de entrada | Delivery | 02 Implantacao / Setups em andamento | canal conectado |  |
| 26 | Setup tecnico | Capturar baseline cost humano | Delivery + cliente | 02 Implantacao / Setups em andamento | baseline capturado | human_cost_baseline |
| 27 | Setup tecnico | Aprovar tone of voice + prompts iniciais | Delivery + cliente | 02 Implantacao / Setups em andamento | prompts aprovados | prompt_pack_v1 |
| 28 | Setup tecnico | Smoke test end-to-end | Delivery | 02 Implantacao / Setups em andamento | shadow ligado | smoke_test_evidence |
| 29 | Setup tecnico | Ativar SHADOW no sistema | Tech Lead | 02 Implantacao / Setups em andamento | shadow ligado |  |
| 30 | SHADOW | Acompanhar primeiros outcomes diariamente | Delivery | 02 Implantacao / SHADOWs ativos | calibrando |  |
| 31 | SHADOW | Coletar 30+ outcomes em SHADOW | Delivery + sistema | 02 Implantacao / SHADOWs ativos | calibrando | shadow_outcome_sample |
| 32 | SHADOW | Comparar decisao humana vs decisao do agente | Delivery | 02 Implantacao / SHADOWs ativos | 30 outcomes coletados | human_agent_comparison |
| 33 | SHADOW | Calcular concordancia e ajustar prompts | Tech Lead | 02 Implantacao / SHADOWs ativos | analise concluida | concordance_report |
| 34 | SHADOW | Validar unit economics real | Tech Lead | 02 Implantacao / SHADOWs ativos | analise concluida | real_unit_economics |
| 40 | ASSISTED | Iterar prompts com base em feedback acumulado | Tech Lead | 02 Implantacao / ASSISTEDs ativos | operando | prompt_iteration_notes |
| 41 | ASSISTED | Validar threshold de promocao 90%+ | Tech Lead | 02 Implantacao / ASSISTEDs ativos | threshold atingido |  |

## 04 Saude Operacional

| # | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|
| 35 | SHADOW | Solicitar promocao para ASSISTED | Tech Lead | 04 Saude Operacional / Promocoes de modo | solicitada |  |
| 36 | SHADOW | CEO ou Tech Lead aprova promocao | CEO | 04 Saude Operacional / Promocoes de modo | aprovada |  |
| 37 | ASSISTED | Aprovar/rejeitar gates conforme outcomes chegam | Delivery | 04 Saude Operacional / Gates pendentes | aguardando |  |
| 38 | ASSISTED | Anotar feedback estruturado em gate rejeitado | Delivery | 04 Saude Operacional / Gates pendentes | rejeitado | gate_feedback |
| 42 | ASSISTED | Solicitar promocao para AUTONOMOUS | Tech Lead | 04 Saude Operacional / Promocoes de modo | solicitada |  |
| 43 | Operacao continua | Executar auditoria mensal | Delivery | 04 Saude Operacional / Auditorias mensais | em revisao | monthly_audit_report |
| 44 | Operacao continua | Anexar relatorio de auditoria a fatura | Delivery | 04 Saude Operacional / Auditorias mensais | anexada a fatura |  |
| 48 | Operacao continua | Atender incidentes P1/P2/P3 | Delivery | 04 Saude Operacional / Incidentes | aberto |  |
| 49 | Operacao continua | Escrever post-mortem de P1/P2 | Tech Lead | 04 Saude Operacional / Incidentes | postmortem | incident_postmortem |
| 50 | Operacao continua | Drift detection mensal | Sistema | 04 Saude Operacional / Incidentes | aberto | drift_detection_report |

## 05 Institucional Acme

| # | Fase | Atividade | Dono | Onde | Status | Artefato |
|---|---|---|---|---|---|---|
| 69 | Churn / Sunset | Post-mortem publico interno | Tech Lead | 05 Institucional Acme / Decisoes e ADRs | em curso | internal_lessons_learned |
| 70 | Transversal | Manter catalogo de SKUs atualizado | Tech Lead | 05 Institucional Acme / Catalogo de SKUs | dev |  |
| 71 | Transversal | Tomar decisoes estrategicas | CEO + Tech Lead | 05 Institucional Acme / Decisoes e ADRs | em curso | adr |
| 72 | Transversal | Backlog tecnico Forge / Ondas | Tech Lead | 05 Institucional Acme / Backlog tecnico | em curso |  |
| 73 | Transversal | Onboarding de novo membro | Quem contratou | 05 Institucional Acme / Time Acme | onboarding |  |
| 74 | Transversal | Auditoria mensal DeepAgents | Reviewer externo | 05 Institucional Acme / Auditoria DeepAgents | em curso | deepagents_review |

## Contrato de saida do Diagnostico Fase 0

Evento: `diagnostic_completed`

Campos obrigatorios:
- `company_name`
- `diagnostic_task_id`
- `selected_candidate.name`
- `selected_candidate.outcome_definition`
- `selected_candidate.sku`
- `selected_candidate.unit_economics`
- `selected_candidate.recommended_mode`
- `selected_candidate.technical_platforms`
- `decision`

## Regras de geracao pos-diagnostico

### decision=approved_for_proposal

Criar:
- Propostas / Proposta enviada
- Catalogo de SKUs / SKU em dev se SKU ainda nao existir
- Backlog tecnico / tarefas tech por plataforma identificada

Artefatos:
- proposal_doc
- unit_economics_model
- diagnostic_report_pdf

### proposal.status=assinada

Criar:
- Clientes ativos / Cliente saudavel
- Setups em andamento / Setup tecnico iniciado

Artefatos:
- signed_contract
- setup_fee_receipt
- institutional_briefing

### setup.status=shadow ligado

Criar:
- SHADOWs ativos / SHADOW ativo
- Auditorias mensais / Auditoria agendada se cliente ja estiver em operacao

Artefatos:
- prompt_pack_v1
- smoke_test_evidence
