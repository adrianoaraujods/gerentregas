"use client";

import { format } from "date-fns";
import { History, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";

interface RouteHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string | null;
}

export function RouteHistoryDialog({
  open,
  onOpenChange,
  routeId,
}: RouteHistoryDialogProps) {
  const { data: historyData, isLoading } = api.routes.history.useQuery(
    { id: routeId ?? "" },
    { enabled: !!routeId && open },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] sm:max-w-xl md:max-w-2xl bg-zinc-950/90 backdrop-blur-xl border-l-white/10 flex flex-col gap-0 p-6">
        <SheetHeader className="pb-4 border-b border-white/10 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <History className="h-5 w-5 text-primary" />
            Histórico de Versões
          </SheetTitle>
          <SheetDescription className="mt-1.5">
            Acompanhe a linha do tempo de alterações estruturais e correções
            deste roteiro.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-4 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !historyData || historyData.versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum histórico encontrado para este roteiro.
            </p>
          ) : (
            <div className="relative border-l border-muted-foreground/20 ml-3 space-y-8 pb-4">
              {historyData.versions.map((version) => (
                <div key={version.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className="absolute -left-2.5 top-1 h-5 w-5 rounded-full border-4 border-background bg-primary" />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          v{version.version}
                        </Badge>
                        <span className="text-sm font-medium text-muted-foreground">
                          {format(
                            new Date(version.createdAt),
                            "dd/MM/yyyy HH:mm:ss",
                          )}
                        </span>
                      </div>
                      <Badge
                        variant={
                          version.status === "concluded"
                            ? "default"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {version.status}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 rounded-md p-4 space-y-4">
                      <h4 className="text-sm font-semibold border-b pb-2">
                        Fotografia das Paradas
                      </h4>

                      <div className="space-y-3">
                        {version.stops.map((stop, _index) => (
                          <div
                            key={stop.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-background p-2 rounded border"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Badge
                                variant="secondary"
                                className="w-6 h-6 flex items-center justify-center p-0 shrink-0"
                              >
                                {stop.order === "0" ? "O" : stop.order}
                              </Badge>
                              <span className="font-medium truncate">
                                {stop.point?.name || stop.addressSnapshot}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                              {stop.versionType === "correction" && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] h-5"
                                >
                                  Correção
                                </Badge>
                              )}
                              {stop.actorName && (
                                <span
                                  className="flex items-center gap-1"
                                  title="Autor da alteração"
                                >
                                  <User className="h-3 w-3" />
                                  {stop.actorName}
                                </span>
                              )}
                              {(stop.arrivalAt || stop.departureAt) && (
                                <div className="flex flex-col text-right">
                                  {stop.arrivalAt && (
                                    <span>
                                      Arr:{" "}
                                      {format(
                                        new Date(stop.arrivalAt),
                                        "HH:mm",
                                      )}
                                    </span>
                                  )}
                                  {stop.departureAt && (
                                    <span>
                                      Dep:{" "}
                                      {format(
                                        new Date(stop.departureAt),
                                        "HH:mm",
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
