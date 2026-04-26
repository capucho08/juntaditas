"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { addSupplyItem, toggleSupplyItem, deleteSupplyItem } from "@/db/queries/supplies";
import { CATEGORY_LABELS } from "@/lib/supply-types";
import type { SupplyCategory } from "@/lib/supply-types";
import { Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: SupplyCategory[] = ["house", "food", "produce", "breakfast", "drinks", "condiments"];

type SupplyItem = {
  id: string;
  category: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  checked: boolean;
};

type Props = {
  juntadaId: string;
  items: SupplyItem[];
};

export function SuppliesPanel({ juntadaId, items }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<SupplyCategory>("food");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");

  function handleAdd() {
    if (!name) return;
    startTransition(async () => {
      await addSupplyItem({
        juntadaId,
        category,
        name,
        quantity: quantity || undefined,
        unit: unit || undefined,
      });
      setName("");
      setQuantity("");
      setUnit("");
      setOpen(false);
    });
  }

  function handleToggle(id: string, checked: boolean) {
    startTransition(async () => {
      await toggleSupplyItem(id, !checked, juntadaId);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSupplyItem(id, juntadaId);
    });
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
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
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
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
                  <Label>Unidad (opcional)</Label>
                  <Input placeholder="kg, lts..." value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isPending || !name}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {CATEGORIES.map((cat) => {
        const catItems = grouped[cat];
        if (catItems.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{CATEGORY_LABELS[cat]}</h3>
            <div className="divide-y border rounded-lg">
              {catItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
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
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(item.id)} disabled={isPending}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
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
