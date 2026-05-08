"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/auth/client";
import type { AuthUser } from "@/auth";
import { Home, BookOpen, User, Users, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
};

export function Nav() {
  const { data: session } = useSession();
  const user = session?.user as AuthUser | undefined;
  const pathname = usePathname();

  if (!user) return null;

  const isAdmin = user.role === "admin";

  function handleSignOut() {
    signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } });
  }

  const navItems: NavItem[] = [
    { href: "/", label: "Inicio", icon: Home, active: pathname === "/" },
    { href: "/listas", label: "Listas", icon: BookOpen, active: pathname.startsWith("/listas") },
    { href: "/perfil", label: "Perfil", icon: User, active: pathname === "/perfil" },
    ...(isAdmin ? [{ href: "/usuarios", label: "Usuarios", icon: Users, active: pathname === "/usuarios" }] : []),
  ];

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:block border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight text-foreground">
              Juntaditas
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition-colors",
                  item.active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Mobile top header */}
      <header className="md:hidden border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">Juntaditas</span>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t">
        <div className="flex" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors min-h-[56px]",
                item.active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn("w-5 h-5 transition-all", item.active && "scale-110")}
                strokeWidth={item.active ? 2.5 : 1.8}
              />
              <span className={cn("text-[10px] font-medium", item.active ? "opacity-100" : "opacity-70")}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
