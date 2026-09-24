import { notFound } from "next/navigation";
import { GridPattern } from "@/components/layout/background-patterns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/server";
import type { User } from "@/server/modules/auth";

export default async function MotoristaPage() {
  const session = await getSession();
  if (session?.user.role !== "driver") notFound();

  const user = session.user as User;

  return (
    <GridPattern className="flex-1 overflow-y-auto p-5 sm:p-7">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle render={<h1>Painel do Motorista</h1>} />
            <CardDescription
              render={
                <h2>
                  Bem-vindo, {user.name}. Aqui você pode visualizar seus
                  roteiros e registrar chegadas/saídas.
                </h2>
              }
            />
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Em desenvolvimento — funcionalidades de visualização de roteiros e
              registro de paradas serão implementadas aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </GridPattern>
  );
}
