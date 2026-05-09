"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@hlf/ui/button";
import { Input } from "@hlf/ui/input";
import { Label } from "@hlf/ui/label";
import { Badge } from "@hlf/ui/badge";
import { Switch } from "@hlf/ui/switch";

interface Ticker {
  id: string;
  symbol: string;
  name: string;
  sector: string | null;
  isApproved: boolean;
}

export function AdminClient({ tickers: initialTickers }: { tickers: Ticker[] }) {
  const [tickers, setTickers] = useState(initialTickers);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [adding, setAdding] = useState(false);

  async function addTicker() {
    if (!symbol || !name) {
      toast.error("Symbol and name are required.");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/admin/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: symbol.toUpperCase(), name, sector }),
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
    setSymbol("");
    setName("");
    setSector("");
    toast.success(`${ticker.symbol} added.`);
  }

  async function toggleApproved(id: string, current: boolean) {
    const res = await fetch(`/api/admin/tickers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isApproved: !current }),
    });
    if (!res.ok) {
      toast.error("Failed to update.");
      return;
    }
    setTickers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isApproved: !current } : t)),
    );
  }

  async function deleteTicker(id: string, sym: string) {
    const res = await fetch(`/api/admin/tickers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete.");
      return;
    }
    setTickers((prev) => prev.filter((t) => t.id !== id));
    toast.success(`${sym} removed.`);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin — Ticker Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add and manage the approved wheel universe.
        </p>
      </div>

      <div className="border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-medium">Add Ticker</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Symbol</Label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="AAPL"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apple Inc."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sector</Label>
            <Input
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Technology"
            />
          </div>
        </div>
        <Button onClick={addTicker} disabled={adding}>
          {adding ? "Adding…" : "Add Ticker"}
        </Button>
      </div>

      <div>
        <h2 className="font-medium mb-3">All Tickers ({tickers.length})</h2>
        <div className="space-y-2">
          {tickers.map((ticker) => (
            <div
              key={ticker.id}
              className="border border-border rounded-lg p-3 flex items-center gap-4"
            >
              <div className="flex-1">
                <span className="font-medium">{ticker.symbol}</span>
                <span className="text-sm text-muted-foreground ml-2">{ticker.name}</span>
                {ticker.sector && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {ticker.sector}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Approved</span>
                  <Switch
                    checked={ticker.isApproved}
                    onCheckedChange={() => toggleApproved(ticker.id, ticker.isApproved)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteTicker(ticker.id, ticker.symbol)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
