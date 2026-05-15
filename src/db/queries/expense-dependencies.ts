"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseDependency } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getExpenseDependencies(juntadaId: string) {
  return db.query.expenseDependency.findMany({
    where: eq(expenseDependency.juntadaId, juntadaId),
    with: {
      dependent: true,
      coveredBy: true,
    },
  });
}

export async function addExpenseDependency(data: {
  juntadaId: string;
  dependentId: string;
  coveredById: string;
}) {
  await requireSession();
  await db.insert(expenseDependency).values({
    id: generateId(),
    juntadaId: data.juntadaId,
    dependentId: data.dependentId,
    coveredById: data.coveredById,
  });
  revalidatePath(`/juntadas/${data.juntadaId}`);
}

export async function deleteExpenseDependency(id: string, juntadaId: string) {
  await requireSession();
  await db.delete(expenseDependency).where(
    and(eq(expenseDependency.id, id), eq(expenseDependency.juntadaId, juntadaId))
  );
  revalidatePath(`/juntadas/${juntadaId}`);
}
