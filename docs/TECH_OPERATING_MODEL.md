# Modelo operacional Tech

Este documento e gerado a partir de `config/tech-operational-repository.json` e `config/tech-platform-catalog.json`.

## Principios

- Toda entrega tecnica precisa estar ligada a um cliente, plataforma e artefato esperado.
- Atividades manuais registram decisao humana; atividades automaticas registram execucao do sistema.
- Codigo, PR, deploy, teste e smoke test devem apontar para a task tecnica correspondente.
- O ClickUp mostra execucao viva; este repositorio define o contrato operacional.
- Atividades de agente/IA (prompts, evals, traces) so sao obrigatorias para delivery_type=agentic_saas ou ai_enabled=true.
- Atividades de plataforma (rollout, smoke, piloto, aceite, CANONICAL) so sao obrigatorias para delivery_type=platform ou blocos platform em hybrid.

## Fluxo de status

`a fazer` -> `em desenvolvimento` -> `em revisao` -> `bloqueado` -> `concluido`

## Papeis

### Tech Lead

- definir arquitetura
- validar escopo tecnico do diagnostico
- aprovar promocao de modo
- revisar PRs criticos
- resolver bloqueios tecnicos

### Dev backend

- implementar endpoints
- integrar APIs externas
- criar testes tecnicos
- instrumentar logs e rastreabilidade
- corrigir bugs de integracao

### Dev frontend

- implementar telas e fluxos de usuario
- integrar UI com APIs
- tratar loading, erro, vazio e sucesso
- validar responsividade desktop/mobile
- criar testes E2E de fluxos criticos

### AI Engineer

- definir comportamento do agente
- implementar prompts, tools e memoria
- criar suites de avaliacao
- instrumentar traces e metricas de IA
- preparar gates SHADOW e ASSISTED

### Delivery tecnico

- configurar canais
- rodar smoke tests
- capturar evidencias
- acompanhar SHADOW/ASSISTED
- registrar feedback tecnico

## Atividades operacionais Tech

### Revisar escopo tecnico do diagnostico

- ID: `tech.scope.review`
- Delivery type: `any`
- Tipo: `manual`
- Papel: `tech_lead`
- Gatilho: `diagnostic_completed`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `payload_contract`

Entradas:
- `diagnostic_task_id`
- `selected_candidate`
- `technical_platforms`

Saidas:
- `technical_scope_approved`
- `platform_task_plan`

Automacao atual: Gerar tarefas tech por plataforma apos payload aprovado.
Proxima automacao: Validar automaticamente se plataformas do diagnostico existem no catalogo.

### Gerar backlog tecnico por plataforma

- ID: `tech.task.generate`
- Delivery type: `any`
- Tipo: `automatic`
- Papel: `system`
- Gatilho: `tech_scope_identified`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `platform_task_plan`

Entradas:
- `client_name`
- `client_task_id`
- `technical_platforms`
- `tech_owner`
- `delivery_due_date`

Saidas:
- `clickup_tech_tasks`

Automacao atual: scripts/generate-tech-tasks.mjs
Proxima automacao: Expor como endpoint interno POST /admin/tech-scope.

### Linkar codigo a tarefa tecnica

- ID: `tech.code.link`
- Delivery type: `any`
- Tipo: `hybrid`
- Papel: `backend_dev`
- Gatilho: `commit_or_pr_created`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `pull_request_url`

Entradas:
- `task_key`
- `repository_url`
- `commit_sha`
- `pull_request_url`

Saidas:
- `clickup_comment_with_code_reference`

Automacao atual: Manual: dev comenta link do PR/task.
Proxima automacao: Webhook GitHub identifica task_key e comenta automaticamente no ClickUp.

### Ler progresso tecnico por cliente

- ID: `tech.progress.read`
- Delivery type: `any`
- Tipo: `automatic`
- Papel: `system`
- Gatilho: `daily_or_on_demand`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `tech_progress_report`

Entradas:
- `client_name_optional`

Saidas:
- `progress_percent`
- `blocked_tasks`
- `task_status_summary`

Automacao atual: scripts/read-tech-progress.mjs
Proxima automacao: Gerar comentario diario no cliente ou dashboard executivo.

### Desenhar agente de IA do produto

- ID: `tech.agent.design`
- Delivery type: `agentic_saas`
- Tipo: `hybrid`
- Papel: `ai_engineer`
- Gatilho: `ai_agent_selected`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `agent_outcome_contract`

