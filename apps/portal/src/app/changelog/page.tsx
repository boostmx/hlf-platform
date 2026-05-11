import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Badge } from "@hlf/ui/badge";
import { getChangelogSorted } from "@/data/changelog";

export default function ChangelogPage() {
  const entries = getChangelogSorted();
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          What&apos;s new
        </h1>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <Card key={`${entry.date}-${entry.version ?? ""}`}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-mono">{entry.version}</CardTitle>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {entry.date}
              </Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm leading-relaxed">
                {entry.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary mt-1.5 shrink-0">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
