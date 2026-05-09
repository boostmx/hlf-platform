"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import {
  TrendingDown,
  TrendingUp,
  BarChart2,
  Clock,
  ExternalLink,
  Plus,
  X,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { TickerAvatar } from "@hlf/ui/ticker-avatar";
import { Button } from "@hlf/ui/button";
import { Input } from "@hlf/ui/input";
import { Label } from "@hlf/ui/label";
import { DatePicker } from "@hlf/ui/date-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  WheelOpenPositions,
  WheelOpenTrade,
  WheelOpenStockLot,
} from "@/lib/wheel-tracker-client";

type Ticker = { id: string; symbol: string; name: string };

type ManualPosition = {
  id: string;
  positionType: "CSP" | "CC" | "STOCK";
  contracts: number;
  strikePrice: number | null;
  premium: number | null;
  shares: number | null;
  entryPrice: number | null;
  expirationDate: string | null;
  notes: string | null;
  openedAt: string;
  ticker: Ticker;
};

const TRACKER_TRADE_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  CashSecuredPut: { label: "CSP", icon: TrendingDown, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  CoveredCall: { label: "CC", icon: TrendingUp, color: "bg-sky-500/15 text-sky-400 border-sky-500/25" },
  Put: { label: "Put", icon: TrendingDown, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  Call: { label: "Call", icon: TrendingUp, color: "bg-sky-500/15 text-sky-400 border-sky-500/25" },
};

function getDte(expirationDate: string) {
  return differenceInCalendarDays(new Date(expirationDate), new Date());
}

function getDteColor(dte: number) {
  if (dte <= 7) return "text-rose-500";
  if (dte <= 14) return "text-amber-500";
  return "text-muted-foreground";
}

function TrackerTradeRow({ trade }: { trade: WheelOpenTrade }) {
  const meta =
    TRACKER_TRADE_META[trade.type] ??
    {
      label: trade.type,
      icon: BarChart2,
      color: "bg-muted text-muted-foreground border-border",
    };
  const Icon = meta.icon;
  const dte = getDte(trade.expirationDate);
  return (
    <div className="border border-border rounded-lg p-4 bg-card flex items-start gap-4">
      <TickerAvatar symbol={trade.ticker} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-sm">{trade.ticker}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
              meta.color,
            )}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <span className="text-sm font-medium">${trade.strikePrice.toFixed(2)} strike</span>
          <span className="text-xs text-muted-foreground">
            ${trade.contractPrice.toFixed(2)} premium × {trade.contractsOpen * 100} shares
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className={getDteColor(dte)}>
            {dte > 0 ? `${dte} DTE` : dte === 0 ? "Expires today" : "Expired"}
          </span>
          <span>Exp. {new Date(trade.expirationDate).toLocaleDateString()}</span>
          <span className="text-muted-foreground/60">{trade.portfolioName}</span>
          {trade.contractsOpen !== trade.contractsInitial && (
            <span className="text-amber-500">
              {trade.contractsOpen}/{trade.contractsInitial} contracts open
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackerLotRow({ lot }: { lot: WheelOpenStockLot }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card flex items-start gap-4">
      <TickerAvatar symbol={lot.ticker} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-sm">{lot.ticker}</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-violet-500/15 text-violet-400 border-violet-500/25">
            <BarChart2 className="h-3 w-3" />
            Stock
          </span>
          <span className="text-sm font-medium">{lot.shares} shares</span>
          <span className="text-xs text-muted-foreground">
            avg cost ${lot.avgCost.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Opened {new Date(lot.openedAt).toLocaleDateString()}</span>
          <span className="text-muted-foreground/60">{lot.portfolioName}</span>
        </div>
      </div>
    </div>
  );
}

const MANUAL_META = {
  CSP: { label: "CSP", icon: TrendingDown, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  CC: { label: "CC", icon: TrendingUp, color: "bg-sky-500/15 text-sky-400 border-sky-500/25" },
  STOCK: { label: "Stock", icon: BarChart2, color: "bg-violet-500/15 text-violet-400 border-violet-500/25" },
};

function ManualPositionRow({
  position,
  onClose,
  onDelete,
}: {
  position: ManualPosition;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = MANUAL_META[position.positionType];
  const Icon = meta.icon;
  const dte = position.expirationDate ? getDte(position.expirationDate) : null;

  return (
    <div className="border border-border rounded-lg p-4 bg-card flex items-start gap-4">
      <TickerAvatar symbol={position.ticker.symbol} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-sm">{position.ticker.symbol}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
              meta.color,
            )}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          {position.positionType !== "STOCK" && position.strikePrice && (
            <span className="text-sm font-medium">${position.strikePrice.toFixed(2)} strike</span>
          )}
          {position.positionType !== "STOCK" && position.premium && (
            <span className="text-xs text-muted-foreground">
              ${position.premium.toFixed(2)} premium × {position.contracts * 100} shares
            </span>
          )}
          {position.positionType === "STOCK" && position.shares && (
            <span className="text-sm font-medium">{position.shares} shares</span>
          )}
          {position.positionType === "STOCK" && position.entryPrice && (
            <span className="text-xs text-muted-foreground">
              entry ${position.entryPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {dte !== null && (
            <span className={getDteColor(dte)}>
              {dte > 0 ? `${dte} DTE` : dte === 0 ? "Expires today" : "Expired"}
            </span>
          )}
          {position.expirationDate && (
            <span>Exp. {new Date(position.expirationDate).toLocaleDateString()}</span>
          )}
          <span>Opened {new Date(position.openedAt).toLocaleDateString()}</span>
          {position.notes && <span className="italic">{position.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onClose(position.id)}
          title="Mark closed"
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-rose-500"
          onClick={() => onDelete(position.id)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

type FormState = {
  tickerId: string;
  positionType: "CSP" | "CC" | "STOCK";
  contracts: string;
  strikePrice: string;
  premium: string;
  shares: string;
  entryPrice: string;
  expirationDate: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  tickerId: "",
  positionType: "CSP",
  contracts: "1",
  strikePrice: "",
  premium: "",
  shares: "",
  entryPrice: "",
  expirationDate: "",
  notes: "",
};

function AddPositionModal({
  tickers,
  onClose,
  onSaved,
}: {
  tickers: Ticker[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.tickerId) {
      toast.error("Select a ticker.");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      tickerId: form.tickerId,
      positionType: form.positionType,
      contracts: form.positionType !== "STOCK" ? Number(form.contracts) : 1,
      strikePrice: form.strikePrice ? Number(form.strikePrice) : null,
      premium: form.premium ? Number(form.premium) : null,
      shares: form.shares ? Number(form.shares) : null,
      entryPrice: form.entryPrice ? Number(form.entryPrice) : null,
      expirationDate: form.expirationDate || null,
      notes: form.notes || null,
    };
    const res = await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Position added.");
      onSaved();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to add position.");
    }
  }

  const isOption = form.positionType !== "STOCK";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Add Manual Position</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ticker</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.tickerId}
              onChange={(e) => set("tickerId", e.target.value)}
            >
              <option value="">Select ticker…</option>
              {tickers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol} — {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex gap-2">
              {(["CSP", "CC", "STOCK"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("positionType", type)}
                  className={cn(
                    "flex-1 h-9 rounded-md text-sm font-medium border transition-colors",
                    form.positionType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-input hover:text-foreground",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isOption ? (
              <>
                <div className="space-y-1.5">
                  <Label>Contracts</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.contracts}
                    onChange={(e) => set("contracts", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Strike Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.strikePrice}
                    onChange={(e) => set("strikePrice", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Premium</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.premium}
                    onChange={(e) => set("premium", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiration</Label>
                  <DatePicker
                    value={form.expirationDate}
                    onChange={(v) => set("expirationDate", v)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Shares</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="100"
                    value={form.shares}
                    onChange={(e) => set("shares", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Entry Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.entryPrice}
                    onChange={(e) => set("entryPrice", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              placeholder="e.g. hedge position"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving…" : "Add Position"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PositionsClient({
  trackerPositions,
  isTrackerConfigured,
  manualPositions: initialManual,
  tickers,
}: {
  trackerPositions: WheelOpenPositions;
  isTrackerConfigured: boolean;
  manualPositions: ManualPosition[];
  tickers: Ticker[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"tracker" | "manual">("tracker");
  const [showAddModal, setShowAddModal] = useState(false);

  const trackerCount = trackerPositions.trades.length + trackerPositions.stockLots.length;
  const manualCount = initialManual.length;

  async function handleClose(id: string) {
    const res = await fetch(`/api/positions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close: true }),
    });
    if (res.ok) {
      toast.success("Position marked closed.");
      router.refresh();
    } else toast.error("Failed to close position.");
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Position deleted.");
      router.refresh();
    } else toast.error("Failed to delete position.");
  }

  const TabButton = ({
    value,
    label,
    count,
  }: {
    value: "tracker" | "manual";
    label: string;
    count: number;
  }) => (
    <button
      onClick={() => setTab(value)}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
        tab === value
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-[10px] font-medium h-4 min-w-4 px-1",
          tab === value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor open positions for exit alert signals.
          </p>
        </div>
        <a
          href={
            process.env.NEXT_PUBLIC_WHEEL_TRACKER_URL ?? "https://wheel.hlfinancialstrategies.com"
          }
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
        >
          Open Tracker
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="space-y-4">
        <div className="flex border-b border-border">
          <TabButton value="tracker" label="Wheel Tracker" count={trackerCount} />
          <TabButton value="manual" label="Manual" count={manualCount} />
        </div>

        {tab === "tracker" &&
          (!isTrackerConfigured ? (
            <div className="border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="font-medium mb-1">Wheel Tracker not connected</p>
              <p className="text-xs">
                Set <code className="font-mono text-xs">WHEEL_TRACKER_URL</code> and{" "}
                <code className="font-mono text-xs">INTERNAL_API_KEY</code> to enable live position
                sync.
              </p>
            </div>
          ) : trackerCount === 0 ? (
            <div className="border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>No open positions in your Wheel Tracker portfolios.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {trackerPositions.trades.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Options ({trackerPositions.trades.length})
                  </h2>
                  <div className="space-y-2">
                    {trackerPositions.trades.map((t) => (
                      <TrackerTradeRow key={t.id} trade={t} />
                    ))}
                  </div>
                </div>
              )}
              {trackerPositions.stockLots.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Stock Lots ({trackerPositions.stockLots.length})
                  </h2>
                  <div className="space-y-2">
                    {trackerPositions.stockLots.map((l) => (
                      <TrackerLotRow key={l.id} lot={l} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

        {tab === "manual" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Positions entered manually — useful for trades not in Wheel Tracker.
              </p>
              <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Position
              </Button>
            </div>

            {manualCount === 0 ? (
              <div className="border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No manual positions yet.</p>
                <p className="text-xs mt-1">
                  Add positions here to receive exit alerts for trades outside Wheel Tracker.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {initialManual.map((p) => (
                  <ManualPositionRow
                    key={p.id}
                    position={p}
                    onClose={handleClose}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddPositionModal
          tickers={tickers}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
