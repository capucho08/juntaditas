import { getBringTemplates } from "@/db/queries/bring-templates";
import { getSupplyTemplates } from "@/db/queries/supply-templates";
import { getMyPersonalLists } from "@/db/queries/personal-lists";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BringTemplatesPanel } from "@/components/listas/bring-templates-panel";
import { SupplyTemplatesPanel } from "@/components/listas/supply-templates-panel";
import { PersonalListsPanel } from "@/components/listas/personal-lists-panel";
import { BookOpen, Package, ShoppingCart } from "lucide-react";

export default async function ListasPage() {
  const [bringTemplates, supplyTemplates, myPersonalLists] = await Promise.all([
    getBringTemplates(),
    getSupplyTemplates(),
    getMyPersonalLists(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Listas</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Tus listas personales y plantillas reutilizables</p>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="w-full h-auto gap-0.5 p-1">
          <TabsTrigger value="personal" className="flex-col py-2.5 gap-1 h-auto">
            <BookOpen className="w-[18px] h-[18px]" />
            <span className="text-[11px] leading-none font-medium">Mis listas</span>
          </TabsTrigger>
          <TabsTrigger value="llevar" className="flex-col py-2.5 gap-1 h-auto">
            <Package className="w-[18px] h-[18px]" />
            <span className="text-[11px] leading-none font-medium">A llevar</span>
          </TabsTrigger>
          <TabsTrigger value="surtido" className="flex-col py-2.5 gap-1 h-auto">
            <ShoppingCart className="w-[18px] h-[18px]" />
            <span className="text-[11px] leading-none font-medium">Surtido</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="pt-5">
          <PersonalListsPanel lists={myPersonalLists as any} />
        </TabsContent>

        <TabsContent value="llevar" className="pt-5">
          <BringTemplatesPanel templates={bringTemplates as any} />
        </TabsContent>

        <TabsContent value="surtido" className="pt-5">
          <SupplyTemplatesPanel templates={supplyTemplates as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
