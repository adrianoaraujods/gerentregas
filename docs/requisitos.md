# Gerentregas — Especificação de Requisitos

> Documento derivado **exclusivamente do código implementando** neste repositório
> (`src/app`, `src/server`, `src/lib`, `src/components`, `src/server/db`, `tests`).
> Toda a terminologia de domínio segue `CONTEXT.md`; as regras de negócio (RN) são
> as mesmas implementadas e cobertas por testes.

---

## 1. Visão geral do sistema

**Gerentregas** é um sistema web (monólito Next.js com App Router) para gestão de
rotas de entrega que registra o **tempo parado** (*dwell time*) de profissionais de
campo em cada ponto do roteiro diário, calcula o **custo estimado** do trajeto e
apresenta indicadores em um dashboard.

### 1.1 Tecnologias utilizadas (evidenciadas no código)

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js 16 (App Router, Server Components, Route Handlers) + React 19 + TypeScript estrito |
| API | tRPC 11 (procedures `query`/`mutation`, batching HTTP em `/api/trpc`) + better-auth (`/api/auth/[...all]`) |
| Persistência | PostgreSQL 16 + Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `pg`) com migrações versionadas |
| Autenticação | better-auth (e-mail/senha, sessão com cache de cookie, plugin `admin`, plugin `i18n` pt) |
| Validação | Zod 4 (schemas de entrada/saída por módulo) |
| UI | Tailwind CSS 4, componentes shadcn/Base UI, Recharts, Sonner, `next-themes` |
| Cliente | PWA instalável (manifest + service worker), fila offline em IndexedDB via Dexie |
| Integrações | Nominatim (geocodificação), OSRM (distância rodoviária), SMTP/Nodemailer (e-mail de redefinição de senha) |
| Qualidade | Biome (lint/format), Vitest 4 (testes de servidor e de cliente), Husky + lint-staged + commitlint |

### 1.2 Arquitetura de módulos do backend

O backend segue quatro camadas por módulo, conforme `src/server/ARCHITECTURE.md` e
`src/server/modules/README.md`:

```
Router (tRPC)  →  Controller  →  Service  →  Repository  →  PostgreSQL
   (transporte)    (orquestra)    (regras)     (queries Drizzle)
```

Módulos implementados em `src/server/modules` (registrados em `src/server/api/router.ts`):
`auth`, `dashboard`, `drivers`, `fleet`, `parameters`, `points`, `routes`, `sync`.

Cada módulo possui `*.router.ts`, `*.controller.ts`, `*.service.ts`,
`*.repository.ts`, `*.types.ts` e `index.ts` (API pública do módulo).

### 1.3 Atores

| Ator | Perfil (`user.role`) | Acesso |
| --- | --- | --- |
| **Usuário não autenticado** | — | Páginas de entrada, cadastro, recuperação e redefinição de senha; rotas públicas de `better-auth` |
| **Motorista / Motoboy** | `driver` | Aplicação do dia (`/motorista`): executar o roteiro, registrar chegada/saída, sincronizar fila offline |
| **Gerente / Coordenador** | `manager` | Painel administrativo (`/admin`): roteiros, pontos, frota, motoristas, dashboard, histórico e parâmetros |
| **Administrador** | `admin` | Tudo o que o gerente faz, além de criar gerentes, restaurar registros excluídos e garantir o usuário admin |

A matriz de permissões é aplicada por middlewares tRPC
(`src/server/api/middleware.ts`): `publicProcedure`, `authenticatedProcedure`,
`driverProcedure`, `managerProcedure` (manager + admin) e `adminProcedure`.

### 1.4 Regras de negócio implementadas

| ID | Regra | Onde está implementada |
| --- | --- | --- |
| RN01 | A parada de origem (ordem `1`) não acumula tempo parado, não aceita check-in e não pode ser excluída | `routes.service.ts` (`createRoute`, `getRoute`, `checkIn`, `deleteStop`) |
| RN02 | Tempo parado da parada = `departure_at` − `arrival_at` | `routes.service.ts`, `dashboard.repository.ts` (`computeDwellMinutes`) |
| RN03 | Tempo total parado da rota = soma dos tempos das paradas, excluindo a origem | `routes.service.ts` (`totalDwellSeconds`) |
| RN04 | A jornada padrão (default 480 min = 8 h) é o denominador dos indicadores percentuais | `parameter.standard_workday_duration`, `dashboard.service.ts` |
| RN05 | Cada roteiro pertence a um único motorista e a uma única data | `checkDriverDateConflict`, índice único `unique_driver_date_idx` |
| RN06 | As paradas têm ordem sequencial e única por roteiro | validação sequencial + índice único `unique_route_order_idx` |
| RN07 | Custo do trajeto = `distance_km × preço_combustível / km_por_litro do veículo` | `routes/cost.ts`, distância via OSRM (`routes/osrm.ts`) |

