# Contratos de eventos ClickUp Acme

Este documento e gerado a partir de `config/clickup-task-templates.json`.
Ele define os campos que o backend deve receber antes de criar tasks e disparar atividades correspondentes.

Delivery types suportados: `agentic_saas`, `platform`, `automation`, `hybrid`.

> Cada template declara delivery_type. Templates agentic exigem prompts/eval/SHADOW; templates platform exigem rollout/smoke/piloto/aceite.

## [TEMPLATE] Solicitacao de agente

- Evento: `agent_request`
- Delivery type: `agentic_saas`
- Destino: `05 Institucional Acme / Solicitacoes de agente`
- Status desejado: `rascunho`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `client_name` | Cliente | text | sim |  | Acme Ltda |
| `business_problem` | Problema de negocio | long_text | sim |  | Comercial demora para qualificar leads e perde timing. |
| `expected_outcome` | Outcome esperado | long_text | sim |  | Lead qualificado com score e proximo passo sugerido. |
| `agent_type` | Tipo de agente | select | sim | SDR, suporte, cobranca, atendimento, operacao, analise, outro |  |
| `primary_channel` | Canal principal | select | sim | whatsapp, email, crm, site, dashboard, api, outro |  |
| `technical_platforms` | Plataformas tecnicas | text | sim |  | ai_agent,whatsapp,node_backend |
| `autonomy_level` | Nivel de autonomia | select | sim | somente sugerir, executar com aprovacao, executar autonomo, nao sei |  |
| `human_handoff_rule` | Quando chamar humano | long_text | sim |  | Quando o lead pedir desconto, contrato ou falar com diretor. |
| `success_metric` | Metrica de sucesso | text | nao |  | % leads qualificados corretamente |
| `delivery_due_date` | Prazo desejado | date | sim |  | 2026-05-15 |
| `tech_owner` | Responsavel tecnico | person_or_text | sim |  | AI Engineer |
| `repository_url` | Repositorio | url | nao |  | https://github.com/acme/acme |
| `environment` | Ambiente | select | sim | dev, staging, prod |  |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Solicitacao de agente
- Quando `custom_fields preenchidos`: Validar escopo minimo
- Quando `status=escopo pronto`: Gerar payload tecnico e disparar tech.task.generate

### Subtasks padrao

- Preencher cliente, problema e outcome
- Selecionar tipo de agente e canal principal
- Definir autonomia e regra de handoff humano
- Confirmar plataformas tecnicas
- Marcar status como escopo pronto

## [TEMPLATE] Lead novo

- Evento: `lead_new`
- Delivery type: `any`
- Destino: `01 Pipeline Comercial / Leads`
- Status desejado: `novo`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `contact_name` | Contato principal | text | sim |  | Maria Silva |
| `contact_email` | Email | email | nao |  | maria@acme.com |
| `contact_phone` | Telefone/WhatsApp | phone | nao |  | +55 11 99999-9999 |
| `source` | Origem | select | sim | indicacao, evento, outbound, inbound, parceiro, manual |  |
| `pain_summary` | Dor percebida | long_text | sim |  | Time perde muito tempo qualificando leads manualmente. |
| `commercial_owner` | Dono comercial | person_or_text | sim |  | Rafael |
| `next_step_date` | Data do proximo passo | date | nao |  | 2026-05-08 |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Lead na lista Leads
- Quando `source=indicacao`: Adicionar tag revisao-humana
- Quando `next_step_date preenchido`: Definir due date da task

### Subtasks padrao

- Registrar origem e contexto do lead
- Definir dono comercial
- Agendar ou tentar primeira conversa

## [TEMPLATE] Diagnostico Fase 0 vendido

- Evento: `diagnostic_sold`
- Delivery type: `any`
- Destino: `01 Pipeline Comercial / Diagnosticos Fase 0`
- Status desejado: `vendido`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `lead_task_id` | Task do lead | clickup_task_id | nao |  | 86abc123 |
| `diagnostic_fee` | Fee do diagnostico | currency_brl | sim |  | 8000 |
| `payment_confirmed_at` | Pagamento confirmado em | datetime | sim |  | 2026-05-01T14:00:00-03:00 |
| `client_ceo_name` | CEO do cliente | text | sim |  | Maria Silva |
| `client_ceo_email` | Email do CEO | email | nao |  | maria@acme.com |
| `start_date` | Data de inicio | date | sim |  | 2026-05-04 |
| `delivery_date` | Data de devolucao | date | sim |  | 2026-05-08 |
| `diagnostic_owner` | Responsavel tecnico | person_or_text | sim |  | Tech Lead |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Diagnostico Fase 0
- Quando `task_created`: Criar 6 subtasks padrao D+1 a D+5
- Quando `lead_task_id preenchido`: Relacionar/linkar task de lead
- Quando `delivery_date preenchido`: Definir due date da devolucao

