"use server";

import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { juntada, attendance } from "@/db/schema";
import { generateId } from "@/lib/ids";
import { requireSession, requireAdmin } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getJuntadas() {
  return db.query.juntada.findMany({
    orderBy: [desc(juntada.dateStart)],
    with: { attendance: { with: { user: true } } },
  });
}

export async function getJuntada(id: string) {
  return db.query.juntada.findFirst({
    where: eq(juntada.id, id),
    with: {
      attendance: { with: { user: true } },
    },
  });
}

export async function createJuntada(data: {
  title: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  description?: string;
}) {
  const session = await requireAdmin();
  const id = generateId();

  await db.insert(juntada).values({
    id,
    ...data,
    createdBy: session.user.id,
  });

  revalidatePath("/");
  return id;
}

export async function updateJuntada(
  id: string,
  data: {
    title?: string;
    location?: string;
    dateStart?: string;
    dateEnd?: string;
    description?: string;
  }
) {
  await requireAdmin();
  await db.update(juntada).set(data).where(eq(juntada.id, id));
  revalidatePath(`/juntadas/${id}`);
  revalidatePath("/");
}

export async function deleteJuntada(id: string) {
  await requireAdmin();
  await db.delete(juntada).where(eq(juntada.id, id));
  revalidatePath("/");
}

export async function joinJuntada(juntadaId: string) {
  const session = await requireSession();
  const existing = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.juntadaId, juntadaId),
      eq(attendance.userId, session.user.id)
    ),
  });
  if (existing) return;

  await db.insert(attendance).values({
    id: generateId(),
    juntadaId,
    userId: session.user.id,
  });

  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function updateAttendance(
  juntadaId: string,
  data: {
    confirmed?: boolean;
    arrivalDate?: string;
    arrivalSlot?: "morning" | "noon" | "afternoon" | "night";
    departureDate?: string;
    departureSlot?: "morning" | "noon" | "afternoon" | "night";
  }
) {
  const session = await requireSession();

  await db
    .update(attendance)
    .set(data)
    .where(
      and(
        eq(attendance.juntadaId, juntadaId),
        eq(attendance.userId, session.user.id)
      )
    );

  revalidatePath(`/juntadas/${juntadaId}`);
}
