"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MapComponent = dynamic(
  () => import("./map-component").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full absolute inset-0 z-0 bg-zinc-950/50" />,
  }
);

export function DashboardMap() {
  return <MapComponent />;
}
