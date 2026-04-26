"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireSession, requireAdmin } from "@/auth/server";
import { revalidatePath } from "next/cache";

export async function getAllUsers() {
  await requireAdmin();
  return db.query.user.findMany({
    orderBy: (u, { asc }) => [asc(u.name)],
  });
}

export async function updateOwnProfile(data: { name: string; phone?: string }) {
  const session = await requireSession();
  await db.update(user).set(data).where(eq(user.id, session.user.id));
  revalidatePath("/perfil");
}

export async function adminUpdateUser(
  userId: string,
  data: { name: string; phone?: string; role: "admin" | "member" }
) {
  await requireAdmin();
  await db.update(user).set(data).where(eq(user.id, userId));
  revalidatePath("/usuarios");
}
