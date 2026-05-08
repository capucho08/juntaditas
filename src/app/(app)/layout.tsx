import { Nav } from "@/components/nav";
import { getSession } from "@/auth/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-24 md:py-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
