export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function getNights(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// Slot order for comparison
const SLOT_ORDER = { morning: 0, noon: 1, afternoon: 2, night: 3 } as const;
type Slot = keyof typeof SLOT_ORDER;

export const SLOT_LABELS: Record<Slot, string> = {
  morning: "Mañana",
  noon: "Mediodía (almuerzo)",
  afternoon: "Tarde",
  night: "Noche (cena)",
};

export function slotIndex(slot: Slot): number {
  return SLOT_ORDER[slot];
}

// Returns the "portion of day" index (0 = morning+noon, 1 = afternoon+night)
export function slotPortion(slot: Slot): number {
  return slotIndex(slot) < 2 ? 0 : 1;
}
