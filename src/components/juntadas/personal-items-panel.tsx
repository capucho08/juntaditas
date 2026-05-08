"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  addJuntadaPersonalItem, toggleJuntadaPersonalItem,
  deleteJuntadaPersonalItem, importPersonalList,
} from "@/db/queries/juntada-personal-items";
import { Plus, Trash2, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Attendee = { id: string; name: string; email: string };
type PersonalItem = { id: string; userId: string; name: string; checked: boolean };
type PersonalListItem = { id: string; name: string };
type MyList = { id: string; name: string; items: PersonalListItem[] };

type Props = {
  juntadaId: string;
  currentUserId: string;
  attendees: Attendee[];
  items: PersonalItem[];
  myLists: MyList[];
};

function displayName(attendee: Attendee) {
  return attendee.name || attendee.email.split("@")[0];
}

export function PersonalItemsPanel({ juntadaId, currentUserId, attendees, items, myLists }: Props) {
  const [isPending, startTransition] = useTransition();
  const [newItem, setNewItem] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const myItems = items.filter((i) => i.userId === currentUserId);
  const othersWithItems = attendees.filter(
    (a) => a.id !== currentUserId && items.some((i) => i.userId === a.id)
  );

  function handleAdd() {
    if (!newItem.trim()) return;
    startTransition(async () => {
      await addJuntadaPersonalItem(juntadaId, newItem.trim());
      setNewItem("");
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleJuntadaPersonalItem(id, juntadaId);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteJuntadaPersonalItem(id, juntadaId);
    });
  }

  function handleImport(listId: string) {
    startTransition(async () => {
      await importPersonalList(listId, juntadaId);
      setImportOpen(false);
    });
  }

  const me = attendees.find((a) => a.id === currentUserId);

  return (
    <div className="space-y-6">
      {/* My section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            Mis cosas {me ? `(${displayName(me)})` : ""}
          </h3>
          {myLists.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Importar lista
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          {myItems.length === 0 && (
            <p className="text-sm text-muted-foreground px-1 py-2">Sin items todavía.</p>
          )}
          {myItems.map((item) => (
            <div key={item.id} className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
              item.checked ? "bg-muted/50 border-transparent" : "bg-card border-border/60"
            )}>
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                disabled={isPending}
                className={cn(
                  "w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
                  item.checked ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
                )}
              >
                {item.checked && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />}
              </button>
              <span className={cn("text-sm flex-1", item.checked && "line-through opacity-50")}>
                {item.name}
              </span>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0"
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          {/* Add item inline */}
          <div className="flex items-center gap-2 px-1 py-1">
            <Input
              className="h-8 text-sm flex-1"
              placeholder="Agregar item..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button size="sm" className="h-8" onClick={handleAdd} disabled={isPending || !newItem.trim()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Other attendees with items */}
      {othersWithItems.map((attendee) => {
        const theirItems = items.filter((i) => i.userId === attendee.id);
        return (
          <div key={attendee.id} className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">{displayName(attendee)}</h3>
            <div className="space-y-1.5">
              {theirItems.map((item) => (
                <div key={item.id} className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all",
                  item.checked ? "bg-muted/50 border-transparent" : "bg-card border-border/60"
                )}>
                  <div className={cn(
                    "w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center",
                    item.checked ? "bg-primary border-primary" : "border-muted-foreground/20"
                  )}>
                    {item.checked && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />}
                  </div>
                  <span className={cn("text-sm flex-1", item.checked && "line-through opacity-50")}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nadie agregó cosas personales todavía.
        </p>
      )}

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar lista personal</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {myLists.map((list) => (
              <div key={list.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{list.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {list.items.length > 0
                      ? list.items.map((i) => i.name).join(", ")
                      : "Sin items"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleImport(list.id)}
                  disabled={isPending || list.items.length === 0}
                  className="shrink-0 ml-3"
                >
                  Importar
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
