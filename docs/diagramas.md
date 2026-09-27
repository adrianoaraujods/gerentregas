# Gerentregas — Diagramas

> Diagramas derivados da implementação do repositório: páginas e componentes em
> `src/app` e `src/components`, API tRPC em `src/server/api` e `src/server/modules/*`,
> esquema do banco em `src/server/db/schemas/*`.
>
> **Mapeamento dos requisitos:** os casos de uso referenciam os identificadores `RFxx`
> de [`docs/requisitos.md`](./requisitos.md); as entidades dos diagramas de robustez e de
> classes correspondem a [`docs/modelo-dados.md`](./modelo-dados.md).
>
> **Nota sobre notação:** o Mermaid não possui um tipo de diagrama UML nativo para casos
> de uso ou robustez; eles são representados por `flowchart` com o agrupamento e os esterótipos
> do UML preservados (ator, <<boundary>>, <<control>>, <<entity>>), e o diagrama de classes
> usa `classDiagram`.

---

## 1. Diagrama de Casos de Uso

Atores, casos de uso e associações conforme as procedures tRPC implementadas
(`auth`, `drivers`, `fleet`, `points`, `routes`, `dashboard`, `parameters`, `sync`) e as
telas correspondentes. A especialização representa o fato de que, no código, o perfil
`admin` atende a todas as procedures de `manager` (`roleMiddleware(["manager", "admin"])`).

