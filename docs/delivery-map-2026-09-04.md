# Mapa de entrega e operação

Data: 2026-09-04. Fatia de interface em STAGING, sem mudança de autonomia. Remote confirmado: `rafaelnovaes22/clickup-automation`.

## Jornadas e dados

| Jornada | Implementação | Estado e efeito |
|---|---|---|
| Briefing público | `GET /`, `POST /preview`, `briefing-web.mjs`, `briefing-view.mjs` | Seleção de plataformas produz backlog real do catálogo, com artefatos e critérios; não cria tarefas |
| Reutilização do briefing | JSON exibido na prévia | Operador reutiliza o payload no CLI ou preenche solicitação no ClickUp |
| Solicitação aprovada | `POST /webhooks/clickup`, `agent-request.mjs` | HMAC + lista de origem + status `escopo pronto`; cria backlog e marca solicitação `gerado` |
| Setup de workspace | `bootstrap-clickup.mjs`, scripts de seed | Configuração versionada para spaces/listas/campos/templates, com modos dry-run |
| Plataforma multimódulo | `generate-aios-modules.mjs` | Pais por módulo, subtarefas por estágio, dependências e regras por tier |
| Sincronização de evidências | `sync-tech-status.mjs`, `sync-aios-status.mjs` | Lê filesystem, PRs e CI; atualiza status e evidências no ClickUp |
| Worker contínuo | `sync-all-daemon.mjs` | Fontes SchoolPlatform, Aicfo e marketing; intervalo padrão de 15 minutos |
| Repo de marketing | `bootstrap-marketing-ai-agents-repo.mjs` | Agora usa conta pessoal, preserva checkout sujo/branch alheia, atualiza só por fast-forward |
| Liveness | `GET /health` | Testa processo; não comprova webhook, credenciais nem conclusão de sincronização |

O ClickUp é a fonte de tarefas, comentários, fases e aprovações. Os catálogos JSON versionados definem entregas, status e contratos. GitHub e artefatos locais fornecem evidência de execução. A prévia pública não persiste briefings nem recebe credenciais.

## Correções verificadas

Raiz 404 substituída por formulário funcional e prévia, com HTML escapado, CSP, limite de 16 KB e validação de campos. Webhook e health mantidos. Marcadores de geração agora expiram em 30 minutos, permitindo nova tentativa após interrupção; plataforma inválida é recusada antes do lock, e falha ao consultar lock não permite seguir silenciosamente.

O bootstrap anterior colocava token na URL e aplicava `reset --hard`. Agora o URL é pessoal e sem credencial. Header de autenticação é passado somente no ambiente do subprocesso Git. Clone existente só pode atualizar quando remote, branch e estado limpo correspondem ao esperado. O método `pull --ff-only` recusa divergência. [Git configuration environment](https://git-scm.com/docs/git-config#Documentation/git-config.txt-GITCONFIGCOUNT), [Git pull](https://git-scm.com/docs/git-pull).

O timestamp dos comentários ClickUp é expresso em milissegundos e fundamenta o prazo do lock. A API retorna os 25 comentários mais recentes por padrão. [Get Task Comments](https://developer.clickup.com/reference/gettaskcomments).

## Cloud e limites

Manter web e worker separados no Railway permite distinguir disponibilidade HTTP de jobs. Web precisa de `CLICKUP_TOKEN`, `CLICKUP_TEAM_ID` e, em produção, `CLICKUP_WEBHOOK_SECRET`. Worker usa também `GITHUB_TOKEN`/`GH_TOKEN` e acesso aos repositórios/artefatos. Nunca executar um worker live apenas para validar a interface pública.

Esta automação determinística não exige GPU nem LLM para gerar a prévia. A decisão de conservar Node e catálogos existentes reduz custo e dependências sem alterar o contrato. Não houve comparação de preço entre todas as clouds nem benchmark de produção que justifique chamar essa arquitetura de superior a todas as alternativas.

Gates locais: `npm test` passou com 63 testes; `npm run validate` passou; `npm ci --omit=dev --ignore-scripts` passou com o lockfile novo. QA de desktop pela coordenação gerou exatamente quatro tarefas WhatsApp. A coordenação também verificou uma fixture visual estática de 360px; o envio mobile completo ainda não está comprovado.

O Doctor ausente foi incorporado do repositório pessoal `agent-governance-framework` sem modificar suas regras. O diagnóstico inicial resultou em 13 OK, 7 WARN e 114 FAIL porque o manifest da aplicação era um inventário canônico copiado. A [ADR de enquadramento consumidor](adr/20260904-consumer-governance.md) fundamenta a correção com `canonical=false`, `automation`, `ai_enabled=false` e 26 paths próprios. Os hooks preservam o booleano false e leem o contrato aninhado do projeto. O validador verifica identidade e versões, e o teste do hook comprova que os gates LLM voltam quando AI é habilitada.

Após a correção, o Doctor executado no ai-jail, com o manifest canônico montado para leitura, resultou em 14 OK, 1 WARN e 0 FAIL. O aviso de drift 0.21.0 para 0.24.0 foi preservado. A Constitution 0.3.0 permaneceu intacta. A atualização integral de ferramentas do framework e o piloto operacional continuam pendentes; não houve promoção de lifecycle.

O Dockerfile usa `npm ci` com lockfile, Node 22, `NODE_ENV=production` e usuário `node` sem root. A configuração Railway usa Dockerfile, healthcheck em `/health` e `npm start` fixo. A variável `WORKER` não inicia o daemon neste serviço. `.dockerignore` exclui ambientes, segredos locais, relatórios e caches. O boot de produção exige `CLICKUP_WEBHOOK_SECRET`; definir esse segredo não configura a integração ClickUp nem prova uma automação externa. O Docker Desktop local está sem daemon; o build da imagem e o boot remoto devem ser confirmados pela coordenação. [Railway Config as Code](https://docs.railway.com/config-as-code/reference).

## Pendências para aceite integral

| Pendência | Critério para encerrar |
|---|---|
| Fluxo ClickUp real | Webhook de teste autenticado cria backlog, comenta e muda status uma única vez, em lista de teste autorizada |
| Worker real | Evidências filesystem/GitHub válidas, último ciclo bem-sucedido e falhas observáveis por fonte |
| Garantia distribuída | O lock por comentário não é atomicidade entre réplicas; testar concorrência e adotar chave durável antes de escalar |
| Paginação de comentários | Confirmar comportamento de locks sob mais de 25 comentários recentes ou adicionar armazenamento próprio |
| Retentativa de job | Evitar sobreposição de ticks e implementar timeout/retry/backoff por fonte |
| Runtime do worker | Garantir Git instalado na imagem; verificar permissão de leitura sem persistir credenciais |
| Governance | Avaliar atualização da camada Foundry 0.21.0 para 0.24.0; qualquer alteração da Constitution exige processo próprio |
| Custos/qualidade | Medir tempo por backlog, duplicações, taxa de erro, custo mensal e aceite humano |
| Interface mobile | Validar 360px com screenshot e jornada completa de envio do formulário |

Não houve chamada live para criar tarefas, envio de mensagens ou execução de worker nesta fatia.
