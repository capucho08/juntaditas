import { getBringTemplates } from "@/db/queries/bring-templates";
import { getSupplyTemplates } from "@/db/queries/supply-templates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BringTemplatesPanel } from "@/components/listas/bring-templates-panel";
import { SupplyTemplatesPanel } from "@/components/listas/supply-templates-panel";

export default async function ListasPage() {
  const [bringTemplates, supplyTemplates] = await Promise.all([
    getBringTemplates(),
    getSupplyTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plantillas</h1>
        <p className="text-muted-foreground text-sm">Listas reutilizables para importar en cualquier juntada</p>
      </div>

      <Tabs defaultValue="llevar">
        <TabsList>
          <TabsTrigger value="llevar">Cosas a llevar</TabsTrigger>
          <TabsTrigger value="surtido">Surtido</TabsTrigger>
        </TabsList>

        <TabsContent value="llevar" className="pt-4">
          <BringTemplatesPanel templates={bringTemplates as any} />
        </TabsContent>

        <TabsContent value="surtido" className="pt-4">
          <SupplyTemplatesPanel templates={supplyTemplates as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
