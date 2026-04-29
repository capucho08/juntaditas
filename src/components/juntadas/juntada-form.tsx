"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createJuntada, updateJuntada } from "@/db/queries/juntadas";

type Props = {
  juntada?: {
    id: string;
    title: string;
    location: string;
    locationUrl: string | null;
    dateStart: string;
    dateEnd: string;
    description: string | null;
  };
};

export function JuntadaForm({ juntada }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const isEditing = !!juntada;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = {
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      location: (form.elements.namedItem("location") as HTMLInputElement).value,
      locationUrl: (form.elements.namedItem("locationUrl") as HTMLInputElement).value || undefined,
      dateStart: (form.elements.namedItem("dateStart") as HTMLInputElement).value,
      dateEnd: (form.elements.namedItem("dateEnd") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value || undefined,
    };

    if (data.dateEnd < data.dateStart) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateJuntada(juntada.id, data);
          router.push(`/juntadas/${juntada.id}`);
        } else {
          const id = await createJuntada(data);
          router.push(`/juntadas/${id}`);
        }
      } catch {
        setError("Hubo un error. Intentá de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="title">Nombre</Label>
        <Input
          id="title"
          name="title"
          placeholder="Ej: Verano en La Paloma"
          defaultValue={juntada?.title}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Lugar</Label>
        <Input
          id="location"
          name="location"
          placeholder="Ej: La Paloma, Uruguay"
          defaultValue={juntada?.location}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="locationUrl">Link de Google Maps (opcional)</Label>
        <Input
          id="locationUrl"
          name="locationUrl"
          type="url"
          placeholder="https://maps.app.goo.gl/..."
          defaultValue={juntada?.locationUrl ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateStart">Fecha inicio</Label>
          <Input
            id="dateStart"
            name="dateStart"
            type="date"
            defaultValue={juntada?.dateStart}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateEnd">Fecha fin</Label>
          <Input
            id="dateEnd"
            name="dateEnd"
            type="date"
            defaultValue={juntada?.dateEnd}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Detalles del plan..."
          defaultValue={juntada?.description ?? ""}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear juntada"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
