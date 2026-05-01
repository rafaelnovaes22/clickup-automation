# Contratos de eventos ClickUp Acme

Este documento e gerado a partir de `config/clickup-task-templates.json`.
Ele define os campos que o backend deve receber antes de criar tasks e disparar atividades correspondentes.

## [TEMPLATE] Lead novo

- Evento: `lead_new`
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
