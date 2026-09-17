"use client";

import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { revalidateLogic } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validationLogic: revalidateLogic({ modeAfterSubmission: "change" }),
    validators: { onDynamic: loginSchema },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });

      if (error) {
        form.setErrorMap({
          onSubmit: {
            fields: {},
            form: error.message ?? "E-mail ou senha inválidos.",
          },
        });
        return;
      }

      router.push("/");
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
              <CardTitle render={<h1>Bem-vindo de volta!</h1>} />

              <CardDescription
                render={<h2>Entre com seus dados abaixo para continuar</h2>}
              />
            </CardHeader>

            <CardContent
              render={
                <FieldGroup>
                  <form.AppField name="email">
                    {(field) => (
                      <field.TextField
                        label="E-mail"
                        props={{ type: "email", placeholder: "seu@email.com" }}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="password">
                    {(field) => (
                      <field.TextField
                        label={
                          <>
                            <span>Senha</span>{" "}
                            <Button
                              className="ml-auto p-0 text-primary text-sm"
                              variant="link"
                              nativeButton={false}
                              render={
                                <Link href="/recuperar-conta">
                                  Esqueceu sua senha?
                                </Link>
                              }
                            />
                          </>
                        }
                        props={{
                          type: showPassword ? "text" : "password",
                          placeholder: "••••••••",
                        }}
                        suffix={
                          <Button
                            type="button"
                            variant="primary-hover"
                            size="icon"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword ? "Esconder senha" : "Mostrar senha"
                            }
                          >
                            {showPassword ? (
                              <HugeiconsIcon
                                icon={EyeOffIcon}
                                className="size-4"
                              />
                            ) : (
                              <HugeiconsIcon
                                icon={EyeIcon}
                                className="size-4"
                              />
                            )}
                          </Button>
                        }
                      />
                    )}
                  </form.AppField>

                  <form.FormError />
                </FieldGroup>
              }
            />

            <CardFooter className="flex-col space-y-4">
              <form.SubmitButton>Entrar</form.SubmitButton>

              <span>
                Ainda não tem uma conta?{" "}
                <Button
                  className="px-2"
                  variant="link"
                  nativeButton={false}
                  render={<Link href="/cadastrar">Cadastre-se</Link>}
                />
              </span>
            </CardFooter>
          </form>
        }
      />
    </form.AppForm>
  );
}
