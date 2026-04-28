"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { addSupplyItem, toggleSupplyItem, deleteSupplyItem, updateSupplyItem } from "@/db/queries/supplies";
import { ImportSupplyButton } from "./import-supply-button";
import { CATEGORY_LABELS } from "@/lib/supply-types";
import type { SupplyCategory } from "@/lib/supply-types";
import { Plus, Trash2, Check, Pencil, X, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DISPLAY_CATEGORIES: SupplyCategory[] = ["house", "food", "produce", "breakfast", "drinks", "condiments", "meal_ingredients"];
const EDITABLE_CATEGORIES: SupplyCategory[] = ["house", "food", "produce", "breakfast", "drinks", "condiments"];

type SupplyItem = {
  id: string;
  category: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  checked: boolean;
};

type SupplyTemplate = { id: string; name: string; category: string; items: { id: string }[] };

type Props = {
  juntadaId: string;
  items: SupplyItem[];
  supplyTemplates: SupplyTemplate[];
};

type EditState = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: SupplyCategory;
};

export function SuppliesPanel({ juntadaId, items, supplyTemplates }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<SupplyCategory>("food");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("unid");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [collapsed, setCollapsed] = useState<Set<SupplyCategory>>(new Set());

  function toggleCollapse(cat: SupplyCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function handleAdd() {
    if (!name) return;
    startTransition(async () => {
      await addSupplyItem({ juntadaId, category, name, quantity: quantity || undefined, unit: unit || undefined });
      setName("");
      setQuantity("");
      setUnit("unid");
      setOpen(false);
    });
  }

  function handleToggle(id: string, checked: boolean) {
    startTransition(async () => { await toggleSupplyItem(id, !checked, juntadaId); });
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteSupplyItem(id, juntadaId); });
  }

  function startEdit(item: SupplyItem) {
    setEditing({
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? "",
      unit: item.unit ?? "unid",
      category: item.category as SupplyCategory,
    });
  }

  function handleSaveEdit() {
    if (!editing || !editing.name) return;
    startTransition(async () => {
      await updateSupplyItem(
        editing.id,
        { name: editing.name, quantity: editing.quantity || undefined, unit: editing.unit || undefined, category: editing.category },
        juntadaId
      );
      setEditing(null);
    });
  }

  const grouped = DISPLAY_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<SupplyCategory, SupplyItem[]>);

  const totalChecked = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalChecked}/{items.length} items listos
        </p>
        <div className="flex gap-2">
          <ImportSupplyButton juntadaId={juntadaId} templates={supplyTemplates} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Agregar</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar al surtido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v as SupplyCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EDITABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Ej: Aceite" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Cantidad (opcional)</Label>
                    <Input placeholder="2" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad</Label>
                    <Select value={unit} onValueChange={(v) => v && setUnit(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unid">unid</SelectItem>
                        <SelectItem value="gr">gr</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="l">l</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={isPending || !name}>Agregar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {DISPLAY_CATEGORIES.map((cat) => {
        const catItems = grouped[cat];
        if (catItems.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <button
              onClick={() => toggleCollapse(cat)}
              className="flex items-center gap-1.5 w-full text-left"
            >
              {collapsed.has(cat)
                ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              }
              <h3 className="text-sm font-semibold text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </h3>
              <span className="text-xs text-muted-foreground ml-1">
                ({catItems.filter((i) => i.checked).length}/{catItems.length})
              </span>
            </button>
            {!collapsed.has(cat) && <div className="divide-y border rounded-lg">
              {catItems.map((item) => {
                const isEditing = editing?.id === item.id;
                return (
                  <div key={item.id}>
                    {isEditing ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                        <Input
                          className="h-7 text-sm flex-1"
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                        />
                        <Input
                          className="h-7 text-sm w-16"
                          placeholder="Cant."
                          value={editing.quantity}
                          onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                        />
                        <Select value={editing.unit} onValueChange={(v) => v && setEditing({ ...editing, unit: v })}>
                          <SelectTrigger size="sm" className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unid">unid</SelectItem>
                            <SelectItem value="gr">gr</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="l">l</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={editing.category} onValueChange={(v) => v && setEditing({ ...editing, category: v as SupplyCategory })}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {EDITABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-7 px-2" onClick={handleSaveEdit} disabled={isPending || !editing.name}>Listo</Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <button
                          onClick={() => handleToggle(item.id, item.checked)}
                          disabled={isPending}
                          className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                            item.checked ? "bg-primary border-primary" : "border-border hover:border-primary"
                          )}
                        >
                          {item.checked && <Check className="w-3 h-3 text-primary-foreground" />}
                        </button>
                        <span className={cn("text-sm flex-1", item.checked && "line-through text-muted-foreground")}>
                          {item.name}
                          {(item.quantity || item.unit) && (
                            <span className="text-muted-foreground ml-1">
                              ({[item.quantity, item.unit].filter(Boolean).join(" ")})
                            </span>
                          )}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(item)} disabled={isPending}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(item.id)} disabled={isPending}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay items en el surtido todavía.
        </p>
      )}
    </div>
  );
}
