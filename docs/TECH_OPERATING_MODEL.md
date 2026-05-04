# Modelo operacional Tech

Este documento e gerado a partir de `config/tech-operational-repository.json` e `config/tech-platform-catalog.json`.

## Principios

- Toda entrega tecnica precisa estar ligada a um cliente, plataforma e artefato esperado.
- Atividades manuais registram decisao humana; atividades automaticas registram execucao do sistema.
- Codigo, PR, deploy, teste e smoke test devem apontar para a task tecnica correspondente.
- O ClickUp mostra execucao viva; este repositorio define o contrato operacional.

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

## Plataformas e tarefas automaticas

### WhatsApp

- Key: `whatsapp`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Validar credenciais WhatsApp | `credential_validation_evidence` | Token, phone number ID e webhook secret validados. |
| Configurar webhook WhatsApp | `webhook_url` | Webhook recebe evento real e responde com sucesso. |
| Mapear payload WhatsApp | `payload_contract` | Campos de entrada e eventos suportados documentados. |
| Rodar smoke test WhatsApp | `smoke_test_evidence` | Mensagem teste percorre fluxo end-to-end. |

### Email

- Key: `email`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Configurar canal de email inbound | `inbound_email_config` | Email de entrada gera evento processavel. |
| Implementar parser de email | `email_parser_contract` | Assunto, remetente, corpo e anexos relevantes sao extraidos. |
| Validar entrega e resposta por email | `delivery_test_evidence` | Fluxo de resposta passa em teste com caixa real. |

### CRM

- Key: `crm`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Configurar autenticacao CRM | `crm_auth_evidence` | API do CRM autenticada em ambiente de teste. |
| Mapear schema CRM | `crm_schema_map` | Campos de lead/deal/contact mapeados para o modelo interno. |
| Implementar escrita de resultado no CRM | `crm_writeback_evidence` | Outcome do agente atualiza entidade correta no CRM. |

### Backend Node

- Key: `node_backend`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Criar endpoint de ingestao | `api_endpoint_contract` | Endpoint valida payload, autentica origem e registra evento. |
| Implementar modelo de dominio | `domain_model_notes` | Entidades e estados necessarios estao persistidos. |
| Adicionar logs e rastreabilidade | `observability_dashboard_or_trace` | Evento pode ser auditado de entrada ate outcome. |
| Criar teste end-to-end tecnico | `e2e_test_result` | Teste cobre fluxo tecnico principal e passa no CI/local. |

### Agente de IA

- Key: `ai_agent`
- Dono padrao: `ai_engineer`

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
- Dono padrao: `frontend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Definir contrato das metricas | `dashboard_metric_contract` | Cada card tem fonte, filtro, periodo e estado vazio definidos. |
| Implementar visualizacao do dashboard | `dashboard_ui` | Dashboard renderiza cards/tabelas/graficos com dados de exemplo. |
| Integrar dashboard aos dados reais | `dashboard_data_evidence` | Metricas batem com fonte de dados validada. |
| Validar leitura executiva do dashboard | `ceo_review_notes` | CEO consegue responder a pergunta do dashboard em ate 30 segundos. |

### API externa

- Key: `external_api`
- Dono padrao: `backend_dev`

| Task | Artefato | Done when |
|---|---|---|
| Documentar contrato da API externa | `external_api_contract` | Auth, endpoints, rate limits e erros conhecidos documentados. |
| Implementar client da API externa | `api_client_module` | Client cobre chamadas necessarias com retry e tratamento de erro. |
| Validar integracao com API externa | `integration_test_result` | Fluxo principal passa contra sandbox ou credencial real autorizada. |

## Backlog de automacao

| ID | Prioridade | Nome | Descricao |
|---|---|---|---|
| `auto.github.clickup` | high | Webhook GitHub -> ClickUp | Ao abrir PR ou fazer commit com task_key, comentar automaticamente na task [TECH]. |
| `auto.tech.scope.endpoint` | high | Endpoint interno para escopo tech | Transformar generate-tech-tasks.mjs em endpoint POST /admin/tech-scope. |
| `auto.daily.tech.report` | medium | Relatorio diario tech | Rodar leitura de progresso diariamente e publicar resumo no ClickUp. |
| `auto.test.status` | medium | Atualizacao por teste/deploy | Atualizar task [TECH] quando CI, E2E ou deploy mudar de estado. |
| `auto.frontend.screenshots` | medium | Screenshots automaticos frontend | Capturar desktop/mobile com Playwright e comentar evidencias na task [TECH]. |
