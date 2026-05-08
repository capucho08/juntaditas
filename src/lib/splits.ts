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
  splitMethod?: "linear" | "portions" | null;
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
          const method = exp.splitMethod ?? "portions";
          const pool = exp.participants.length > 0
            ? attendance.filter((a) => exp.participants.some((p) => p.userId === a.userId))
            : attendance;
          if (pool.length === 0) return null;
          if (method === "linear") {
            const share = exp.amount / pool.length;
            return pool.map((a) => ({ userId: a.userId, amount: share }));
          } else {
            const portionCounts = pool.map((a) => ({
              userId: a.userId,
              portions: getPortionsForUser(a, dates),
            }));
            const totalPortions = portionCounts.reduce((s, p) => s + p.portions, 0);
            if (totalPortions === 0) return null;
            return portionCounts
              .filter((p) => p.portions > 0)
              .map((p) => ({ userId: p.userId, amount: (exp.amount * p.portions) / totalPortions }));
          }
        }
        case "meal": {
          if (attendance.length === 0) return null;
          return attendance.map((a) => ({ userId: a.userId, amount: exp.amount / attendance.length }));
        }
        case "custom": {
          // legacy: equal split among explicit participants
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

export function calculateSimplifiedSplit(split: SplitResult[]): SplitResult[] {
  const result: SplitResult[] = [];

  for (const currency of ["UYU", "USD"] as const) {
    const entries = split.filter((s) => s.currency === currency);
    if (entries.length === 0) continue;

    // Net balance per person: positive = creditor, negative = debtor
    const balance: Record<string, number> = {};
    for (const s of entries) {
      balance[s.userId] = (balance[s.userId] ?? 0) - s.amount;
      balance[s.owes] = (balance[s.owes] ?? 0) + s.amount;
    }

    const debtors = Object.entries(balance)
      .filter(([, b]) => b < -0.01)
      .map(([id, b]) => ({ id, amount: -b }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = Object.entries(balance)
      .filter(([, b]) => b > 0.01)
      .map(([id, b]) => ({ id, amount: b }))
      .sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const payment = Math.min(debtor.amount, creditor.amount);

      if (payment > 0.01) {
        result.push({
          userId: debtor.id,
          owes: creditor.id,
          amount: Math.round(payment * 100) / 100,
          currency,
        });
      }

      debtor.amount -= payment;
      creditor.amount -= payment;
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
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
      const method = exp.splitMethod ?? "portions";
      const pool = exp.participants.length > 0
        ? attendance.filter((a) => exp.participants.some((p) => p.userId === a.userId))
        : attendance;
      if (pool.length === 0) return [];
      if (method === "linear") {
        const share = Math.round((exp.amount / pool.length) * 100) / 100;
        return pool.map((a) => ({ userId: a.userId, amount: share }));
      } else {
        const portionCounts = pool.map((a) => ({
          userId: a.userId,
          portions: getPortionsForUser(a, dates),
        }));
        const total = portionCounts.reduce((s, p) => s + p.portions, 0);
        if (total === 0) return [];
        return portionCounts
          .filter((p) => p.portions > 0)
          .map((p) => ({ userId: p.userId, amount: Math.round((exp.amount * p.portions / total) * 100) / 100 }));
      }
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
