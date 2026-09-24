"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MoneyField } from "@/components/fields/money-field";
import { NumberField } from "@/components/fields/number-field";
import { useAppForm } from "@/components/hooks/use-app-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { api } from "@/lib/api/client";

export default function ConfiguracoesPage() {
  const [isLoading, setIsLoading] = useState(false);

  const updateMutation = api.parameters.update.useMutation({
    onSuccess: () => {
      toast.success("Parâmetros atualizados com sucesso");
      setIsLoading(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar parâmetros");
      setIsLoading(false);
    },
  });

  const form = useAppForm({
    defaultValues: {
      fuelPricePerLiter: 0,
      standardWorkdayDuration: 480,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      updateMutation.mutate({
        fuelPricePerLiter: Number(value.fuelPricePerLiter),
        standardWorkdayDuration: Number(value.standardWorkdayDuration),
      });
    },
  });

  const { data, isLoading: isFetching, error } = api.parameters.get.useQuery();

  useEffect(() => {
    if (data) {
      form.setFieldValue("fuelPricePerLiter", data.fuelPricePerLiter);
      form.setFieldValue(
        "standardWorkdayDuration",
        data.standardWorkdayDuration,
      );
    }
  }, [data, form]);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar parâmetros");
    }
  }, [error]);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <form.AppForm>
      <Card
        className="max-w-md"
        render={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <CardHeader>
              <CardTitle render={<h1>Configurações</h1>} />
              <CardDescription
                render={
                  <h2>
                    Gerencie os parâmetros do sistema utilizados nos cálculos de
                    custo.
                  </h2>
                }
              />
            </CardHeader>

            <CardContent
              render={
                <FieldGroup>
                  <form.AppField name="fuelPricePerLiter">
                    {() => (
                      <MoneyField
                        label="Preço do combustível (R$/L)"
                        props={{
                          disabled: isLoading,
                          placeholder: "0,00",
                        }}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="standardWorkdayDuration">
                    {() => (
                      <NumberField
                        label="Jornada padrão (minutos)"
                        props={{
                          min: "1",
                          placeholder: "480",
                          disabled: isLoading,
                        }}
                      />
                    )}
                  </form.AppField>

                  <form.FormError />
                </FieldGroup>
              }
            />

            <CardFooter
              className="flex-col space-y-4"
              render={
                <form.SubmitButton disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar alterações"}
                </form.SubmitButton>
              }
            />
          </form>
        }
      />
    </form.AppForm>
  );
}
