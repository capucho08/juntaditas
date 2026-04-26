import { getSession } from "@/auth/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/users/profile-form";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) notFound();

  const userData = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });
  if (!userData) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-muted-foreground text-sm">Editá tus datos personales</p>
      </div>
      <ProfileForm user={userData} />
    </div>
  );
}
