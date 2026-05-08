"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  createSupplyTemplate, deleteSupplyTemplate,
  addSupplyTemplateItem, deleteSupplyTemplateItem, updateSupplyTemplate,
} from "@/db/queries/supply-templates";
import { CATEGORY_LABELS } from "@/lib/supply-types";
import type { SupplyCategory } from "@/lib/supply-types";
import { Plus, Trash2, Pencil } from "lucide-react";

const CATEGORIES: SupplyCategory[] = ["house", "food", "produce", "breakfast", "drinks", "condiments"];

const CATEGORY_EMOJI: Record<string, string> = {
  house: "🏠", food: "🍽️", produce: "🥬", breakfast: "☕",
  drinks: "🥤", condiments: "🧂", picada: "🧀", meal_ingredients: "🛒",
};

type TemplateItem = { id: string; name: string; quantity: string | null; unit: string | null };
type Template = { id: string; name: string; category: string; items: TemplateItem[] };

export function SupplyTemplatesPanel({ templates }: { templates: Template[] }) {
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<SupplyCategory>("food");

  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<SupplyCategory>("food");

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemUnit, setItemUnit] = useState("unid");

  function handleCreate() {
    if (!newName) return;
    startTransition(async () => {
      await createSupplyTemplate({ name: newName, category: newCategory });
      setCreateOpen(false); setNewName("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteSupplyTemplate(id); });
  }

  function handleUpdate() {
    if (!editTemplate || !editName) return;
    startTransition(async () => {
      await updateSupplyTemplate(editTemplate.id, { name: editName, category: editCategory });
      setEditTemplate(null);
    });
  }

  function handleAddItem(templateId: string) {
    if (!itemName) return;
    startTransition(async () => {
      await addSupplyTemplateItem(templateId, { name: itemName, quantity: itemQty || undefined, unit: itemUnit || undefined });
      setItemName(""); setItemQty(""); setItemUnit("unid"); setAddingTo(null);
    });
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => { await deleteSupplyTemplateItem(itemId); });
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = templates.filter((t) => t.category === cat);
    return acc;
  }, {} as Record<SupplyCategory, Template[]>);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button><Plus className="w-4 h-4 mr-2" />Nueva plantilla</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva plantilla de surtido</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={newCategory} onValueChange={(v) => v && setNewCategory(v as SupplyCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input placeholder="Ej: Condimentos básicos..." value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
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
          <DialogHeader><DialogTitle>Editar plantilla</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={editCategory} onValueChange={(v) => v && setEditCategory(v as SupplyCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={isPending || !editName}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">No hay plantillas todavía.</p>
      )}

      {CATEGORIES.map((cat) => {
        const catTemplates = grouped[cat];
        if (catTemplates.length === 0) return null;
        return (
          <div key={cat} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{CATEGORY_EMOJI[cat]}</span>
              <h3 className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</h3>
            </div>

            <div className="space-y-5">
              {catTemplates.map((t) => (
                <div key={t.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium flex-1 truncate">{t.name}</h4>
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                      {t.items.length}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { setEditTemplate(t); setEditName(t.name); setEditCategory(t.category as SupplyCategory); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => handleDelete(t.id)} disabled={isPending}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {t.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="text-sm flex-1">
                          {item.name}
                          {(item.quantity || item.unit) && (
                            <span className="text-muted-foreground ml-1.5 text-xs">
                              {[item.quantity, item.unit].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteItem(item.id)} disabled={isPending}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}

                    {addingTo === t.id ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-primary/30">
                        <Input className="h-8 text-sm flex-1" placeholder="Nombre" value={itemName} onChange={(e) => setItemName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddItem(t.id)} />
                        <Input className="h-8 text-sm w-16" placeholder="Cant." value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
                        <Select value={itemUnit} onValueChange={(v) => v && setItemUnit(v)}>
                          <SelectTrigger size="sm" className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unid">unid</SelectItem>
                            <SelectItem value="gr">gr</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="l">l</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8" onClick={() => handleAddItem(t.id)} disabled={isPending || !itemName}>Listo</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddingTo(null); setItemName(""); setItemQty(""); setItemUnit("unid"); }}>×</Button>
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
          </div>
        );
      })}
    </div>
  );
}