```mermaid
flowchart TB
  subgraph ATORES["Atores"]
    direction LR
    A1(("Usuário<br/>não autenticado"))
    A2(("Motorista /<br/>Motoboy"))
    A3(("Gerente /<br/>Coordenador"))
    A4(("Administrador"))
  end

  subgraph CONTA["Conta e acesso"]
    direction TB
    UC01["RF01 Cadastrar-se"]
    UC02["RF02 Autenticar-se"]
    UC03["RF03 Encerrar sessão"]
    UC04["RF04 Solicitar redefinição de senha"]
    UC05["RF05 Redefinir senha com token"]
    UC06["RF06 Consultar o próprio perfil"]
    UC07["RF07 Ver a conta e alterar o tema"]
  end

  subgraph USUARIOS["Motoristas e gerentes"]
    direction TB
    UC08["RF08 Cadastrar motorista"]
    UC09["RF09 Cadastrar gerente"]
    UC10["RF10 Listar e buscar usuários"]
    UC11["RF11 Consultar usuário"]
    UC12["RF12 Atualizar dados e CPF"]
    UC13["RF13 Excluir usuário"]
    UC14["RF13 Restaurar usuário"]
  end

  subgraph FROTA["Frota de veículos"]
    direction TB
    UC15["RF14 Cadastrar veículo"]
    UC16["RF15 Listar veículos"]
    UC17["RF16 Editar veículo"]
    UC18["RF17 Excluir veículo"]
  end

  subgraph PONTOS["Pontos do roteiro"]
    direction TB
    UC19["RF18 / RF19 Cadastrar ponto com geocodificação"]
    UC20["RF20 Consultar ponto"]
    UC21["RF21 Listar pontos"]
    UC22["RF22 Editar ponto e re-geocodificar"]
    UC23["RF23 Excluir ponto"]
    UC24["RF23 Restaurar ponto"]
  end

  subgraph ROTEIROS["Roteiros, paradas e versões"]
    direction TB
    UC25["RF24 Montar roteiro do dia"]
    UC26["RF25 Calcular distância do roteiro"]
    UC27["RF26 Listar roteiros"]
    UC28["RF27 Consultar roteiro com paradas e tempo parado"]
    UC29["RF28 Editar roteiro e gerar versão"]
    UC30["RF29 Adicionar parada"]
    UC31["RF30 Editar parada"]
    UC32["RF31 Concluir parada"]
    UC33["RF32 Excluir parada"]
    UC34["RF33 Excluir roteiro"]
    UC35["RF33 Restaurar roteiro"]
    UC36["RF34 Consultar histórico de versões"]
    UC37["RF35 Corrigir horários da parada"]
  end

  subgraph OPERACAO["Execução do dia pelo motorista"]
    direction TB
    UC38["RF36 Consultar roteiro do dia"]
    UC39["RF37 Iniciar turno e escolher veículo"]
    UC40["RF38 Registrar chegada"]
    UC41["RF39 Registrar saída e tempo parado"]
    UC42["RF40 Registrar chegada e saída offline"]
    UC43["RF41 Sincronizar lote pendente"]
    UC44["RF42 Reprocessar ou descartar rejeitado"]
  end

  subgraph INDICADORES["Dashboard, histórico e parâmetros"]
    direction TB
    UC45["RF43 Dashboard por dia"]
    UC46["RF44 Dashboard por mês"]
    UC47["RF45 Dashboard por período"]
    UC48["RF46 Drilldown de um dia"]
    UC49["RF47 Exportar relatório CSV"]
    UC50["RF48 Consultar jornada padrão"]
    UC51["RF49 Consultar parâmetros"]
    UC52["RF50 Atualizar parâmetros"]
  end

  A1 --> UC01
  A1 --> UC02
  A1 --> UC04
  A1 --> UC05
  A1 --> UC07

  A2 --> UC03
  A2 --> UC06
  A2 --> UC07
  A2 --> UC16
  A2 --> UC38
  A2 --> UC39
  A2 --> UC40
  A2 --> UC41
  A2 --> UC42
  A2 --> UC43
  A2 --> UC44

  A3 --> UC03
  A3 --> UC06
  A3 --> UC08
  A3 --> UC10
  A3 --> UC11
  A3 --> UC12
  A3 --> UC13
  A3 --> UC15
  A3 --> UC16
  A3 --> UC17
  A3 --> UC18
  A3 --> UC19
  A3 --> UC20
  A3 --> UC21
  A3 --> UC22
  A3 --> UC23
  A3 --> UC25
  A3 --> UC27
  A3 --> UC28
  A3 --> UC29
  A3 --> UC30
  A3 --> UC31
  A3 --> UC32
  A3 --> UC33
  A3 --> UC34
  A3 --> UC36
  A3 --> UC37
  A3 --> UC45
  A3 --> UC46
  A3 --> UC47
  A3 --> UC48
  A3 --> UC49
  A3 --> UC50
  A3 --> UC51
  A3 --> UC52

  A4 --> UC09
  A4 --> UC10
  A4 --> UC14
  A4 --> UC24
  A4 --> UC35
  A4 -- "especializa" --> A3

  UC25 -->|"«include»"| UC26
  UC30 -->|"«include»"| UC26
  UC49 -->|"«include»"| UC48
  UC43 -->|"«extend»"| UC42
  UC40 -.->|"«extend» (offline)"| UC42
  UC41 -.->|"«extend» (offline)"| UC42
  UC44 -->|"«extend»"| UC43
  UC31 -->|"«include»"| UC22
  UC32 -->|"«include»"| UC41

  classDef ator fill:#dbe4ff,stroke:#3b5bdb,stroke-width:1px,color:#0b1a4a
  classDef uc fill:#ffffff,stroke:#495057,stroke-width:1px,color:#111111
  class A1,A2,A3,A4 ator
  class UC01,UC02,UC03,UC04,UC05,UC06,UC07,UC08,UC09,UC10,UC11,UC12,UC13,UC14,UC15,UC16,UC17,UC18,UC19,UC20,UC21,UC22,UC23,UC24,UC25,UC26,UC27,UC28,UC29,UC30,UC31,UC32,UC33,UC34,UC35,UC36,UC37,UC38,UC39,UC40,UC41,UC42,UC43,UC44,UC45,UC46,UC47,UC48,UC49,UC50,UC51,UC52 uc
```

### 1.1 Relações «include» / «extend» (e onde occurrem no código)

| Relação | Ocorrência no código |
| --- | --- |
| «include» RF25 → distância | `RoutesService.createRoute` chama `computeRouteDistance` |
| «include» RF29 → distância | `RoutesService.addStop` chama `recomputeRouteDistance` |
| «include» RF47 → drilldown | `DashboardRepository.exportCSV` executa `getDrilldown` |
| «extend» RF43 → registro offline | `DriverDayContent.handleCheckIn/handleCheckOut` desviam para `useSyncQueue` quando `isOnline === false` |
| «extend» RF44 → reprocessar rejeitado | `useSyncQueue.retry` / `dismiss` (delegando a `SyncClient`) operam sobre itens com `status = "rejected"` |
| «include» RF31 → registro de saída | `RoutesService.concludeStop` grava `departure_at` (equivalente ao check-out do motorista) |
| Especialização Administrador → Gerente | `managerMiddleware = roleMiddleware(["manager", "admin"])` |

---

## 2. Diagrama de Robustez