### Subtasks padrao

- D+1 - Sessao estruturada 90min com CEO
- D+1 - Entrevistas 30min com 2-3 pessoas-chave
- D+2 - Auditoria express de dados e ferramentas
- D+3 - Analise de 3 candidatos e criterios SaaS2
- D+4 - Redacao do relatorio
- D+5 - Sessao de devolucao 1h

## [TEMPLATE] Proposta enviada

- Evento: `proposal_sent`
- Delivery type: `any`
- Destino: `01 Pipeline Comercial / Propostas`
- Status desejado: `enviada`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `diagnostic_task_id` | Task do diagnostico | clickup_task_id | sim |  | 86diag123 |
| `sku` | SKU proposto | text | sim |  | Qualificacao de Leads SaaS2 |
| `platform_fee` | Fee plataforma mensal | currency_brl | sim |  | 3000 |
| `outcome_price` | Preco por outcome | currency_brl | sim |  | 80 |
| `monthly_cap` | Cap mensal | currency_brl | sim |  | 12000 |
| `sla_threshold` | SLA threshold | percent | sim |  | 90 |
| `proposal_url` | Link da proposta | url | nao |  | https://... |
| `valid_until` | Validade da proposta | date | sim |  | 2026-05-20 |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Proposta
- Quando `proposal_url preenchido`: Adicionar link na descricao
- Quando `valid_until preenchido`: Definir due date de follow-up
- Quando `status=assinada`: Disparar template setup_created

### Subtasks padrao

- Validar clausula de outcome
- Validar pricing plataforma + outcome + cap
- Enviar proposta final
- Coletar assinatura digital
- Confirmar setup fee

## [TEMPLATE] Setup tecnico iniciado

- Evento: `setup_created`
- Delivery type: `any`
- Destino: `02 Implantacao / Setups em andamento`
- Status desejado: `kickoff`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `client_task_id` | Task do cliente | clickup_task_id | nao |  | 86cli123 |
| `proposal_task_id` | Task da proposta | clickup_task_id | sim |  | 86prop123 |
| `setup_fee` | Setup fee | currency_brl | sim |  | 15000 |
| `setup_owner` | Responsavel pelo setup | person_or_text | sim |  | Delivery |
| `entry_channel` | Canal de entrada | select | sim | whatsapp, email, webhook, form, outro |  |
| `kickoff_date` | Data do kickoff | datetime | sim |  | 2026-05-06T10:00:00-03:00 |
| `target_shadow_date` | Data alvo para SHADOW | date | sim |  | 2026-05-15 |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Setup tecnico
- Quando `task_created`: Criar 6 subtasks padrao de setup
- Quando `target_shadow_date preenchido`: Definir due date do setup
- Quando `status=shadow ligado`: Disparar template shadow_active

### Subtasks padrao

- Kickoff com cliente
- Coletar briefing institucional
- Mapear processo agent-ready
- Conectar canal de entrada
- Capturar baseline cost humano
- Aprovar prompts iniciais e rodar smoke test

## [TEMPLATE] SHADOW ativo

- Evento: `shadow_active`
- Delivery type: `agentic_saas`
- Destino: `02 Implantacao / SHADOWs ativos`
- Status desejado: `calibrando`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `setup_task_id` | Task do setup | clickup_task_id | sim |  | 86setup123 |
| `subscription_id` | Subscription ID no backend | text | sim |  | sub_123 |
| `agent_name` | Nome do agente | text | sim |  | Lead Qualifier |
| `shadow_started_at` | SHADOW iniciado em | datetime | sim |  | 2026-05-15T09:00:00-03:00 |
| `target_outcome_count` | Meta de outcomes | number | sim |  | 30 |
| `langfuse_project_url` | Link Langfuse | url | nao |  | https://... |

### Atividades disparadas

