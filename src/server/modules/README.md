# Modules

This directory SHALL contain every module following the architecture.

The shared files SHOULD be located at the root of this directory.

## Architecture

### Structure per module

```
products/
  index.ts                  ← Public API (controller, router, types)
  products.router.ts        ← tRPC router (procedure definitions)
  products.service.ts       ← Service layer
  products.repository.ts    ← Repository layer
  products.types.ts         ← Zod schemas, module-specific domain and inferred types
```

### File naming

Files within a module use kebab-case with the module name as prefix: `products.router.ts`, `orders.service.ts`.

### Public API (`index.ts`)

Each module's `index.ts` exports:

1. A **Controller class** — for cross-module usage (other modules import the class, not the instance)
2. The **Router** — for the combined app router to compose
3. The **Types and Constants** — for typesafety

### Cross-module communication

Module A MUST import from Module B only through its `index.ts`:

```typescript
// ✅ Correct
import { ExampleController } from "@/server/modules/example";

// ❌ Incorrect
import { ExampleController } from "@/server/modules/example/example.controller";
```

Internal files (`*.router.ts`, `*.service.ts`, `*.repository.ts`, `*.types.ts`) MUST NOT be imported by production code outside their own module. Tests MAY import them directly.

### tRPC integration

Module routers use the three procedure types defined in `src/server/api/trpc.ts`:

- **`publicProcedure`** — no auth required
- **`authenticatedProcedure`** — requires a valid session
- **`managerProcedure`** — requires an admin role

Domain errors (`BadRequestError`, `NotFoundError`, etc.) are mapped to `TRPCError` codes automatically via middleware.

### Shared kernel

`errors.ts` — domain error classes (`BadRequestError`, `NotFoundError`, etc.).

Every module uses these shared types. They are part of the module architecture, not generic library utilities.

## HTTP Responses

tRPC handles HTTP responses. Procedures return data directly on success and throw `TRPCError` on failure. There is no response envelope — the frontend receives the data or the error at the protocol level.