Entradas:
- `client_name`
- `selected_candidate`
- `agent_outcome`
- `technical_platforms`

Saidas:
- `agent_outcome_contract`
- `agent_behavior_spec`
- `agent_tool_contracts`

Automacao atual: Gerar tarefas da plataforma ai_agent pelo catalogo tecnico.
Proxima automacao: Gerar automaticamente documento de especificacao do agente a partir do Diagnostico Fase 0.

### Avaliar qualidade do agente

- ID: `tech.agent.evaluate`
- Delivery type: `agentic_saas`
- Tipo: `hybrid`
- Papel: `ai_engineer`
- Gatilho: `agent_implementation_ready`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `agent_eval_suite`

Entradas:
- `agent_task_id`
- `eval_dataset`
- `expected_outcomes`

Saidas:
- `agent_eval_report`
- `promotion_recommendation`

Automacao atual: Task tecnica exige suite de avaliacao e evidencia de resultado.
Proxima automacao: Rodar avaliacoes automaticamente no CI e atualizar status no ClickUp.

### Registrar evidencia de smoke test

- ID: `tech.smoke.evidence`
- Delivery type: `any`
- Tipo: `hybrid`
- Papel: `delivery_engineer`
- Gatilho: `smoke_test_completed`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `smoke_test_evidence`

Entradas:
- `tech_task_id`
- `test_result`
- `evidence_url_or_notes`

Saidas:
- `clickup_comment`
- `task_ready_for_review`

Automacao atual: Manual: anexar evidencia e mover status.
Proxima automacao: Teste automatizado comenta resultado e move status para em revisao/concluido.

### Validar entrega visual frontend

- ID: `tech.frontend.visual.review`
- Delivery type: `any`
- Tipo: `hybrid`
- Papel: `frontend_dev`
- Gatilho: `frontend_screen_ready`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `responsive_screenshots`

Entradas:
- `tech_task_id`
- `screen_url_or_route`
- `desktop_screenshot`
- `mobile_screenshot`

Saidas:
- `responsive_review`
- `task_ready_for_review`

Automacao atual: Manual: anexar screenshots e mover status.
Proxima automacao: Playwright captura screenshots e comenta automaticamente na task.

### Validar fluxo frontend com teste E2E

- ID: `tech.frontend.e2e`
- Delivery type: `any`
- Tipo: `hybrid`
- Papel: `frontend_dev`
- Gatilho: `frontend_flow_ready`
- Onde: `05 Institucional Acme / Backlog tecnico`
- Artefato: `frontend_e2e_test_result`

Entradas:
- `tech_task_id`
- `test_command`
- `test_result`

Saidas:
- `frontend_e2e_result`
- `task_ready_for_review`

Automacao atual: Manual: rodar teste e comentar resultado.
Proxima automacao: CI/Playwright atualiza status da task automaticamente.

### Provisionar ambiente do modulo de plataforma

- ID: `tech.platform.environment`
- Delivery type: `platform`
- Tipo: `hybrid`
- Papel: `delivery_engineer`
- Gatilho: `platform_module_planned`
- Onde: `02 Implantacao / Rollouts em andamento`
- Artefato: `environment_provisioning_evidence`

Entradas:
- `client_name`
- `module_key`
- `environment`
- `infra_template`

Saidas:
- `env_url`
- `env_credentials_evidence`

Automacao atual: Manual: provisionar ambiente e registrar evidencia.
Proxima automacao: Pipeline de IaC provisiona ambiente e comenta evidencia automaticamente.

### Rodar migrations e seed do modulo

- ID: `tech.platform.migrations`
- Delivery type: `platform`
- Tipo: `hybrid`
- Papel: `backend_dev`
- Gatilho: `environment_ready`
- Onde: `02 Implantacao / Rollouts em andamento`
- Artefato: `migrations_evidence`

Entradas:
- `env_url`
- `module_key`
- `migration_set`

Saidas:
- `migration_evidence`
- `rollback_tested`

Automacao atual: Manual: rodar migrations + seed + testar rollback.
Proxima automacao: CI executa migrations + rollback test e comenta na task.

### Smoke test tecnico do modulo de plataforma

- ID: `tech.platform.smoke`
- Delivery type: `platform`
- Tipo: `hybrid`
- Papel: `delivery_engineer`
- Gatilho: `module_deployed_in_env`
- Onde: `02 Implantacao / Rollouts em andamento`
- Artefato: `module_smoke_test_evidence`

