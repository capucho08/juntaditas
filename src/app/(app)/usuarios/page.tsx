import { getAllUsers } from "@/db/queries/users";
import { UserRow } from "@/components/users/user-row";

export default async function UsuariosPage() {
  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground text-sm">{users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="border rounded-lg divide-y">
        {users.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}
