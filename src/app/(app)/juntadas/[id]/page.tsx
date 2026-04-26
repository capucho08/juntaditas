import { notFound } from "next/navigation";
import Link from "next/link";
import { getJuntada } from "@/db/queries/juntadas";
import { getExpenses } from "@/db/queries/expenses";
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
import { ExpensesPanel } from "@/components/juntadas/expenses-panel";
import { DeleteJuntadaButton } from "@/components/juntadas/delete-juntada-button";
import { formatDate, getDatesInRange, getNights } from "@/lib/dates";
import { MapPin, Calendar, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function JuntadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [juntada, session] = await Promise.all([getJuntada(id), getSession()]);
  if (!juntada || !session) notFound();

  const [expenses, supplyItems, things, drinkConfigs, drinkPreferences] = await Promise.all([
    getExpenses(id),
    getSupplyItems(id),
    getThingsToBring(id),
    getDrinkConfigs(id),
    getDrinkPreferences(id),
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
              <MapPin className="w-3.5 h-3.5" />
              {juntada.location}
            </span>
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
      <Tabs defaultValue="asistencia">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="comidas">Comidas</TabsTrigger>
          <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
          <TabsTrigger value="surtido">Surtido</TabsTrigger>
          <TabsTrigger value="llevar">A llevar</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="asistencia" className="pt-4">
          <AttendancePanel
            juntadaId={id}
            dateStart={juntada.dateStart}
            dateEnd={juntada.dateEnd}
            dates={dates}
            attendance={juntada.attendance as any}
            currentUserId={session.user.id}
          />
        </TabsContent>

        <TabsContent value="comidas" className="pt-4">
          <MealsPanel
            juntadaId={id}
            dates={dates}
            attendance={juntada.attendance as any}
          />
        </TabsContent>

        <TabsContent value="bebidas" className="pt-4">
          <DrinksPanel
            juntadaId={id}
            currentUserId={session.user.id}
            configs={drinkConfigs}
            preferences={drinkPreferences as any}
            attendance={juntada.attendance as any}
            totalDays={totalDays}
          />
        </TabsContent>

        <TabsContent value="surtido" className="pt-4">
          <SuppliesPanel juntadaId={id} items={supplyItems} />
        </TabsContent>

        <TabsContent value="llevar" className="pt-4">
          <ThingsPanel
            juntadaId={id}
            things={things as any}
            attendees={attendees as any}
          />
        </TabsContent>

        <TabsContent value="gastos" className="pt-4">
          <ExpensesPanel
            juntadaId={id}
            dateStart={juntada.dateStart}
            dateEnd={juntada.dateEnd}
            expenses={expenses as any}
            attendance={juntada.attendance as any}
            attendees={attendees as any}
            currentUserId={session.user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