Entradas:
- `env_url`
- `module_key`
- `smoke_scenarios`

Saidas:
- `smoke_evidence`
- `task_ready_for_acceptance`

Automacao atual: Manual: rodar smoke e anexar log.
Proxima automacao: Playwright + smoke API rodam em CI e comentam evidencias.

### Comparar dados legado vs plataforma

- ID: `tech.platform.data.validate`
- Delivery type: `platform`
- Tipo: `hybrid`
- Papel: `delivery_engineer`
- Gatilho: `pilot_in_progress`
- Onde: `02 Implantacao / Pilotos ativos`
- Artefato: `legacy_vs_new_comparison`

Entradas:
- `module_key`
- `legacy_dataset`
- `new_dataset`
- `tolerance_pct`

Saidas:
- `legacy_vs_new_comparison`
- `gaps_list`

Automacao atual: Script ad-hoc executa diff e gera relatorio.
Proxima automacao: Job recorrente roda diff e comenta tendencia na task.

### Configurar observabilidade do modulo

- ID: `tech.platform.observability`
- Delivery type: `platform`
- Tipo: `hybrid`
- Papel: `backend_dev`
- Gatilho: `module_in_staging`
- Onde: `02 Implantacao / Rollouts em andamento`
- Artefato: `platform_observability_setup`

Entradas:
- `module_key`
- `metrics_spec`
- `alerting_targets`

Saidas:
- `dashboard_url`
- `alerts_active`

Automacao atual: Manual: instrumentar logs/metricas e configurar alertas.
Proxima automacao: Templates de observabilidade aplicados via IaC.

### Coletar aceite humano operacional

- ID: `tech.platform.acceptance`
- Delivery type: `platform`
- Tipo: `manual`
- Papel: `tech_lead`
- Gatilho: `pilot_evidence_ready`
- Onde: `04 Saude Operacional / Aceites operacionais`
- Artefato: `human_operational_signoff`

Entradas:
- `pilot_task_id`
- `comparison_evidence`
- `acceptance_criteria_doc`

Saidas:
- `human_operational_signoff`
- `decision`

Automacao atual: Manual: coletar assinatura cliente + Tech Lead.
Proxima automacao: Form interno gera task e anexa evidencia automaticamente.

### Promover modulo para CANONICAL

- ID: `tech.platform.canonical`
- Delivery type: `platform`
- Tipo: `manual`
- Papel: `tech_lead`
- Gatilho: `operational_signoff_approved`
- Onde: `04 Saude Operacional / Promocoes de modo`
- Artefato: `canonical_cutover_note`

Entradas:
- `acceptance_task_id`
- `cutover_date`
- `legacy_sunset_plan`

Saidas:
- `canonical_cutover_note`
- `module_in_canonical`

Automacao atual: Manual: aprovar promocao e mover modulo para Fontes canonicas.
Proxima automacao: Pipeline movimenta task automaticamente apos aprovacao registrada.

### Monitorar incidentes pos-canonical

- ID: `tech.platform.incident.canonical`
- Delivery type: `platform`
- Tipo: `automatic`
- Papel: `system`
- Gatilho: `module_in_canonical`
- Onde: `04 Saude Operacional / Auditorias mensais`
- Artefato: `operational_consistency_report`

Entradas:
- `module_key`
- `alerting_channels`

Saidas:
- `incident_tasks_created`
- `consistency_report`

Automacao atual: Manual: revisar dashboards e abrir incidentes quando necessario.
Proxima automacao: Alertas em produto criam tasks de incidente automaticamente.

### Definir e validar plano de rollback

- ID: `tech.platform.rollback`
- Delivery type: `platform`
- Tipo: `manual`
- Papel: `tech_lead`
- Gatilho: `module_in_staging`
- Onde: `02 Implantacao / Rollouts em andamento`
- Artefato: `rollback_plan`

Entradas:
- `module_key`
- `rollback_steps`
- `rollback_evidence`

Saidas:
- `rollback_plan`
- `rollback_tested`

Automacao atual: Manual: documentar e testar rollback em staging.
Proxima automacao: CI valida rollback automaticamente em cada release de schema.

## Plataformas e tarefas automaticas

### WhatsApp

