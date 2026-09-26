"use client";

import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { revalidateLogic } from "@tanstack/react-form";
import { KeyRoundIcon } from "lucide-react";
import React from "react";

import { useAppForm } from "@/components/hooks/use-app-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { registerSchema } from "@/server/modules/auth/auth.types";

export const formSchema = registerSchema
  .pick({ password: true })
  .extend({ confirmPassword: registerSchema.shape.password })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export function ChangePasswordDialog({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useAppForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validationLogic: revalidateLogic({ modeAfterSubmission: "change" }),
    validators: { onDynamic: formSchema },
    onSubmit: async () => {},
  });

  return (
    <Dialog>
      <DialogTrigger render={<Button {...props} />}>
        <KeyRoundIcon />
        Alterar senha
      </DialogTrigger>

      <DialogContent>
        <form.AppForm>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Alterar senha</DialogTitle>
              <DialogDescription>
                Preencha os campos abaixo para escolher sua nova senha.
              </DialogDescription>
            </DialogHeader>

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
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Esconder senha" : "Mostrar senha"
                        }
                      >
                        <HugeiconsIcon
                          icon={showPassword ? EyeOffIcon : EyeIcon}
                        />
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
                        variant="outline"
                        size="icon"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword
                            ? "Esconder senha"
                            : "Mostrar senha"
                        }
                      >
                        <HugeiconsIcon
                          icon={showConfirmPassword ? EyeOffIcon : EyeIcon}
                        />
                      </Button>
                    }
                  />
                )}
              </form.AppField>
            </FieldGroup>

            <form.FormError />

            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline" />}
                onClick={() => form.reset()}
              >
                Cancelar
              </DialogClose>

              <form.SubmitButton>Salvar senha</form.SubmitButton>
            </DialogFooter>
          </form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
