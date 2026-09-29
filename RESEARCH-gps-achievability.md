# GPS assist achievability: PWA vs native (issue #47, child of #43)

Read-only investigation. No GPS code added; manual check-in/out stays truth in PWA v1.

## Repo baseline (verified in-tree)

- Driver check-in/out is manual-only: `src/components/modules/driver/driver-day-content.tsx` stamps `arrival_at`/`departure_at` via buttons.
- Offline queue: `src/lib/sync/sync-client.ts` (`recordArrival`/`recordDeparture` → Dexie → `QueuedStopEvent`); no location fields.
- Schema: `stop.arrival_at`/`departure_at` are the single source of truth for dwell + completion (`docs/adr/0003-arrival-departure-single-source-of-truth.md`, `CONTEXT.md`).
- Zero geolocation usage today: grep for `navigator.geolocation`, `watchPosition`, `BackgroundGeolocation`, `expo-location`, `capacitor.*geolocation` returns no hits.
- PWA shell exists: `src/app/manifest.ts`, `public/sw.js`, `src/components/service-worker-registrar.tsx` (RNF03).

## Verdict

- **PWA v1: GPS auto-stamping is not achievable.** `watchPosition` is foreground/visible-document only per spec; background, screen-off, and service-worker contexts get no fixes. At most, PWA can offer a foreground "near-stop nudge" (one-shot `getCurrentPosition` when the driver has the stop open) that still requires manual confirm. Manual stays truth.
- **Future native: achievable with OS geofencing + foreground service**, under explicit consent, in-flight-only evaluation, and event-only retention. Recommend geofence-per-stop (enter/exit → propose, driver confirms, manual overwrite wins).

## 1. Background watchPosition reliability in PWAs

- W3C Geolocation CR (2026-03-26, §6.5 "Request a position"): if the document's visibility state is `hidden`, the algorithm waits for visibility; the `watchPosition` loop (§6.5 step 5) delivers updates **only to fully-active visible documents**, otherwise updates are "dropped on the floor".
- So: tab backgrounded, screen locked, or app switched away = no fixes, with gaps, not delayed delivery. Reopening resumes the watch; nothing buffers while hidden.
- `navigator.geolocation` is `Exposed=Window` only (W3C §8 IDL); service workers have no DOM/geolocation access (MDN Service Worker API: worker context, no DOM). No background-GPS-via-SW workaround exists.
- Practical result: on Android Chrome the watch dies with the page lifecycle (Doze/background tab freeze); on iOS Safari it is stricter (background tab suspend within seconds). PWA cannot do arrival/departure detection while the phone is in the pocket — the exact case that matters.
- PWA-feasible subset: when the driver opens a stop (visible document), one-shot `getCurrentPosition({enableHighAccuracy:true, timeout, maximumAge:0})` → "you appear within ~X m of stop, confirm arrival?" → manual confirm writes the existing `QueuedStopEvent`. Foreground-only assist, zero background promise.

## 2. Accuracy / drift and false-arrival risk

- W3C §6.6: `accuracy` is meters at 95% confidence; API is "agnostic of the underlying sources, no guarantee it returns the device's actual location" (§1). Urban canyon / indoor stops routinely see 30–100 m+ drift and jumps between Wi-Fi/cell fixes.
- False-arrival mitigations (synthesis, standard practice):
  - Accuracy gate: ignore fixes with `accuracy` worse than threshold (e.g. > 50 m urban; tune per stop).
  - Radius + min-stay: enter candidate only after N consecutive fixes inside radius R for dwell D (draft defaults below); single-fix entry is what causes drive-by false arrivals.
  - Exit symmetric: outside radius for absence window before proposing departure.
  - `maximumAge: 0` for assist fixes so stale cached positions can't auto-propose.
- Residual risk never reaches zero (stacked deliveries, adjacent stops, parking across the street) — which is why propose-and-confirm with manual overwrite is the only safe contract, not auto-stamp.

## 3. Battery cost

