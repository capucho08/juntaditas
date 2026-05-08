"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  createBringTemplate, updateBringTemplate, deleteBringTemplate,
  addTemplateItem, deleteTemplateItem,
} from "@/db/queries/bring-templates";
import { Plus, Trash2, Pencil } from "lucide-react";

type Item = { id: string; name: string };
type Template = { id: string; name: string; description: string | null; items: Item[] };

export function BringTemplatesPanel({ templates }: { templates: Template[] }) {
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");

  function handleCreate() {
    if (!newName) return;
    startTransition(async () => {
      await createBringTemplate({ name: newName, description: newDesc || undefined });
      setCreateOpen(false); setNewName(""); setNewDesc("");
    });
  }

  function handleUpdate() {
    if (!editTemplate || !editName) return;
    startTransition(async () => {
      await updateBringTemplate(editTemplate.id, { name: editName, description: editDesc || undefined });
      setEditTemplate(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBringTemplate(id);
      setDeleteId(null);
    });
  }

  function handleAddItem(templateId: string) {
    if (!itemName.trim()) return;
    startTransition(async () => {
      await addTemplateItem(templateId, itemName.trim());
      setItemName(""); setAddingTo(null);
    });
  }

  function handleDeleteItem(itemId: string, templateId: string) {
    startTransition(async () => { await deleteTemplateItem(itemId, templateId); });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button><Plus className="w-4 h-4 mr-2" />Nueva lista</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva lista de cosas a llevar</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input placeholder="Ej: Camping, Casa de campo..." value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea placeholder="Para qué tipo de juntadas..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isPending || !newName}>Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editTemplate} onOpenChange={(v) => { if (!v) setEditTemplate(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar lista</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={isPending || !editName}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Eliminar lista?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Se eliminarán la lista y todos sus items. Las juntadas que ya importaron esta lista no se ven afectadas.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteId!)} disabled={isPending}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">No hay listas todavía. ¡Creá la primera!</p>
      )}

      {templates.map((t) => (
        <div key={t.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate">{t.name}</h3>
              {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
            </div>
            <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
              {t.items.length}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { setEditTemplate(t); setEditName(t.name); setEditDesc(t.description ?? ""); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setDeleteId(t.id)} disabled={isPending}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-1.5">
            {t.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/60">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-sm flex-1">{item.name}</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteItem(item.id, t.id)} disabled={isPending}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            {addingTo === t.id ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-primary/30">
                <Input className="h-8 text-sm flex-1" placeholder="Nombre del item..." value={itemName} onChange={(e) => setItemName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddItem(t.id)} />
                <Button size="sm" className="h-8" onClick={() => handleAddItem(t.id)} disabled={isPending || !itemName.trim()}>Listo</Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddingTo(null); setItemName(""); }}>×</Button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                onClick={() => setAddingTo(t.id)}
              >
                <Plus className="w-3.5 h-3.5" /> Agregar item
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
