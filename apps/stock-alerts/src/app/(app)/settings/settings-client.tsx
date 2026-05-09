"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User, Bell, Sliders, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@hlf/ui/button";
import { Input } from "@hlf/ui/input";
import { Label } from "@hlf/ui/label";
import { Switch } from "@hlf/ui/switch";
import { cn } from "@/lib/utils";
import type { Thresholds } from "@/lib/signals";
import type { WheelPortfolio } from "@/lib/wheel-tracker-client";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export function SettingsClient({
  initialEmail,
  initialName,
  initialDiscordWebhook,
  initialEmailEnabled,
  initialThresholds,
  portfolios,
  initialWatchedPortfolioIds,
}: {
  initialEmail: string;
  initialName: string;
  initialDiscordWebhook: string;
  initialEmailEnabled: boolean;
  initialThresholds: Thresholds;
  portfolios: WheelPortfolio[];
  initialWatchedPortfolioIds: string[];
}) {
  const [discordWebhook, setDiscordWebhook] = useState(initialDiscordWebhook);
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [watchedPortfolioIds, setWatchedPortfolioIds] = useState<string[]>(
    initialWatchedPortfolioIds,
  );
  const [saving, setSaving] = useState(false);

  function setThreshold(key: keyof Thresholds, value: number) {
    setThresholds((prev) => ({ ...prev, [key]: value }));
  }

  // watchedPortfolioIds semantics: [] === watch all. A non-empty array means
  // watch only those portfolio IDs. Normalize "every one selected" back to []
  // so storage stays in the canonical "all" form.
  const isAllSelected = watchedPortfolioIds.length === 0;

  function selectAll() {
    setWatchedPortfolioIds([]);
  }

  function togglePortfolio(id: string) {
    if (isAllSelected) {
      setWatchedPortfolioIds([id]);
      return;
    }
    setWatchedPortfolioIds((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((p) => p !== id) : [...prev, id];
      if (next.length === 0 || next.length === portfolios.length) return [];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordWebhook, emailEnabled, thresholds, watchedPortfolioIds }),
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved.");
    else toast.error("Failed to save settings.");
  }

  async function testDiscord() {
    if (!discordWebhook) {
      toast.error("Enter a Discord webhook URL first.");
      return;
    }
    const res = await fetch("/api/settings/test-discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl: discordWebhook }),
    });
    if (res.ok) toast.success("Test message sent to Discord.");
    else toast.error("Failed to send test message.");
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Notification preferences and alert thresholds.
        </p>
      </div>

      <section className="border border-border rounded-lg p-5">
        <SectionHeader
          icon={User}
          title="Profile"
          description="Update your name in any HLF app — it syncs across the suite."
        />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={initialName} disabled className="opacity-50" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={initialEmail} disabled className="opacity-50" />
          </div>
        </div>
      </section>

      <section className="border border-border rounded-lg p-5">
        <SectionHeader
          icon={Bell}
          title="Notifications"
          description="Choose how you receive alerts."
        />
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email alerts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive alerts to your email address.
              </p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
          <div className="space-y-1.5">
            <Label>Discord webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/…"
                className="flex-1"
              />
              <Button variant="outline" onClick={testDiscord}>
                Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy URL.
            </p>
          </div>
        </div>
      </section>

      <section className="border border-border rounded-lg p-5">
        <SectionHeader
          icon={Layers}
          title="Position Portfolios"
          description="Choose which Wheel Tracker portfolios to monitor for exit alerts."
        />
        {portfolios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No portfolios found. Make sure your Wheel Tracker account uses the same email address.
          </p>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={selectAll}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors text-left",
                isAllSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/30",
              )}
            >
              <div>
                <p
                  className={cn(
                    "font-medium",
                    isAllSelected ? "text-primary" : "text-foreground",
                  )}
                >
                  All portfolios
                </p>
                <p className="text-xs text-muted-foreground">
                  Monitor exit signals for every portfolio
                </p>
              </div>
              {isAllSelected && (
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </button>

            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                or select specific
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {portfolios.map((p) => {
              const checked = !isAllSelected && watchedPortfolioIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePortfolio(p.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors text-left",
                    checked
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      checked ? "text-primary" : "text-foreground",
                    )}
                  >
                    {p.name}
                  </span>
                  {checked && (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}

            <p className="text-xs text-muted-foreground pt-2">
              {isAllSelected
                ? `All ${portfolios.length} portfolios included`
                : `${watchedPortfolioIds.length} of ${portfolios.length} portfolio${
                    portfolios.length !== 1 ? "s" : ""
                  } selected`}
            </p>
          </div>
        )}
      </section>

      <section className="border border-border rounded-lg p-5">
        <SectionHeader
          icon={Sliders}
          title="Alert Thresholds"
          description="Customize when signals fire for your subscriptions."
        />
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>RSI Oversold — CSP signal</Label>
            <Input
              type="number"
              min={10}
              max={50}
              value={thresholds.rsiOversold}
              onChange={(e) => setThreshold("rsiOversold", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Default 35. Fires when RSI drops below this.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>RSI Overbought — CC signal</Label>
            <Input
              type="number"
              min={50}
              max={90}
              value={thresholds.rsiOverbought}
              onChange={(e) => setThreshold("rsiOverbought", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Default 65. Fires when RSI rises above this.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Support proximity (%)</Label>
            <Input
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              value={thresholds.supportProximityPct}
              onChange={(e) => setThreshold("supportProximityPct", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Default 3. Fires when price is within this % of support.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Resistance proximity (%)</Label>
            <Input
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              value={thresholds.resistanceProximityPct}
              onChange={(e) => setThreshold("resistanceProximityPct", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Default 3. Fires when price is within this % of resistance.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Volume surge multiplier</Label>
            <Input
              type="number"
              min={1.2}
              max={5}
              step={0.1}
              value={thresholds.volumeSurgeMultiplier}
              onChange={(e) => setThreshold("volumeSurgeMultiplier", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Default 2×. Fires when volume exceeds this vs 20-day avg.
            </p>
          </div>
        </div>
      </section>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
