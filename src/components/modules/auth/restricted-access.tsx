import Link from "next/link";
import { Button } from "@/components/ui/button";

export function RestrictedAccess({ role }: { role?: string }) {
  const target = role === "driver" ? "/motorista" : "/";
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold">Acesso restrito</h1>
      <p className="mt-2 text-muted-foreground">
        Você não tem permissão para acessar esta área.
      </p>
      <Button asChild className="mt-6">
        <Link href={target}>Ir para a área correta</Link>
      </Button>
    </div>
  );
}
