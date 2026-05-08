"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { personalList, personalListItem, juntadaPersonalItem } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getMyPersonalLists() {
  const session = await requireSession();
  return db.query.personalList.findMany({
    where: eq(personalList.userId, session.user.id),
    with: { items: true },
    orderBy: (l, { asc }) => [asc(l.createdAt)],
  });
}

export async function createPersonalList(name: string) {
  const session = await requireSession();
  await db.insert(personalList).values({ id: generateId(), userId: session.user.id, name });
  revalidatePath("/listas");
}

export async function renamePersonalList(id: string, name: string) {
  await requireSession();
  await db.update(personalList).set({ name }).where(eq(personalList.id, id));
  revalidatePath("/listas");
}

export async function deletePersonalList(id: string) {
  await requireSession();
  await db.delete(personalList).where(eq(personalList.id, id));
  revalidatePath("/listas");
}

export async function addPersonalListItem(listId: string, name: string) {
  await requireSession();
  await db.insert(personalListItem).values({ id: generateId(), listId, name });
  revalidatePath("/listas");
}

export async function deletePersonalListItem(itemId: string) {
  await requireSession();
  await db.delete(personalListItem).where(eq(personalListItem.id, itemId));
  revalidatePath("/listas");
}
