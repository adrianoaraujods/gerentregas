# API — tRPC Client

This directory exports two tRPC clients: one for server components, one for client components.

## When to use which

| Import | Use in | Purpose |
|--------|--------|---------|
| `api` from `@/lib/api/client` | `"use client"` components | Client-side fetching with React Query hooks |
| `api` from `@/lib/api/server` | Server Components | Direct server-side calls (no HTTP), with data hydration |
| `HydrateClient` from `@/lib/api/server` | Server Components | Serializes server-fetched data into the client-side React Query cache |

### `api` from `@/lib/api/client`

For client components that need to fetch data reactively. Uses `createTRPCReact` — every procedure becomes a React Query hook.

```tsx
"use client";

import { api } from "@/lib/api/client";

export function ProductList() {
  const { data } = api.products.list.useQuery();
  // data is typed as Product[]
}
```

### `api` from `@/lib/api/server`

For Server Components that fetch data directly without going through HTTP. Uses `createCaller` — procedures are async functions, not hooks.

```tsx
import { api } from "@/lib/api/server";

export default async function ProductPage() {
  const products = await api.products.list();
  // products is typed as Product[]
}
```

### `HydrateClient`

Wraps client components so they receive server-fetched data without re-fetching. Without it, the client would duplicate the request over HTTP after hydration.

```tsx
import { api, HydrateClient } from "@/lib/api/server";

export default async function Page() {
  const products = await api.products.list();

  return (
    <HydrateClient>
      <ProductList /> {/* can use api.products.list.useQuery() without re-fetching */}
    </HydrateClient>
  );
}
```

### Error handling (server-side)

Since `api` from `@/lib/api/server` is a plain async function call, errors throw directly in the component. Use `try/catch` to map domain errors to specific behaviors:

```tsx
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server";
import { NotFoundError } from "@/server/api";

export default async function ProductPage({ params }) {
  try {
    const product = await api.products.getBySlug({ slug: params.slug });
    return <ProductCard product={product} />;
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound(); // renders the nearest not-found.tsx
    }
    throw error; // re-throw for the nearest error.tsx boundary
  }
}
```

Uncaught errors propagate to the nearest `error.tsx` boundary — no `try/catch` needed if a generic error UI is sufficient.
