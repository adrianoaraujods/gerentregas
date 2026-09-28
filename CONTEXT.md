# Gerentregas — Context

Sistema de gestão de rotas de entrega que registra o tempo parado (dwell time) de profissionais de campo em cada ponto do roteiro diário, com dashboard, cálculo de custos e conformidade LGPD.

## Language

### Core Entities

**Route** (Roteiro):
An ordered list of stops assigned to a single driver on a single date. Each route has a total distance, total dwell time, and estimated cost. A vehicle may be bound at creation (manager) or picked by the driver at shift start.
_Avoid_: Roteiro, itinerary, trip

**Stop** (Ponto):
A geographic location within a route, identified by sequential order, address, coordinates, arrival/departure timestamps, and calculated dwell time. The first stop is always the Origin and does not accumulate dwell time.
_Avoid_: Ponto, checkpoint, waypoint

**Origin** (Ponto de partida):
The first stop in a route. Does not accumulate dwell time per business rule RN01.
_Avoid_: Starting point, departure point, first stop

**Vehicle** (Veículo):
A company-owned vehicle in the fleet, with fuel consumption (km per liter). Assigned to a single driver for the day: optionally by the manager when creating the route, otherwise picked by the driver at shift start (overriding any pre-assignment). Determines the route's cost. No driver owns a fixed vehicle.
_Avoid_: car, truck, moto (model-specific terms belong in the UI only)

**Driver** (Motorista / Motoboy):
A field professional who executes routes. Assigned to one route per day. Records arrival and departure at each stop via the driver app. Operates a Vehicle from the shared fleet, assigned per route.
_Avoid_: Entregador, transportador, courier

**Manager** (Gerente / Coordenador):
A coordinator who builds daily routes, assigns drivers, and monitors performance via the dashboard.
_Avoid_: Admin, owner, supervisor

### Domain Concepts

**Dwell time** (Tempo parado):
The duration a vehicle remains stationary at a stop, calculated as departure time minus arrival time. The first stop (Origin) is excluded. Sum of all dwell times across a route equals the route's total dwell time.
_Avoid_: Idle time, stopped time, tempo parado

**Completion** (Conclusão / status do ciclo de vida):
A stop is *concluded* when it has a departure timestamp (`departure_at IS NOT NULL`); a route is concluded when every stop has one. `arrival_at`/`departure_at` are the single source of truth for both dwell time and completion; the stored `route.status` (`in_flight` → `concluded`) is the route lifecycle state, set automatically on the last departure or manually by a manager finishing early.
_Avoid_: concluded_at, finished flag, flag de conclusão

**Standard workday** (Jornada padrão):
8 hours per day. Used as the denominator for dwell time percentage indicators.
_Avoid_: shift, work period

**Route metrics** (Métricas do roteiro):
The dwell-derived quantities of a Route — per-stop dwell time (Origin excluded), route total dwell, and dwell percentage of the standard workday — computed by one shared module (`src/lib/route-metrics`). The dashboard's month views keep a SQL aggregation, pinned equivalent by test. Route cost keeps its own home in the Route module.
_Avoid_: dwell engine, statistics service

**Parameter** (Parâmetro):
Configurable system value: fuel price per liter and standard workday duration. Fuel consumption is a Vehicle attribute; cost per kilometer is derived (`fuel_price / vehicle.km_per_liter`). Alterable via UI without code changes.
_Avoid_: config, setting

**Route cost** (Custo do trajeto):
Estimated expense for a route. Formula: `distance_km × fuel_price / vehicle.km_per_liter`, using the vehicle bound to the route. When no vehicle is bound, cost is undetermined until the driver picks one. Distance is road distance via OSRM routing over the stops' geocoded coordinates (address → coordinates via a geocoder such as Nominatim; coordinates → distance via OSRM). Any distance override is versioned.
_Avoid_: trip cost, delivery cost

**Archived** (Arquivado):
The deletion state of a vehicle or user that has route history (`route`, `route_version`, or `stop_version.actor_id` references): the row stays with `deleted_at` set and the record cannot be edited, only restored. Records without route history are permanently deleted instead — archiving exists to preserve route history and audit. An archived user additionally gets `banned = true` and all sessions revoked, so they cannot sign in. Archived rows are hidden by default in listings and carry the "Arquivado" status badge.
_Avoid_: deactivated, disabled, soft-deleted (legacy terms for this state)

### Architecture

**SyncClient**:
Shared interface for local storage and background synchronization. Two implementations: Dexie.js (IndexedDB) for PWA, expo-sqlite for native. Both use the same protocol: queue locally → batch upload → server accepts/rejects.
_Avoid_: sync engine, offline manager

## Conventions

- **Code**: English (variables, functions, types, comments)
- **User-facing content**: pt-BR (UI labels, error messages, notifications)
- **Documentation**: PT-BR (CONTEXT.md, ADRs, README)
- **Database**: English table/column names, pt-BR only in UI display

## Business Rules

- RN01: Origin stop does not accumulate dwell time
- RN02: Dwell time = departure timestamp − arrival timestamp
- RN03: Route total dwell time = sum of all stop dwell times (excluding Origin)
- RN04: Standard workday = 8h/day (dwell time percentage denominator)
- RN05: Each route belongs to one driver and one date
- RN06: Stops have sequential order (1, 2, 3, …)
- RN07: Route cost = distance × (fuel price / vehicle km per liter); distance from OSRM routing
- RN08: Deleting a vehicle or user with route history archives it; without history it is permanently deleted
- RN09: Archived users are banned at sign-in (sessions revoked on archive)