Mapeamento da arquitetura `routes/controllers/services/repositories` descrita em
`src/server/ARCHITECTURE.md`. As *boundaries* são telas e componentes de interface; os
*controls* são os routers tRPC, os controllers e os services; as *entities* são os
repositórios e as entidades persistidas.

```mermaid
flowchart TB
  subgraph ATORES["Atores"]
    direction LR
    A1(("Usuário<br/>não autenticado"))
    A2(("Motorista"))
    A3(("Gerente"))
    A4(("Administrador"))
  end

  subgraph B["<<boundary>> — Interface (src/app, src/components)"]
    direction TB
    B1["Páginas públicas<br/>/entrar · /cadastrar · /recuperar-conta<br/>/atualizar-senha · /minha-conta · / · /offline"]
    B2["Dashboard<br/>DashboardContent · PeriodHistoryContent<br/>DrilldownModal · CsvExportButton"]
    B3["Roteiros<br/>RoteirosContent · RouteDialog · RouteHistoryDialog"]
    B4["Cadastros<br/>PontosContent · PointDialog · DriversManagement<br/>FrotaPage · ConfiguracoesPage"]
    B5["Aplicativo do motorista<br/>DriverDayContent · useSyncQueue"]
    B6["<<boundary>> — Route Handlers<br/>/api/trpc · /api/auth/[...all]"]
  end

  subgraph C["<<control>> — tRPC, controllers e services (src/server)"]
    direction TB
    C0["Middleware de sessão e perfil<br/>auth · driver · manager · admin"]
    CR1["authRouter"]
    CR2["driversRouter"]
    CR3["fleetRouter"]
    CR4["pointsRouter"]
    CR5["routesRouter"]
    CR6["dashboardRouter"]
    CR7["parametersRouter"]
    CR8["syncRouter"]

    CC1["AuthController<br/>AuthService"]
    CC2["DriversController<br/>DriversService"]
    CC3["FleetController<br/>FleetService"]
    CC4["PointsController<br/>PointsService"]
    CC5["RoutesController<br/>RoutesService"]
    CC6["DashboardController<br/>DashboardService"]
    CC7["ParametersController<br/>ParametersService"]
    CC8["SyncController<br/>SyncService"]

    CX1["<<externo>> NominatimGeocoder<br/>geocodificação de endereço"]
    CX2["<<externo>> OsrmClient<br/>distância rodoviária"]
    CX3["<<externo>> better-auth<br/>createUser · sessão · redefinição de senha"]
    CX4["<<externo>> SMTP / Nodemailer<br/>e-mail de redefinição"]
  end

  subgraph E["<<entity>> — Repositórios e persistência"]
    direction TB
    ER1["AuthRepository"]
    ER2["DriversRepository<br/>encrypt / maskDocument"]
    ER3["FleetRepository"]
    ER4["PointsRepository"]
    ER5["RoutesRepository"]
    ER6["DashboardRepository"]
    ER7["ParametersRepository"]
    ER8["SyncRepository"]

    ED1[("PostgreSQL · tabelas<br/>user · session · account · verification<br/>vehicle · parameter · point<br/>route · route_version · stop · stop_version")]
    ED2[("Fila local do navegador<br/>IndexedDB · Dexie<br/>QueuedStopEvent")]
  end

  A1 --> B1
  A2 --> B5
  A3 --> B2
  A3 --> B3
  A3 --> B4
  A4 --> B4

  B1 --> B6
  B2 --> B6
  B3 --> B6
  B4 --> B6
  B5 --> B6

  B6 --> C0
  C0 --> CR1
  C0 --> CR2
  C0 --> CR3
  C0 --> CR4
  C0 --> CR5
  C0 --> CR6
  C0 --> CR7
  C0 --> CR8

  CR1 --> CC1
  CR2 --> CC2
  CR3 --> CC3
  CR4 --> CC4
  CR5 --> CC5
  CR6 --> CC6
  CR7 --> CC7
  CR8 --> CC8

  CC1 --> ER1
  CC2 --> ER2
  CC3 --> ER3
  CC4 --> ER4
  CC5 --> ER5
  CC6 --> ER6
  CC7 --> ER7
  CC8 --> ER8

  ER1 --> ED1
  ER2 --> ED1
  ER3 --> ED1
  ER4 --> ED1
  ER5 --> ED1
  ER6 --> ED1
  ER7 --> ED1
  ER8 --> ED1

  CC4 --> CX1
  CC5 --> CX2
  CC2 --> CX3
  CX3 --> CX4
  B5 --> ED2
  ED2 -->|"flush em lote (RF41)"| CR8
```

