# 0001 — Hybrid PWA + Native Architecture

We chose a hybrid architecture: a **Next.js monolith** serving a responsive PWA (primary interface for all roles) with a **REST API** that a future native mobile app (Expo/React Native) will consume. Both surfaces share a `SyncClient` interface for offline-first local storage and background synchronization.

## Why

The delivery spec (RNF02) explicitly requires a responsive web interface usable on mobile by the driver. Background GPS auto-detection of stops — a feature the client wants — cannot run reliably in a PWA on iOS (WebKit suspends background execution after ~30 seconds). Native (Expo/React Native) solves this, but building native from day one would double the frontend codebase for a 2–3 person university team.

The hybrid approach gives us: a working MVP immediately (PWA with manual check-in/out), zero distribution friction for the initial deployment, and a clear path to add native auto-detection without rewriting the server or sync layer.

## Considered Options

- **PWA only**: simplest, but cannot deliver background GPS auto-detection on iOS
- **Native only**: best for driver features, but higher cost, app store friction, no web dashboard without building one separately
- **Hybrid (chosen)**: PWA first, native layer added later. One server, two surfaces.

## Consequences

- The REST API must be designed from day one (not just tRPC) since the native app will consume it
- `SyncClient` interface is the critical shared abstraction — must be designed before either storage implementation
- tRPC serves the PWA; REST serves the native app. Both hit the same Next.js server routes.
- Driver's PWA experience (manual check-in/out) and native experience (auto-detection + manual override) must produce identical server-side data shapes
- The native app is a thin client — all business logic lives in the Next.js server
