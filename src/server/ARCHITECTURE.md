# Server Architecture

The backend lives under `src/server/` and is organized into **modules** — bounded contexts that encapsulate all domain logic. Each module follows a four-layer architecture.

## Module structure

```
src/server/modules/{module}/
├── {module}.repository.ts    Data access (Drizzle queries)
├── {module}.service.ts       Business logic
├── {module}.controller.ts    Orchestration (framework-agnostic)
├── {module}.router.ts        tRPC procedures (transport layer)
├── {module}.types.ts         Zod schemas + TypeScript types
└── index.ts                  Barrel export
```

## Layers

### Repository

The data access layer. A class that receives an instance of the database access in the constructor and uses the Drizzle query builder. Each method runs a single query or a small set of related queries.

**Rules:**

- One repository per module
- No business logic — just queries
- Returns raw Drizzle rows or joined results
- Should not have explicit return types, but map to the correct shape but should return all avaliable collumns.

### Service

Contains business logic. Injected with a repository and other modules controllers if needed. Called only by it's controller. Framework-agnostic, no request/response objects, no HTTP concepts.

**Rules:**

- One service per module
- Throws domain errors (`NotFoundError`, `ConflictError`, etc.) — never returns error objects
- Validates business invariants (e.g., "certificate already exists for this enrollment")
- Called only by the controller
- Should not have explicit return types — except when the method constructs a new domain shape (e.g. builds a tree), in which case the return type should be declared

### Controller

The **boundary between the server's internal data shapes and what clients can ever receive**. A thin orchestration layer. Injected with all module dependencies and wires them in the constructor. Each method maps 1:1 to a use case. Returns data directly — errors propagate as domain errors and are converted by the transport layer.

Each method parses its result with the module's output Zod schema — the full, widest shape a client could ever see — and declares that inferred type as its return type. The parse strips anything not in the schema, so internal columns can never leak even if a repository or service returns extra fields.

> **Note:** Runtime response parsing (`.parse`) is a behavior change and lands incrementally. Until it lands, controllers return the service's rows, which structurally match the declared output-schema types — the explicit return types above are the type-level contract in the interim.

**Rules:**

- One controller per module
- No HTTP concepts (no `NextRequest`, no `cookies()`)
- No business logic — just calls the service
- Called by tRPC routers, Route Handlers, or better-auth callbacks
- MUST have explicit return types, inferred from the module's output Zod schemas (`z.infer<typeof schema>`)
- Each method MUST parse its result with the module's output schema (`.parse`)
- Joined methods need a dedicated output schema describing the joined shape

**Example:**

```ts
import type { Database } from "@/server/db";
import { OtherController } from "@/server/modules/other";

import { ExampleRepository } from "./example.repository";
import { ExampleService } from "./example.service";
import { exampleSchema } from "./example.types";
import type { Example } from "./example.types";

export class ExampleController {
  private readonly service: ExampleService;

  constructor(private readonly db: Database) {
    this.service = new ExampleService(new ExampleRepository(db));
  }

  async create(input: CreateExampleInput): Promise<Example> {
    return exampleSchema.parse(await this.service.create(input));
  }

  async getById(id: Example["id"]): Promise<Example> {
    return exampleSchema.parse(await this.service.getById(id));
  }

  async update(input: UpdateExampleInput): Promise<Example> {
    return exampleSchema.parse(await this.service.update(input));
  }

  async delete(id: Example["id"]): Promise<void> {
    await this.service.delete(id);
  }

  async methodWithDependency(id: Example["id"]): Promise<Example> {
    const otherController = new OtherController(this.db);

    return exampleSchema.parse(
      await this.service.methodWithDependency(id, otherController),
    );
  }
}
```

### Router

The tRPC transport layer. Defines procedures (queries/mutations) that validate input via Zod and call the controller. The controller already parsed the result to the module's full output shape — the router forwards it as-is, unless a procedure must expose less, in which case it narrows the result with a per-access-level output schema.

**Rules:**

- One router per module, registered in `src/server/api/router.ts`
- Validates input with the module's Zod schema
- Handles auth via procedure types: `publicProcedure`, `authenticatedProcedure`, `managerProcedure`
- Instanciates the controller with all the dependencies, using the database from the context.
- Forwards the controller's parsed result without further parsing
- Can have multiple procedures that call the same controller method at different levels of access — the narrower access level parses the result with a reduced (`.pick`/`.omit`) output schema

**Example:**

```ts
import { managerProcedure, createRouter, publicProcedure } from "@/server/api";

import { ExampleController } from "./example.controller";
import {
  createExampleSchema,
  exampleSchema,
  publicExampleSchema,
  updateExampleSchema,
} from "./example.types";

export const exampleRouter = createRouter({
  create: managerProcedure
    .input(createExampleSchema)
    .mutation(({ ctx: { db }, input }) =>
      new ExampleController(db).create(input),
    ),

  get: publicProcedure
    .input(exampleSchema.shape.id)
    .query(({ ctx: { db }, input: id }) =>
      new ExampleController(db).getById(id).then(publicExampleSchema.parse),
    ),

  getAsAdmin: managerProcedure
    .input(exampleSchema.shape.id)
    .query(({ ctx: { db }, input: id }) =>
      new ExampleController(db).getById(id),
    ),

  update: managerProcedure
    .input(updateExampleSchema)
    .mutation(({ ctx: { db }, input }) =>
      new ExampleController(db).update(input),
    ),

  delete: managerProcedure
    .input(exampleSchema.shape.id)
    .mutation(({ ctx: { db }, input: id }) =>
      new ExampleController(db).delete(id),
    ),
});
```

### Types

Zod schemas and TypeScript types specific to the module. Schemas define input/output contracts. Types are inferred from schemas or derived from Drizzle table types.

**Rules:**

- Input schemas are used by the router for validation
- Output schemas are required — the controller parses each method's result with them, and access-level narrowings are derived from them (`.pick`/`.omit`) at the router
- Should have a schema for each type of operation:
    1. Read: contain all the database columns (use `createSelectSchema()` as a base), should have one schema for each level of access.
    1. Insert: should have all permited columns and have custom error messages. (use `createInsertSchema()` as a base)
    2. Create: should extend the Insert Schema, inheriting the error messages (tip: use `.and()` if the type is deep nested). 
    3. Update: should extend the Create Schema and ommit not allowed fields.
- Do not use Drizzle-inferred types (`$inferSelect`, `$inferInsert`), types should be infered by the Zod Schemas.

### Index Files

Re-export the module controller, router and types. The zod schemas SHOULD NOT be re-exported, since this could create problems for front-end in client components.

## Dependency flow

```
Router → Controller → Service → Repository → DB
```

Each layer only knows about the layer directly below it. The router never calls the service or repository directly. The service never imports from `@/server/db/`.

Data propagates upward unfiltered: the repository returns all columns, the service passes them through, and the controller strips to the module's full output shape via `.parse`. Narrowing to access-level views happens only at the router. Never select or narrow at a lower layer — that forces additional queries.

## Error handling

All layers can throw domain errors, imported from `@/server/api` (subclasses of `TRPCError`). The tRPC framework converts these into typed error responses on the client.
