"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";

// Fix for missing default icons in Next.js + Leaflet
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

export function MapComponent() {
  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: Leaflet internals
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-zinc-950">
      <MapContainer
        center={[-19.916681, -43.934493]} // Belo Horizonte as default
        zoom={12}
        className="h-full w-full opacity-70 mix-blend-screen"
        zoomControl={false}
      >
        {/* Dark Matter theme from CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
      </MapContainer>
      
      {/* Overlay gradient to blend the map edges if needed */}
      <div className="absolute inset-x-0 bottom-0 h-32 z-10 pointer-events-none bg-gradient-to-t from-background to-transparent opacity-80" />
      <div className="absolute inset-x-0 top-0 h-24 z-10 pointer-events-none bg-gradient-to-b from-background to-transparent opacity-80" />
    </div>
  );
}
