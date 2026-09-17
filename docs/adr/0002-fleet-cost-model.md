# 0002 — Route Cost from Fleet Vehicle Consumption

Route cost is derived per route from the fleet vehicle bound to it: `distance_km × fuel_price / vehicle.km_per_liter`. The company's fuel price per liter is a single global `Parameter`; each `Vehicle` in the fleet carries its own consumption (km per liter); the `cost_per_km` parameter from the original spec draft was dropped because it is always derivable from the other two and would otherwise silently diverge from them.

## Why

The delivery spec's RN07 defines cost from fuel price, vehicle km/liter, and distance. A flat `cost_per_km` input satisfied the formula numerically but made the fuel price and consumption parameters decorative — knobs a manager could twiddle that no longer affected the result a customer cares about ("calcular corretamente o custo real de cada rota"). Modeling the fleet explicitly lets the cost reflect which vehicle actually ran the route.

The fleet is a **shared company resource**: no driver owns a fixed vehicle. A route binds a vehicle optionally at creation (manager pre-assignment) and otherwise by the driver at shift start. Cost is therefore an *estimate* until a vehicle is bound and a distance is finalized; it recomputes whenever the vehicle or the distance changes. Every such change is a new route version.

## Considered Options

- **Global `cost_per_km` parameter (original spec draft)**: simplest UI, but disconnected from fuel price and vehicle consumption; the task's per-driver km/litro went unused.
- **Derived cost from fleet vehicle (chosen)**: cost = distance × fuelPrice / vehicle.kmPerLiter. Pre-assigned vehicle or "undetermined" until the driver picks. Fuel price is company-wide in the MVP.

## Consequences

- Vehicles are a shared fleet; the task's "Motorista.veículo / rendimento km/litro" attribute shifted to the `Vehicle` entity (`plate, model, km_per_liter, active`). No `isDefault` flag — an uncovered route simply shows "cost undetermined".
- Assignment policy is fixed for the MVP: driver picks unless the manager pre-assigned, and the binding locks once the day starts (any change versions the route).
- Fuel price granularity is company-wide; per-vehicle or per-fuel-type pricing is explicitly out of scope for the MVP.
- `Parameter` holds `fuel_price_per_liter` and `standard_workday_hours`; there is no `cost_per_km`.