- Quando `template_instantiated`: Criar task SHADOW
- Quando `target_outcome_count atingido`: Criar alerta para analise humano-vs-agente
- Quando `promocao_solicitada`: Disparar task em Promocoes de modo

### Subtasks padrao

- Acompanhar primeiros outcomes diariamente
- Coletar 30+ outcomes
- Comparar decisao humana vs agente
- Calcular concordancia
- Validar unit economics real
- Solicitar promocao para ASSISTED

## [TEMPLATE] Auditoria mensal

- Evento: `monthly_audit`
- Delivery type: `agentic_saas`
- Destino: `04 Saude Operacional / Auditorias mensais`
- Status desejado: `agendada`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `client_task_id` | Task do cliente | clickup_task_id | sim |  | 86cli123 |
| `subscription_id` | Subscription ID no backend | text | sim |  | sub_123 |
| `billing_month` | Mes de referencia | month | sim |  | 2026-05 |
| `sample_size` | Tamanho da amostra | number | sim |  | 50 |
| `sla_threshold` | SLA threshold | percent | sim |  | 90 |
| `invoice_task_id` | Task da fatura | clickup_task_id | nao |  | 86fat123 |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Auditoria mensal
- Quando `auditoria_concluida`: Atualizar task de fatura com relatorio
- Quando `sla_real < sla_threshold`: Disparar task SLA breach

### Subtasks padrao

- Definir sample 5-10%
- Rodar LLM-as-judge
- Revisar amostra humana
- Calcular SLA agregado
- Anexar relatorio a fatura

## [TEMPLATE] Incidente operacional

- Evento: `incident_opened`
- Delivery type: `any`
- Destino: `04 Saude Operacional / Incidentes`
- Status desejado: `aberto`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | nao |  | Acme Ltda |
| `client_task_id` | Task do cliente | clickup_task_id | nao |  | 86cli123 |
| `subscription_id` | Subscription ID no backend | text | nao |  | sub_123 |
| `severity` | Severidade | select | sim | P1, P2, P3 |  |
| `incident_source` | Origem do incidente | select | sim | pipeline, drift, cliente, auditoria, manual, infra |  |
| `impact_summary` | Resumo do impacto | long_text | sim |  | Outcomes deixaram de ser entregues por 40 minutos. |
| `detected_at` | Detectado em | datetime | sim |  | 2026-05-01T11:30:00-03:00 |
| `owner` | Responsavel | person_or_text | sim |  | Delivery |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Incidente
- Quando `severity=P1`: Adicionar tag urgente e notificar CEO
- Quando `severity=P1|P2`: Criar subtask de postmortem
- Quando `cliente afetado`: Relacionar/linkar task do cliente

### Subtasks padrao

- Classificar severidade P1/P2/P3
- Registrar impacto e cliente afetado
- Definir responsavel de mitigacao
- Comunicar envolvidos
- Escrever postmortem se P1/P2

## [TEMPLATE] Plataforma - rollout

- Evento: `platform_rollout`
- Delivery type: `platform`
- Destino: `02 Implantacao / Rollouts em andamento`
- Status desejado: `draft`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `platform_name` | Nome da plataforma | text | sim |  | Plataforma Acme |
| `module_key` | Modulo | text | sim |  | cadastros |
| `client_task_id` | Task do cliente | clickup_task_id | nao |  | 86cli123 |
| `proposal_task_id` | Task da proposta | clickup_task_id | sim |  | 86prop123 |
| `rollout_owner` | Responsavel pelo rollout | person_or_text | sim |  | Delivery |
| `environment` | Ambiente | select | sim | dev, staging, prod |  |
| `kickoff_date` | Data do kickoff | datetime | sim |  | 2026-05-06T10:00:00-03:00 |
| `target_staging_date` | Data alvo para STAGING | date | sim |  | 2026-05-15 |
| `ai_enabled` | Modulo usa IA? | select | nao | sim, nao |  |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Rollout do modulo
- Quando `task_created`: Criar 5 subtasks padrao de rollout
- Quando `target_staging_date preenchido`: Definir due date do rollout
- Quando `status=staging`: Disparar template platform_pilot

### Subtasks padrao

- Provisionar ambiente
- Rodar migrations e seed inicial
- Configurar observabilidade (logs, metricas, alertas)
- Smoke test tecnico do modulo
- Definir criterios de aceite operacional

## [TEMPLATE] Plataforma - piloto ativo

