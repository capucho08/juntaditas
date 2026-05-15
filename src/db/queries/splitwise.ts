"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { juntada as juntadaTable } from "@/db/schema";
import { requireAdmin } from "@/auth/server";
import { getExpenses } from "@/db/queries/expenses";
import { getMealsForJuntada } from "@/db/queries/meals";
import { calculateExpenseShares } from "@/lib/splits";
import { getDatesInRange } from "@/lib/dates";
import { getAttendeesForMeal } from "@/lib/attendance";

type SwMember = { id: number; email: string; first_name: string; last_name: string };

type PushResult = {
  created: number;
  skipped: { description: string; reason: string }[];
  errors: { description: string; error: string }[];
};

export async function pushToSplitwise(juntadaId: string): Promise<PushResult> {
  await requireAdmin();

  const token = process.env.SPLITWISE_API_TOKEN;
  if (!token) throw new Error("SPLITWISE_API_TOKEN no configurado en el servidor.");

  const juntada = await db.query.juntada.findFirst({
    where: eq(juntadaTable.id, juntadaId),
    with: { attendance: { with: { user: true } } },
  });
  if (!juntada) throw new Error("Juntada no encontrada.");
  if (!juntada.splitwiseGroupId) throw new Error("Esta juntada no tiene un Splitwise Group ID configurado.");

  const groupId = juntada.splitwiseGroupId;

  // Fetch Splitwise group members
  const groupRes = await fetch(`https://secure.splitwise.com/api/v3.0/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!groupRes.ok) throw new Error(`Error al obtener el grupo de Splitwise (${groupRes.status}).`);
  const { group } = await groupRes.json() as { group: { members: SwMember[] } };

  // Map email → Splitwise user ID
  const emailToSwId = new Map<string, number>();
  for (const m of group.members) {
    emailToSwId.set(m.email.toLowerCase(), m.id);
  }

  // Map juntada userId → Splitwise user ID
  const userToSwId = new Map<string, number>();
  for (const att of juntada.attendance) {
    const swId = emailToSwId.get(att.user.email.toLowerCase());
    if (swId) userToSwId.set(att.userId, swId);
  }

  const [expenses, meals] = await Promise.all([
    getExpenses(juntadaId),
    getMealsForJuntada(juntadaId),
  ]);

  const attendance = juntada.attendance.map((a) => ({
    userId: a.userId,
    arrivalDate: a.arrivalDate,
    arrivalSlot: a.arrivalSlot,
    departureDate: a.departureDate,
    departureSlot: a.departureSlot,
  }));
  const dates = getDatesInRange(juntada.dateStart, juntada.dateEnd);

  const result: PushResult = { created: 0, skipped: [], errors: [] };

  // Build all expense records to push
  type ExpenseRecord = {
    description: string;
    amount: number;
    currency: "UYU" | "USD";
    paidBy: string;
    type: string;
    splitMethod?: "linear" | "portions" | null;
    mealId: string | null;
    participants: { userId: string }[];
  };

  const records: ExpenseRecord[] = [
    ...expenses.map((e) => ({
      description: e.description,
      amount: e.amount,
      currency: e.currency ?? "UYU" as const,
      paidBy: e.paidBy,
      type: e.type,
      splitMethod: e.splitMethod,
      mealId: e.mealId,
      participants: e.participants,
    })),
    ...meals.flatMap((m) =>
      m.costs.map((c) => {
        const presentIds = getAttendeesForMeal(attendance, m.date, m.type);
        const participants = (presentIds.length > 0 ? presentIds : attendance.map((a) => a.userId))
          .map((userId) => ({ userId }));
        return {
          description: `${m.type === "lunch" ? "Almuerzo" : "Cena"} ${m.date}${m.description ? ` — ${m.description}` : ""}${c.description ? ` (${c.description})` : ""}`,
          amount: c.amount,
          currency: "UYU" as const,
          paidBy: c.paidByUser.id,
          type: "custom",
          splitMethod: null,
          mealId: m.id,
          participants,
        };
      })
    ),
  ];

  for (const rec of records) {
    const payerSwId = userToSwId.get(rec.paidBy);
    if (!payerSwId) {
      result.skipped.push({ description: rec.description, reason: "Quien pagó no está en el grupo de Splitwise." });
      continue;
    }

    const shares = calculateExpenseShares(
      { ...rec, id: "", date: "" },
      attendance,
      dates,
    );

    const mappedShares = shares.filter((s) => userToSwId.has(s.userId));
    if (mappedShares.length === 0) {
      result.skipped.push({ description: rec.description, reason: "Ningún participante está en el grupo de Splitwise." });
      continue;
    }

    // Rescale owed shares so they sum exactly to the expense amount
    const totalMapped = mappedShares.reduce((s, m) => s + m.amount, 0);
    const scale = totalMapped > 0 ? rec.amount / totalMapped : 1;

    const params = new URLSearchParams({
      cost: rec.amount.toFixed(2),
      description: rec.description,
      currency_code: rec.currency,
      group_id: groupId,
      split_equally: "false",
    });

    let allocated = 0;
    mappedShares.forEach((share, idx) => {
      const isLast = idx === mappedShares.length - 1;
      const owed = isLast
        ? parseFloat((rec.amount - allocated).toFixed(2))
        : parseFloat((share.amount * scale).toFixed(2));
      allocated += owed;
      const swId = userToSwId.get(share.userId)!;
      const paid = share.userId === rec.paidBy ? rec.amount.toFixed(2) : "0.00";
      params.set(`users__${idx}__user_id`, String(swId));
      params.set(`users__${idx}__paid_share`, paid);
      params.set(`users__${idx}__owed_share`, owed.toFixed(2));
    });

    try {
      const res = await fetch("https://secure.splitwise.com/api/v3.0/create_expense", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const json = await res.json() as { errors?: Record<string, string[]> };
      if (!res.ok || (json.errors && Object.keys(json.errors).length > 0)) {
        const msg = json.errors ? Object.values(json.errors).flat().join(", ") : `HTTP ${res.status}`;
        result.errors.push({ description: rec.description, error: msg });
      } else {
        result.created++;
      }
    } catch (e) {
      result.errors.push({ description: rec.description, error: String(e) });
    }
  }

  return result;
}
