import { redirect } from "next/navigation";
import { Section } from "@/components/layout/section";
import { ChangePasswordDialog } from "@/components/modules/auth/change-password-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/server";

const pathname = "/minha-conta";

export default async function MinhaContaPage() {
  const session = await getSession();

  if (!session) {
    redirect(`/entrar?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  return (
    <Section
      maxWidth="sm"
      className="flex items-center flex-col justify-center py-8 sm:py-16"
      render={<main />}
    >
      <Card className="w-full">
        <CardHeader className="border-b">
          <CardTitle render={<h1>Minha conta</h1>} />
          <CardDescription
            render={<h2>Gerencie seus dados de acesso da Gerentregas.</h2>}
          />
        </CardHeader>

        <CardContent className="grid gap-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Nome
              </dt>
              <dd className="text-base font-medium">{session.user.name}</dd>
            </div>

            <div className="grid gap-1">
              <dt className="text-sm font-medium text-muted-foreground">
                E-mail
              </dt>
              <dd className="break-all text-base font-medium">
                {session.user.email}
              </dd>
            </div>
          </dl>

          <div className="flex justify-start">
            {/* TODO: add reset password */}
            <ChangePasswordDialog disabled />
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}
