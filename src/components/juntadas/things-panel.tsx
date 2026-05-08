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
type Thing = { id: string; name: string; checked: boolean; responsibles: { user: Attendee }[] };
type Template = { id: string; name: string; description: string | null; items: { id: string }[] };
type Props = { juntadaId: string; things: Thing[]; attendees: Attendee[]; templates: Template[] };

export function ThingsPanel({ juntadaId, things, attendees, templates }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editThing, setEditThing] = useState<Thing | null>(null);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function handleAdd() {
    if (!name) return;
    startTransition(async () => {
      await addThingToBring({ juntadaId, name, responsibleIds: selectedIds });
      setName(""); setSelectedIds([]); setAddOpen(false);
    });
  }

  function handleToggle(id: string, checked: boolean) {
    startTransition(async () => { await toggleThingToBring(id, !checked, juntadaId); });
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteThingToBring(id, juntadaId); });
  }

  function handleUpdateResponsibles() {
    if (!editThing) return;
    startTransition(async () => {
      await updateThingResponsibles(editThing.id, selectedIds, juntadaId);
      setEditThing(null);
    });
  }

  const checked = things.filter((t) => t.checked).length;
  const unassignedCount = things.filter((t) => !t.checked && t.responsibles.length === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{checked}/{things.length}</span>
          <span className="text-sm text-muted-foreground">confirmadas</span>
        </div>
        <div className="flex gap-2">
          <ImportTemplateButton juntadaId={juntadaId} templates={templates} />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Agregar</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar cosa a llevar</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>¿Qué hay que llevar?</Label>
                  <Input placeholder="Ej: Parlante, reposeras..." value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Responsables (opcional)</Label>
                  <MultiSelect
                    options={attendees.map((a) => ({ id: a.id, label: a.name || a.email.split("@")[0] }))}
                    selected={selectedIds} onChange={setSelectedIds} placeholder="Asignar responsables..."
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

      <Dialog open={!!editThing} onOpenChange={(v) => { if (!v) setEditThing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responsables — {editThing?.name}</DialogTitle></DialogHeader>
          <MultiSelect
            options={attendees.map((a) => ({ id: a.id, label: a.name || a.email.split("@")[0] }))}
            selected={selectedIds} onChange={setSelectedIds} placeholder="Seleccioná responsables..."
          />
          <DialogFooter>
            <Button onClick={handleUpdateResponsibles} disabled={isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {things.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No hay cosas cargadas todavía.</p>
      ) : (
        <div className="space-y-2">
          {unassignedCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {unassignedCount} item{unassignedCount !== 1 ? "s" : ""} sin responsable asignado
            </div>
          )}
          <div className="space-y-1.5">
            {things.map((thing) => {
              const unassigned = thing.responsibles.length === 0 && !thing.checked;
              return (
                <div key={thing.id} className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
                  thing.checked
                    ? "bg-muted/50 border-transparent"
                    : unassigned
                    ? "bg-amber-50/60 border-amber-200/60"
                    : "bg-card border-border/60"
                )}>
                  <button
                    onClick={() => handleToggle(thing.id, thing.checked)}
                    disabled={isPending}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      thing.checked ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
                    )}
                  >
                    {thing.checked && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm block", thing.checked && "line-through opacity-50")}>
                      {thing.name}
                    </span>
                    {thing.responsibles.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <UserRound className="w-3 h-3 shrink-0" />
                        {thing.responsibles.map((r) => r.user.name || r.user.email.split("@")[0]).join(", ")}
                      </span>
                    )}
                    {unassigned && (
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5 mt-0.5">
                        <UserRound className="w-3 h-3" /> Sin asignar
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className={cn("h-7 w-7 p-0 shrink-0", unassigned && "text-amber-600 hover:text-amber-700")}
                    onClick={() => { setEditThing(thing); setSelectedIds(thing.responsibles.map((r) => r.user.id)); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleDelete(thing.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
