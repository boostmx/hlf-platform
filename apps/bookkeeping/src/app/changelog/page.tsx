import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getChangelogSorted, getLatestVersion } from "@/data/changelog";
import { auth } from "@/server/auth/auth";

export const metadata = {
  title: "Changelog — HLF Bookkeeping",
  description: "Release notes and feature history for HLF Bookkeeping.",
};

export default async function ChangelogPage() {
  const entries = getChangelogSorted();
  const latest = getLatestVersion();
  const session = await auth();
  const isSignedIn = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <Link
            href={isSignedIn ? "/dashboard" : "/login"}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.52 0.24 265), oklch(0.40 0.22 280))" }}
            >
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">HLF Bookkeeping</span>
          </Link>
          <span className="text-border">·</span>
          <span className="text-sm text-muted-foreground font-mono">{latest}</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">What&apos;s New</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Release notes and feature history for HLF Bookkeeping.
          </p>
        </div>

        {/* Entries */}
        <div className="space-y-10">
          {entries.map((entry) => (
            <div key={entry.version} className="relative">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="font-mono text-sm font-semibold text-primary">{entry.version}</span>
                <h2 className="text-lg font-semibold text-foreground">{entry.title}</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {new Date(entry.date).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
                })}
              </p>

              {entry.notes && (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">
                  {entry.notes}
                </p>
              )}

              <ul className="space-y-2.5">
                {entry.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-foreground/80">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground/50">
          <span>© {new Date().getFullYear()} HL Financial Strategies</span>
          {isSignedIn ? (
            <Link href="/dashboard" className="hover:text-muted-foreground transition-colors">
              ← Dashboard
            </Link>
          ) : (
            <Link href="/login" className="hover:text-muted-foreground transition-colors">
              Sign in →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