- Key: `whatsapp`
- Delivery types aplicaveis: `agentic_saas`, `platform`, `automation`, `hybrid`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Validar credenciais WhatsApp | `credential_validation_evidence` | Token, phone number ID e webhook secret validados. |
| Configurar webhook WhatsApp | `webhook_url` | Webhook recebe evento real e responde com sucesso. |
| Mapear payload WhatsApp | `payload_contract` | Campos de entrada e eventos suportados documentados. |
| Rodar smoke test WhatsApp | `smoke_test_evidence` | Mensagem teste percorre fluxo end-to-end. |

### Email

- Key: `email`
- Delivery types aplicaveis: `agentic_saas`, `platform`, `automation`, `hybrid`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Configurar canal de email inbound | `inbound_email_config` | Email de entrada gera evento processavel. |
| Implementar parser de email | `email_parser_contract` | Assunto, remetente, corpo e anexos relevantes sao extraidos. |
| Validar entrega e resposta por email | `delivery_test_evidence` | Fluxo de resposta passa em teste com caixa real. |

### CRM

- Key: `crm`
- Delivery types aplicaveis: `agentic_saas`, `platform`, `automation`, `hybrid`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Configurar autenticacao CRM | `crm_auth_evidence` | API do CRM autenticada em ambiente de teste. |
| Mapear schema CRM | `crm_schema_map` | Campos de lead/deal/contact mapeados para o modelo interno. |
| Implementar escrita de resultado no CRM | `crm_writeback_evidence` | Outcome do agente atualiza entidade correta no CRM. |

### Backend Node

- Key: `node_backend`
- Delivery types aplicaveis: `agentic_saas`, `platform`, `automation`, `hybrid`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Criar endpoint de ingestao | `api_endpoint_contract` | Endpoint valida payload, autentica origem e registra evento. |
| Implementar modelo de dominio | `domain_model_notes` | Entidades e estados necessarios estao persistidos. |
| Adicionar logs e rastreabilidade | `observability_dashboard_or_trace` | Evento pode ser auditado de entrada ate outcome. |
| Criar teste end-to-end tecnico | `e2e_test_result` | Teste cobre fluxo tecnico principal e passa no CI/local. |

### Agente de IA

- Key: `ai_agent`
- Delivery types aplicaveis: `agentic_saas`, `hybrid`
- Dono padrao: `ai_engineer`
- IA-enabled: sim (exige prompts/eval/observabilidade de IA)

| Task | Artefato | Done when |
|---|---|---|
| Definir contrato de outcome do agente | `agent_outcome_contract` | Outcome, entradas, saidas, limites de responsabilidade e criterio de sucesso estao definidos. |
| Especificar comportamento e politica de decisao | `agent_behavior_spec` | Instrucoes, tom, regras de escalonamento, recusas e criterios de decisao estao documentados. |
| Mapear ferramentas e integracoes do agente | `agent_tool_contracts` | Cada tool/API necessaria tem contrato, permissao, erro esperado e fallback definidos. |
| Implementar contexto e memoria operacional | `agent_context_memory_design` | Fontes de contexto, janela, recuperacao, retencao e isolamento por cliente estao implementados. |
| Versionar prompts e configuracoes do agente | `agent_prompt_version` | Prompt, modelo, parametros e changelog estao versionados e rastreaveis por deploy. |
| Criar suite de avaliacao do agente | `agent_eval_suite` | Casos felizes, casos limite, criterios de qualidade e regressao automatica estao cobertos. |
| Implementar guardrails e escalonamento humano | `agent_guardrail_policy` | Regras de seguranca, validacao de output, handoff humano e bloqueios criticos funcionam. |
| Instrumentar traces e metricas do agente | `agent_observability_trace` | Cada execucao registra input, decisao, tool calls, output, latencia, custo e resultado. |
| Rodar piloto SHADOW do agente | `agent_shadow_report` | Minimo de 30 outcomes comparados com humano e gaps priorizados. |
| Preparar promocao para ASSISTED | `agent_assisted_gate` | Threshold de qualidade, SLA, riscos e checklist de aprovacao para ASSISTED estao fechados. |

### Frontend Web