- Evento: `platform_pilot`
- Delivery type: `platform`
- Destino: `02 Implantacao / Pilotos ativos`
- Status desejado: `piloto aberto`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `platform_name` | Nome da plataforma | text | sim |  | Plataforma Acme |
| `module_key` | Modulo | text | sim |  | cadastros |
| `rollout_task_id` | Task do rollout | clickup_task_id | sim |  | 86roll123 |
| `pilot_started_at` | Piloto iniciado em | datetime | sim |  | 2026-05-15T09:00:00-03:00 |
| `pilot_user_count` | Usuarios participantes | number | sim |  | 5 |
| `legacy_system_name` | Sistema legado em paralelo | text | nao |  | Sistema X |
| `comparison_target_error_pct` | Erro maximo aceito vs legado (%) | percent | sim |  | 1 |
| `ai_enabled` | Modulo usa IA? | select | nao | sim, nao |  |
| `observability_url` | Link de observabilidade | url | nao |  | https://... |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Piloto
- Quando `task_created`: Criar 5 subtasks padrao de piloto
- Quando `comparacao_legado_concluida`: Disparar template platform_acceptance
- Quando `ai_enabled=sim`: Exigir prompts versionados, eval suite e Langfuse antes de aceite

### Subtasks padrao

- Confirmar perfil de usuarios participantes
- Rodar comparacao legado vs plataforma
- Coletar feedback estruturado dos usuarios
- Verificar observabilidade (incidentes, latencia, erros)
- Preparar dossie de aceite humano

## [TEMPLATE] Plataforma - aceite operacional

- Evento: `platform_acceptance`
- Delivery type: `platform`
- Destino: `04 Saude Operacional / Aceites operacionais`
- Status desejado: `aguardando`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `platform_name` | Nome da plataforma | text | sim |  | Plataforma Acme |
| `module_key` | Modulo | text | sim |  | cadastros |
| `pilot_task_id` | Task do piloto | clickup_task_id | sim |  | 86pilot123 |
| `acceptance_criteria_doc` | Documento de criterios de aceite | url | sim |  | https://... |
| `comparison_evidence` | Evidencia comparacao legado x nova | url | sim |  | https://... |
| `client_signoff_owner` | Quem assina pelo cliente | text | sim |  | Maria Silva (CFO Acme) |
| `tech_signoff_owner` | Quem assina pela Acme | person_or_text | sim |  | Tech Lead |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Aceite operacional
- Quando `status=aprovado`: Disparar template platform_canonical_promotion
- Quando `status=rejeitado`: Voltar piloto para 'comparando legado vs nova' e listar gaps

### Subtasks padrao

- Validar criterios de aceite com cliente
- Anexar evidencia de comparacao legado x nova
- Coletar assinatura de aceite do cliente
- Coletar assinatura de aceite do Tech Lead
- Registrar decisao na task

## [TEMPLATE] Plataforma - promocao para CANONICAL

- Evento: `platform_canonical_promotion`
- Delivery type: `platform`
- Destino: `04 Saude Operacional / Promocoes de modo`
- Status desejado: `solicitada`

### Campos

| Key | Label | Tipo | Obrigatorio | Opcoes | Exemplo |
|---|---|---|---|---|---|
| `company_name` | Empresa | text | sim |  | Acme Ltda |
| `platform_name` | Nome da plataforma | text | sim |  | Plataforma Acme |
| `module_key` | Modulo | text | sim |  | cadastros |
| `acceptance_task_id` | Task do aceite operacional | clickup_task_id | sim |  | 86acc123 |
| `cutover_date` | Data planejada de cutover | date | sim |  | 2026-06-01 |
| `legacy_sunset_plan` | Plano de sunset do legado | long_text | nao |  | Manter legado em leitura por 30 dias para auditoria, desligar em 2026-07-01. |

### Atividades disparadas

- Quando `template_instantiated`: Criar task Promocao para CANONICAL
- Quando `status=aprovada`: Mover modulo para Fontes canonicas no Space 03 Clientes
- Quando `status=aprovada`: Agendar auditoria operacional mensal de consistencia canonical x legado

### Subtasks padrao

- Validar plano de cutover com cliente
- Confirmar plano de sunset do legado
- Aprovar promocao com Tech Lead + CEO
- Mover modulo para Fontes canonicas
- Comunicar time e cliente da entrada em CANONICAL