Regras complementares implementadas no serviço de rotas:

- Transições de status válidas: `draft → in_flight | cancelled`, `in_flight → concluded | cancelled`,
  `cancelled → draft`; `concluded` é terminal (`validateStatusTransition`).
- Rota e veículo são travados ao iniciar o turno: não é possível trocar motorista, veículo
  ou distância em roteiro concluído/cancelado; a parada de origem e todas as paradas até a
  última concluída ficam congeladas.
- Um veículo não pode estar simultaneamente em duas rotas `in_flight` na mesma data
  (`isVehicleLockedForDate`).
- `arrival_at`/`departure_at` são a única fonte de verdade de tempo parado e de conclusão;
  não existe coluna "concluída" (ADR 0003).

---

## 2. Requisitos Funcionais

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RF01 | Cadastrar-se informando nome, e-mail e senha, gerando conta com perfil de motorista (padrão do sistema) | Alta |
| RF02 | Autenticar-se com e-mail e senha, com mensagens de erro em português | Alta |
| RF03 | Encerrar a sessão do usuário autenticado, redirecionando para a tela de entrada | Alta |
| RF04 | Solicitar o envio de e-mail com link de redefinição de senha para um e-mail cadastrado | Média |
| RF05 | Redefinir a senha utilizando o token recebido por e-mail, com confirmação da nova senha | Média |
| RF06 | Consultar o próprio perfil autenticado (nome, e-mail e imagem) | Média |
| RF07 | Consultar os dados da própria conta e alternar o tema da interface (sistema, claro, escuro) | Baixa |
| RF08 | Cadastrar motorista com nome, e-mail, senha, telefone em formato E.164 e CPF com 11 dígitos | Alta |
| RF09 | Cadastrar gerente com os mesmos dados, restrito ao perfil de administrador | Alta |
| RF10 | Listar usuários com paginação, filtro por perfil e busca por nome ou e-mail; gerente visualiza apenas motoristas e administrador visualiza todos os perfis | Alta |
| RF11 | Consultar os dados de um motorista/gerente específico | Média |
| RF12 | Atualizar nome, telefone e documento (CPF) do motorista, criptografando novamente o documento | Alta |
| RF13 | Excluir permanentemente usuários sem roteiros vinculados ou arquivar (bloqueando o acesso) os que possuem histórico; restaurar arquivados — gerentes restauram motoristas, administradores restauram qualquer perfil | Média |
| RF14 | Cadastrar veículo com placa, modelo, rendimento em km por litro e situação ativa/inativa | Alta |
| RF15 | Listar veículos, restringindo o motorista à lista de veículos ativos | Alta |
| RF16 | Atualizar veículo (placa, modelo, rendimento, situação), impedindo placa duplicada | Alta |
| RF17 | Excluir veículo permanentemente quando não há roteiros vinculados, ou arquivá-lo quando há histórico; veículos arquivados podem ser listados e restaurados | Média |
| RF18 | Cadastrar ponto com nome e endereço, obtendo latitude/longitude por geocodificação automática | Alta |
| RF19 | Cadastrar ponto com coordenadas informadas manualmente, marcando a origem como `manual` | Média |
| RF20 | Consultar o detalhe de um ponto (nome, endereço, coordenadas e situação da geocodificação) | Média |
| RF21 | Listar pontos com paginação, ordenação por data de criação e opção de incluir os excluídos | Alta |
| RF22 | Atualizar ponto, executando nova geocodificação quando o endereço muda e preservando coordenadas manuais quando informadas | Alta |
| RF23 | Excluir e restaurar pontos, com restauração exclusiva do administrador | Média |
| RF24 | Montar o roteiro diário associando motorista, data, veículo opcional e paradas em ordem sequencial começando pela origem | Alta |
| RF25 | Calcular automaticamente a distância do roteiro (soma dos trechos retornados pelo OSRM) e mantê-la indeterminada quando faltarem coordenadas | Alta |
| RF26 | Listar roteiros com paginação e filtros por motorista, status e intervalo de datas, exibindo distância e custo estimado | Alta |
| RF27 | Consultar o roteiro com suas paradas ordenadas, dados do ponto, tempo parado por parada e tempo total parado | Alta |
| RF28 | Alterar motorista, veículo, status ou distância do roteiro, gerando nova versão auditada e recalculando o custo | Alta |
| RF29 | Adicionar parada ao roteiro, respeitando o congelamento das paradas já concluídas e recalculando a distância | Alta |
| RF30 | Alterar o ponto e/ou a ordem de uma parada ainda não concluída | Alta |
| RF31 | Concluir uma parada registrando a saída, com transição automática de `draft` para `in_flight` e para `concluded` quando todas as paradas forem concluídas | Alta |
| RF32 | Excluir uma parada não concluída, vedando a exclusão da parada de origem | Alta |
| RF33 | Excluir (soft delete) e restaurar roteiros, com restauração exclusiva do administrador | Média |
| RF34 | Consultar o histórico de versões do roteiro, com paradas, distância, custo, status e autoria das correções | Média |
| RF35 | Corrigir as datas/horas de chegada e saída de uma parada (motorista da rota ou gerente), gerando uma versão do tipo `correction` com identificação do autor | Alta |
| RF36 | Visualizar o roteiro do dia, com a lista de paradas, o veículo do dia e o tempo parado acumulado | Alta |
| RF37 | Iniciar o turno, selecionando o veículo ativo quando não houver pré-atribuição, registrando a partida da origem e travando o veículo na data | Alta |
| RF38 | Registrar a chegada na parada, vedada a parada de origem, paradas já concluídas e rotas fora de `in_flight` | Alta |
| RF39 | Registrar a saída na parada, retornando o tempo parado calculado, vedada a saída sem chegada prévia | Alta |
| RF40 | Registrar chegada e saída em modo offline, mantendo os registros em fila local e sincronizando automaticamente ao voltar a conexão | Alta |
| RF41 | Enviar a fila offline em lote, recebendo resposta item a item (aceitos, rejeitados com motivo e resumo do lote) | Alta |
| RF42 | Reprocessar um registro rejeitado ou descartá-lo da fila | Média |
| RF43 | Consultar o dashboard do dia com barras empilhadas por motorista, exibindo o tempo parado de cada parada (chegada, saída e percentual da jornada padrão no tooltip) | Alta |
| RF44 | Consultar o dashboard do mês com a agregação diária de tempo parado e quantidade de paradas | Alta |
| RF45 | Consultar o dashboard de um período personalizado com a agregação diária entre duas datas | Alta |
| RF46 | Abrir o detalhamento (drilldown) da rota de um motorista no dia, com ponto, endereço, chegada, saída e tempo parado de cada parada | Alta |
| RF47 | Exportar o relatório do período selecionado em CSV, com nome de arquivo sugerido pelo período | Média |
| RF48 | Consultar a duração da jornada padrão configurada | Baixa |
| RF49 | Consultar os parâmetros do sistema (preço do combustível e jornada padrão) | Alta |
| RF50 | Atualizar os parâmetros do sistema (preço do combustível em R$/L e jornada padrão em minutos) sem alteração de código | Alta |
| RF51 | Impedir o login de usuários arquivados e revogar suas sessões ativas no momento do arquivamento | Alta |
| RF52 | Listar veículos e usuários arquivados com status "Arquivado" (ocultos por padrão), permitindo a restauração | Média |

