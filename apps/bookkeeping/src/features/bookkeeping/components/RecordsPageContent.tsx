"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookMarked, List, Receipt, ChevronDown, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookkeeping, useTradingSummary } from "@/features/bookkeeping/hooks/useBookkeeping";
import { exportYearlyReport } from "@/lib/exportCsv";
import { toast } from "sonner";
import { RecordsLedger } from "@/features/bookkeeping/components/RecordsLedger";
import { TransactionsContent } from "@/features/bookkeeping/components/TransactionsContent";
import { TaxEstimate } from "@/features/bookkeeping/components/TaxEstimate";

const START_YEAR = 2025;
type Tab = "ledger" | "transactions" | "tax";

function getAvailableYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = START_YEAR; y <= current; y++) years.push(y);
  return years;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "ledger", label: "Ledger", icon: BookMarked },
  { id: "transactions", label: "Transactions", icon: List },
  { id: "tax", label: "Tax Estimate", icon: Receipt },
];

export function RecordsPageContent() {
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();

  const initYear = Number(searchParams.get("year") ?? currentYear);
  const initMonth = searchParams.get("month") ? Number(searchParams.get("month")) - 1 : undefined;
  const initTab = (searchParams.get("tab") as Tab | null) ?? "ledger";

  const [year, setYear] = useState(initYear);
  const [tab, setTab] = useState<Tab>(initTab);

  const years = getAvailableYears();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const { data: entries = [] } = useBookkeeping(from, to);
  const { data: trading } = useTradingSummary(from, to);

  function handleDownloadReport() {
    exportYearlyReport(entries, trading, year);
    toast.success(`${year} annual report downloaded`);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Records</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tax year {year} · {TABS.find((t) => t.id === tab)?.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDownloadReport} className="gap-1.5 h-9">
            <FileText className="h-3.5 w-3.5" />
            Download Report
          </Button>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28 h-9 gap-1">
              <SelectValue />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y} {y === currentYear ? "(current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "ledger" && <RecordsLedger year={year} initialMonth={initMonth} />}
      {tab === "transactions" && <TransactionsContent year={year} />}
      {tab === "tax" && <TaxEstimate year={year} />}
    </div>
  );
}
