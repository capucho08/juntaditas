import { getMealsForJuntada } from "@/db/queries/meals";
import { getAttendeesForMeal } from "@/lib/attendance";
import { MealCard } from "./meal-card";
import { formatDate } from "@/lib/dates";

type AttendanceRecord = {
  userId: string;
  confirmed: boolean;
  arrivalDate: string | null;
  arrivalSlot: "morning" | "noon" | "afternoon" | "night" | null;
  departureDate: string | null;
  departureSlot: "morning" | "noon" | "afternoon" | "night" | null;
  user: { id: string; name: string; email: string };
};

type Props = {
  juntadaId: string;
  dates: string[];
  attendance: AttendanceRecord[];
};

export async function MealsPanel({ juntadaId, dates, attendance }: Props) {
  const meals = await getMealsForJuntada(juntadaId);
  const attendees = attendance.map((a) => a.user);

  return (
    <div className="space-y-8">
      {dates.map((date) => {
        const lunchMeal = meals.find((m) => m.date === date && m.type === "lunch") ?? null;
        const dinnerMeal = meals.find((m) => m.date === date && m.type === "dinner") ?? null;

        const lunchAttendeeIds = getAttendeesForMeal(attendance, date, "lunch");
        const dinnerAttendeeIds = getAttendeesForMeal(attendance, date, "dinner");

        return (
          <div key={date} className="space-y-3">
            <h3 className="font-semibold text-sm">{formatDate(date)}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <MealCard
                juntadaId={juntadaId}
                date={date}
                type="lunch"
                label="Almuerzo"
                meal={lunchMeal}
                attendees={attendees}
                presentUserIds={lunchAttendeeIds}
              />
              <MealCard
                juntadaId={juntadaId}
                date={date}
                type="dinner"
                label="Cena"
                meal={dinnerMeal}
                attendees={attendees}
                presentUserIds={dinnerAttendeeIds}
              />
            </div>
          </div>
        );
      })}

      {attendance.filter((a) => !a.arrivalDate).length > 0 && (
        <p className="text-xs text-muted-foreground">
          * Los comensales se calculan automáticamente según la asistencia confirmada.
          {attendance.filter((a) => !a.arrivalDate).length} persona(s) aún no configuraron sus horarios.
        </p>
      )}
    </div>
  );
}
