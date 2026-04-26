import Link from "next/link";
import { getJuntadas } from "@/db/queries/juntadas";
import { getSession } from "@/auth/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { Plus, MapPin, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [juntadas, session] = await Promise.all([getJuntadas(), getSession()]);
  const isAdmin = session?.user.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Juntadas</h1>
          <p className="text-muted-foreground text-sm">Todas las juntadas organizadas</p>
        </div>
        {isAdmin && (
          <Link href="/juntadas/nueva" className={cn(buttonVariants())}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva juntada
          </Link>
        )}
      </div>

      {juntadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isAdmin
              ? "Todavía no hay juntadas. ¡Creá la primera!"
              : "Todavía no hay juntadas planificadas."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {juntadas.map((j) => {
            const attendees = j.attendance ?? [];
            const confirmed = attendees.filter((a) => a.status === "confirmed").length;
            const total = attendees.length;
            const now = new Date().toISOString().split("T")[0];
            const isPast = j.dateEnd < now;
            const isUpcoming = j.dateStart > now;

            return (
              <Link key={j.id} href={`/juntadas/${j.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{j.title}</CardTitle>
                      {isPast ? (
                        <Badge variant="secondary">Pasada</Badge>
                      ) : isUpcoming ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Próxima</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">En curso</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{j.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {formatDate(j.dateStart)} → {formatDate(j.dateEnd)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {total === 0
                          ? "Nadie se sumó todavía"
                          : `${confirmed}/${total} confirmados`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
