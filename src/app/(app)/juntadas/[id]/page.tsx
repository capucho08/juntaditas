import { notFound } from "next/navigation";
import Link from "next/link";
import { getJuntada } from "@/db/queries/juntadas";
import { getSession } from "@/auth/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AttendancePanel } from "@/components/juntadas/attendance-panel";
import { DeleteJuntadaButton } from "@/components/juntadas/delete-juntada-button";
import { formatDate, getDatesInRange } from "@/lib/dates";
import { MapPin, Calendar, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function JuntadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [juntada, session] = await Promise.all([getJuntada(id), getSession()]);

  if (!juntada || !session) notFound();

  const isAdmin = session.user.role === "admin";
  const dates = getDatesInRange(juntada.dateStart, juntada.dateEnd);
  const now = new Date().toISOString().split("T")[0];
  const isPast = juntada.dateEnd < now;

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
        <TabsList>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="comidas" disabled>Comidas</TabsTrigger>
          <TabsTrigger value="bebidas" disabled>Bebidas</TabsTrigger>
          <TabsTrigger value="surtido" disabled>Surtido</TabsTrigger>
          <TabsTrigger value="llevar" disabled>A llevar</TabsTrigger>
          <TabsTrigger value="gastos" disabled>Gastos</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