**Total: 52 requisitos funcionais (RF01–RF52).**

### 2.1 Rastreabilidade requisito → implementação

| Área | Requisitos | Implementação principal |
| --- | --- | --- |
| Acesso e conta | RF01–RF07 | `src/lib/auth`, `src/app/(auth)/*`, `src/app/(auth)/minha-conta`, `src/server/email`, `src/server/modules/auth` |
| Usuários | RF08–RF13 | `src/server/modules/drivers/*`, `src/app/admin/motoristas`, `src/components/modules/drivers/drivers-management` |
| Frota | RF14–RF17 | `src/server/modules/fleet/*`, `src/app/admin/frota` |
| Pontos | RF18–RF23 | `src/server/modules/points/*` (inclui `geocoder.ts` — Nominatim), `src/app/admin/pontos` |
| Roteiros | RF24–RF35 | `src/server/modules/routes/*` (inclui `osrm.ts`, `cost.ts`), `src/app/admin/roteiros` |
| Operação do motorista | RF36–RF42 | `src/app/(pages)/motorista`, `src/components/modules/driver/driver-day-content`, `src/lib/sync/*`, `src/server/modules/sync/*` |
| Dashboard e histórico | RF43–RF48 | `src/server/modules/dashboard/*`, `src/app/admin/(dashboard)`, `src/app/admin/historico`, `src/components/modules/dashboard/*` |
| Parâmetros | RF49–RF50 | `src/server/modules/parameters/*`, `src/app/admin/configuracoes` |

