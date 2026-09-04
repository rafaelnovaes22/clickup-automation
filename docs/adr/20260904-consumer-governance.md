# Contrato de governança do consumidor ClickUp

Data: 2026-09-04. Estado: correção técnica em STAGING, sujeita à revisão do PR. Não aprova piloto, cobrança ou autonomia.

## Causa e evidência

O manifest anterior era um inventário do framework canônico copiado para uma aplicação. Declarava `framework.canonical=true`, documentação de instalação do Foundry, templates de distribuição e a integração headless Hermes inexistente nesta base. O Doctor encontrou 112 paths ausentes e duas falhas adicionais de Hermes. O remote da aplicação é `rafaelnovaes22/clickup-automation`; o canônico é `rafaelnovaes22/agent-governance-framework`.

O contrato de consumidor está em `INSTALL.md` do framework pessoal, seções de instalação e preservação do manifest, e em `scripts/foundry-sync.sh`, que declara `docs/foundry/manifest.json` e `project.json` como arquivos de propriedade do consumidor. `templates/project.template.json` define `automation` para execução determinística e `project.ai_enabled=false` para aplicar auditoria funcional, operacional e econômica. O manifest consumidor de Consórcio também registra fontes reais da aplicação, em vez de declarar todos os arquivos de distribuição do framework.

O ClickUp usa somente biblioteca padrão do Node, catálogos JSON e APIs ClickUp/GitHub. `server.mjs`, geração de backlog e daemons não chamam LLM. Gerenciar entregas de agentes externos não transforma esta automação em um runtime de inferência.

## Decisão e mudanças

O manifest passa a `canonical=false` e inventaria explicitamente contrato, configuração, catálogos, fontes, testes, contexto e hooks realmente exigidos por esta aplicação. As declarações de distribuição do framework e de Hermes deixam de fingir instalação local. Isso não remove nenhum arquivo, hook configurado, regra ou integração real.

`project.json` declara `automation`, `ai_enabled=false` e STAGING. Custos continuam sem medição, com limite de 25% preservado. Não existe override de C1-C8. A Constitution 0.3.0 permanece byte a byte inalterada. A camada instalada continua 0.21.0; não se declara sincronização com a versão canônica atual 0.24.0.

O validador funcional passa a conferir a coerência de manifest, project e settings. Os hooks leem o contrato aninhado `project.type`/`project.ai_enabled` e preservam o booleano false, que `jq // true` tratava incorretamente como ausência. Testes verificam tanto automação sem LLM quanto a necessidade de retomar gates LLM caso o contrato mude.

## Gates preservados e pendências

Continuam obrigatórios: JSON e catálogos válidos, contratos tipados de tarefas, HMAC de webhook, validação antes da geração, testes funcionais, rastreabilidade de evidências, consentimento humano de promoção e controle econômico. O enquadramento não dispensa aceite humano nem cria evidência de piloto.

O Doctor canônico permanece sem alteração de lógica. Sua comparação de versão por badge/CHANGELOG é orientada ao framework; nesta aplicação esses arquivos não são a fonte de versão Foundry. A coerência de settings/manifest/Constitution é verificada diretamente pelo validador da aplicação. A auditoria com o canônico montado deve conservar o aviso de drift 0.21.0 para 0.24.0.

A atualização integral do framework, incluindo ferramentas L2/comandos ainda não instalados, é uma entrega distinta e continua pendente. O sincronizador atual inclui a Constitution entre arquivos substituídos; por isso não foi executado nesta correção. Nenhum placeholder foi criado para satisfazer os 112 paths do inventário incorreto.

## Validação

Executar `npm test`, `npm run validate` e `bash scripts/foundry-doctor.sh --consumer`. A promoção continua condicionada ao piloto e às pendências de operação documentadas no mapa de entrega.

Fontes: [contrato de instalação](https://github.com/rafaelnovaes22/agent-governance-framework/blob/main/INSTALL.md), [sincronizador](https://github.com/rafaelnovaes22/agent-governance-framework/blob/main/scripts/foundry-sync.sh), [contrato project.json](https://github.com/rafaelnovaes22/agent-governance-framework/blob/main/templates/project.template.json).
