"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { joinJuntada, updateAttendance } from "@/db/queries/juntadas";
import { SLOT_LABELS } from "@/lib/dates";
import { Check, UserPlus } from "lucide-react";

type Slot = "morning" | "noon" | "afternoon" | "night";

type AttendanceRecord = {
  userId: string;
  confirmed: boolean;
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
    startTransition(async () => {
      await joinJuntada(juntadaId);
    });
  }

  function handleSave() {
    startTransition(async () => {
      await updateAttendance(juntadaId, {
        confirmed: true,
        arrivalDate,
        arrivalSlot,
        departureDate,
        departureSlot,
      });
    });
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Llegada — fecha</Label>
                <Select value={arrivalDate} onValueChange={(v) => v && setArrivalDate(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dates.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Llegada — horario</Label>
                <Select value={arrivalSlot} onValueChange={(v) => v && setArrivalSlot(v as Slot)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => (
                      <SelectItem key={s} value={s}>{SLOT_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Salida — fecha</Label>
                <Select value={departureDate} onValueChange={(v) => v && setDepartureDate(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dates.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Salida — horario</Label>
                <Select value={departureSlot} onValueChange={(v) => v && setDepartureSlot(v as Slot)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => (
                      <SelectItem key={s} value={s}>{SLOT_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSave} disabled={isPending} size="sm">
              <Check className="w-4 h-4 mr-2" />
              {isPending ? "Guardando..." : "Confirmar asistencia"}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* All attendees */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Quiénes van ({attendance.length})
        </h3>

        {attendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie se sumó todavía.</p>
        ) : (
          <div className="divide-y border rounded-lg">
            {attendance.map((a) => (
              <div key={a.userId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{a.user.name || a.user.email}</p>
                  {a.arrivalDate && (
                    <p className="text-xs text-muted-foreground">
                      Llega {a.arrivalDate} ({SLOT_LABELS[a.arrivalSlot!]}) →{" "}
                      Sale {a.departureDate} ({SLOT_LABELS[a.departureSlot!]})
                    </p>
                  )}
                </div>
                {a.confirmed ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmado</Badge>
                ) : (
                  <Badge variant="secondary">Pendiente</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
