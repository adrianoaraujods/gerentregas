# Issue tracker: arquivos locais

Specs e tickets vivem como arquivos Markdown dentro do repo, em `.scratch/`.
Nada de GitHub, nada de `gh` — o workshop roda offline e sem conta.

## Layout

```
.scratch/<feature-slug>/
├── spec.md              # saída do /to-spec
└── issues/
    ├── 01-<slug>.md     # saída do /to-tickets, numerado na ordem de dependência
    └── 02-<slug>.md
```

## Convenções

- **Criar a spec**: escreva `.scratch/<feature-slug>/spec.md` com o template do `/to-spec`.
- **Criar tickets**: um arquivo por ticket, em `.scratch/<feature-slug>/issues/`, numerado
  de `01` em diante na ordem de dependência (bloqueadores primeiro).
- **Ler um ticket**: leia o arquivo. O campo `**Blocked by:**` lista os números que o gateiam.
- **Fechar um ticket**: marque as caixas de aceite e troque `**Status:**` para `done`.
- **Spec**: permanece aberta até todos os tickets fecharem.

## Quando uma skill diz "publish to the issue tracker"

Escreva o arquivo em `.scratch/<feature-slug>/`.

## Quando uma skill diz "fetch the relevant ticket"

Leia `.scratch/<feature-slug>/issues/<NN>-<slug>.md`.

## Pull requests

**PRs as a request surface: no.** Não há PRs neste fluxo.
