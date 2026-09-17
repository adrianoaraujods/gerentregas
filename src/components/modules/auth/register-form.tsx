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
import { registerSchema } from "@/server/modules/auth/auth.types";

export const formSchema = registerSchema
  .extend({ confirmPassword: registerSchema.shape.password })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useAppForm({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    validationLogic: revalidateLogic({ modeAfterSubmission: "change" }),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const { confirmPassword: _, ...data } = value;

      const { error } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (error) {
        if (error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
          form.setErrorMap({
            onSubmit: { fields: { email: error.message } },
          });
          return;
        }

        form.setErrorMap({
          onSubmit: { fields: {}, form: error.message ?? "Erro ao cadastrar." },
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
              <CardTitle render={<h1>Crie sua conta!</h1>} />
              <CardDescription
                render={
                  <h2>Preencha com seus dados abaixo para se cadastrar</h2>
                }
              />
            </CardHeader>

            <CardContent
              render={
                <FieldGroup>
                  <form.AppField name="name">
                    {(field) => (
                      <field.TextField
                        label="Nome"
                        props={{ placeholder: "João da Silva" }}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="email">
                    {(field) => (
                      <field.TextField
                        label="E-mail"
                        props={{
                          type: "email",
                          placeholder: "joao.silva@email.com",
                        }}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="password">
                    {(field) => (
                      <field.TextField
                        label="Senha"
                        props={{
                          type: showPassword ? "text" : "password",
                          placeholder: "••••••••",
                        }}
                        suffix={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hover:bg-transparent hover:text-primary-hover"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword ? "Esconder senha" : "Mostrar senha"
                            }
                          >
                            {showPassword ? (
                              <HugeiconsIcon icon={EyeOffIcon} />
                            ) : (
                              <HugeiconsIcon icon={EyeIcon} />
                            )}
                          </Button>
                        }
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="confirmPassword">
                    {(field) => (
                      <field.TextField
                        label="Confirmar senha"
                        props={{
                          type: showConfirmPassword ? "text" : "password",
                          placeholder: "••••••••",
                        }}
                        suffix={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hover:bg-transparent hover:text-primary-hover"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            aria-label={
                              showConfirmPassword
                                ? "Esconder senha"
                                : "Mostrar senha"
                            }
                          >
                            {showConfirmPassword ? (
                              <HugeiconsIcon icon={EyeOffIcon} />
                            ) : (
                              <HugeiconsIcon icon={EyeIcon} />
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
              <form.SubmitButton>Cadastrar</form.SubmitButton>

              <span>
                Já tem uma conta?{" "}
                <Button
                  className="px-2"
                  variant="link"
                  nativeButton={false}
                  render={<Link href="/entrar">Entre aqui</Link>}
                />
              </span>
            </CardFooter>
          </form>
        }
      />
    </form.AppForm>
  );
}
