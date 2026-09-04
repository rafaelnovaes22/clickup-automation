# Prévia de briefing

`is_internal: true`, `lifecycle_state: STAGING`, `tier_scope: L1`.

Problema: o domínio público respondia 404 porque só havia webhook e health. O operador precisava montar JSON manualmente para avaliar o backlog. Não havia medição de tempo humano para essa etapa.

Outcome: a raiz permite preencher o briefing, selecionar plataformas e revisar as tarefas do catálogo real com artefatos e critérios de conclusão. O evento de conclusão é a resposta HTML 200 de `/preview`, com todas as tarefas das plataformas selecionadas. A geração no workspace continua no fluxo documentado de aprovação por status no ClickUp.

Aceites positivos: a raiz abre sem credenciais; WhatsApp produz quatro entregas do catálogo; o JSON exibido pode ser reutilizado no CLI existente. Aceites negativos: plataformas desconhecidas são recusadas; briefing incompleto é recusado; texto com HTML é escapado e não executado.

Verificação: `npm test` e `npm run validate`. A janela de estabilidade de produção e o aceite de usuários reais ainda não foram medidos. Não há promoção automática de lifecycle.

Custo: prévia determinística sem inferência e sem chamadas externas. Reutiliza o processo HTTP existente; custo incremental de infraestrutura deve ser medido no Railway após deploy. Receita e margem não se aplicam à prévia interna.

Mapa: `scripts/lib/briefing-web.mjs` valida entrada e reutiliza o catálogo; `scripts/lib/briefing-view.mjs` renderiza; `public/briefing.css` apresenta; `tests/briefing-web.test.mjs` cobre o fluxo HTTP. Nenhum briefing é persistido pelo servidor.
