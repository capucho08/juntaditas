"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { supplyTemplate, supplyTemplateItem, supplyItem } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";
import type { SupplyCategory } from "@/lib/supply-types";

export async function getSupplyTemplates() {
  return db.query.supplyTemplate.findMany({
    with: { items: true },
    orderBy: (t, { asc }) => [asc(t.category), asc(t.name)],
  });
}

export async function getSupplyTemplate(id: string) {
  return db.query.supplyTemplate.findFirst({
    where: eq(supplyTemplate.id, id),
    with: { items: { orderBy: (i, { asc }) => [asc(i.createdAt)] } },
  });
}

export async function createSupplyTemplate(data: { name: string; category: SupplyCategory }) {
  const session = await requireSession();
  const id = generateId();
  await db.insert(supplyTemplate).values({ id, ...data, createdBy: session.user.id });
  revalidatePath("/listas");
  return id;
}

export async function updateSupplyTemplate(id: string, data: { name: string; category: SupplyCategory }) {
  await requireSession();
  await db.update(supplyTemplate).set(data).where(eq(supplyTemplate.id, id));
  revalidatePath("/listas");
}

export async function deleteSupplyTemplate(id: string) {
  await requireSession();
  await db.delete(supplyTemplate).where(eq(supplyTemplate.id, id));
  revalidatePath("/listas");
}

export async function addSupplyTemplateItem(
  templateId: string,
  data: { name: string; quantity?: string; unit?: string }
) {
  await requireSession();
  await db.insert(supplyTemplateItem).values({ id: generateId(), templateId, ...data });
  revalidatePath("/listas");
}

export async function deleteSupplyTemplateItem(itemId: string) {
  await requireSession();
  await db.delete(supplyTemplateItem).where(eq(supplyTemplateItem.id, itemId));
  revalidatePath("/listas");
}

export async function importSupplyTemplates(templateIds: string[], juntadaId: string) {
  await requireSession();
  if (templateIds.length === 0) return;

  const templates = await db.query.supplyTemplate.findMany({
    where: (t, { inArray }) => inArray(t.id, templateIds),
    with: { items: true },
  });

  const items = templates.flatMap((t) =>
    t.items.map((item) => ({
      id: generateId(),
      juntadaId,
      category: t.category,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    }))
  );

  if (items.length > 0) {
    await db.insert(supplyItem).values(items);
  }

  revalidatePath(`/juntadas/${juntadaId}`);
}
