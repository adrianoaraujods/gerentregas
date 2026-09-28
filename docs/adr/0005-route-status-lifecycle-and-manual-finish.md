# 0005 — Status da rota como ciclo de vida, com conclusão automática e manual

`route.status` é o estado do ciclo de vida da rota (`draft` → `in_flight` → `concluded`), mantido como coluna armazenada mesmo que a conclusão seja derivável de `departure_at`. A conclusão é automática no último check-out do motorista; o gerente pode concluir manualmente uma rota `in_flight` (carimbando as partidas faltantes), e rotas já presas em `in_flight` foram corrigidas por backfill pontual.

## Considered Options

- **Só derivado, sem coluna de status** (o que o CONTEXT.md dizia): elimina divergência, mas o app do motorista, a tabela do gerente e o sync já leem `route.status` para decidir o que exibir e permitir (check-in/out exigem `in_flight`).
- **Status manual apenas pelo gerente**: simples, mas o fluxo normal do motorista nunca concluiria a rota sozinho.
- **Automático no último check-out + manual antecipado (escolhido)**: o caminho feliz não exige ação extra; o manual cobre exceções (parada pulada, rota abandonada, correção histórica).

## Consequences

- `checkOut` conclui a rota quando não restam paradas abertas; `sync.uploadBatch` já fazia o equivalente no caminho offline.
- `concludeRoute` (manager) carimba `departure_at` nas paradas abertas com o horário atual — sem `arrival_at`, elas contam como concluídas mas não acumulam dwell (mesma regra do `concludeStop`, ADR-0003).
- `getMyRoute`/`getDriverRoute` (sem dwell, sem chamadores) foi removido; o app do motorista usa só `getMyRouteWithDwell`.
