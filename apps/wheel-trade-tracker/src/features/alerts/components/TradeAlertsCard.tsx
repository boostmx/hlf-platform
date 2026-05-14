"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@hlf/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALERT_TYPE_LABEL, describeConfig } from "@/lib/alerts/types";

type ConfigType = "PROFIT_TARGET" | "ASSIGNMENT_RISK" | "ROLL_OPPORTUNITY";

interface AlertConfigRow {
  id: string;
  type: ConfigType;
  enabled: boolean;
  params: unknown;
  lastFiredAt: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TradeAlertsCard({ tradeId }: { tradeId: string }) {
  const { data, mutate, isLoading } = useSWR<{ configs: AlertConfigRow[] }>(
    `/api/alerts/configs?tradeId=${encodeURIComponent(tradeId)}`,
    fetcher,
  );
  const [addOpen, setAddOpen] = useState(false);
  const configs = data?.configs ?? [];

  async function toggleEnabled(c: AlertConfigRow) {
    const res = await fetch(`/api/alerts/configs/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !c.enabled }),
    });
    if (res.ok) mutate();
    else toast.error("Failed to toggle alert");
  }

  async function remove(c: AlertConfigRow) {
    const res = await fetch(`/api/alerts/configs/${c.id}`, { method: "DELETE" });
    if (res.ok) mutate();
    else toast.error("Failed to remove alert");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Alerts
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add alert
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : configs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No alerts on this trade. Add one to get a Web Push when a threshold fires.
        </p>
      ) : (
        <ul className="space-y-2">
          {configs.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-md hover:bg-accent/40"
            >
              <Switch checked={c.enabled} onCheckedChange={() => toggleEnabled(c)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {ALERT_TYPE_LABEL[c.type]}
                  </Badge>
                  <span className="text-sm text-muted-foreground truncate">
                    {describeConfig(c.type, c.params)}
                  </span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => remove(c)}
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddTradeAlertDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tradeId={tradeId}
        onCreated={() => mutate()}
      />
    </Card>
  );
}

function AddTradeAlertDialog({
  open,
  onOpenChange,
  tradeId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeId: string;
  onCreated: () => void;
}) {
  const [type, setType] = useState<ConfigType>("PROFIT_TARGET");
  const [profitPct, setProfitPct] = useState<number | null>(80);
  const [withinPctOfStrike, setWithinPctOfStrike] = useState<number | null>(2);
  const [riskMaxDte, setRiskMaxDte] = useState<number | null>(21);
  const [rollMaxDte, setRollMaxDte] = useState<number | null>(7);
  const [minOtmPct, setMinOtmPct] = useState<number | null>(2);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const params = (() => {
        if (type === "PROFIT_TARGET") return { profitPct: profitPct ?? 0 };
        if (type === "ASSIGNMENT_RISK")
          return {
            withinPctOfStrike: withinPctOfStrike ?? 0,
            maxDte: riskMaxDte ?? 0,
          };
        return { maxDte: rollMaxDte ?? 0, minOtmPct: minOtmPct ?? 0 };
      })();

      const res = await fetch("/api/alerts/configs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, tradeId, params }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Failed to add alert");
        return;
      }
      onCreated();
      onOpenChange(false);
      toast.success("Alert added");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add alert</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ConfigType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROFIT_TARGET">Profit target</SelectItem>
                <SelectItem value="ASSIGNMENT_RISK">Assignment risk</SelectItem>
                <SelectItem value="ROLL_OPPORTUNITY">Roll opportunity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "PROFIT_TARGET" && (
            <div>
              <Label className="text-xs">Profit % to trigger at</Label>
              <NumberInput
                min={1}
                max={99}
                value={profitPct}
                onValueChange={setProfitPct}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Estimated from time-decay; conservative for OTM positions.
              </p>
            </div>
          )}

          {type === "ASSIGNMENT_RISK" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Trigger when price within (% of strike)</Label>
                <NumberInput
                  min={0}
                  max={50}
                  step={0.5}
                  value={withinPctOfStrike}
                  onValueChange={setWithinPctOfStrike}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Only when DTE ≤</Label>
                <NumberInput
                  min={0}
                  max={365}
                  allowDecimal={false}
                  value={riskMaxDte}
                  onValueChange={setRiskMaxDte}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {type === "ROLL_OPPORTUNITY" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">When DTE ≤</Label>
                <NumberInput
                  min={0}
                  max={60}
                  allowDecimal={false}
                  value={rollMaxDte}
                  onValueChange={setRollMaxDte}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">And OTM ≥ (%)</Label>
                <NumberInput
                  min={0}
                  max={50}
                  step={0.5}
                  value={minOtmPct}
                  onValueChange={setMinOtmPct}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Add alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
