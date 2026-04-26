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
  currency: "UYU" | "USD";
  paidBy: string;
  date: string;
  mealId: string | null;
  participants: { userId: string }[];
};

export type SplitResult = {
  userId: string;
  owes: string;
  amount: number;
  currency: "UYU" | "USD";
};

export function calculateSplit(
  expenses: ExpenseRecord[],
  attendance: AttendanceRecord[],
  juntadaDateStart: string,
  juntadaDateEnd: string
): SplitResult[] {
  const dates = getDatesInRange(juntadaDateStart, juntadaDateEnd);

  // Separate nets per currency
  const net: Record<"UYU" | "USD", Record<string, Record<string, number>>> = {
    UYU: {},
    USD: {},
  };

  function charge(currency: "UYU" | "USD", payerId: string, debtorId: string, amount: number) {
    if (payerId === debtorId || amount <= 0) return;
    if (!net[currency][debtorId]) net[currency][debtorId] = {};
    net[currency][debtorId][payerId] = (net[currency][debtorId][payerId] ?? 0) + amount;
  }

  for (const exp of expenses) {
    const currency = exp.currency ?? "UYU";

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
          if (attendance.length === 0) return null;
          return attendance.map((a) => ({ userId: a.userId, amount: exp.amount / attendance.length }));
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
      charge(currency, exp.paidBy, userId, amount);
    }
  }

  const result: SplitResult[] = [];

  for (const currency of ["UYU", "USD"] as const) {
    for (const debtorId of Object.keys(net[currency])) {
      for (const creditorId of Object.keys(net[currency][debtorId])) {
        const owed = net[currency][debtorId][creditorId];
        const reverse = net[currency][creditorId]?.[debtorId] ?? 0;
        const netAmount = owed - reverse;
        if (netAmount > 0.01) {
          result.push({
            userId: debtorId,
            owes: creditorId,
            amount: Math.round(netAmount * 100) / 100,
            currency,
          });
        }
      }
    }
  }

  return result;
}

export type ExpenseShare = { userId: string; amount: number };

export function calculateExpenseShares(
  exp: ExpenseRecord,
  attendance: AttendanceRecord[],
  dates: string[]
): ExpenseShare[] {
  switch (exp.type) {
    case "house": {
      const nightCounts = attendance.map((a) => ({
        userId: a.userId,
        nights: getNightsForUser(a, dates),
      }));
      const total = nightCounts.reduce((s, n) => s + n.nights, 0);
      if (total === 0) return [];
      return nightCounts
        .filter((n) => n.nights > 0)
        .map((n) => ({ userId: n.userId, amount: Math.round((exp.amount * n.nights / total) * 100) / 100 }));
    }
    case "general": {
      const portionCounts = attendance.map((a) => ({
        userId: a.userId,
        portions: getPortionsForUser(a, dates),
      }));
      const total = portionCounts.reduce((s, p) => s + p.portions, 0);
      if (total === 0) return [];
      return portionCounts
        .filter((p) => p.portions > 0)
        .map((p) => ({ userId: p.userId, amount: Math.round((exp.amount * p.portions / total) * 100) / 100 }));
    }
    case "meal":
    case "custom": {
      const participants = exp.participants.length > 0
        ? exp.participants.map((p) => p.userId)
        : attendance.map((a) => a.userId);
      if (participants.length === 0) return [];
      const share = Math.round((exp.amount / participants.length) * 100) / 100;
      return participants.map((userId) => ({ userId, amount: share }));
    }
    default:
      return [];
  }
}
