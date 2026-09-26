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

const formSchema = registerSchema
  .pick({ password: true })
  .extend({ confirmPassword: registerSchema.shape.password })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useAppForm({
    defaultValues: { password: "", confirmPassword: "" },
    validationLogic: revalidateLogic({ modeAfterSubmission: "change" }),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      if (!token) {
        form.setErrorMap({
          onSubmit: {
            fields: {},
            form: "Link de recuperação inválido ou expirado.",
          },
        });
        return;
      }

      const { error } = await authClient.resetPassword({
        newPassword: value.password,
        token,
      });

      if (error) {
        form.setErrorMap({
          onSubmit: {
            fields: {},
            form: error.message ?? "Erro ao redefinir a senha.",
          },
        });
        return;
      }

      router.push("/entrar");
    },
  });

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>
            Este link de recuperação é inválido ou expirou. Solicite um novo
            link.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            className="mr-4"
            variant="link"
            nativeButton={false}
            render={<Link href="/recuperar-conta">Recuperar conta</Link>}
          />
        </CardFooter>
      </Card>
    );
  }

  return (
    <form.AppForm>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Defina uma nova senha</CardTitle>
            <CardDescription>
              Escolha uma nova senha para sua conta.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FieldGroup>
              <form.AppField name="password">
                {(field) => (
                  <field.TextField
                    label="Nova senha"
                    props={{
                      type: showPassword ? "text" : "password",
                      placeholder: "••••••••",
                    }}
                    suffix={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
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
                    label="Confirmar nova senha"
                    props={{
                      type: showConfirmPassword ? "text" : "password",
                      placeholder: "••••••••",
                    }}
                    suffix={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
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
          </CardContent>

          <CardFooter>
            <form.SubmitButton>Salvar nova senha</form.SubmitButton>
          </CardFooter>
        </Card>
      </form>
    </form.AppForm>
  );
}
