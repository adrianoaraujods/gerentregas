"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  buildRouteMapViewModel,
  ROUTE_MAP_STATE_META,
  type RouteMapGeometryInput,
  type RouteMapMarkerState,
  type RouteMapStatus,
  type RouteMapStopInput,
} from "@/lib/route-map";

const RouteMapLeaflet = dynamic(
  () => import("./route-map-leaflet").then((m) => m.RouteMapLeaflet),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

type RouteMapProps = {
  stops: RouteMapStopInput[];
  geometry?: RouteMapGeometryInput;
  status: RouteMapStatus;
};

export function RouteMap({ stops, geometry = null, status }: RouteMapProps) {
  const viewModel = useMemo(
    () => buildRouteMapViewModel(stops, geometry, status),
    [stops, geometry, status],
  );

  return (
    <section
      className="flex flex-col gap-4 md:flex-row"
      aria-label="Mapa do roteiro"
    >
      <div className="h-72 w-full overflow-hidden rounded-md border md:h-96 md:flex-1">
        <RouteMapLeaflet
          key={viewModel.markers.map((marker) => marker.stopId).join(",")}
          viewModel={viewModel}
        />
      </div>
      <div className="w-full shrink-0 space-y-3 md:w-72">
        {!viewModel.hasGeometry && (
          <p className="text-sm text-muted-foreground">
            Trajeto indisponível: mostrando apenas as paradas.
          </p>
        )}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Legenda</h3>
          <ul className="space-y-1 text-sm">
            {(Object.keys(ROUTE_MAP_STATE_META) as RouteMapMarkerState[]).map(
              (state) =>
                viewModel.markers.some((m) => m.state === state) && (
                  <li key={state} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`inline-block size-3 rounded-full ${ROUTE_MAP_STATE_META[state].dotClass}`}
                    />
                    {ROUTE_MAP_STATE_META[state].label}
                  </li>
                ),
            )}
          </ul>
        </div>
        {viewModel.ungeocoded.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Sem localização no mapa</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {viewModel.ungeocoded.map((entry) => (
                <li key={entry.stopId}>
                  <span className="font-medium text-foreground">
                    {entry.order}.
                  </span>{" "}
                  {entry.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
