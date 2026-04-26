"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateOwnProfile } from "@/db/queries/users";

type Props = {
  user: { name: string; email: string; phone: string | null; role: string };
};

export function ProfileForm({ user }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateOwnProfile({ name, phone: phone || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={user.email} disabled className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">El email no se puede cambiar.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Celular (opcional)</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+598 99 000 000"
        />
      </div>

      <div className="space-y-2">
        <Label>Rol</Label>
        <div>
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
            {user.role === "admin" ? "Administrador" : "Participante"}
          </Badge>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {saved ? "¡Guardado!" : isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
