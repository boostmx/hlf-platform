"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  LayoutDashboard,
  List,
  Settings,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Sun,
  Moon,
  Briefcase,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@hlf/ui/button";
import { useTheme } from "next-themes";
import { getLatestVersion } from "@/data/changelog";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/positions", label: "Positions", icon: Briefcase },
  { href: "/tickers", label: "Tickers", icon: TrendingUp },
  { href: "/alerts", label: "Alerts", icon: List },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const email = session?.user?.email ?? "";
  const initial = email[0]?.toUpperCase() ?? "?";
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const navLink = (href: string, label: string, Icon: React.ElementType) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
        pathname.startsWith(href)
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );

  const sidebarNav = (
    <>
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {mainNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>
      <div className="px-3 pb-4 space-y-0.5 border-t border-sidebar-border pt-3">
        {navLink("/settings", "Settings", Settings)}
        {isAdmin && navLink("/admin", "Admin", ShieldCheck)}
        <Link
          href="/changelog"
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
            pathname.startsWith("/changelog")
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <span className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0" />
            What&apos;s New
          </span>
          <span className="font-mono text-[10px] opacity-60">{getLatestVersion()}</span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-2 mt-1">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">{initial}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate flex-1">{email}</p>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )
            ) : (
              <div className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-56 border-r border-border bg-sidebar flex-col shrink-0">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">HLF Stock Alerts</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Wheel strategy signals
              </p>
            </div>
          </Link>
        </div>
        {sidebarNav}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-semibold text-sm leading-tight truncate">HLF Stock Alerts</p>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar border-r border-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
              <Link
                href="/dashboard"
                className="flex items-center gap-3"
                onClick={() => setMobileNavOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 shrink-0">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">HLF Stock Alerts</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    Wheel strategy signals
                  </p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="shrink-0 ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebarNav}
          </aside>
        </div>
      )}
    </div>
  );
}
