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
flowchart LR

  %% =========================
  %% ATORES
  %% =========================

  A1["<div style='text-align:center'><pre>  o
 /|\
 / \</pre><b>Usuário<br/>não autenticado</b></div>"]

  A2["<div style='text-align:center'><pre>  o
 /|\
 / \</pre><b>Motorista /<br/>Motoboy</b></div>"]

  A3["<div style='text-align:center'><pre>  o
 /|\
 / \</pre><b>Gerente /<br/>Coordenador</b></div>"]

  A4["<div style='text-align:center'><pre>  o
 /|\
 / \</pre><b>Administrador</b></div>"]

  %% Generalização do Administrador
  A4 -. "especializa" .-> A3


  %% =========================
  %% FRONTEIRA DO SISTEMA
  %% =========================

  subgraph SISTEMA["SISTEMA DE GESTÃO DE ROTAS E ENTREGAS"]
    direction TB

    %% -------------------------
    %% CONTA E ACESSO
    %% -------------------------

    subgraph CONTA["Conta e acesso"]
      direction TB
      UC01(["Cadastrar-se"])
      UC02(["Autenticar-se"])
      UC03(["Encerrar sessão"])
      UC04(["Solicitar redefinição de senha"])
      UC05(["Redefinir senha com token"])
      UC06(["Consultar próprio perfil"])
      UC07(["Alterar tema da conta"])
    end


    %% -------------------------
    %% USUÁRIOS
    %% -------------------------

    subgraph USUARIOS["Gestão de usuários"]
      direction TB
      UC08(["Cadastrar motorista"])
      UC09(["Cadastrar gerente"])
      UC10(["Listar usuários"])
      UC11(["Consultar usuário"])
      UC12(["Atualizar dados do usuário"])
      UC13(["Excluir usuário"])
      UC14(["Restaurar usuário"])
    end


    %% -------------------------
    %% FROTA
    %% -------------------------

    subgraph FROTA["Gestão de veículos"]
      direction TB
      UC15(["Cadastrar veículo"])
      UC16(["Listar veículos"])
      UC17(["Editar veículo"])
      UC18(["Excluir veículo"])
    end


    %% -------------------------
    %% PONTOS
    %% -------------------------

    subgraph PONTOS["Gestão de pontos do roteiro"]
      direction TB
      UC19(["Cadastrar ponto"])
      UC20(["Consultar ponto"])
      UC21(["Listar pontos"])
      UC22(["Editar ponto"])
      UC23(["Excluir ponto"])
      UC24(["Restaurar ponto"])
      UC25(["Geocodificar endereço"])
    end


    %% -------------------------
    %% ROTEIROS
    %% -------------------------

    subgraph ROTEIROS["Gestão de roteiros"]
      direction TB
      UC26(["Montar roteiro do dia"])
      UC27(["Calcular distância do roteiro"])
      UC28(["Listar roteiros"])
      UC29(["Consultar roteiro"])
      UC30(["Editar roteiro"])
      UC31(["Gerar versão do roteiro"])
      UC32(["Adicionar parada"])
      UC33(["Editar parada"])
      UC34(["Concluir parada"])
      UC35(["Excluir parada"])
      UC36(["Excluir roteiro"])
      UC37(["Restaurar roteiro"])
      UC38(["Consultar histórico de versões"])
      UC39(["Corrigir horários da parada"])
    end


    %% -------------------------
    %% OPERAÇÃO
    %% -------------------------

    subgraph OPERACAO["Execução do roteiro"]
      direction TB
      UC40(["Consultar roteiro do dia"])
      UC41(["Iniciar turno"])
      UC42(["Escolher veículo"])
      UC43(["Registrar chegada"])
      UC44(["Registrar saída"])
      UC45(["Registrar tempo parado"])
      UC46(["Registrar chegada e saída offline"])
      UC47(["Sincronizar registros pendentes"])
      UC48(["Reprocessar registro rejeitado"])
      UC49(["Descartar registro rejeitado"])
    end


    %% -------------------------
    %% INDICADORES
    %% -------------------------

    subgraph INDICADORES["Dashboard e relatórios"]
      direction TB
      UC50(["Consultar dashboard diário"])
      UC51(["Consultar dashboard mensal"])
      UC52(["Consultar dashboard por período"])
      UC53(["Consultar detalhes de um dia"])
      UC54(["Exportar relatório CSV"])
      UC55(["Consultar jornada padrão"])
      UC56(["Consultar parâmetros"])
      UC57(["Atualizar parâmetros"])
    end


    %% =========================
    %% RELACIONAMENTOS INCLUDE
    %% =========================

    UC04 -. "«include»" .-> UC05

    UC19 -. "«include»" .-> UC25
    UC22 -. "«include»" .-> UC25

    UC26 -. "«include»" .-> UC27

    UC30 -. "«include»" .-> UC31

    UC32 -. "«include»" .-> UC27

    UC41 -. "«include»" .-> UC42

    UC44 -. "«include»" .-> UC45

    UC54 -. "«include»" .-> UC53


    %% =========================
    %% RELACIONAMENTOS EXTEND
    %% =========================

    UC46 -. "«extend»" .-> UC43
    UC46 -. "«extend»" .-> UC44

    UC47 -. "«extend»" .-> UC46

    UC48 -. "«extend»" .-> UC47
    UC49 -. "«extend»" .-> UC47

    UC39 -. "«extend»" .-> UC33
  end


  %% =========================
  %% ASSOCIAÇÕES DOS ATORES
  %% =========================

  %% Usuário não autenticado
  A1 --- UC01
  A1 --- UC02
  A1 --- UC04
  A1 --- UC05


  %% Motorista
  A2 --- UC03
  A2 --- UC06
  A2 --- UC07
  A2 --- UC16
  A2 --- UC40
  A2 --- UC41
  A2 --- UC43
  A2 --- UC44
  A2 --- UC46
  A2 --- UC47
  A2 --- UC48
  A2 --- UC49


  %% Gerente
  A3 --- UC03
  A3 --- UC06
  A3 --- UC07

  A3 --- UC08
  A3 --- UC10
  A3 --- UC11
  A3 --- UC12
  A3 --- UC13

  A3 --- UC15
  A3 --- UC16
  A3 --- UC17
  A3 --- UC18

  A3 --- UC19
  A3 --- UC20
  A3 --- UC21
  A3 --- UC22
  A3 --- UC23

  A3 --- UC26
  A3 --- UC28
  A3 --- UC29
  A3 --- UC30
  A3 --- UC32
  A3 --- UC33
  A3 --- UC34
  A3 --- UC35
  A3 --- UC36
  A3 --- UC38
  A3 --- UC39

  A3 --- UC50
  A3 --- UC51
  A3 --- UC52
  A3 --- UC53
  A3 --- UC54
  A3 --- UC55
  A3 --- UC56
  A3 --- UC57


  %% Administrador
  A4 --- UC09
  A4 --- UC14
  A4 --- UC24
  A4 --- UC37


  %% =========================
  %% ESTILOS
  %% =========================

  classDef ator fill:#ffffff,stroke:#3b5bdb,stroke-width:2px,color:#0b1a4a
  classDef uc fill:#ffffff,stroke:#495057,stroke-width:1.5px,color:#111111

  class A1,A2,A3,A4 ator
  class UC01,UC02,UC03,UC04,UC05,UC06,UC07,UC08,UC09,UC10,UC11,UC12,UC13,UC14,UC15,UC16,UC17,UC18,UC19,UC20,UC21,UC22,UC23,UC24,UC25,UC26,UC27,UC28,UC29,UC30,UC31,UC32,UC33,UC34,UC35,UC36,UC37,UC38,UC39,UC40,UC41,UC42,UC43,UC44,UC45,UC46,UC47,UC48,UC49,UC50,UC51,UC52,UC53,UC54,UC55,UC56,UC57 uc

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
`src/server/ARCHITECTURE.md` para um diagrama de robustez, organizando os elementos
segundo os estereótipos _actor_, _boundary_, _control_ e _entity_. As _boundaries_
representam as interfaces e telas do sistema; os _controls_ representam os routers
tRPC, controllers e services responsáveis pela coordenação das operações; e as
_entities_ representam os objetos de domínio, repositórios e dados persistidos.

Os atores interagem com as _boundaries_, que encaminham as solicitações aos
_controls_, e estes acessam ou manipulam as _entities_, evidenciando o fluxo
**ator → boundary → control → entity**.


```mermaid
flowchart LR

  %% =====================================================
  %% ATORES
  %% =====================================================

  A1(["👤<br/>Usuário<br/>não autenticado"])
  A2(["👤<br/>Motorista"])
  A3(["👤<br/>Gerente"])
  A4(["👤<br/>Administrador"])


  %% =====================================================
  %% BOUNDARY — INTERFACES
  %% =====================================================

  B1(("«boundary»<br/>Interface pública<br/>Entrar · Cadastrar<br/>Recuperar conta<br/>Atualizar senha"))

  B2(("«boundary»<br/>Interface do motorista<br/>DriverDayContent<br/>Sincronização offline"))

  B3(("«boundary»<br/>Interface do gerente<br/>Dashboard<br/>Roteiros<br/>Histórico"))

  B4(("«boundary»<br/>Interface administrativa<br/>Pontos · Motoristas<br/>Frota · Configurações"))


  %% =====================================================
  %% CONTROL — CONTROLES
  %% =====================================================

  C1(("«control»<br/>AuthControl<br/>Autenticação<br/>Sessão · Recuperação"))

  C2(("«control»<br/>DriverControl<br/>Gestão de motoristas"))

  C3(("«control»<br/>FleetControl<br/>Gestão da frota"))

  C4(("«control»<br/>PointControl<br/>Gestão de pontos"))

  C5(("«control»<br/>RouteControl<br/>Gestão de roteiros<br/>Histórico de rotas"))

  C6(("«control»<br/>DashboardControl<br/>Indicadores · Histórico<br/>Exportação"))

  C7(("«control»<br/>ParameterControl<br/>Parâmetros do sistema"))

  C8(("«control»<br/>SyncControl<br/>Sincronização offline"))


  %% =====================================================
  %% ENTITY — ENTIDADES
  %% =====================================================

  E1(["«entity»<br/>Usuário"])
  E2(["«entity»<br/>Sessão"])
  E3(["«entity»<br/>Motorista"])
  E4(["«entity»<br/>Veículo"])
  E5(["«entity»<br/>Ponto"])
  E6(["«entity»<br/>Rota"])
  E7(["«entity»<br/>Versão da rota"])
  E8(["«entity»<br/>Parada"])
  E9(["«entity»<br/>Parâmetro"])
  E10(["«entity»<br/>Evento de sincronização"])


  %% =====================================================
  %% SISTEMAS EXTERNOS
  %% =====================================================

  X1(["«external»<br/>Nominatim"])
  X2(["«external»<br/>OSRM"])
  X3(["«external»<br/>better-auth"])
  X4(["«external»<br/>SMTP / Nodemailer"])


  %% =====================================================
  %% ATORES → BOUNDARY
  %% =====================================================

  A1 --> B1

  A2 --> B2

  A3 --> B3

  A4 --> B4


  %% =====================================================
  %% BOUNDARY → CONTROL
  %% =====================================================

  B1 --> C1

  B2 --> C5
  B2 --> C8

  B3 --> C5
  B3 --> C6

  B4 --> C2
  B4 --> C3
  B4 --> C4
  B4 --> C7


  %% =====================================================
  %% CONTROL → ENTITY
  %% =====================================================

  C1 --> E1
  C1 --> E2

  C2 --> E3

  C3 --> E4

  C4 --> E5

  C5 --> E6
  C5 --> E7
  C5 --> E8

  C6 --> E6
  C6 --> E8

  C7 --> E9

  C8 --> E10
  C8 --> E8


  %% =====================================================
  %% CONTROL → SISTEMAS EXTERNOS
  %% =====================================================

  C4 --> X1
  C5 --> X2
  C1 --> X3
  X3 --> X4


  %% =====================================================
  %% ESTILIZAÇÃO
  %% =====================================================

  classDef ator fill:#fff,stroke:#222,stroke-width:2px,color:#111;
  classDef boundary fill:#fff9c4,stroke:#222,stroke-width:2px,color:#111;
  classDef control fill:#fff9c4,stroke:#222,stroke-width:2px,color:#111;
  classDef entity fill:#fff9c4,stroke:#222,stroke-width:2px,color:#111;
  classDef external fill:#e0e0e0,stroke:#555,stroke-width:2px,color:#111;

  class A1,A2,A3,A4 ator;
  class B1,B2,B3,B4 boundary;
  class C1,C2,C3,C4,C5,C6,C7,C8 control;
  class E1,E2,E3,E4,E5,E6,E7,E8,E9,E10 entity;
  class X1,X2,X3,X4 external;

```
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
