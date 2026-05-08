import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getChangelogSorted, getLatestVersion } from "@/data/changelog";
import ChangelogList from "@/features/changelog/ChangelogList";

export const metadata = {
  title: "Changelog",
  description: "Release notes and updates for HLF Wheel Alerts",
};

export default async function ChangelogPage() {
  const session = await getServerSession(authOptions);
  const items = getChangelogSorted();
  const version = getLatestVersion();

  const content = (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <div className="flex items-baseline gap-2.5 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">What&apos;s New</h1>
          <span className="font-mono text-sm text-muted-foreground">{version}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Release history and updates for HLF Wheel Alerts.
        </p>
      </div>
      <ChangelogList items={items} initialVisibleCount={4} showToggle={true} />
    </div>
  );

  if (session) {
    return <AppShell>{content}</AppShell>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/sign-in" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-semibold text-sm">HLF Wheel Alerts</span>
        </Link>
        <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign in →
        </Link>
      </header>
      {content}
    </div>
  );
}
