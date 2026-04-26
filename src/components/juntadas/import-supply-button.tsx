"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { importSupplyTemplates } from "@/db/queries/supply-templates";
import { CATEGORY_LABELS } from "@/lib/supply-types";
import type { SupplyCategory } from "@/lib/supply-types";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Template = { id: string; name: string; category: string; items: { id: string }[] };

type Props = { juntadaId: string; templates: Template[] };

const CATEGORY_ORDER: SupplyCategory[] = ["house", "food", "produce", "breakfast", "drinks", "condiments"];

export function ImportSupplyButton({ juntadaId, templates }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (templates.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  function handleImport() {
    if (selected.length === 0) return;
    startTransition(async () => {
      await importSupplyTemplates(selected, juntadaId);
      setDone(true);
      setTimeout(() => { setOpen(false); setSelected([]); setDone(false); }, 800);
    });
  }

  // Group by category
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = templates.filter((t) => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<SupplyCategory, Template[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />Importar plantillas</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar plantillas de surtido</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground">
            Seleccioná una o más plantillas. Sus items se agregan al surtido sin tocar los existentes.
          </p>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {CATEGORY_LABELS[cat as SupplyCategory]}
              </p>
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-3",
                    selected.includes(t.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{t.items.length} items</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {selected.length > 0 && (
            <span className="text-xs text-muted-foreground">{selected.length} plantilla{selected.length !== 1 ? "s" : ""} seleccionada{selected.length !== 1 ? "s" : ""}</span>
          )}
          <Button onClick={handleImport} disabled={isPending || selected.length === 0} className="ml-auto">
            {done ? "¡Importado!" : isPending ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
