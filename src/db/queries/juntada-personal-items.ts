"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { juntadaPersonalItem, personalList } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getJuntadaPersonalItems(juntadaId: string) {
  return db.query.juntadaPersonalItem.findMany({
    where: eq(juntadaPersonalItem.juntadaId, juntadaId),
    with: { user: true },
    orderBy: (i, { asc }) => [asc(i.createdAt)],
  });
}

export async function addJuntadaPersonalItem(juntadaId: string, name: string) {
  const session = await requireSession();
  await db.insert(juntadaPersonalItem).values({
    id: generateId(),
    juntadaId,
    userId: session.user.id,
    name,
  });
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function toggleJuntadaPersonalItem(id: string, juntadaId: string) {
  await requireSession();
  const item = await db.query.juntadaPersonalItem.findFirst({
    where: eq(juntadaPersonalItem.id, id),
  });
  if (!item) return;
  await db.update(juntadaPersonalItem)
    .set({ checked: !item.checked })
    .where(eq(juntadaPersonalItem.id, id));
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function deleteJuntadaPersonalItem(id: string, juntadaId: string) {
  await requireSession();
  await db.delete(juntadaPersonalItem).where(eq(juntadaPersonalItem.id, id));
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function importPersonalList(listId: string, juntadaId: string) {
  const session = await requireSession();
  const list = await db.query.personalList.findFirst({
    where: eq(personalList.id, listId),
    with: { items: true },
  });
  if (!list || list.userId !== session.user.id || list.items.length === 0) return;
  await db.insert(juntadaPersonalItem).values(
    list.items.map((item) => ({
      id: generateId(),
      juntadaId,
      userId: session.user.id,
      name: item.name,
    }))
  );
  revalidatePath(`/juntadas/${juntadaId}`);
}
