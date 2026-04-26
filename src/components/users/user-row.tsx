"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminUpdateUser } from "@/db/queries/users";
import { Pencil, Check, X } from "lucide-react";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
};

export function UserRow({ user }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [role, setRole] = useState<"admin" | "member">(
    user.role === "admin" ? "admin" : "member"
  );

  function handleSave() {
    startTransition(async () => {
      await adminUpdateUser(user.id, { name, phone: phone || undefined, role });
      setEditing(false);
    });
  }

  function handleCancel() {
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
    setRole(user.role === "admin" ? "admin" : "member");
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{user.name || <span className="text-muted-foreground italic">Sin nombre</span>}</p>
          <p className="text-xs text-muted-foreground">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
        </div>
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role === "admin" ? "Administrador" : "Participante"}
        </Badge>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Nombre</p>
          <Input className="h-8 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Celular</p>
          <Input className="h-8 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="space-y-1 w-36">
          <p className="text-xs text-muted-foreground">Rol</p>
          <Select value={role} onValueChange={(v) => v && setRole(v as "admin" | "member")}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Participante</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 mt-5">
          <Button size="sm" className="h-8" onClick={handleSave} disabled={isPending}>
            <Check className="w-3.5 h-3.5 mr-1" />
            Guardar
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={handleCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
