"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Bell, BellRing, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BreachConfig {
  id: string;
  enabled: boolean;
  params: { triggerPrice: number; direction: "below" | "above" };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function WatchlistAlertButton({
  ticker,
  currentPrice,
}: {
  ticker: string;
  currentPrice: number | null;
}) {
  const { data, mutate } = useSWR<{ configs: BreachConfig[] }>(
    `/api/alerts/configs?watchlistTicker=${encodeURIComponent(ticker)}`,
    fetcher,
  );
  const configs = data?.configs ?? [];
  const activeCount = configs.filter((c) => c.enabled).length;
  const [open, setOpen] = useState(false);

  const [direction, setDirection] = useState<"below" | "above">("below");
  const [triggerPrice, setTriggerPrice] = useState<number | null>(
    currentPrice ? Number(currentPrice.toFixed(2)) : null,
  );
  const [saving, setSaving] = useState(false);

  async function addConfig() {
    const price = triggerPrice;
    if (!price || price <= 0) {
      toast.error("Enter a positive trigger price");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/alerts/configs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "WATCHLIST_BREACH",
          watchlistTicker: ticker,
          params: { triggerPrice: price, direction },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Failed to add alert");
        return;
      }
      mutate();
      setTriggerPrice(currentPrice ? Number(currentPrice.toFixed(2)) : null);
      toast.success("Alert added");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: BreachConfig) {
    const res = await fetch(`/api/alerts/configs/${c.id}`, { method: "DELETE" });
    if (res.ok) mutate();
    else toast.error("Failed to remove");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "transition-colors p-0.5 -m-0.5 rounded",
            activeCount > 0
              ? "text-amber-500 hover:text-amber-600"
              : "text-muted-foreground/60 hover:text-foreground",
          )}
          title={
            activeCount > 0
              ? `${activeCount} active alert${activeCount === 1 ? "" : "s"}`
              : "Add price alert"
          }
        >
          {activeCount > 0 ? (
            <BellRing className="h-3.5 w-3.5" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {ticker} price alerts
          </div>

          {configs.length > 0 && (
            <ul className="space-y-1.5">
              {configs.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 text-xs py-1 px-2 -mx-2 rounded hover:bg-accent/40"
                >
                  <span className="flex-1">
                    Notify when{" "}
                    <span className="font-semibold">
                      {c.params.direction === "below" ? "≤" : "≥"} ${c.params.triggerPrice.toFixed(2)}
                    </span>
                  </span>
                  <button
                    onClick={() => remove(c)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 pt-1 border-t">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as "below" | "above")}>
                  <SelectTrigger className="h-8 mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="below">Drops to</SelectItem>
                    <SelectItem value="above">Rises to</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Price</Label>
                <NumberInput
                  min={0}
                  step={0.01}
                  value={triggerPrice}
                  onValueChange={setTriggerPrice}
                  className="h-8 mt-0.5"
                />
              </div>
            </div>
            <Button onClick={addConfig} disabled={saving} size="sm" className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add alert
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
