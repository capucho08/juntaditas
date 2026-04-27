type Slot = "morning" | "noon" | "afternoon" | "night";

const SLOT_INDEX: Record<Slot, number> = {
  morning: 0,
  noon: 1,
  afternoon: 2,
  night: 3,
};

type AttendanceRecord = {
  userId: string;
  confirmed?: boolean;
  arrivalDate: string | null;
  arrivalSlot: Slot | null;
  departureDate: string | null;
  departureSlot: Slot | null;
};

// Returns userIds present at a given meal (lunch=noon, dinner=night)
export function getAttendeesForMeal(
  attendance: AttendanceRecord[],
  date: string,
  mealType: "lunch" | "dinner"
): string[] {
  const mealSlot = mealType === "lunch" ? 1 : 3; // noon=1, night=3

  return attendance
    .filter((a) => {
      if (!a.arrivalDate || !a.departureDate || !a.arrivalSlot || !a.departureSlot) return false;

      const arrivalSlotIdx = SLOT_INDEX[a.arrivalSlot];
      const departureSlotIdx = SLOT_INDEX[a.departureSlot];

      // Has arrived by meal time on this date
      const hasArrived =
        a.arrivalDate < date ||
        (a.arrivalDate === date && arrivalSlotIdx <= mealSlot);

      // Has not left before meal time on this date
      const hasNotLeft =
        a.departureDate > date ||
        (a.departureDate === date && departureSlotIdx >= mealSlot);

      return hasArrived && hasNotLeft;
    })
    .map((a) => a.userId);
}

// Returns number of "day portions" a person is present (2 portions per day: am+noon / pm+night)
export function getPortionsForUser(
  attendance: AttendanceRecord,
  dates: string[]
): number {
  if (!attendance.arrivalDate || !attendance.departureDate || !attendance.arrivalSlot || !attendance.departureSlot) {
    return 0;
  }

  let portions = 0;
  const arrSlot = SLOT_INDEX[attendance.arrivalSlot];
  const depSlot = SLOT_INDEX[attendance.departureSlot];

  for (const date of dates) {
    if (date < attendance.arrivalDate || date > attendance.departureDate) continue;

    const isArrivalDay = date === attendance.arrivalDate;
    const isDepartureDay = date === attendance.departureDate;

    // Portion 0 = morning+noon (slots 0,1)
    const inPortion0 =
      (!isArrivalDay || arrSlot <= 1) &&
      (!isDepartureDay || depSlot >= 1);

    // Portion 1 = afternoon+night (slots 2,3)
    const inPortion1 =
      (!isArrivalDay || arrSlot <= 3) &&
      (!isDepartureDay || depSlot >= 2);

    if (inPortion0) portions++;
    if (inPortion1) portions++;
  }

  return portions;
}

// Returns drink portions for a person based on meal attendance (lunch=noon, dinner=night)
// Each day has 2 possible portions. The cutoff is meal time:
//   - Lunch (noon, slot 1): counts if arrived by noon and departs at noon or later
//   - Dinner (night, slot 3): counts if arrived by night and departs at night or later
export function getDrinkPortionsForUser(
  attendance: AttendanceRecord,
  dates: string[]
): number {
  if (!attendance.arrivalDate || !attendance.departureDate || !attendance.arrivalSlot || !attendance.departureSlot) {
    return 0;
  }

  let portions = 0;
  const arrSlot = SLOT_INDEX[attendance.arrivalSlot];
  const depSlot = SLOT_INDEX[attendance.departureSlot];

  for (const date of dates) {
    if (date < attendance.arrivalDate || date > attendance.departureDate) continue;

    const isArrivalDay = date === attendance.arrivalDate;
    const isDepartureDay = date === attendance.departureDate;

    // Lunch: must arrive by noon (slot 1) and depart at noon or later
    const atLunch =
      (!isArrivalDay || arrSlot <= 1) &&
      (!isDepartureDay || depSlot >= 1);

    // Dinner: must arrive by night (slot 3) and depart at night or later
    const atDinner =
      (!isArrivalDay || arrSlot <= 3) &&
      (!isDepartureDay || depSlot >= 3);

    if (atLunch) portions++;
    if (atDinner) portions++;
  }

  return portions;
}

// Returns number of nights a person is present (for house costs)
export function getNightsForUser(
  attendance: AttendanceRecord,
  dates: string[] // all dates of the juntada, except the last (nights = gaps between dates)
): number {
  if (!attendance.arrivalDate || !attendance.departureDate) return 0;

  // A "night" is defined as the night between date[i] and date[i+1]
  // Person is present for that night if they arrived by end of date[i] and depart on date[i+1] or later
  let nights = 0;
  for (let i = 0; i < dates.length - 1; i++) {
    const night = dates[i]; // the night of this date
    const nextDay = dates[i + 1];

    const arrivedByNight =
      attendance.arrivalDate < night ||
      (attendance.arrivalDate === night);

    const stillThereNextDay =
      attendance.departureDate >= nextDay;

    if (arrivedByNight && stillThereNextDay) nights++;
  }
  return nights;
}
