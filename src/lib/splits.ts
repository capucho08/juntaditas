import { getPortionsForUser, getNightsForUser } from "./attendance";
import { getDatesInRange } from "./dates";

type AttendanceRecord = {
  userId: string;
  confirmed?: boolean;
  arrivalDate: string | null;
  arrivalSlot: "morning" | "noon" | "afternoon" | "night" | null;
  departureDate: string | null;
  departureSlot: "morning" | "noon" | "afternoon" | "night" | null;
};

type ExpenseRecord = {
  id: string;
  type: string;
  amount: number;
  paidBy: string;
  date: string;
  mealId: string | null;
  participants: { userId: string }[];
};

export function calculateSplit(
  expenses: ExpenseRecord[],
  attendance: AttendanceRecord[],
  juntadaDateStart: string,
  juntadaDateEnd: string
): { userId: string; owes: string; amount: number }[] {
  const dates = getDatesInRange(juntadaDateStart, juntadaDateEnd);

  const net: Record<string, Record<string, number>> = {};

  function charge(payerId: string, debtorId: string, amount: number) {
    if (payerId === debtorId || amount <= 0) return;
    if (!net[debtorId]) net[debtorId] = {};
    net[debtorId][payerId] = (net[debtorId][payerId] ?? 0) + amount;
  }

  for (const exp of expenses) {
    const share = (() => {
      switch (exp.type) {
        case "house": {
          const nightCounts = attendance.map((a) => ({
            userId: a.userId,
            nights: getNightsForUser(a, dates),
          }));
          const totalNights = nightCounts.reduce((s, n) => s + n.nights, 0);
          if (totalNights === 0) return null;
          return nightCounts
            .filter((n) => n.nights > 0)
            .map((n) => ({ userId: n.userId, amount: (exp.amount * n.nights) / totalNights }));
        }
        case "general": {
          const portionCounts = attendance.map((a) => ({
            userId: a.userId,
            portions: getPortionsForUser(a, dates),
          }));
          const totalPortions = portionCounts.reduce((s, p) => s + p.portions, 0);
          if (totalPortions === 0) return null;
          return portionCounts
            .filter((p) => p.portions > 0)
            .map((p) => ({ userId: p.userId, amount: (exp.amount * p.portions) / totalPortions }));
        }
        case "meal": {
          const split = attendance.length;
          if (split === 0) return null;
          return attendance.map((a) => ({ userId: a.userId, amount: exp.amount / split }));
        }
        case "custom": {
          const participants = exp.participants.map((p) => p.userId);
          if (participants.length === 0) return null;
          return participants.map((userId) => ({ userId, amount: exp.amount / participants.length }));
        }
        default:
          return null;
      }
    })();

    if (!share) continue;
    for (const { userId, amount } of share) {
      charge(exp.paidBy, userId, amount);
    }
  }

  // Simplify bidirectional debts
  const result: { userId: string; owes: string; amount: number }[] = [];
  for (const debtorId of Object.keys(net)) {
    for (const creditorId of Object.keys(net[debtorId])) {
      const owed = net[debtorId][creditorId];
      const reverse = net[creditorId]?.[debtorId] ?? 0;
      const net_amount = owed - reverse;
      if (net_amount > 0.01) {
        result.push({ userId: debtorId, owes: creditorId, amount: Math.round(net_amount * 100) / 100 });
      }
    }
  }

  return result;
}
