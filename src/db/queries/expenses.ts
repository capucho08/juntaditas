"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expense, expenseParticipant } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";
import { getDatesInRange, getNights } from "@/lib/dates";
import type { ExpenseType } from "@/lib/expense-types";

export async function getExpenses(juntadaId: string) {
  return db.query.expense.findMany({
    where: eq(expense.juntadaId, juntadaId),
    with: {
      paidByUser: true,
      participants: { with: { user: true } },
      meal: true,
    },
    orderBy: (e, { asc }) => [asc(e.date)],
  });
}

export async function addExpense(data: {
  juntadaId: string;
  type: ExpenseType;
  description: string;
  amount: number;
  date: string;
  mealId?: string;
  participantIds?: string[]; // for custom type
}) {
  const session = await requireSession();
  const id = generateId();

  await db.insert(expense).values({
    id,
    juntadaId: data.juntadaId,
    type: data.type,
    description: data.description,
    amount: data.amount,
    paidBy: session.user.id,
    date: data.date,
    mealId: data.mealId,
  });

  if (data.type === "custom" && data.participantIds && data.participantIds.length > 0) {
    await db.insert(expenseParticipant).values(
      data.participantIds.map((userId) => ({ expenseId: id, userId }))
    );
  }

  revalidatePath(`/juntadas/${data.juntadaId}`);
}

export async function deleteExpense(expenseId: string, juntadaId: string) {
  await requireSession();
  await db.delete(expense).where(eq(expense.id, expenseId));
  revalidatePath(`/juntadas/${juntadaId}`);
}

// ── Split calculation ─────────────────────────────────────────────────────────

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

