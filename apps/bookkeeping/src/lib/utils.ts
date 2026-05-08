import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BookkeepingEntry } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the annualized value of an entry. Recurring entries are monthly so multiply by 12. */
export function entryAmount(e: Pick<BookkeepingEntry, "amount" | "recurring">): number {
  return e.recurring ? e.amount * 12 : e.amount;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
