"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { revalidateLogic } from "@tanstack/react-form";
import Link from "next/link";

import { useAppForm } from "@/components/hooks/use-app-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";
import { loginSchema } from "@/server/modules/auth/auth.types";

export function RecoverForm() {
  const form = useAppForm({
    defaultValues: { email: "" },
    validationLogic: revalidateLogic({ modeAfterSubmission: "change" }),
    validators: { onDynamic: loginSchema.pick({ email: true }) },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: "/atualizar-senha",
      });

      if (error) {
        form.setErrorMap({
          onSubmit: {
            fields: {},
            form: error.message ?? "Erro ao enviar e-mail de recuperação.",
          },
        });
        return;
      }
    },
  });

  return (
    <form.AppForm>
      <Card
        className="w-full max-w-md"
        render={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <CardHeader>
              <CardTitle render={<h1>Recupere sua conta</h1>} />
              <CardDescription
                render={
                  <h2>
                    Enviaremos um e-mail com um código para alteração de sua
                    senha.
                  </h2>
                }
              />
            </CardHeader>

            <CardContent
              render={
                <FieldGroup>
                  <form.AppField name="email">
                    {(field) => (
                      <field.TextField
                        label="E-mail"
                        props={{
                          type: "email",
                          placeholder: "joao.silva@email.com",
                          autoComplete: "email",
                          required: true,
                        }}
                      />
                    )}
                  </form.AppField>

                  <form.FormError />
                </FieldGroup>
              }
            />

            <CardFooter className="flex-col space-y-4">
              <form.SubmitButton disabled={form.state.isSubmitted}>
                Enviar
              </form.SubmitButton>

              <Button
                className="mr-4"
                variant="link"
                nativeButton={false}
                render={
                  <Link href="entrar">
                    <HugeiconsIcon
                      icon={ArrowLeft01Icon}
                      className="inline h-4 w-4"
                    />
                    Voltar para o login
                  </Link>
                }
              />
            </CardFooter>
          </form>
        }
      />
    </form.AppForm>
  );
}
