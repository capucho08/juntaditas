"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { joinJuntada, updateAttendance } from "@/db/queries/juntadas";
import { SLOT_LABELS } from "@/lib/dates";
import { Check, UserPlus, X } from "lucide-react";

type Slot = "morning" | "noon" | "afternoon" | "night";
type Status = "pending" | "confirmed" | "not_going";

type AttendanceRecord = {
  userId: string;
  status: Status;
  arrivalDate: string | null;
  arrivalSlot: Slot | null;
  departureDate: string | null;
  departureSlot: Slot | null;
  user: { id: string; name: string; email: string };
};

type Props = {
  juntadaId: string;
  dateStart: string;
  dateEnd: string;
  dates: string[];
  attendance: AttendanceRecord[];
  currentUserId: string;
};

const SLOTS: Slot[] = ["morning", "noon", "afternoon", "night"];

const STATUS_BADGE: Record<Status, React.ReactNode> = {
  confirmed: <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmado</Badge>,
  pending: <Badge variant="secondary">Pendiente</Badge>,
  not_going: <Badge className="bg-red-100 text-red-800 hover:bg-red-100">No va</Badge>,
};

export function AttendancePanel({
  juntadaId,
  dateStart,
  dateEnd,
  dates,
  attendance,
  currentUserId,
}: Props) {
  const myAttendance = attendance.find((a) => a.userId === currentUserId);
  const [isPending, startTransition] = useTransition();

  const [arrivalDate, setArrivalDate] = useState(myAttendance?.arrivalDate ?? dateStart);
  const [arrivalSlot, setArrivalSlot] = useState<Slot>(myAttendance?.arrivalSlot ?? "afternoon");
  const [departureDate, setDepartureDate] = useState(myAttendance?.departureDate ?? dateEnd);
  const [departureSlot, setDepartureSlot] = useState<Slot>(myAttendance?.departureSlot ?? "afternoon");

  function handleJoin() {
    startTransition(async () => { await joinJuntada(juntadaId); });
  }

  function handleConfirm() {
    startTransition(async () => {
      await updateAttendance(juntadaId, {
        status: "confirmed",
        arrivalDate,
        arrivalSlot,
        departureDate,
        departureSlot,
      });
    });
  }

  function handleSetStatus(status: Status) {
    startTransition(async () => { await updateAttendance(juntadaId, { status }); });
  }

  return (
    <div className="space-y-8">
      {/* My attendance */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Mi asistencia
        </h3>

        {!myAttendance ? (
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground flex-1">
              Todavía no te sumaste a esta juntada.
            </p>
            <Button onClick={handleJoin} disabled={isPending} size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Sumarme
            </Button>
          </div>
        ) : (
          <div className="space-y-4 p-4 border rounded-lg">
            {/* Status buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={myAttendance.status === "confirmed" ? "default" : "outline"}
                onClick={() => myAttendance.status !== "confirmed" && handleConfirm()}
                disabled={isPending}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Voy
              </Button>
              <Button
                size="sm"
                variant={myAttendance.status === "not_going" ? "destructive" : "outline"}
                onClick={() => handleSetStatus(myAttendance.status === "not_going" ? "pending" : "not_going")}
                disabled={isPending}
              >
                <X className="w-4 h-4 mr-1.5" />
                No voy
              </Button>
              {myAttendance.status !== "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSetStatus("pending")}
                  disabled={isPending}
                  className="text-muted-foreground"
                >
                  Todavía no sé
                </Button>
              )}
            </div>

            {/* Arrival/departure — only show if going or pending */}
            {myAttendance.status !== "not_going" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Llegada — fecha</Label>
                    <Select value={arrivalDate} onValueChange={(v) => v && setArrivalDate(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {dates.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Llegada — horario</Label>
                    <Select value={arrivalSlot} onValueChange={(v) => v && setArrivalSlot(v as Slot)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SLOTS.map((s) => <SelectItem key={s} value={s}>{SLOT_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Salida — fecha</Label>
                    <Select value={departureDate} onValueChange={(v) => v && setDepartureDate(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {dates.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Salida — horario</Label>
                    <Select value={departureSlot} onValueChange={(v) => v && setDepartureSlot(v as Slot)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SLOTS.map((s) => <SelectItem key={s} value={s}>{SLOT_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {myAttendance.status === "confirmed" && (
                  <Button onClick={handleConfirm} disabled={isPending} size="sm" variant="outline">
                    Actualizar horarios
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* All attendees */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Quiénes van ({attendance.filter((a) => a.status === "confirmed").length} confirmados)
        </h3>

        {attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie se sumó todavía.</p>
        ) : (
          <div className="divide-y border rounded-lg">
            {attendance.map((a) => (
              <div key={a.userId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{a.user.name || a.user.email}</p>
                  {a.status === "confirmed" && a.arrivalDate && (
                    <p className="text-xs text-muted-foreground">
                      Llega {a.arrivalDate} ({SLOT_LABELS[a.arrivalSlot!]}) →{" "}
                      Sale {a.departureDate} ({SLOT_LABELS[a.departureSlot!]})
                    </p>
                  )}
                </div>
                {STATUS_BADGE[a.status]}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
