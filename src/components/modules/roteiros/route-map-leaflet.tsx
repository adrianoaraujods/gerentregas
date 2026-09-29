"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet";

import type { RouteMapMarkerState, RouteMapViewModel } from "@/lib/route-map";
import { ROUTE_MAP_STATE_META } from "@/lib/route-map";

function pinIcon(order: string, state: RouteMapMarkerState): L.DivIcon {
  return L.divIcon({
    className: "route-map-pin",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background-color:${ROUTE_MAP_STATE_META[state].pinColor};color:#fff;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 3px rgb(0 0 0 / 0.3)">${order}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function RouteMapLeaflet({
  viewModel,
}: {
  viewModel: RouteMapViewModel;
}) {
  const bounds = useMemo(() => {
    const points: Array<[number, number]> = [
      ...(viewModel.polyline ?? []),
      ...viewModel.markers.map((marker) => marker.position),
    ];
    if (points.length === 0) return null;
    return L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
  }, [viewModel]);

  if (!bounds) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground">
        Sem coordenadas para exibir o mapa.
      </div>
    );
  }

  return (
    <MapContainer
      bounds={bounds}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {viewModel.polyline && <Polyline positions={viewModel.polyline} />}
      {viewModel.markers.map((marker) => (
        <Marker
          key={marker.stopId}
          position={marker.position}
          icon={pinIcon(marker.order, marker.state)}
          title={marker.label}
        >
          {marker.dwellLabel && (
            <Tooltip permanent direction="top" offset={[0, -16]}>
              {marker.dwellLabel}
            </Tooltip>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
