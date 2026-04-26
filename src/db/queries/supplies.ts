"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { supplyItem, thingToBring, thingResponsible } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";
import type { SupplyCategory } from "@/lib/supply-types";

export async function getSupplyItems(juntadaId: string) {
  return db.query.supplyItem.findMany({
    where: eq(supplyItem.juntadaId, juntadaId),
    orderBy: (s, { asc }) => [asc(s.category), asc(s.createdAt)],
  });
}

export async function addSupplyItem(data: {
  juntadaId: string;
  category: SupplyCategory;
  name: string;
  quantity?: string;
  unit?: string;
}) {
  await requireSession();
  await db.insert(supplyItem).values({ id: generateId(), ...data });
  revalidatePath(`/juntadas/${data.juntadaId}`);
}

export async function toggleSupplyItem(id: string, checked: boolean, juntadaId: string) {
  await requireSession();
  await db.update(supplyItem).set({ checked }).where(eq(supplyItem.id, id));
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function deleteSupplyItem(id: string, juntadaId: string) {
  await requireSession();
  await db.delete(supplyItem).where(eq(supplyItem.id, id));
  revalidatePath(`/juntadas/${juntadaId}`);
}

// ── Things to bring ───────────────────────────────────────────────────────────

export async function getThingsToBring(juntadaId: string) {
  return db.query.thingToBring.findMany({
    where: eq(thingToBring.juntadaId, juntadaId),
    with: { responsibles: { with: { user: true } } },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
}

export async function addThingToBring(data: {
  juntadaId: string;
  name: string;
  responsibleIds: string[];
}) {
  await requireSession();
  const id = generateId();
  await db.insert(thingToBring).values({ id, juntadaId: data.juntadaId, name: data.name });

  if (data.responsibleIds.length > 0) {
    await db.insert(thingResponsible).values(
      data.responsibleIds.map((userId) => ({ thingId: id, userId }))
    );
  }

  revalidatePath(`/juntadas/${data.juntadaId}`);
}

export async function toggleThingToBring(id: string, checked: boolean, juntadaId: string) {
  await requireSession();
  await db.update(thingToBring).set({ checked }).where(eq(thingToBring.id, id));
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function deleteThingToBring(id: string, juntadaId: string) {
  await requireSession();
  await db.delete(thingToBring).where(eq(thingToBring.id, id));
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function updateThingResponsibles(thingId: string, responsibleIds: string[], juntadaId: string) {
  await requireSession();
  await db.delete(thingResponsible).where(eq(thingResponsible.thingId, thingId));
  if (responsibleIds.length > 0) {
    await db.insert(thingResponsible).values(
      responsibleIds.map((userId) => ({ thingId, userId }))
    );
  }
  revalidatePath(`/juntadas/${juntadaId}`);
}
