import type { BookkeepingEntry } from "@/types";
import { entryAmount } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function escapeCell(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEntriesToCsv(entries: BookkeepingEntry[], filename?: string) {
  const headers = ["Date", "Type", "Category", "Amount", "Description", "Source"];

  const rows = entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((e) => [
      e.date.slice(0, 10),
      e.type,
      e.category,
      e.amount.toFixed(2),
      e.description ?? "",
      e.source,
    ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");

  downloadCsv(csv, filename ?? `hlf-bookkeeping-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportYearlyReport(
  entries: BookkeepingEntry[],
  trading: { totalPremium: number; tradeCount: number; byMonth: Record<string, number> } | undefined,
  year: number,
) {
  const $ = (n: number) => n.toFixed(2);
  const rows: string[][] = [];

  const recurringEntries = entries.filter((e) => e.recurring);
  const oneTimeEntries = entries.filter((e) => !e.recurring);

  const recurringIncomePerMonth = recurringEntries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const recurringExpensePerMonth = recurringEntries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);

  const tradingPL = trading?.totalPremium ?? 0;
  const totalOtherIncome = entries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + entryAmount(e), 0);
  const totalExpenses = entries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + entryAmount(e), 0);
  const netIncome = tradingPL + totalOtherIncome - totalExpenses;

  // Title
  rows.push([`HLF Bookkeeping — ${year} Annual Report`]);
  rows.push([`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`]);
  rows.push([]);

  // Year Summary
  rows.push(["YEAR SUMMARY"]);
  rows.push(["Category", "Amount ($)"]);
  rows.push(["Trading P&L", $(tradingPL)]);
  if (trading?.tradeCount) rows.push([`  (${trading.tradeCount} closed trades)`, ""]);
  rows.push(["Other Income (Manual)", $(totalOtherIncome)]);
  rows.push(["Total Expenses", $(totalExpenses)]);
  rows.push(["Net Income", $(netIncome)]);
  rows.push([]);

  // Monthly Summary
  rows.push(["MONTHLY SUMMARY"]);
  rows.push(["Month", "Trading P&L", "Other Income", "Expenses", "Net"]);

  let sumTradingPL = 0;
  let sumOtherIncome = 0;
  let sumExpenses = 0;

  for (let m = 0; m < 12; m++) {
    const monthKey = `${year}-${String(m + 1).padStart(2, "0")}`;
    const monthEntries = oneTimeEntries.filter((e) => e.date.startsWith(monthKey));
    const monthIncome = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const monthExp = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
    const monthTrading = trading?.byMonth[monthKey] ?? 0;

    const totalInc = monthIncome + recurringIncomePerMonth + monthTrading;
    const totalExp = monthExp + recurringExpensePerMonth;

    sumTradingPL += monthTrading;
    sumOtherIncome += monthIncome + recurringIncomePerMonth;
    sumExpenses += totalExp;

    rows.push([
      `${MONTH_NAMES[m]} ${year}`,
      $(monthTrading),
      $(monthIncome + recurringIncomePerMonth),
      $(totalExp),
      $(totalInc - totalExp),
    ]);
  }

  rows.push(["ANNUAL TOTAL", $(sumTradingPL), $(sumOtherIncome), $(sumExpenses), $(sumTradingPL + sumOtherIncome - sumExpenses)]);
  rows.push([]);

  // Transactions by Month
  rows.push(["TRANSACTIONS BY MONTH"]);
  if (recurringEntries.length > 0) {
    rows.push(["Note: Recurring entries are listed separately at the bottom and included in each month's totals."]);
  }

  for (let m = 0; m < 12; m++) {
    const monthKey = `${year}-${String(m + 1).padStart(2, "0")}`;
    const monthEntries = oneTimeEntries
      .filter((e) => e.date.startsWith(monthKey))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const monthTrading = trading?.byMonth[monthKey] ?? 0;

    if (monthEntries.length === 0 && monthTrading === 0) continue;

    rows.push([]);
    rows.push([`--- ${MONTH_NAMES[m].toUpperCase()} ${year} ---`]);
    rows.push(["Date", "Type", "Name", "Category", "Amount ($)", "Notes"]);

    if (monthTrading !== 0) {
      rows.push([
        monthKey,
        "income",
        "Trading P&L (Wheel Tracker)",
        "Trading Profits",
        $(monthTrading),
        "Auto-imported",
      ]);
    }

    for (const e of monthEntries) {
      rows.push([
        e.date.slice(0, 10),
        e.type,
        e.name ?? e.category,
        e.category,
        $(e.amount),
        e.description ?? "",
      ]);
    }

    const monthInc =
      monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0)
      + recurringIncomePerMonth
      + monthTrading;
    const monthExp =
      monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0)
      + recurringExpensePerMonth;

    rows.push(["", "Month Total", "", "", $(monthInc - monthExp), `Income: ${$(monthInc)} | Expenses: ${$(monthExp)}`]);
  }

  // Recurring entries
  if (recurringEntries.length > 0) {
    rows.push([]);
    rows.push(["RECURRING ENTRIES (monthly amount × 12 = annual value)"]);
    rows.push(["Type", "Name", "Category", "Monthly Amount ($)", "Annual Amount ($)", "Notes"]);
    for (const e of recurringEntries) {
      rows.push([
        e.type,
        e.name ?? e.category,
        e.category,
        $(e.amount),
        $(e.amount * 12),
        e.description ?? "",
      ]);
    }
  }

  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
  downloadCsv(csv, `hlf-bookkeeping-${year}-annual-report.csv`);
}
