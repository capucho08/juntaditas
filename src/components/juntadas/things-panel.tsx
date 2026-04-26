"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { addThingToBring, toggleThingToBring, deleteThingToBring, updateThingResponsibles } from "@/db/queries/supplies";
import { Plus, Trash2, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };
type Thing = {
  id: string;
  name: string;
  checked: boolean;
  responsibles: { user: Attendee }[];
};

type Props = {
  juntadaId: string;
  things: Thing[];
  attendees: Attendee[];
};

export function ThingsPanel({ juntadaId, things, attendees }: Props) {
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
                <div className="flex flex-wrap gap-2">
                  {attendees.map((a) => (
                    <button key={a.id} type="button" onClick={() => toggleId(a.id)}
                      className={cn("px-3 py-1 rounded-full text-sm border transition-colors",
                        selectedIds.includes(a.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                      )}>
                      {a.name || a.email.split("@")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isPending || !name}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit responsibles dialog */}
      <Dialog open={!!editThing} onOpenChange={(v) => { if (!v) setEditThing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responsables — {editThing?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {attendees.map((a) => (
              <button key={a.id} type="button" onClick={() => toggleId(a.id)}
                className={cn("px-3 py-1 rounded-full text-sm border transition-colors",
                  selectedIds.includes(a.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                )}>
                {a.name || a.email.split("@")[0]}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateResponsibles} disabled={isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {things.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay cosas cargadas todavía.</p>
      ) : (
        <div className="divide-y border rounded-lg">
          {things.map((thing) => (
            <div key={thing.id} className="flex items-center gap-3 px-3 py-3">
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
                <span className={cn("text-sm", thing.checked && "line-through text-muted-foreground")}>
                  {thing.name}
                </span>
                {thing.responsibles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {thing.responsibles.map((r) => r.user.name || r.user.email.split("@")[0]).join(", ")}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
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
          ))}
        </div>
      )}
    </div>
  );
}
