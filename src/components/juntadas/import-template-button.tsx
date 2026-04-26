"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { importTemplateIntoJuntada } from "@/db/queries/bring-templates";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Template = { id: string; name: string; description: string | null; items: { id: string }[] };

type Props = {
  juntadaId: string;
  templates: Template[];
};

export function ImportTemplateButton({ juntadaId, templates }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleImport() {
    if (!selected) return;
    startTransition(async () => {
      await importTemplateIntoJuntada(selected, juntadaId);
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setSelected(null);
        setDone(false);
      }, 800);
    });
  }

  if (templates.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />Importar lista
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar lista</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Seleccioná una lista para agregar sus items a esta juntada. Los items ya existentes no se tocan.
          </p>
          <div className="space-y-2 pt-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                  selected === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted"
                )}
              >
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.description && `${t.description} · `}{t.items.length} item{t.items.length !== 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleImport} disabled={isPending || !selected}>
            {done ? "¡Importado!" : isPending ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
