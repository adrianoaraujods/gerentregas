"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { RouterOutputs } from "@/server/api/router";

type ClientPoint = RouterOutputs["points"]["list"]["points"][number];

interface PointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointToEdit?: ClientPoint | null;
  onSuccess: () => void;
}

export function PointDialog({
  open,
  onOpenChange,
  pointToEdit,
  onSuccess,
}: PointDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isEditing = !!pointToEdit;

  useEffect(() => {
    if (open) {
      if (pointToEdit) {
        setName(pointToEdit.name);
        setAddress(pointToEdit.address);
        setLatitude(pointToEdit.latitude ? String(pointToEdit.latitude) : "");
        setLongitude(
          pointToEdit.longitude ? String(pointToEdit.longitude) : "",
        );
      } else {
        setName("");
        setAddress("");
        setLatitude("");
        setLongitude("");
      }
      setErrors({});
    }
  }, [open, pointToEdit]);

  const createMutation = api.points.create.useMutation({
    onSuccess: () => {
      toast.success("Ponto criado com sucesso!");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar ponto: ${error.message}`);
    },
  });

  const updateMutation = api.points.update.useMutation({
    onSuccess: () => {
      toast.success("Ponto atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar ponto: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = "Nome é obrigatório";
    if (!address.trim()) newErrors.address = "Endereço é obrigatório";

    let latNum: number | undefined;
    let lngNum: number | undefined;

    if (latitude.trim()) {
      latNum = parseFloat(latitude.replace(",", "."));
      if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
        newErrors.latitude = "Latitude inválida (-90 a 90)";
      }
    }

    if (longitude.trim()) {
      lngNum = parseFloat(longitude.replace(",", "."));
      if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        newErrors.longitude = "Longitude inválida (-180 a 180)";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      name: name.trim(),
      address: address.trim(),
      latitude: latNum,
      longitude: lngNum,
    };

    if (isEditing && pointToEdit) {
      updateMutation.mutate({ id: pointToEdit.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Ponto" : "Adicionar Ponto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <Field>
            <FieldLabel htmlFor="point-name">Nome</FieldLabel>
            <FieldContent>
              <Input
                id="point-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: CD Sul"
              />
              <FieldError
                errors={errors.name ? [{ message: errors.name }] : undefined}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="point-address">Endereço</FieldLabel>
            <FieldContent>
              <Input
                id="point-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O endereço será convertido em coordenadas automaticamente. Se
                falhar, você poderá inseri-las manualmente.
              </p>
              <FieldError
                errors={
                  errors.address ? [{ message: errors.address }] : undefined
                }
              />
            </FieldContent>
          </Field>

          {(pointToEdit?.geocodeStatus === "failed" ||
            latitude ||
            longitude) && (
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="point-latitude">
                  Latitude (Opcional)
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="point-latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="Ex: -23.550520"
                  />
                  <FieldError
                    errors={
                      errors.latitude
                        ? [{ message: errors.latitude }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="point-longitude">
                  Longitude (Opcional)
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="point-longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="Ex: -46.633308"
                  />
                  <FieldError
                    errors={
                      errors.longitude
                        ? [{ message: errors.longitude }]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