**Leitura do fluxo (exemplo — RF37 a RF39):**
`DriverDayContent` (*boundary*) → `routesRouter.startShift` → `RoutesController` →
`RoutesService.startShift` → `RoutesRepository` → tabelas `route`, `stop`, `route_version`,
`stop_version` (*entity*), com `OsrmClient` como integração externa quando a distância é
recalculada.

---

## 3. Diagrama de Classes Conceitual

Entidades persistidas com seus atributos, cardinalidades e enumerados. Atributos marcados
como `derivado` são calculados na camada de serviço e não são gravados no banco.

```mermaid
classDiagram
  direction LR

  class User {
    <<entidade>>
    +text id (PK)
    +text name
    +text email (UK)
    +boolean email_verified
    +text image
    +UserRole role
    +text phone
    +text document
    +boolean banned
    +text ban_reason
    +timestamp ban_expires
    +timestamp deleted_at
    +timestamp created_at
    +timestamp updated_at
  }

  class Session {
    <<entidade>>
    +text id (PK)
    +text token (UK)
    +timestamp expires_at
    +text user_id (FK)
    +text ip_address
    +text user_agent
    +text impersonated_by
    +timestamp created_at
    +timestamp updated_at
  }

  class Account {
    <<entidade>>
    +text id (PK)
    +text account_id
    +text provider_id
    +text user_id (FK)
    +text password
    +text access_token
    +text refresh_token
    +text id_token
    +text scope
    +timestamp created_at
    +timestamp updated_at
  }

  class Verification {
    <<entidade>>
    +text id (PK)
    +text identifier
    +text value
    +timestamp expires_at
    +timestamp created_at
    +timestamp updated_at
  }

  class Vehicle {
    <<entidade>>
    +text id (PK)
    +text plate (UK)
    +text model
    +integer km_per_liter_hundredths
    +boolean active
    +timestamp deleted_at
    +timestamp created_at
    +timestamp updated_at
  }

  class Parameter {
    <<entidade>>
    +text id (PK)
    +integer fuel_price_per_liter
    +integer standard_workday_duration
    +timestamp created_at
    +timestamp updated_at
  }

  class Point {
    <<entidade>>
    +text id (PK)
    +text name
    +text address
    +real latitude
    +real longitude
    +GeocodeStatus geocode_status
    +timestamp deleted_at
    +timestamp created_at
    +timestamp updated_at
  }

  class Route {
    <<entidade>>
    +text id (PK)
    +text manager_id (FK)
    +text driver_id (FK)
    +text vehicle_id (FK)
    +timestamp date
    +RouteStatus status
    +text current_version
    +integer distance_km_hundredths
    +timestamp deleted_at
    +timestamp created_at
    +timestamp updated_at
    +number distance_km (derivado)
    +number cost (derivado)
    +number totalDwellSeconds (derivado)
  }

  class RouteVersion {
    <<entidade>>
    +text id (PK)
    +text route_id (FK)
    +text version
    +text manager_id (FK)
    +text driver_id (FK)
    +text vehicle_id (FK)
    +timestamp date
    +RouteStatus status
    +integer distance_km_hundredths
    +timestamp created_at
  }

  class Stop {
    <<entidade>>
    +text id (PK)
    +text route_id (FK)
    +text point_id (FK)
    +text order
    +text address_snapshot
    +real latitude_snapshot
    +real longitude_snapshot
    +timestamp arrival_at
    +timestamp departure_at
    +timestamp deleted_at
    +timestamp created_at
    +timestamp updated_at
    +number dwellSeconds (derivado — RN02)
  }

  class StopVersion {
    <<entidade>>
    +text id (PK)
    +text stop_id (FK)
    +text route_version_id (FK)
    +text order
    +text point_id (FK)
    +text address_snapshot
    +real latitude_snapshot
    +real longitude_snapshot
    +timestamp arrival_at
    +timestamp departure_at
    +StopVersionType version_type
    +text actor_id (FK)
    +timestamp deleted_at
    +timestamp created_at
  }

  class UserRole {
    <<enumerado>>
    driver
    manager
    admin
  }

  class GeocodeStatus {
    <<enumerado>>
    success
    failed
    manual
  }

  class RouteStatus {
    <<enumerado>>
    draft
    in_flight
    concluded
    cancelled
  }

  class StopVersionType {
    <<enumerado>>
    structural
    correction
  }

  User "1" --> "0..*" Session : sessoes
  User "1" --> "0..*" Account : contas
  User "1" --> "0..*" Route : gerente
  User "1" --> "0..*" Route : motorista
  User "1" --> "0..*" RouteVersion : gerente
  User "1" --> "0..*" RouteVersion : motorista
  User "0..1" --> "0..*" StopVersion : ator da correcao
  Vehicle "0..1" --> "0..*" Route : veiculo do dia
  Vehicle "0..1" --> "0..*" RouteVersion : veiculo
  Route "1" --> "0..*" RouteVersion : versoes
  Route "1" --> "1..*" Stop : paradas
  Point "1" --> "0..*" Stop : ponto
  Point "1" --> "0..*" StopVersion : ponto
  Stop "1" --> "0..*" StopVersion : versoes
  RouteVersion "1" --> "0..*" StopVersion : paradas

  User --> UserRole : role
  Point --> GeocodeStatus : geocode_status
  Route --> RouteStatus : status
  RouteVersion --> RouteStatus : status
  StopVersion --> StopVersionType : version_type

  note for Route "RN05: um roteiro por motorista e data (driver_id + date). RN07: custo = distance_km x preco_combustivel / km_por_litro do veiculo; sem veiculo vinculado o custo e indeterminado."
  note for Stop "RN01: order = 1 e a origem, nao acumula dwell. Conclusao derivada de departure_at (ADR 0003)."
  note for Parameter "Registro unico com id = 'system'."
```

