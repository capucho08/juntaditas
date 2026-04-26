"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { drinkConfig, drinkPreference } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";
import type { DrinkType } from "@/lib/drink-types";

export async function getDrinkConfigs(juntadaId: string) {
  return db.query.drinkConfig.findMany({
    where: eq(drinkConfig.juntadaId, juntadaId),
  });
}

export async function getDrinkPreferences(juntadaId: string) {
  return db.query.drinkPreference.findMany({
    where: eq(drinkPreference.juntadaId, juntadaId),
    with: { user: true },
  });
}

export async function upsertDrinkConfig(
  juntadaId: string,
  drinkType: DrinkType,
  mlPerPersonPerDay: number
) {
  await requireSession();

  const existing = await db.query.drinkConfig.findFirst({
    where: and(
      eq(drinkConfig.juntadaId, juntadaId),
      eq(drinkConfig.drinkType, drinkType)
    ),
  });

  if (existing) {
    await db.update(drinkConfig).set({ mlPerPersonPerDay }).where(eq(drinkConfig.id, existing.id));
  } else {
    await db.insert(drinkConfig).values({
      id: generateId(),
      juntadaId,
      drinkType,
      mlPerPersonPerDay,
    });
  }

  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function upsertDrinkPreference(
  juntadaId: string,
  drinkType: DrinkType,
  enabled: boolean
) {
  const session = await requireSession();
  const userId = session.user.id;

  const existing = await db.query.drinkPreference.findFirst({
    where: and(
      eq(drinkPreference.juntadaId, juntadaId),
      eq(drinkPreference.userId, userId),
      eq(drinkPreference.drinkType, drinkType)
    ),
  });

  if (existing) {
    await db.update(drinkPreference).set({ enabled }).where(eq(drinkPreference.id, existing.id));
  } else {
    await db.insert(drinkPreference).values({
      id: generateId(),
      juntadaId,
      userId,
      drinkType,
      enabled,
    });
  }

  revalidatePath(`/juntadas/${juntadaId}`);
}