---

## 3. Requisitos Não Funcionais

| ID | Requisito |
| --- | --- |
| RNF01 | Persistir todos os dados em banco relacional PostgreSQL 16 por meio do Drizzle ORM, com esquema declarado em código e migrações versionadas geradas por `drizzle-kit` |
| RNF02 | Oferecer interface web responsiva em português do Brasil (pt-BR), utilizável em desktop e em dispositivos móveis |
| RNF03 | Instalar como PWA (manifesto com ícones 192/512 e variantes *maskable*, `display: standalone`, orientação *portrait*) e registrar service worker em produção para cache do *shell* e aviso de uso offline |
| RNF04 | Operar de forma *offline-first* no aplicativo do motorista: registrar chegada/saída em fila local (IndexedDB via Dexie), enviar em lote (1 a 500 itens) e reter itens rejeitados com motivo, permitindo reenvio ou descarte |
| RNF05 | Aplicar controle de acesso por perfil (`driver`, `manager`, `admin`) em todas as operações, com middlewares tRPC e sessão gerenciada por better-auth, e redirecionar usuários sem perfil para a área correta |
| RNF06 | Manter registro de auditoria das alterações de roteiro por versionamento: cada mudança estrutural ou correção de horário gera `route_version`/`stop_version` com tipo (`structural`/`correction`), autor e data, expondo o histórico por roteiro |
| RNF07 | Atender à LGPD no tratamento de dados pessoais: CPF armazenado criptografado (AES-256-GCM com chave `ENCRYPTION_KEY`) e exibido mascarado (`***.***.***-XX`) nas listagens, com exclusão lógica preservando o histórico |
| RNF08 | Isolar a lógica de negócio em módulos com quatro camadas (router → controller → service → repository), sem dependência de conceitos HTTP nas camadas internas e com validação Zod na entrada e na saída |
| RNF09 | Retornar erros tipados e padronizados (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`) com mensagens em pt-BR, sem vazamento de colunas internas nas respostas |
| RNF10 | Garantir precisão monetária e de distância por cálculo em inteiros (preço do combustível e custo em centavos; distância e rendimento em centésimos), sem ponto flutuante na persistência |
| RNF11 | Integrar serviços externos de geocodificação (Nominatim) e de roteamento rodoviário (OSRM), com tratamento de falha que preserva o registro do ponto e deixa a distância indeterminada |
| RNF12 | Enviar e-mail de redefinição de senha via SMTP, com link de uso temporário e mensagem de descarte para quem não solicitou |
| RNF13 | Garantir desempenho do dashboard com agregação do tempo parado em consulta SQL, atendendo aos recortes de dia, mês e período personalizado, e percentual sobre a jornada padrão |
| RNF14 | Cobrir o comportamento por testes automatizados com Vitest — testes de servidor contra banco de testes real (recriado a cada execução) e testes de cliente com `fake-indexeddb` |
| RNF15 | Assegurar qualidade estática com TypeScript em modo estrito (`tsc --noEmit`), formatação e lintagem por Biome e commits convencionais validados por Husky/commitlint |
| RNF16 | Configurar o ambiente exclusivamente por variáveis de ambiente (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ENCRYPTION_KEY`, `SMTP_FROM/USER/PASS`), com falha imediata na ausência de variáveis obrigatórias |
| RNF17 | Garantir dados iniciais de execução: criação/atualização do usuário administrador, parâmetros padrão (R$ 6,00/L e 480 min) e veículo padrão, além de script de seed com base de demonstração verificada por teste |
| RNF18 | Usar cache de consultas no cliente com React Query (tRPC) e hidratação do cache em Server Components, evitando requisições duplicadas após a hidratação |

