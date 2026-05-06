# AIOS Sync Pattern

Como o clickup-automation acompanha o estado de projetos AIOS (multi-modulo) sem acoplar
o projeto consumidor (ex: SchoolPlatform/EDIX) a esta governança.

## Decisao arquitetural: ClickUp **puxa** o estado

O AIOS Server e os agentes que rodam dentro de um projeto consumidor (ex: `SchoolPlatform`) **nao
emitem eventos** para o clickup-automation. O fluxo é o inverso: o clickup-automation roda um sync
periodico que le o estado canonico do filesystem do projeto consumidor e do GitHub, e atualiza
as tasks correspondentes em `05 Institucional Acme / Backlog tecnico`.

```
+---------------+       +-------------------+
| Projeto AIOS  |       | clickup-automation    |
| (SchoolPlatform)   |       | (governança)      |
|---------------|       |-------------------|
| docs/specs/   | <---  | sync-aios-status  |
| src/          | <---  | (cron 15 min)     |
| GitHub repo   | <---  |                   |
+---------------+       +-------------------+
        ^                       |
        | nunca empurra         | atualiza status + comentario
        | webhook               v
                          ClickUp tasks
                          [AIOS] ... / [MANUAL] ...
```

### Por que pull e nao push

1. **Zero acoplamento**: o projeto consumidor (SchoolPlatform) nao precisa saber que o
   clickup-automation existe. Pode ser substituido por outra ferramenta sem mudar uma linha
   de codigo dentro do SchoolPlatform.
2. **Estado canonico vive onde a verdade existe**: `{project_root}/docs/specs/` + GitHub.
   Nao queremos que duas fontes (filesystem + ClickUp) divirjam em caso de falha de webhook.
3. **Reproducibilidade**: rodar `npm run aios:sync:live` qualquer hora reconstroi o estado
   correto. Se o ClickUp ficar fora do ar, basta rerodar.

## Fonte de verdade

| Stage AIOS | Artefato | O que indica |
|---|---|---|
| spec     | `{root}/docs/specs/{module}.md`        | Spec gerada pelo spec_agent |
| backend  | `{root}/docs/specs/_backend_{module}.md`  | Backend gerado pelo backend_agent |
| frontend | `{root}/docs/specs/_frontend_{module}.md` | Frontend gerado pelo frontend_agent |
| tests    | `{root}/docs/specs/_tests_{module}.md`    | Testes gerados pelo test_agent |
| review   | `{root}/docs/specs/_review_{module}.md`   | Review do review_agent (procura "APROVADO PARA MERGE: Sim") |
| merge    | `{root}/src/{module}/` + PR mergeado em main | Codigo no main + CI verde |

Tier C / `manual_implementation` nao tem artefato AIOS. Status e calculado **somente** com
evidencia GitHub (branch, PR, CI).

## Frequencia recomendada

Durante horario de trabalho (Rafael ativo no projeto):

- **A cada 15 minutos** via `npm run aios:daemon` rodando em background
- Ou disparado manualmente apos um marco (`npm run aios:sync:live --client=SchoolPlatform`)

Fora do horario, manter parado. O sync e idempotente — se demorar 12h sem rodar, basta rodar
quando voltar e o estado se reconcilia.

## Migracao futura para push (opcional)

Se um dia o sync precisar ser mais reativo (ex: dashboards executivos refletindo evolucao em
tempo real), adicionar um endpoint `POST /aios/sync` no `server.mjs` e configurar webhooks no
GitHub do projeto consumidor (`push` em `main`). O webhook dispara o mesmo `sync-aios-status`,
limitando a pesquisa ao module/stage afetado pelo commit.

A escolha hoje (pull-only) prioriza simplicidade operacional: um daemon, um JSON de payload,
uma fonte de verdade unica.

## Pendencias conhecidas

(nenhuma — atualizar esta secao se algum criterio de pronto da implementacao inicial ficar em
debito tecnico)