- Key: `frontend_web`
- Delivery types aplicaveis: `agentic_saas`, `platform`, `automation`, `hybrid`
- Dono padrao: `frontend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Mapear fluxo de usuario | `user_flow_spec` | Fluxo principal, estados vazios, erros e sucesso estao documentados. |
| Implementar estrutura visual da tela | `ui_screen_implementation` | Tela responsiva renderiza layout base sem dados reais. |
| Integrar frontend com API | `api_integration_evidence` | Tela consome endpoint real ou mock contratual e trata loading/erro/sucesso. |
| Implementar validacao de formularios | `form_validation_rules` | Campos obrigatorios, mensagens de erro e submissao invalida estao cobertos. |
| Validar responsividade desktop/mobile | `responsive_screenshots` | Tela foi verificada em viewport desktop e mobile sem quebra visual. |
| Criar teste E2E do fluxo | `frontend_e2e_test_result` | Teste cobre o fluxo principal e passa local/CI. |

### Dashboard Frontend

- Key: `frontend_dashboard`
- Delivery types aplicaveis: `agentic_saas`, `platform`, `automation`, `hybrid`
- Dono padrao: `frontend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Definir contrato das metricas | `dashboard_metric_contract` | Cada card tem fonte, filtro, periodo e estado vazio definidos. |
| Implementar visualizacao do dashboard | `dashboard_ui` | Dashboard renderiza cards/tabelas/graficos com dados de exemplo. |
| Integrar dashboard aos dados reais | `dashboard_data_evidence` | Metricas batem com fonte de dados validada. |
| Validar leitura executiva do dashboard | `ceo_review_notes` | CEO consegue responder a pergunta do dashboard em ate 30 segundos. |

### API externa

- Key: `external_api`
- Delivery types aplicaveis: `agentic_saas`, `platform`, `automation`, `hybrid`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Documentar contrato da API externa | `external_api_contract` | Auth, endpoints, rate limits e erros conhecidos documentados. |
| Implementar client da API externa | `api_client_module` | Client cobre chamadas necessarias com retry e tratamento de erro. |
| Validar integracao com API externa | `integration_test_result` | Fluxo principal passa contra sandbox ou credencial real autorizada. |

### Modulo de plataforma

- Key: `platform_module`
- Delivery types aplicaveis: `platform`, `hybrid`
- Dono padrao: `delivery_engineer`

| Task | Artefato | Done when |
|---|---|---|
| Provisionar ambiente do modulo | `environment_provisioning_evidence` | Ambiente isolado provisionado com configs do cliente e acesso restrito. |
| Rodar migrations e seed | `migrations_evidence` | Schema atual aplicado e seed inicial inserido. Rollback testado. |
| Smoke test tecnico do modulo | `module_smoke_test_evidence` | Fluxos criticos do modulo respondem sem erro em ambiente isolado. |
| Validar consistencia de dados vs legado | `legacy_vs_new_comparison` | Comparacao automatizada legado x nova roda dentro do erro maximo aceito. |
| Configurar observabilidade do modulo | `platform_observability_setup` | Logs estruturados, metricas e alertas ativados com runbook minimo. |
| Documentar criterios de aceite operacional | `operational_acceptance_criteria` | Criterios escritos e revisados com cliente; condicao de aceite explicita. |
| Operacao assistida em piloto com usuario interno | `pilot_open_note` | Modulo rodando contra usuarios reais em paralelo ao legado, com canal de feedback. |
| Coletar aceite humano operacional | `human_operational_signoff` | Cliente e Tech Lead assinam aceite com base nos criterios documentados. |
| Promover modulo para CANONICAL | `canonical_cutover_note` | Modulo virou fonte canonica; legado paralelo desligado ou agendado. |
| Definir e validar plano de rollback | `rollback_plan` | Procedimento de rollback documentado e testado em staging. |

## Backlog de automacao

| ID | Prioridade | Nome | Descricao |
|---|---|---|---|
| `auto.github.clickup` | high | Webhook GitHub -> ClickUp | Ao abrir PR ou fazer commit com task_key, comentar automaticamente na task [TECH]. |
| `auto.tech.scope.endpoint` | high | Endpoint interno para escopo tech | Transformar generate-tech-tasks.mjs em endpoint POST /admin/tech-scope. |
| `auto.daily.tech.report` | medium | Relatorio diario tech | Rodar leitura de progresso diariamente e publicar resumo no ClickUp. |
| `auto.test.status` | medium | Atualizacao por teste/deploy | Atualizar task [TECH] quando CI, E2E ou deploy mudar de estado. |
| `auto.frontend.screenshots` | medium | Screenshots automaticos frontend | Capturar desktop/mobile com Playwright e comentar evidencias na task [TECH]. |