**Total: 18 requisitos não funcionais (RNF01–RNF18).**

### 3.1 Rastreabilidade requisito não funcional → implementação

| ID | Evidência no código |
| --- | --- |
| RNF01 | `src/server/db/schemas/*`, `src/server/db/migrations/*`, `drizzle.config.ts`, `docker-compose.yml` |
| RNF02 | `src/app/layout.tsx` (`lang="pt-BR"`), componentes responsivos, `next-themes` |
| RNF03 | `src/app/manifest.ts`, `public/sw.js`, `src/components/service-worker-registrar.tsx`, `public/icons/*` |
| RNF04 | `src/lib/sync/db.ts`, `src/lib/sync/sync-client.ts`, `src/lib/sync/use-sync-queue.ts`, `src/server/modules/sync/*`, `src/app/offline/page.tsx` |
| RNF05 | `src/server/api/middleware.ts`, `src/lib/auth/index.ts`, `src/app/admin/layout.tsx`, `src/app/(pages)/(home)/page.tsx` |
| RNF06 | `src/server/db/schemas/routes.ts` (`route_version`, `stop_version`), `routes.service.ts` (`createNewVersion`), `correctTimestamps` |
| RNF07 | `src/server/lib/crypto.ts`, `src/server/modules/drivers/drivers.repository.ts` (`encrypt`/`maskDocument`), colunas `deleted_at` |
| RNF08 | `src/server/ARCHITECTURE.md`, `src/server/modules/*` |
| RNF09 | `src/server/api/errors.ts`, `src/server/api/trpc.ts` (`errorFormatter`) |
| RNF10 | `src/server/lib/money.ts`, `src/server/modules/routes/cost.ts`, colunas `*_hundredths` |
| RNF11 | `src/server/modules/points/geocoder.ts`, `src/server/modules/routes/osrm.ts` |
| RNF12 | `src/server/email/index.ts`, `src/lib/auth/index.ts` (`sendResetPassword`) |
| RNF13 | `src/server/modules/dashboard/dashboard.repository.ts` (CTE `stop_dwell`/`daily_dwell`), `dashboard.service.ts` |
| RNF14 | `vitest.config.mjs`, `tests/global-setup.ts`, `tests/setup.ts`, `tests/server/*`, `tests/client/*` |
| RNF15 | `tsconfig.json`, `biome.json`, `.husky/*`, `commitlint.config.mjs` |
| RNF16 | `.env.example`, `src/lib/config.ts`, `src/server/db/index.ts`, `src/server/email/index.ts`, `src/server/lib/crypto.ts` |
| RNF17 | `src/server/db/scripts/seed.ts`, `ensure-admin.ts`, `seed-demo.ts`, `package.json` (`predev`/`prestart`) |
| RNF18 | `src/lib/api/client.ts`, `src/lib/api/server.ts`, `src/lib/query.ts`, `src/components/providers.tsx` |

---

## 4. Limitações conhecidas na implementação atual

Observações verificáveis no código, que delimitam o escopo realmente entregue:

- A tela **Minha conta** exibe os dados do usuário, mas a alteração de senha está
  desabilitada (`<ChangePasswordDialog disabled />`) e o `onSubmit` do formulário é vazio.
- A conclusão de parada pelo gerente (`concludeStop`) grava apenas `departure_at`; sem
  `arrival_at` a parada é contada como concluída, porém não acumula tempo parado (ADR 0003).
- O cálculo de distância depende de coordenadas geocodificadas; sem elas a distância e o
  custo permanecem indeterminados, e a distância pode ser sobrescrita manualmente pelo gerente
  (sempre gerando nova versão auditada).
- O aplicativo nativo com detecção automática de paradas por GPS está fora do escopo
  implementado; o cliente do motorista registra a chegada/saída manualmente (ADR 0001).
- Não há integração com folha de pagamento/ERP, nem roteirização automática.
- O arquivamento de usuário revoga suas sessões no banco, mas o cache de sessão em cookie
  (5 minutos) pode manter um acesso já autenticado por até esse intervalo (ADR 0004).
