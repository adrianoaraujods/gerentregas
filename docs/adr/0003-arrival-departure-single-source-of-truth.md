# 0003 — Arrival/Departure como única fonte de verdade

`arrival_at` e `departure_at` na `stop` (e nos snapshots de `stop_version`) são a **única** fonte de verdade para dwell time e para conclusão de paradas. A coluna `concluded_at` foi removida: "concluída" e "última parada concluída" passam a ser estados **derivados** de `departure_at IS NOT NULL`.

## Why

O MVP tinha duas fontes de verdade paralelas para o mesmo fato: o fluxo online (gerente) gravava só `concluded_at`, enquanto o sync (app do motorista) gravava `concluded_at = departure_at`. Os dois caminhos divergiam — uma rota executada pelo driver aparecia sem "dwell" no dashboard porque `arrival_at`/`departure_at` existiam, mas os gráficos (RN02/RN03) eram calculados a partir de intervalos entre `concluded_at` consecutivos. Qualquer manutenção posterior teria que decidir qual coluna venceria.

Como o driver é quem registra chegada/saída em cada parada, `departure_at` já é, de fato, o momento em que a parada termina. Persistir um segundo carimbo "concluída" é redundante e convida à divergência.

## Considered Options

- **Manter `concluded_at` e sincronizá-la sempre** (`concluded_at = departure_at`): preserva o código de "conclusão", mas deixa duas colunas com o mesmo significado livres para divergir (ex.: correção de horário, seed).
- **Remover `concluded_at` e derivar de `departure_at` (escolhido)**: um único campo, um único domínio. "Concluída" é uma projeção: `departure_at IS NOT NULL`; a rota está concluída quando todas as paradas têm `departure_at`. A parada de origem (ordem `1`) participa da conclusão da rota, mas nunca acumula dwell (RN01).

## Consequences

- `concludeStop` do gerente grava apenas `departure_at` (retrocompatível: sem `arrival_at`, a parada não acumula dwell, mas conta como concluída).
- Duplicate-arrival validation e `countOpenStops` do sync passam a usar `departure_at IS NULL`.
- Dashboards (dia, mês, período customizado), drilldown e CSV calculam dwell por parada como `departure_at − arrival_at`, somando apenas paradas não-Origem.
- Migração gerada remove `concluded_at` de `stop` e `stop_version`; o código não referencia mais a coluna.