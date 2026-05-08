"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { addSupplyItem, toggleSupplyItem, deleteSupplyItem, updateSupplyItem, clearSupplyCategory } from "@/db/queries/supplies";
import { ImportSupplyButton } from "./import-supply-button";
import { CATEGORY_LABELS } from "@/lib/supply-types";
import type { SupplyCategory } from "@/lib/supply-types";
import { Plus, Trash2, Check, Pencil, X, ChevronDown, ChevronRight, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

const DISPLAY_CATEGORIES: SupplyCategory[] = ["house", "food", "produce", "breakfast", "drinks", "condiments", "picada", "meal_ingredients"];
const EDITABLE_CATEGORIES: SupplyCategory[] = ["house", "food", "produce", "breakfast", "drinks", "condiments", "picada"];

const CATEGORY_EMOJI: Record<SupplyCategory, string> = {
  house: "🏠", food: "🍽️", produce: "🥬", breakfast: "☕",
  drinks: "🥤", condiments: "🧂", picada: "🧀", meal_ingredients: "🛒",
};

type SupplyItem = {
  id: string; category: string; name: string;
  quantity: string | null; unit: string | null; checked: boolean;
};
type SupplyTemplate = { id: string; name: string; category: string; items: { id: string }[] };
type Props = { juntadaId: string; items: SupplyItem[]; supplyTemplates: SupplyTemplate[]; isAdmin: boolean };
type EditState = { id: string; name: string; quantity: string; unit: string; category: SupplyCategory };

export function SuppliesPanel({ juntadaId, items, supplyTemplates, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<SupplyCategory>("food");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("unid");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [collapsed, setCollapsed] = useState<Set<SupplyCategory>>(new Set());
  const [clearingCategory, setClearingCategory] = useState<SupplyCategory | null>(null);

  function toggleCollapse(cat: SupplyCategory) {
    setCollapsed((prev) => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next; });
  }

  function handleAdd() {
    if (!name) return;
    startTransition(async () => {
      await addSupplyItem({ juntadaId, category, name, quantity: quantity || undefined, unit: unit || undefined });
      setName(""); setQuantity(""); setUnit("unid"); setOpen(false);
    });
  }

  function handleToggle(id: string, checked: boolean) {
    startTransition(async () => { await toggleSupplyItem(id, !checked, juntadaId); });
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteSupplyItem(id, juntadaId); });
  }

  function handleClearCategory() {
    if (!clearingCategory) return;
    startTransition(async () => { await clearSupplyCategory(juntadaId, clearingCategory); setClearingCategory(null); });
  }

  function startEdit(item: SupplyItem) {
    setEditing({ id: item.id, name: item.name, quantity: item.quantity ?? "", unit: item.unit ?? "unid", category: item.category as SupplyCategory });
  }

  function handleSaveEdit() {
    if (!editing || !editing.name) return;
    startTransition(async () => {
      await updateSupplyItem(editing.id, { name: editing.name, quantity: editing.quantity || undefined, unit: editing.unit || undefined, category: editing.category }, juntadaId);
      setEditing(null);
    });
  }

  const grouped = DISPLAY_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<SupplyCategory, SupplyItem[]>);

  const totalChecked = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? (totalChecked / items.length) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{totalChecked}/{items.length} listos</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <ImportSupplyButton juntadaId={juntadaId} templates={supplyTemplates} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Agregar</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Agregar al surtido</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={category} onValueChange={(v) => v && setCategory(v as SupplyCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EDITABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input placeholder="Ej: Aceite" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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

      {/* Categories */}
      {DISPLAY_CATEGORIES.map((cat) => {
        const catItems = grouped[cat];
        if (catItems.length === 0) return null;
        const catChecked = catItems.filter((i) => i.checked).length;
        const isCollapsed = collapsed.has(cat);
        return (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCollapse(cat)}
                className="flex items-center gap-2 flex-1 text-left min-w-0 py-1"
              >
                <span className="text-base leading-none">{CATEGORY_EMOJI[cat]}</span>
                <span className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</span>
                <span className={cn(
                  "text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                  catChecked === catItems.length
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {catChecked}/{catItems.length}
                </span>
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setClearingCategory(cat)}
                  title="Borrar toda la lista"
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded shrink-0"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!isCollapsed && (
              <div className="space-y-1.5">
                {catItems.map((item) => {
                  const isEditing = editing?.id === item.id;
                  return (
                    <div key={item.id} className={cn(
                      "rounded-xl border transition-all",
                      item.checked ? "bg-muted/50 border-transparent" : "bg-card border-border/60"
                    )}>
                      {isEditing ? (
                        <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
                          <Input className="h-7 text-sm flex-1 min-w-24" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()} />
                          <Input className="h-7 text-sm w-16" placeholder="Cant." value={editing.quantity} onChange={(e) => setEditing({ ...editing, quantity: e.target.value })} />
                          <Select value={editing.unit} onValueChange={(v) => v && setEditing({ ...editing, unit: v })}>
                            <SelectTrigger size="sm" className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unid">unid</SelectItem><SelectItem value="gr">gr</SelectItem>
                              <SelectItem value="kg">kg</SelectItem><SelectItem value="l">l</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={editing.category} onValueChange={(v) => v && setEditing({ ...editing, category: v as SupplyCategory })}>
                            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EDITABLE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="h-7 px-2" onClick={handleSaveEdit} disabled={isPending || !editing.name}>Listo</Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-3">
                          <button
                            onClick={() => handleToggle(item.id, item.checked)}
                            disabled={isPending}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                              item.checked ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
                            )}
                          >
                            {item.checked && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />}
                          </button>
                          <span className={cn("text-sm flex-1", item.checked && "line-through opacity-50")}>
                            {item.name}
                            {(item.quantity || item.unit) && (
                              <span className="text-muted-foreground ml-1.5 text-xs">
                                {[item.quantity, item.unit].filter(Boolean).join(" ")}
                              </span>
                            )}
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100" onClick={() => startEdit(item)} disabled={isPending}>
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
              </div>
            )}
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">No hay items en el surtido todavía.</p>
      )}

      <Dialog open={clearingCategory !== null} onOpenChange={(v) => !v && setClearingCategory(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Borrar toda la lista?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se van a eliminar todos los items de{" "}
            <span className="font-medium text-foreground">{clearingCategory ? CATEGORY_LABELS[clearingCategory] : ""}</span>.
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearingCategory(null)} disabled={isPending}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClearCategory} disabled={isPending}>{isPending ? "Borrando..." : "Borrar todo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
