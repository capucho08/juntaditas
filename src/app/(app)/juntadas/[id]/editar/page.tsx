import { notFound } from "next/navigation";
import { requireAdmin } from "@/auth/server";
import { getJuntada } from "@/db/queries/juntadas";
import { JuntadaForm } from "@/components/juntadas/juntada-form";

export default async function EditarJuntadaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const juntada = await getJuntada(id);
  if (!juntada) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar juntada</h1>
        <p className="text-muted-foreground text-sm">{juntada.title}</p>
      </div>
      <JuntadaForm juntada={juntada} />
    </div>
  );
}
