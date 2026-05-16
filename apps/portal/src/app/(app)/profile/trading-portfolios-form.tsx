"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Button } from "@hlf/ui/button";
import { Checkbox } from "@hlf/ui/checkbox";
import { Label } from "@hlf/ui/label";

export type Portfolio = { id: string; name: string };
export type Selection = "all" | string[];

type Props = {
  initialSelection: Selection;
  portfolios: Portfolio[];
  availableError?: string;
};

export function TradingPortfoliosForm({
  initialSelection,
  portfolios,
  availableError,
}: Props) {
  const [mode, setMode] = useState<"all" | "selected">(
    initialSelection === "all" ? "all" : "selected",
  );
  const [ids, setIds] = useState<string[]>(
    initialSelection === "all" ? [] : initialSelection,
  );
  const [saving, setSaving] = useState(false);

  const dirty =
    mode === "all"
      ? initialSelection !== "all"
      : initialSelection === "all" ||
        sortedEqual(ids, initialSelection) === false;

  function toggle(id: string) {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    if (mode === "selected" && ids.length === 0) {
      toast.error("Select at least one portfolio, or switch to All");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/trading-portfolios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: mode === "all" ? "all" : ids }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Trading portfolios updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          Trading portfolios
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
          Which Wheel Tracker portfolios count toward cross-app trading P&amp;L
          rollups. Affects the portal dashboard and bookkeeping&apos;s trading
          income auto-pull. Wheel Tracker&apos;s own UI is unaffected.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <ModeOption
              label="All portfolios"
              description="Include every portfolio's realized P&L"
              checked={mode === "all"}
              onCheck={() => setMode("all")}
            />
            <ModeOption
              label="Specific portfolios"
              description="Only count the ones you pick below"
              checked={mode === "selected"}
              onCheck={() => setMode("selected")}
            />
          </div>

          {mode === "selected" && (
            <div className="border rounded-md divide-y">
              {availableError && portfolios.length === 0 && (
                <p className="p-3 text-xs text-amber-600 dark:text-amber-400">
                  Couldn&apos;t reach Wheel Tracker to list portfolios: {availableError}
                </p>
              )}
              {!availableError && portfolios.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">
                  No portfolios found in Wheel Tracker yet.
                </p>
              )}
              {portfolios.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={ids.includes(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ModeOption({
  label,
  description,
  checked,
  onCheck,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheck: () => void;
}) {
  return (
    <label className="flex items-start gap-2.5 p-2 -mx-2 rounded-md cursor-pointer hover:bg-muted/40 transition-colors">
      <input
        type="radio"
        name="trading-portfolios-mode"
        checked={checked}
        onChange={onCheck}
        className="mt-0.5 accent-primary"
      />
      <div className="flex-1">
        <Label className="cursor-pointer">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {description}
        </p>
      </div>
    </label>
  );
}

function sortedEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aa = [...a].sort();
  const bb = [...b].sort();
  return aa.every((v, i) => v === bb[i]);
}