### 3.1 Cardinalidades e regras refletidas no diagrama

| Cardinalidade | Regra de negócio / restrição |
| --- | --- |
| `User 1 ─ 0..* Route` (motorista) | RN05 — um roteiro por motorista e data, garantido pelo índice único `(driver_id, date)` |
| `Vehicle 0..1 ─ 0..* Route` | Vínculo opcional no cadastro; obrigatório a partir do início do turno; travado para a data quando a rota está `in_flight` |
| `Route 1 ─ 1..* Stop` | A criação exige ao menos a parada de origem (`stops.min(1)`) com ordem `1` |
| `Stop.route_id + order` | RN06 — ordem sequencial e única por roteiro |
| `Route 1 ─ 0..* RouteVersion` / `Stop 1 ─ 0..* StopVersion` | RNF06 — auditoria por versionamento a cada alteração estrutural ou correção |
| `Point 1 ─ 0..* Stop` | O ponto é reutilizável; a parada guarda *snapshot* de endereço e coordenadas |
| `Parameter 1 ─ 1` | Singleton `id = "system"`, consultado por rotas e dashboard (RN04/RN07) |

---

## 4. Consistência entre os documentos

| Elemento | `requisitos.md` | `modelo-dados.md` | `diagramas.md` |
| --- | --- | --- | --- |
| Roteiro, paradas e versões | RF24–RF35, RN05, RN06, RNF06 | `route`, `stop`, `route_version`, `stop_version` | Casos de uso UC25–UC37; Robustez `routesRouter → RoutesController → RoutesService → RoutesRepository`; Classes `Route`, `Stop`, `RouteVersion`, `StopVersion` |
| Tempo parado e conclusão | RF31, RF38, RF39, RF43–RF46, RN01–RN03 | `stop.arrival_at` / `stop.departure_at` (derivação de conclusão) | UC32/UC40/UC41; `Stop.dwellSeconds` e `Route.totalDwellSeconds` como atributos derivados |
| Frota e custo | RF14–RF17, RF28, RF37, RN07 | `vehicle.km_per_liter_hundredths`, `parameter.fuel_price_per_liter`, `route.distance_km_hundredths` | UC15–UC18, UC39; `Vehicle` e `Parameter` no diagrama de classes |
| Controle de acesso | RNF05, RF08–RF13, RF24–RF35, RF38–RF42 | `user.role`, `session`, `account` | Middleware por perfil no diagrama de robustez; generalização Administrador → Gerente |
| Auditoria e versões | RF34, RF35, RNF06 | `route_version`, `stop_version.version_type`, `stop_version.actor_id` | `current_version` no diagrama de classes e fluxo `createNewVersion` no service |
| Operação offline do motorista | RF40–RF42, RNF03, RNF04 | — (fila local no cliente) | `DriverDayContent`/`useSyncQueue` e `QueuedStopEvent` (IndexedDB) como *boundary/entity* local |
| LGPD | RNF07 | `user.document` cifrado, `deleted_at` | `DriversRepository.encrypt / maskDocument` no diagrama de robustez |
