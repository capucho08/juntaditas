"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/auth/client";
import type { AuthUser } from "@/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Nav() {
  const { data: session } = useSession();
  const user = session?.user as AuthUser | undefined;
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="border-b bg-background">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg">
            Juntaditas 🎉
          </Link>
          <Link
            href="/"
            className={`text-sm ${pathname === "/" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Juntadas
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.name || user.email}
          </span>
          {user.role === "admin" && (
            <Badge variant="secondary">Admin</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
          >
            Salir
          </Button>
        </div>
      </div>
    </nav>
  );
}
