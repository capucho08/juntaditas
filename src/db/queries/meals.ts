"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meal, mealCook, mealCost } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getMealsForJuntada(juntadaId: string) {
  return db.query.meal.findMany({
    where: eq(meal.juntadaId, juntadaId),
    with: {
      cooks: { with: { user: true } },
      costs: { with: { paidByUser: true } },
    },
  });
}

export async function upsertMeal(data: {
  juntadaId: string;
  date: string;
  type: "lunch" | "dinner";
  description: string;
  cookIds: string[];
  vegetarianOption: string;
}) {
  await requireSession();

  const existing = await db.query.meal.findFirst({
    where: and(
      eq(meal.juntadaId, data.juntadaId),
      eq(meal.date, data.date),
      eq(meal.type, data.type)
    ),
  });

  const mealId = existing?.id ?? generateId();

  if (existing) {
    await db.update(meal).set({ description: data.description, vegetarianOption: data.vegetarianOption || null }).where(eq(meal.id, mealId));
    await db.delete(mealCook).where(eq(mealCook.mealId, mealId));
  } else {
    await db.insert(meal).values({
      id: mealId,
      juntadaId: data.juntadaId,
      date: data.date,
      type: data.type,
      description: data.description,
      vegetarianOption: data.vegetarianOption || null,
    });
  }

  if (data.cookIds.length > 0) {
    await db.insert(mealCook).values(
      data.cookIds.map((userId) => ({ mealId, userId }))
    );
  }

  revalidatePath(`/juntadas/${data.juntadaId}`);
  return mealId;
}

export async function deleteMeal(mealId: string, juntadaId: string) {
  await requireSession();
  await db.delete(meal).where(eq(meal.id, mealId));
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function addMealCost(data: {
  mealId: string;
  juntadaId: string;
  amount: number;
  description?: string;
}) {
  const session = await requireSession();
  await db.insert(mealCost).values({
    id: generateId(),
    mealId: data.mealId,
    amount: data.amount,
    paidBy: session.user.id,
    description: data.description,
  });
  revalidatePath(`/juntadas/${data.juntadaId}`);
}

export async function deleteMealCost(costId: string, juntadaId: string) {
  await requireSession();
  await db.delete(mealCost).where(eq(mealCost.id, costId));
  revalidatePath(`/juntadas/${juntadaId}`);
}
