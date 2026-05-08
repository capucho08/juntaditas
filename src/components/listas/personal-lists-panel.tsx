"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  createPersonalList, renamePersonalList, deletePersonalList,
  addPersonalListItem, deletePersonalListItem,
} from "@/db/queries/personal-lists";
import { Plus, Trash2, Pencil } from "lucide-react";

type Item = { id: string; name: string };
type PersonalList = { id: string; name: string; items: Item[] };

export function PersonalListsPanel({ lists }: { lists: PersonalList[] }) {
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [editList, setEditList] = useState<PersonalList | null>(null);
  const [editName, setEditName] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createPersonalList(newName.trim());
      setNewName(""); setCreateOpen(false);
    });
  }

  function handleRename() {
    if (!editList || !editName.trim()) return;
    startTransition(async () => {
      await renamePersonalList(editList.id, editName.trim());
      setEditList(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePersonalList(id);
      setDeleteId(null);
    });
  }

  function handleAddItem(listId: string) {
    if (!itemName.trim()) return;
    startTransition(async () => {
      await addPersonalListItem(listId, itemName.trim());
      setItemName(""); setAddingTo(null);
    });
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => { await deletePersonalListItem(itemId); });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button><Plus className="w-4 h-4 mr-2" />Nueva lista</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva lista personal</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Camping, Casa de playa..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} autoFocus />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isPending || !newName.trim()}>Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editList} onOpenChange={(v) => { if (!v) setEditList(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renombrar lista</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename()} autoFocus />
          </div>
          <DialogFooter>
            <Button onClick={handleRename} disabled={isPending || !editName.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Eliminar lista?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Se eliminará la lista y todos sus items. No afecta las juntadas donde ya importaste estos items.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteId!)} disabled={isPending}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lists.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">No tenés listas personales todavía. ¡Creá una para importarla en tus juntadas!</p>
      )}

      {lists.map((list) => (
        <div key={list.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold flex-1 truncate">{list.name}</h3>
            <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
              {list.items.length}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { setEditList(list); setEditName(list.name); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => setDeleteId(list.id)} disabled={isPending}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-1.5">
            {list.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/60">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-sm flex-1">{item.name}</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteItem(item.id)} disabled={isPending}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            {addingTo === list.id ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-primary/30">
                <Input className="h-8 text-sm flex-1" placeholder="Nombre del item..." value={itemName} onChange={(e) => setItemName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddItem(list.id)} />
                <Button size="sm" className="h-8" onClick={() => handleAddItem(list.id)} disabled={isPending || !itemName.trim()}>Listo</Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddingTo(null); setItemName(""); }}>×</Button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                onClick={() => setAddingTo(list.id)}
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
