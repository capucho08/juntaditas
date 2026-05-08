"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meal, mealCook, mealCost, mealIngredient, supplyItem } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession, requireAdmin } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getMealsForJuntada(juntadaId: string) {
  return db.query.meal.findMany({
    where: eq(meal.juntadaId, juntadaId),
    with: {
      cooks: { with: { user: true } },
      costs: { with: { paidByUser: true } },
      ingredients: true,
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

export async function addMealCosts(data: {
  mealId: string;
  juntadaId: string;
  costs: { amount: number; description?: string; paidBy: string }[];
}) {
  await requireSession();
  await db.insert(mealCost).values(
    data.costs.map((c) => ({
      id: generateId(),
      mealId: data.mealId,
      amount: c.amount,
      paidBy: c.paidBy,
      description: c.description ?? null,
    }))
  );
  revalidatePath(`/juntadas/${data.juntadaId}`);
}

export async function deleteMealCost(costId: string, juntadaId: string) {
  await requireSession();
  await db.delete(mealCost).where(eq(mealCost.id, costId));
  revalidatePath(`/juntadas/${juntadaId}`);
}

// ── Meal Ingredients ──────────────────────────────────────────────────────────

export async function addMealIngredient(data: {
  mealId: string;
  juntadaId: string;
  name: string;
  quantity?: string;
  unit?: string;
}) {
  await requireSession();
  await db.insert(mealIngredient).values({
    id: generateId(),
    mealId: data.mealId,
    name: data.name,
    quantity: data.quantity ?? null,
    unit: data.unit ?? null,
  });
  revalidatePath(`/juntadas/${data.juntadaId}`);
}

export async function deleteMealIngredient(id: string, juntadaId: string) {
  await requireSession();
  await db.delete(mealIngredient).where(eq(mealIngredient.id, id));
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function updateMealIngredient(data: {
  id: string;
  juntadaId: string;
  name: string;
  quantity?: string;
  unit?: string;
}) {
  await requireSession();
  await db
    .update(mealIngredient)
    .set({
      name: data.name,
      quantity: data.quantity || null,
      unit: data.unit || null,
    })
    .where(eq(mealIngredient.id, data.id));
  revalidatePath(`/juntadas/${data.juntadaId}`);
}

function consolidateIngredients(
  ingredients: { name: string; quantity: string | null; unit: string | null }[]
) {
  const consolidated = new Map<string, { name: string; quantity: number | null; unit: string | null; hasNonNumeric: boolean }>();

  for (const ing of ingredients) {
    const key = `${ing.name.trim().toLowerCase()}|${(ing.unit ?? "").trim().toLowerCase()}`;
    const existing = consolidated.get(key);
    const qty = ing.quantity ? parseFloat(ing.quantity) : null;
    const isNumeric = ing.quantity ? !isNaN(qty!) : false;

    if (!existing) {
      consolidated.set(key, {
        name: ing.name.trim(),
        quantity: isNumeric ? qty : null,
        unit: ing.unit ?? null,
        hasNonNumeric: !isNumeric && !!ing.quantity,
      });
    } else {
      if (isNumeric && existing.quantity !== null) {
        existing.quantity = existing.quantity + qty!;
      } else if (isNumeric && existing.quantity === null) {
        existing.quantity = qty;
      } else {
        existing.hasNonNumeric = true;
      }
    }
  }

  return Array.from(consolidated.values());
}

async function replaceSupplyIngredients(juntadaId: string, items: { name: string; quantity: number | null; unit: string | null }[]) {
  await db.delete(supplyItem).where(
    and(eq(supplyItem.juntadaId, juntadaId), eq(supplyItem.category, "meal_ingredients"))
  );

  if (items.length > 0) {
    await db.insert(supplyItem).values(
      items.map((item) => ({
        id: generateId(),
        juntadaId,
        category: "meal_ingredients" as const,
        name: item.name,
        quantity: item.quantity !== null ? String(item.quantity) : undefined,
        unit: item.unit ?? undefined,
        checked: false,
      }))
    );
  }
}

export async function exportIngredientsToSupplies(juntadaId: string) {
  await requireAdmin();

  const meals = await db.query.meal.findMany({
    where: eq(meal.juntadaId, juntadaId),
    with: { ingredients: true },
  });

  const allIngredients = meals.flatMap((m) => m.ingredients);
  if (allIngredients.length === 0) return;

  const items = consolidateIngredients(allIngredients);
  await replaceSupplyIngredients(juntadaId, items);
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function exportSingleMealIngredients(mealId: string, juntadaId: string) {
  await requireAdmin();

  const mealData = await db.query.meal.findFirst({
    where: eq(meal.id, mealId),
    with: { ingredients: true },
  });

  if (!mealData || mealData.ingredients.length === 0) return;

  const mealItems = consolidateIngredients(mealData.ingredients);

  const existing = await db.query.supplyItem.findMany({
    where: and(eq(supplyItem.juntadaId, juntadaId), eq(supplyItem.category, "meal_ingredients")),
  });

  const toInsert: typeof mealItems = [];

  for (const ing of mealItems) {
    const key = `${ing.name.trim().toLowerCase()}|${(ing.unit ?? "").trim().toLowerCase()}`;
    const match = existing.find(
      (e) => `${e.name.trim().toLowerCase()}|${(e.unit ?? "").trim().toLowerCase()}` === key
    );

    if (match) {
      const existingQty = match.quantity ? parseFloat(match.quantity) : null;
      const existingNumeric = match.quantity !== null && existingQty !== null && !isNaN(existingQty);
      const newQty =
        ing.quantity !== null && existingNumeric && existingQty !== null
          ? String(existingQty + ing.quantity)
          : ing.quantity !== null
          ? String(ing.quantity)
          : match.quantity;
      await db.update(supplyItem).set({ quantity: newQty }).where(eq(supplyItem.id, match.id));
    } else {
      toInsert.push(ing);
    }
  }

  if (toInsert.length > 0) {
    await db.insert(supplyItem).values(
      toInsert.map((item) => ({
        id: generateId(),
        juntadaId,
        category: "meal_ingredients" as const,
        name: item.name,
        quantity: item.quantity !== null ? String(item.quantity) : undefined,
        unit: item.unit ?? undefined,
        checked: false,
      }))
    );
  }

  revalidatePath(`/juntadas/${juntadaId}`);
}
