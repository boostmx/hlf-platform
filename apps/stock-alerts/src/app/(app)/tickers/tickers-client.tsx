"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  Search,
  Check,
  Plus,
  X,
  EyeOff,
  Eye,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@hlf/ui/input";
import { Button } from "@hlf/ui/button";
import { Label } from "@hlf/ui/label";
import { TickerAvatar } from "@hlf/ui/ticker-avatar";
import { cn } from "@/lib/utils";

interface Ticker {
  id: string;
  symbol: string;
  name: string;
  sector: string | null;
  lastPrice: number | null;
  createdBy: string | null;
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  Financials: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Healthcare: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  "Consumer Discretionary": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Consumer Staples": "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Energy: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  "Communication Services": "bg-violet-500/15 text-violet-400 border-violet-500/25",
  ETF: "bg-slate-500/15 text-slate-400 border-slate-500/25",
};

export function TickersClient({
  tickers: initialTickers,
  subscribedIds: initialSubscribedIds,
  hiddenIds: initialHiddenIds,
}: {
  tickers: Ticker[];
  subscribedIds: string[];
  hiddenIds: string[];
}) {
  const [tickers, setTickers] = useState(initialTickers);
  const [subscribedIds, setSubscribedIds] = useState(new Set(initialSubscribedIds));
  const [hiddenIds, setHiddenIds] = useState(new Set(initialHiddenIds));
  const [loading, setLoading] = useState<string | null>(null);
  const [hiding, setHiding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ symbol: "", name: "", sector: "" });
  const [validation, setValidation] = useState<{
    state: "idle" | "loading" | "valid" | "error";
    message?: string;
  }>({ state: "idle" });

  async function toggleSubscription(tickerId: string, symbol: string) {
    const isSubscribed = subscribedIds.has(tickerId);
    setLoading(tickerId);
    const res = await fetch("/api/subscriptions", {
      method: isSubscribed ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickerId }),
    });
    setLoading(null);
    if (!res.ok) {
      toast.error("Something went wrong.");
      return;
    }
    setSubscribedIds((prev) => {
      const next = new Set(prev);
      if (isSubscribed) {
        next.delete(tickerId);
        toast.success(`Unsubscribed from ${symbol}.`);
      } else {
        next.add(tickerId);
        toast.success(`Subscribed to ${symbol}.`);
      }
      return next;
    });
  }

  async function toggleHide(tickerId: string, symbol: string) {
    const isHidden = hiddenIds.has(tickerId);
    setHiding(tickerId);
    const res = await fetch(`/api/tickers/${tickerId}/hide`, {
      method: isHidden ? "DELETE" : "POST",
    });
    setHiding(null);
    if (!res.ok) {
      toast.error("Something went wrong.");
      return;
    }
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (isHidden) {
        next.delete(tickerId);
        toast.success(`${symbol} restored.`);
      } else {
        next.add(tickerId);
      }
      return next;
    });
  }

  async function validateSymbol(symbol: string) {
    if (!symbol) {
      setValidation({ state: "idle" });
      return;
    }
    setValidation({ state: "loading" });
    const res = await fetch(`/api/tickers/validate?symbol=${encodeURIComponent(symbol)}`);
    const data = await res.json();
    if (data.valid) {
      setValidation({ state: "valid" });
      setAddForm((p) => ({ ...p, symbol: data.symbol, name: data.name }));
    } else {
      setValidation({ state: "error", message: data.error });
    }
  }

  async function handleDeleteTicker(tickerId: string, symbol: string) {
    setDeleting(tickerId);
    const res = await fetch(`/api/tickers/${tickerId}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      toast.error("Failed to delete ticker.");
      return;
    }
    setTickers((prev) => prev.filter((t) => t.id !== tickerId));
    toast.success(`${symbol} removed.`);
  }

  async function handleAddTicker() {
    if (!addForm.symbol || !addForm.name) {
      toast.error("Symbol and name are required.");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to add ticker.");
      return;
    }
    const ticker = await res.json();
    setTickers((prev) =>
      [...prev, ticker].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );
    setAddForm({ symbol: "", name: "", sector: "" });
    setValidation({ state: "idle" });
    setShowAdd(false);
    toast.success(`${ticker.symbol} added.`);
  }

  const matchesSearch = (t: Ticker) =>
    !search ||
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.sector ?? "").toLowerCase().includes(search.toLowerCase());

  const myTickers = tickers.filter((t) => t.createdBy !== null && matchesSearch(t));
  const curatedVisible = tickers.filter(
    (t) => t.createdBy === null && !hiddenIds.has(t.id) && matchesSearch(t),
  );
  const curatedHidden = tickers.filter(
    (t) => t.createdBy === null && hiddenIds.has(t.id) && matchesSearch(t),
  );
  const totalVisible = myTickers.length + curatedVisible.length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Subscribe to tickers to receive daily wheel strategy alerts.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => {
            setShowAdd((v) => !v);
            setValidation({ state: "idle" });
            setAddForm({ symbol: "", name: "", sector: "" });
          }}
        >
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? "Cancel" : "Add Ticker"}
        </Button>
      </div>

      {showAdd && (
        <div className="border border-border rounded-lg p-5 bg-card space-y-4">
          <p className="text-sm font-semibold">Add a custom ticker</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Symbol</Label>
              <div className="relative">
                <Input
                  value={addForm.symbol}
                  onChange={(e) => {
                    setAddForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }));
                    setValidation({ state: "idle" });
                  }}
                  onBlur={(e) => validateSymbol(e.target.value.trim())}
                  placeholder="AAPL"
                  className={cn(
                    validation.state === "valid" &&
                      "border-emerald-500 focus-visible:ring-emerald-500/30",
                    validation.state === "error" &&
                      "border-destructive focus-visible:ring-destructive/30",
                  )}
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {validation.state === "loading" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                  {validation.state === "valid" && (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  {validation.state === "error" && (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
              </div>
              {validation.state === "error" && (
                <p className="text-xs text-destructive">{validation.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={
                  validation.state === "loading" ? "Looking up…" : "Auto-filled from symbol"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Sector <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={addForm.sector}
                onChange={(e) => setAddForm((p) => ({ ...p, sector: e.target.value }))}
                placeholder="Technology"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAddTicker}
            disabled={adding || validation.state !== "valid"}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            {adding ? "Adding…" : "Add Ticker"}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symbol, name, sector…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {totalVisible} ticker{totalVisible !== 1 ? "s" : ""} · {subscribedIds.size} subscribed
          {curatedHidden.length > 0 && ` · ${curatedHidden.length} hidden`}
        </p>
      </div>

      {totalVisible === 0 && curatedHidden.length === 0 ? (
        <div className="border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-20" />
          <p>No tickers found.</p>
        </div>
      ) : (
        <>
          {myTickers.length > 0 && (
            <TickerSection
              label="My Tickers"
              description="Tickers you've added"
              tickers={myTickers}
              subscribedIds={subscribedIds}
              loading={loading}
              hiding={hiding}
              deleting={deleting}
              onToggle={toggleSubscription}
              onDelete={handleDeleteTicker}
              showHideButton={false}
            />
          )}

          {curatedVisible.length > 0 && (
            <TickerSection
              label="Wheel Universe"
              description="Curated tickers for the wheel strategy"
              tickers={curatedVisible}
              subscribedIds={subscribedIds}
              loading={loading}
              hiding={hiding}
              deleting={null}
              onToggle={toggleSubscription}
              onHide={toggleHide}
              showHideButton={true}
            />
          )}

          {curatedHidden.length > 0 && (
            <div>
              <button
                onClick={() => setShowHidden((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showHidden ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {showHidden ? "Hide" : "Show"} {curatedHidden.length} hidden ticker
                {curatedHidden.length !== 1 ? "s" : ""}
              </button>
              {showHidden && (
                <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
                  {curatedHidden.map((ticker) => (
                    <div
                      key={ticker.id}
                      className="border border-border rounded-lg p-3 bg-card flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">
                          {ticker.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{ticker.symbol}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {ticker.name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs gap-1.5"
                        disabled={hiding === ticker.id}
                        onClick={() => toggleHide(ticker.id, ticker.symbol)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TickerSection({
  label,
  description,
  tickers,
  subscribedIds,
  loading,
  hiding,
  deleting,
  onToggle,
  onHide,
  onDelete,
  showHideButton,
}: {
  label: string;
  description: string;
  tickers: Ticker[];
  subscribedIds: Set<string>;
  loading: string | null;
  hiding: string | null;
  deleting: string | null;
  onToggle: (id: string, symbol: string) => void;
  onHide?: (id: string, symbol: string) => void;
  onDelete?: (id: string, symbol: string) => void;
  showHideButton: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{label}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tickers.map((ticker) => {
          const subscribed = subscribedIds.has(ticker.id);
          const sectorClass = ticker.sector
            ? SECTOR_COLORS[ticker.sector] ?? "bg-slate-500/15 text-slate-400 border-slate-500/25"
            : null;
          return (
            <div
              key={ticker.id}
              className={cn(
                "border rounded-lg p-4 flex flex-col gap-3 bg-card transition-colors group",
                subscribed ? "border-primary/40" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TickerAvatar symbol={ticker.symbol} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{ticker.symbol}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{ticker.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {ticker.lastPrice && (
                    <p className="text-sm font-semibold">${ticker.lastPrice.toFixed(2)}</p>
                  )}
                  {showHideButton && onHide && (
                    <button
                      onClick={() => onHide(ticker.id, ticker.symbol)}
                      disabled={hiding === ticker.id}
                      className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      title="Hide ticker"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(ticker.id, ticker.symbol)}
                      disabled={deleting === ticker.id}
                      className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      title="Delete ticker"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                {sectorClass ? (
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                      sectorClass,
                    )}
                  >
                    {ticker.sector}
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  size="sm"
                  variant={subscribed ? "outline" : "default"}
                  disabled={loading === ticker.id}
                  onClick={() => onToggle(ticker.id, ticker.symbol)}
                  className={cn(
                    "gap-1.5 shrink-0",
                    subscribed && "border-primary/40 text-primary",
                  )}
                >
                  {loading === ticker.id ? (
                    "…"
                  ) : subscribed ? (
                    <>
                      <Check className="h-3 w-3" />
                      Subscribed
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
