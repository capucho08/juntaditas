import { requireAdmin } from "@/auth/server";
import { JuntadaForm } from "@/components/juntadas/juntada-form";

export default async function NuevaJuntadaPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva juntada</h1>
        <p className="text-muted-foreground text-sm">Completá los datos para crear una nueva juntada</p>
      </div>
      <JuntadaForm />
    </div>
  );
}