- W3C §7.1: `enableHighAccuracy` "can result in slower response times or increased power consumption" and may be ignored by the UA.
- Capacitor Geolocation docs (`watchPosition`): "watching for location changes can consume a large amount of energy. Be smart about listening only when you need to."
- Continuous GPS watch during a full shift is the worst profile (GPS radio held on). OS geofencing (region monitoring, cell/Wi-Fi-assisted) exists precisely to avoid this: the OS wakes the app only on boundary crossing.
- Native guidance: never run a continuous high-accuracy watch; use geofences per stop (≤20 iOS / ≤100 Android active regions — fits one route's stop list) plus short-lived high-accuracy fix only inside a candidate window. Expo `deferredUpdatesDistance`/`deferredUpdatesInterval` exist to batch background fixes for the same reason.

## 4. Event-only buffering, local discard of in-between fixes

- Pattern that fits this repo: evaluate fixes **in memory**, enqueue **only** enter/exit proposal events through the existing Dexie `QueuedStopEvent` pipeline, never persist raw fixes.
- In-between fixes are discarded on evaluation (keep last fix + candidate state only). This satisfies data minimization and keeps the sync batch schema unchanged (events carry `at`, not trails).
- W3C privacy guidance for recipients (§3.2) independently requires this shape: request position only when necessary, dispose once the task completes, no retransmission without express permission.

## 5. Future native event contract (draft, no code)

Constraints: **explicit consent + in-flight-only + retention**.

- Consent: per-driver opt-in toggle, separate from OS prompt; record `consentVersion` on each event; revoking stops evaluation immediately. (W3C §3.1: express permission before any location data is shared; permission lifetimes vary by UA.)
- In-flight-only: evaluate geofences only while `route.status = in_flight` and only against the current open stop(s); no tracking between routes, no always-on trail.
- Retention: raw fixes never leave memory; stored proposals keep enter/exit event + accuracy + radius only; suggest a documented TTL (e.g. proposals auto-purged with the route's operational window, max ~90 days — confirm with ops/LGPD review).

```ts
type GpsStopEvent =
  | { kind: "gps.enter"; routeId: string; stopId: string; at: string;
      lat: number; lon: number; accuracyM: number; radiusM: number;
      minStayS: number; source: "geofence" | "watch"; consentVersion: number }
  | { kind: "gps.exit";  routeId: string; stopId: string; at: string;
      lat: number; lon: number; accuracyM: number; radiusM: number;
      absenceS: number; source: "geofence" | "watch"; consentVersion: number };
```

- Draft defaults (tune in pilot): `radiusM: 100–150`, `minStayS: 60–120` for enter, `absenceS: 60` for exit, accuracy gate ≤ 50 m.
- Native capability notes (Capacitor / expo-location docs): Capacitor `@capacitor/geolocation` gives `getCurrentPosition`/`watchPosition`/`checkPermissions`/`requestPermissions` but **no background geolocation directly**; needs a background-capable wrapper. Expo `startGeofencingAsync(taskName, regions)` with `LocationRegion { latitude, longitude, radius, notifyOnEnter, notifyOnExit }` + `startLocationUpdatesAsync` via TaskManager is the closer fit; limits Android ≤100 / iOS ≤20 simultaneous regions; Android background needs `ACCESS_BACKGROUND_LOCATION` + foreground service, iOS needs `UIBackgroundModes: location` + Always authorization; a user-killed app does not auto-restart on Android (iOS restarts on geofence events).
- Server side (future ticket): proposals land as suggestions on the stop; driver confirm writes `arrival_at`/`departure_at` through the existing path; any manual edit overwrites and marks the proposal superseded — ADR-0003 stays intact.

## Sources

- W3C Geolocation CR 2026-03-26 (https://www.w3.org/TR/geolocation/): §§1, 3.1–3.2, 6.5–6.6, 7.1, 8.
- MDN Geolocation API (secure context, permission prompt, watchPosition) and Service Worker API (worker context, no DOM).
- Capacitor Geolocation plugin docs (https://capacitorjs.com/docs/apis/geolocation): energy note, permissions, no-background statement.
- Expo Location docs (https://docs.expo.dev/versions/latest/sdk/location/): foreground-only `watchPositionAsync`, `startLocationUpdatesAsync`, `startGeofencingAsync`, region limits, background config.
- In-repo: `driver-day-content.tsx`, `sync-client.ts`, `server/db/schemas/routes.ts`, `docs/adr/0003-*.md`, `CONTEXT.md`.
