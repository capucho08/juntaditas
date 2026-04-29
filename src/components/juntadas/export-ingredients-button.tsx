"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportIngredientsToSupplies } from "@/db/queries/meals";
import { toast } from "sonner";
import { Download } from "lucide-react";

type Props = {
  juntadaId: string;
};

export function ExportIngredientsButton({ juntadaId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      try {
        await exportIngredientsToSupplies(juntadaId);
        toast.success("Ingredientes exportados al Surtido", {
          description: 'Los encontrás en la categoría "Ingredientes Comidas".',
        });
      } catch {
        toast.error("Error al exportar ingredientes");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      <Download className="w-4 h-4 mr-1.5" />
      {isPending ? "Exportando..." : "Exportar todo"}
    </Button>
  );
}
