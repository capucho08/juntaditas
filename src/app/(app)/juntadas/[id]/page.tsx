import { notFound } from "next/navigation";
import Link from "next/link";
import { getJuntada } from "@/db/queries/juntadas";
import { getExpenses } from "@/db/queries/expenses";
import { getMealsForJuntada } from "@/db/queries/meals";
import { getJuntadaPersonalItems } from "@/db/queries/juntada-personal-items";
import { getMyPersonalLists } from "@/db/queries/personal-lists";
import { getBringTemplates } from "@/db/queries/bring-templates";
import { getSupplyTemplates } from "@/db/queries/supply-templates";
import { getSupplyItems, getThingsToBring } from "@/db/queries/supplies";
import { getDrinkConfigs, getDrinkPreferences } from "@/db/queries/drinks";
import { getSession } from "@/auth/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AttendancePanel } from "@/components/juntadas/attendance-panel";
import { MealsPanel } from "@/components/juntadas/meals-panel";
import { DrinksPanel } from "@/components/juntadas/drinks-panel";
import { SuppliesPanel } from "@/components/juntadas/supplies-panel";
import { ThingsPanel } from "@/components/juntadas/things-panel";
import { PersonalItemsPanel } from "@/components/juntadas/personal-items-panel";
import { ExpensesPanel } from "@/components/juntadas/expenses-panel";
import { DeleteJuntadaButton } from "@/components/juntadas/delete-juntada-button";
import { formatDate, getDatesInRange, getNights } from "@/lib/dates";
import { MapPin, Calendar, Pencil, Users, Utensils, ListChecks, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function JuntadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [juntada, session] = await Promise.all([getJuntada(id), getSession()]);
  if (!juntada || !session) notFound();

  const [expenses, supplyItems, things, drinkConfigs, drinkPreferences, meals, templates, supplyTemplates, personalItems, myPersonalLists] = await Promise.all([
    getExpenses(id),
    getSupplyItems(id),
    getThingsToBring(id),
    getDrinkConfigs(id),
    getDrinkPreferences(id),
    getMealsForJuntada(id),
    getBringTemplates(),
    getSupplyTemplates(),
    getJuntadaPersonalItems(id),
    getMyPersonalLists(),
  ]);

  const isAdmin = session.user.role === "admin";
  const dates = getDatesInRange(juntada.dateStart, juntada.dateEnd);
  const totalDays = getNights(juntada.dateStart, juntada.dateEnd) + 1;
  const now = new Date().toISOString().split("T")[0];
  const isPast = juntada.dateEnd < now;
  const attendees = juntada.attendance.map((a) => a.user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{juntada.title}</h1>
            {isPast && <Badge variant="secondary">Pasada</Badge>}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {juntada.location}
            </span>
            {(juntada.locationUrl || juntada.wazeUrl) && (
              <span className="flex items-center gap-1.5">
                {juntada.locationUrl && (
                  <a
                    href={juntada.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border hover:bg-accent transition-colors"
                  >
                    <svg viewBox="0 0 92.3 132.3" className="w-3 h-3 shrink-0" aria-hidden="true">
                      <path fill="#1a73e8" d="M46.2 0C20.7 0 0 20.7 0 46.2c0 35.5 46.2 86.1 46.2 86.1s46.2-50.6 46.2-86.1C92.3 20.7 71.6 0 46.2 0z"/>
                      <circle fill="#fff" cx="46.2" cy="46.2" r="18.8"/>
                    </svg>
                    Maps
                  </a>
                )}
                {juntada.wazeUrl && (
                  <a
                    href={juntada.wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border hover:bg-accent transition-colors"
                  >
                    <svg viewBox="0 0 64 64" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                      <ellipse fill="#33ccff" cx="32" cy="30" rx="28" ry="26"/>
                      <path fill="#fff" d="M20 28c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4zm16 0c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"/>
                      <path fill="#fff" d="M24 38c2 3 6 5 8 5s6-2 8-5H24z"/>
                      <circle fill="#33ccff" cx="48" cy="50" r="6"/>
                      <circle fill="#33ccff" cx="28" cy="58" r="5"/>
                    </svg>
                    Waze
                  </a>
                )}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(juntada.dateStart)} → {formatDate(juntada.dateEnd)}
            </span>
          </div>
          {juntada.description && (
            <p className="text-sm text-muted-foreground pt-1">{juntada.description}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/juntadas/${id}/editar`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Link>
            <DeleteJuntadaButton juntadaId={id} />
          </div>
        )}
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="quienes">
        {/* 4-tab bar: icon + label */}
        <TabsList className="w-full h-auto gap-0.5 p-1">
          <TabsTrigger value="quienes" className="flex-col py-2.5 gap-1 h-auto">
            <Users className="w-[18px] h-[18px]" />
            <span className="text-[11px] leading-none font-medium">Quiénes</span>
          </TabsTrigger>
          <TabsTrigger value="comidas" className="flex-col py-2.5 gap-1 h-auto">
            <Utensils className="w-[18px] h-[18px]" />
            <span className="text-[11px] leading-none font-medium">Comidas</span>
          </TabsTrigger>
          <TabsTrigger value="listas" className="flex-col py-2.5 gap-1 h-auto">
            <ListChecks className="w-[18px] h-[18px]" />
            <span className="text-[11px] leading-none font-medium">Listas</span>
          </TabsTrigger>
          <TabsTrigger value="gastos" className="flex-col py-2.5 gap-1 h-auto">
            <Receipt className="w-[18px] h-[18px]" />
            <span className="text-[11px] leading-none font-medium">Gastos</span>
          </TabsTrigger>
        </TabsList>

        {/* Quiénes */}
        <TabsContent value="quienes" className="pt-4">
          <AttendancePanel
            juntadaId={id}
            dateStart={juntada.dateStart}
            dateEnd={juntada.dateEnd}
            dates={dates}
            attendance={juntada.attendance as any}
            currentUserId={session.user.id}
          />
        </TabsContent>

        {/* Comidas → sub-tabs Comidas / Bebidas */}
        <TabsContent value="comidas" className="pt-4">
          <Tabs defaultValue="platos">
            <TabsList variant="line" className="w-full border-b mb-5">
              <TabsTrigger value="platos">Comidas</TabsTrigger>
              <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
            </TabsList>
            <TabsContent value="platos">
              <MealsPanel
                juntadaId={id}
                dates={dates}
                attendance={juntada.attendance as any}
                isAdmin={isAdmin}
                currentUserId={session.user.id}
              />
            </TabsContent>
            <TabsContent value="bebidas">
              <DrinksPanel
                juntadaId={id}
                currentUserId={session.user.id}
                configs={drinkConfigs}
                preferences={drinkPreferences as any}
                attendance={juntada.attendance as any}
                dates={dates}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Listas → sub-tabs Surtido / A llevar / Personal */}
        <TabsContent value="listas" className="pt-4">
          <Tabs defaultValue="surtido">
            <TabsList variant="line" className="w-full border-b mb-5">
              <TabsTrigger value="surtido">Surtido</TabsTrigger>
              <TabsTrigger value="llevar">A llevar</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
            </TabsList>
            <TabsContent value="surtido">
              <SuppliesPanel juntadaId={id} items={supplyItems} supplyTemplates={supplyTemplates as any} isAdmin={isAdmin} />
            </TabsContent>
            <TabsContent value="llevar">
              <ThingsPanel
                juntadaId={id}
                things={things as any}
                attendees={attendees as any}
                templates={templates as any}
              />
            </TabsContent>
            <TabsContent value="personal">
              <PersonalItemsPanel
                juntadaId={id}
                currentUserId={session.user.id}
                attendees={attendees as any}
                items={personalItems as any}
                myLists={myPersonalLists as any}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Gastos */}
        <TabsContent value="gastos" className="pt-4">
          <ExpensesPanel
            juntadaId={id}
            dateStart={juntada.dateStart}
            dateEnd={juntada.dateEnd}
            expenses={expenses as any}
            meals={meals as any}
            attendance={juntada.attendance as any}
            attendees={attendees as any}
            currentUserId={session.user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
