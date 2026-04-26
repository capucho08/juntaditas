"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bringTemplate, bringTemplateItem, thingToBring } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getBringTemplates() {
  return db.query.bringTemplate.findMany({
    with: { items: true, createdByUser: true },
    orderBy: (t, { asc }) => [asc(t.name)],
  });
}

export async function getBringTemplate(id: string) {
  return db.query.bringTemplate.findFirst({
    where: eq(bringTemplate.id, id),
    with: { items: { orderBy: (i, { asc }) => [asc(i.createdAt)] } },
  });
}

export async function createBringTemplate(data: { name: string; description?: string }) {
  const session = await requireSession();
  const id = generateId();
  await db.insert(bringTemplate).values({ id, ...data, createdBy: session.user.id });
  revalidatePath("/listas");
  return id;
}

export async function updateBringTemplate(id: string, data: { name: string; description?: string }) {
  await requireSession();
  await db.update(bringTemplate).set(data).where(eq(bringTemplate.id, id));
  revalidatePath("/listas");
  revalidatePath(`/listas/${id}`);
}

export async function deleteBringTemplate(id: string) {
  await requireSession();
  await db.delete(bringTemplate).where(eq(bringTemplate.id, id));
  revalidatePath("/listas");
}

export async function addTemplateItem(templateId: string, name: string) {
  await requireSession();
  await db.insert(bringTemplateItem).values({ id: generateId(), templateId, name });
  revalidatePath(`/listas/${templateId}`);
}

export async function deleteTemplateItem(itemId: string, templateId: string) {
  await requireSession();
  await db.delete(bringTemplateItem).where(eq(bringTemplateItem.id, itemId));
  revalidatePath(`/listas/${templateId}`);
}

export async function importTemplateIntoJuntada(templateId: string, juntadaId: string) {
  await requireSession();
  const template = await getBringTemplate(templateId);
  if (!template || template.items.length === 0) return;

  await db.insert(thingToBring).values(
    template.items.map((item) => ({
      id: generateId(),
      juntadaId,
      name: item.name,
    }))
  );

  revalidatePath(`/juntadas/${juntadaId}`);
}
