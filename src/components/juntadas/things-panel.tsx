"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { addThingToBring, toggleThingToBring, deleteThingToBring, updateThingResponsibles } from "@/db/queries/supplies";
import { ImportTemplateButton } from "./import-template-button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Plus, Trash2, Check, Pencil, UserRound, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };
type Thing = {
  id: string;
  name: string;
  checked: boolean;
  responsibles: { user: Attendee }[];
};

type Template = { id: string; name: string; description: string | null; items: { id: string }[] };

type Props = {
  juntadaId: string;
  things: Thing[];
  attendees: Attendee[];
  templates: Template[];
};

export function ThingsPanel({ juntadaId, things, attendees, templates }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editThing, setEditThing] = useState<Thing | null>(null);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleId(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleAdd() {
    if (!name) return;
    startTransition(async () => {
      await addThingToBring({ juntadaId, name, responsibleIds: selectedIds });
      setName("");
      setSelectedIds([]);
      setAddOpen(false);
    });
  }

  function handleToggle(id: string, checked: boolean) {
    startTransition(async () => {
      await toggleThingToBring(id, !checked, juntadaId);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteThingToBring(id, juntadaId);
    });
  }

  function handleUpdateResponsibles() {
    if (!editThing) return;
    startTransition(async () => {
      await updateThingResponsibles(editThing.id, selectedIds, juntadaId);
      setEditThing(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {things.filter((t) => t.checked).length}/{things.length} confirmadas
        </p>
        <div className="flex gap-2">
          <ImportTemplateButton juntadaId={juntadaId} templates={templates} />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Agregar</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar cosa a llevar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>¿Qué hay que llevar?</Label>
                <Input placeholder="Ej: Parlante, reposeras..." value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Responsables (opcional)</Label>
                <MultiSelect
                  options={attendees.map((a) => ({ id: a.id, label: a.name || a.email.split("@")[0] }))}
                  selected={selectedIds}
                  onChange={setSelectedIds}
                  placeholder="Asignar responsables..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isPending || !name}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Edit responsibles dialog */}
      <Dialog open={!!editThing} onOpenChange={(v) => { if (!v) setEditThing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responsables — {editThing?.name}</DialogTitle>
          </DialogHeader>
          <MultiSelect
            options={attendees.map((a) => ({ id: a.id, label: a.name || a.email.split("@")[0] }))}
            selected={selectedIds}
            onChange={setSelectedIds}
            placeholder="Seleccioná responsables..."
          />
          <DialogFooter>
            <Button onClick={handleUpdateResponsibles} disabled={isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {things.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay cosas cargadas todavía.</p>
      ) : (
        <>
          {things.some((t) => !t.checked && t.responsibles.length === 0) && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {things.filter((t) => !t.checked && t.responsibles.length === 0).length} item{things.filter((t) => !t.checked && t.responsibles.length === 0).length !== 1 ? "s" : ""} sin responsable asignado
            </div>
          )}
        <div className="divide-y border rounded-lg">
          {things.map((thing) => {
            const unassigned = thing.responsibles.length === 0 && !thing.checked;
            return (
            <div key={thing.id} className={cn(
              "flex items-center gap-3 px-3 py-3 transition-colors",
              unassigned && "bg-amber-50/60"
            )}>
              <button
                onClick={() => handleToggle(thing.id, thing.checked)}
                disabled={isPending}
                className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                  thing.checked ? "bg-primary border-primary" : "border-border hover:border-primary"
                )}
              >
                {thing.checked && <Check className="w-3 h-3 text-primary-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-sm", thing.checked && "line-through text-muted-foreground")}>
                    {thing.name}
                  </span>
                  {unassigned && (
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                      <UserRound className="w-3 h-3" />
                      Sin asignar
                    </span>
                  )}
                </div>
                {thing.responsibles.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <UserRound className="w-3 h-3 shrink-0" />
                    {thing.responsibles.map((r) => r.user.name || r.user.email.split("@")[0]).join(", ")}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", unassigned && "text-amber-600 hover:text-amber-700")}
                onClick={() => {
                  setEditThing(thing);
                  setSelectedIds(thing.responsibles.map((r) => r.user.id));
                }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(thing.id)} disabled={isPending}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
