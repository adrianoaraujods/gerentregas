# Gerentregas — Modelo de Dados (Persistência)

> Modelagem extraída das definições de esquema do Drizzle ORM em
> `src/server/db/schemas/*.ts` e conferida contra as migrações em
> `src/server/db/migrations/*/migration.sql`. Nenhuma entidade foi inferida sem
> evidência no código.

Banco: **PostgreSQL 16** (`docker-compose.yml`), acessado por `pg` + `drizzle-orm/node-postgres`
(`src/server/db/index.ts`). Convenção de nomenclatura: tabelas e colunas em inglês
(`snake_case`); tabelas de autenticação em singular (`user`, `session`, `account`,
`verification`) e tabelas de domínio em singular (`route`, `stop`, `point`, `vehicle`,
`parameter`) conforme o esquema.

---

## 1. Visão geral das entidades

| Entidade / Tabela | Atributos principais |
| --- | --- |
| **User** (`user`) | `id` (PK, texto), `name`, `email` (único por `lower(email)`), `email_verified`, `image`, `role` (enum `user_role`), `phone`, `document` (CPF criptografado), `deleted_at`, `banned`, `ban_reason`, `ban_expires`, `created_at`, `updated_at` |
| **Session** (`session`) | `id` (PK), `token` (único), `expires_at`, `user_id` (FK → `user`), `ip_address`, `user_agent`, `impersonated_by`, `created_at`, `updated_at` |
| **Account** (`account`) | `id` (PK), `account_id`, `provider_id`, `user_id` (FK → `user`), `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password`, `created_at`, `updated_at` |
| **Verification** (`verification`) | `id` (PK), `identifier`, `value`, `expires_at`, `created_at`, `updated_at` |
| **Vehicle** (`vehicle`) | `id` (PK), `plate` (único), `model`, `km_per_liter_hundredths`, `active`, `deleted_at`, `created_at`, `updated_at` |
| **Parameter** (`parameter`) | `id` (PK, valor fixo `"system"`), `fuel_price_per_liter` (centavos), `standard_workday_duration` (minutos), `created_at`, `updated_at` |
| **Point** (`point`) | `id` (PK), `name`, `address`, `latitude`, `longitude`, `geocode_status` (enum `geocode_status`), `deleted_at`, `created_at`, `updated_at` |
| **Route** (`route`) | `id` (PK), `manager_id` (FK → `user`), `driver_id` (FK → `user`), `vehicle_id` (FK → `vehicle`), `date`, `status` (enum `route_status`), `current_version`, `distance_km_hundredths`, `deleted_at`, `created_at`, `updated_at` |
| **RouteVersion** (`route_version`) | `id` (PK), `route_id` (FK → `route`), `version`, `manager_id` (FK → `user`), `driver_id` (FK → `user`), `vehicle_id` (FK → `vehicle`), `date`, `status` (enum `route_status`), `distance_km_hundredths`, `created_at` |
| **Stop** (`stop`) | `id` (PK), `route_id` (FK → `route`), `point_id` (FK → `point`), `order`, `address_snapshot`, `latitude_snapshot`, `longitude_snapshot`, `arrival_at`, `departure_at`, `deleted_at`, `created_at`, `updated_at` |
| **StopVersion** (`stop_version`) | `id` (PK), `stop_id` (FK → `stop`), `route_version_id` (FK → `route_version`), `order`, `point_id` (FK → `point`), `address_snapshot`, `latitude_snapshot`, `longitude_snapshot`, `arrival_at`, `departure_at`, `deleted_at`, `version_type` (enum `stop_version_type`), `actor_id` (FK → `user`), `created_at` |

**Total: 11 entidades/tabelas.**

---

## 2. Chaves primárias

Todas as tabelas usam chave primária simples do tipo `text` (`id`):

| Tabela | Definição da PK | Origem do valor |
| --- | --- | --- |
| `user`, `session`, `account`, `verification` | `id text PRIMARY KEY` | Gerado pelo better-auth |
| `vehicle` | `id text PRIMARY KEY` | `crypto.randomUUID()` em `FleetService.create` (seed usa id fixo `seed-vehicle-1`) |
| `parameter` | `id text PRIMARY KEY` | Valor fixo `"system"` (registro único) |
| `point` | `id text PRIMARY KEY` + `$defaultFn(() => crypto.randomUUID())` | UUID gerado pela aplicação |
| `route`, `route_version`, `stop`, `stop_version` | `id text PRIMARY KEY` + `$defaultFn(() => crypto.randomUUID())` | UUID gerado pela aplicação |

Chaves de negócio com restrição de unicidade:

| Restrição | Colunas | Propósito |
| --- | --- | --- |
| `unique_user_email_idx` | `lower(user.email)` | E-mail único, case-insensitive |
| `session.token` | `token` | Token de sessão único |
| `vehicle.plate` | `plate` | Placa única na frota |
| `unique_driver_date_idx` | `route.driver_id`, `route.date` | RN05 — um roteiro por motorista e data |
| `unique_route_version_idx` | `route_version.route_id`, `route_version.version` | Versão única por roteiro |
| `unique_route_order_idx` | `stop.route_id`, `stop.order` | RN06 — ordem sequencial única por roteiro |

---

## 3. Chaves estrangeiras

| Tabela | Coluna | Referência | `ON DELETE` | Significado |
| --- | --- | --- | --- | --- |
| `session` | `user_id` | `user.id` | CASCADE | Sessões do usuário |
| `account` | `user_id` | `user.id` | CASCADE | Contas de credencial do usuário |
| `route` | `manager_id` | `user.id` | — (sem ação) | Gerente responsável pela montagem do roteiro |
| `route` | `driver_id` | `user.id` | — (sem ação) | Motorista executor do roteiro |
| `route` | `vehicle_id` | `vehicle.id` | — (sem ação) | Veículo vinculado (opcional) |
| `route_version` | `route_id` | `route.id` | CASCADE | Versões do roteiro |
| `route_version` | `manager_id` | `user.id` | — (sem ação) | Autor da versão |
| `route_version` | `driver_id` | `user.id` | — (sem ação) | Motorista na versão |
| `route_version` | `vehicle_id` | `vehicle.id` | — (sem ação) | Veículo na versão |
| `stop` | `route_id` | `route.id` | CASCADE | Paradas do roteiro |
| `stop` | `point_id` | `point.id` | — (sem ação) | Ponto referenciado |
| `stop_version` | `stop_id` | `stop.id` | CASCADE | Versões da parada |
| `stop_version` | `route_version_id` | `route_version.id` | CASCADE | Versões agrupadas por versão do roteiro |
| `stop_version` | `point_id` | `point.id` | — (sem ação) | Ponto na versão |
| `stop_version` | `actor_id` | `user.id` | — (sem ação) | Autor da correção de horário |

Observações:

- `parameter` não possui chaves estrangeiras: é uma tabela de configuração singleton
  (`PARAMETER_ID = "system"` em `src/server/modules/parameters/parameters.repository.ts`).
- O relational `src/server/db/relations.ts` expõe ao ORM apenas as relações de
  autenticação (`user` → `sessions`/`accounts`, `session`/`account` → `user`); as demais
  relações são resolvidas por *joins* explícitos nos repositórios.

---

## 4. Relacionamentos

```
User 1 ──── * Session        (sessões ativas, CASCADE)
User 1 ──── * Account        (credenciais, CASCADE)

User (manager) 1 ──── * Route         (manager_id)
User (driver)   1 ──── * Route         (driver_id)   [único por data — RN05]
Vehicle         1 ──── * Route         (vehicle_id, opcional)

Route           1 ──── * RouteVersion  (CASCADE, version única)
Route           1 ──── * Stop          (CASCADE, order único — RN06)
Point           1 ──── * Stop          (referência do ponto)

Stop            1 ──── * StopVersion          (CASCADE)
RouteVersion    1 ──── * StopVersion          (CASCADE)
Point           1 ──── * StopVersion
User (ator)     1 ──── * StopVersion          (actor_id, correções)

Parameter       1 ──── 1 (singleton "system") — sem FK, lida por todas as rotas
```

### 4.1 Cardinalidades e semântica

| Relacionamento | Cardinalidade | Observação no código |
| --- | --- | --- |
| `User` → `Route` (motorista) | `1 : N` | Um motorista executa um roteiro por data; índice único `(driver_id, date)` |
| `User` → `Route` (gerente) | `1 : N` | Gerente monta o roteiro; `manager_id` gravado a partir da sessão |
| `Vehicle` → `Route` | `1 : N` | Frota compartilhada; o vínculo é opcional e travado ao iniciar o turno |
| `Route` → `Stop` | `1 : N` | Paradas ordenadas; a ordem `1` é a origem (RN01) |
| `Point` → `Stop` | `1 : N` | O mesmo ponto pode ser usado em roteiros distintos; a parada guarda *snapshot* de endereço/coordenadas |
| `Route` → `RouteVersion` | `1 : N` | Versionamento incremental (`version = currentVersion + 1`) |
| `RouteVersion` → `StopVersion` | `1 : N` | Cada versão materializa as paradas vigentes naquele momento |
| `Stop` → `StopVersion` | `1 : N` | Histórico da parada, com autoria em correções |

### 4.2 Versionamento de roteiro (auditoria)

O par `route` / `route_version` e `stop` / `stop_version` implementa o requisito de
auditoria (RNF06):

