import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <WifiOff className="size-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Você está offline</h1>
      <p className="max-w-md text-muted-foreground">
        Sem conexão com o servidor agora. Registros de chegada e saída feitos
        offline ficam salvos na fila local e serão sincronizados automaticamente
        quando a conexão voltar.
      </p>
    </div>
  );
}
