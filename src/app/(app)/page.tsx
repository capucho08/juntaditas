import Link from "next/link";
import { getJuntadas } from "@/db/queries/juntadas";
import { getSession } from "@/auth/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { Plus, MapPin, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [juntadas, session] = await Promise.all([getJuntadas(), getSession()]);
  const isAdmin = session?.user.role === "admin";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Juntadas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Todas las juntadas organizadas</p>
        </div>
        {isAdmin && (
          <Link
            href="/juntadas/nueva"
            className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva
          </Link>
        )}
      </div>

      {juntadas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {isAdmin
            ? "Todavía no hay juntadas. ¡Creá la primera!"
            : "Todavía no hay juntadas planificadas."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {juntadas.map((j) => {
            const attendees = j.attendance ?? [];
            const confirmed = attendees.filter((a) => a.status === "confirmed").length;
            const total = attendees.length;
            const now = new Date().toISOString().split("T")[0];
            const isPast = j.dateEnd < now;
            const isUpcoming = j.dateStart > now;

            return (
              <Link key={j.id} href={`/juntadas/${j.id}`}>
                <div className="bg-card rounded-2xl border ring-1 ring-foreground/5 p-4 space-y-3 active:scale-[0.98] transition-transform cursor-pointer hover:shadow-md hover:ring-primary/20 hover:border-primary/20 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-base leading-tight">{j.title}</span>
                    {isPast ? (
                      <Badge variant="secondary" className="shrink-0 text-xs">Pasada</Badge>
                    ) : isUpcoming ? (
                      <Badge className="shrink-0 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Próxima</Badge>
                    ) : (
                      <Badge className="shrink-0 text-xs bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">En curso</Badge>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                      <span className="truncate">{j.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                      <span>{formatDate(j.dateStart)} → {formatDate(j.dateEnd)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                      <span>
                        {total === 0
                          ? "Nadie se sumó todavía"
                          : `${confirmed}/${total} confirmados`}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB for admin on mobile */}
      {isAdmin && (
        <Link
          href="/juntadas/nueva"
          className={cn(
            buttonVariants(),
            "sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full p-0 shadow-lg shadow-primary/25"
          )}
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}