1. A criação do roteiro gera a versão `"1"` e as paradas correspondentes.
2. Toda alteração estrutural (motorista, veículo, status, distância, inclusão/exclusão de
   parada) chama `createNewVersion`, que cria uma nova `route_version` e replica as
   `stop_version` vigentes (`version_type = 'structural'`).
3. Correções de horário (`correctTimestamps`) registram uma `stop_version` adicional com
   `version_type = 'correction'` e `actor_id` do autor, na versão corrente.
4. A consulta de histórico (`routes.history`) devolve as versões com suas paradas, ponto,
   distância, custo e nome do ator.

---

## 5. Enumerados

| Enum | Valores | Coluna |
| --- | --- | --- |
| `user_role` | `driver`, `manager`, `admin` | `user.role` (padrão `driver`) |
| `geocode_status` | `success`, `failed`, `manual` | `point.geocode_status` (padrão `failed`) |
| `route_status` | `draft`, `in_flight`, `concluded`, `cancelled` | `route.status` (padrão `draft`), `route_version.status` |
| `stop_version_type` | `structural`, `correction` | `stop_version.version_type` (padrão `structural`) |

Transições de status válidas (implementadas em `RoutesService.validateStatusTransition`):

```
draft ──▶ in_flight ──▶ concluded
  │            │
  └──▶ cancelled ──▶ draft
```

---

## 6. Índices

| Índice | Tabela | Colunas |
| --- | --- | --- |
| `unique_user_email_idx` | `user` | `lower(email)` (único) |
| `session_user_id_idx` | `session` | `user_id` |
| `account_user_id_idx` | `account` | `user_id` |
| `verification_identifier_idx` | `verification` | `identifier` |
| `point_deleted_at_idx` | `point` | `deleted_at` |
| `unique_driver_date_idx` | `route` | `driver_id`, `date` (único) |
| `route_manager_id_idx` | `route` | `manager_id` |
| `route_driver_id_idx` | `route` | `driver_id` |
| `route_date_idx` | `route` | `date` |
| `route_deleted_at_idx` | `route` | `deleted_at` |
| `unique_route_version_idx` | `route_version` | `route_id`, `version` (único) |
| `route_version_route_id_idx` | `route_version` | `route_id` |
| `unique_route_order_idx` | `stop` | `route_id`, `order` (único) |
| `stop_route_id_idx` | `stop` | `route_id` |
| `stop_point_id_idx` | `stop` | `point_id` |
| `stop_deleted_at_idx` | `stop` | `deleted_at` |
| `stop_version_stop_id_idx` | `stop_version` | `stop_id` |
| `stop_version_route_version_idx` | `stop_version` | `route_version_id` |

---

## 7. Convenções de armazenamento

| Aspecto | Implementação |
| --- | --- |
| Datas | `timestamp` sem fuso (`date`, `created_at`, `arrival_at`, `departure_at`, `deleted_at`); consultas por dia usam intervalo `[00:00:00, 23:59:59.999]` |
| Valores por unidade | Centésimos para evitar ponto flutuante: `km_per_liter_hundredths`, `distance_km_hundredths`; centavos para dinheiro: `fuel_price_per_liter` e o custo calculado (`src/server/lib/money.ts`, `src/server/modules/routes/cost.ts`) |
| Exclusão lógica | `deleted_at` em `user`, `point`, `vehicle`, `route`, `stop`; listagens filtram por `deleted_at IS NULL`; restauração define `deleted_at = NULL` |
| `updated_at` | `defaultNow()` com `$onUpdate(() => new Date())` |
| Snapshot | `stop` e `stop_version` guardam `address_snapshot`, `latitude_snapshot`, `longitude_snapshot`, preservando o trajeto original mesmo que o ponto seja alterado |
| Conclusão | Não existe coluna de conclusão: derivada de `departure_at IS NOT NULL` (ADR 0003); a coluna `concluded_at` foi removida pela migração `20260924120331_cultured_giant_man` |
| Segurança de dados pessoais | `user.document` armazena o CPF criptografado (AES-256-GCM, `src/server/lib/crypto.ts`) e é mascarado na saída (`***.***.***-XX`) |
| Configuração singleton | `parameter.id = "system"`, criado/atualizado por *upsert* |

---

## 8. Dados iniciais (seeds)

| Script | O que garante |
| --- | --- |
| `src/server/db/scripts/seed.ts` (executado em `predev`/`prestart`) | Usuário administrador a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD` (papel `admin` garantido); parâmetros padrão `fuel_price_per_liter = 600` (R$ 6,00) e `standard_workday_duration = 480`; veículo padrão `ABC-1D23` (12,50 km/L) |
| `src/server/db/scripts/seed-demo.ts` | Base de demonstração: 1 gerente, 6 motoristas, pontos de Belo Horizonte, roteiros, paradas e suas versões (coberta por `tests/server/seed-demo.test.ts`) |
