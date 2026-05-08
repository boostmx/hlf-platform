"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User, Bell, Sliders, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Thresholds } from "@/lib/signals";
import type { WheelPortfolio } from "@/lib/wheel-tracker-client";

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
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
  const [name, setName] = useState(initialName);
  const [discordWebhook, setDiscordWebhook] = useState(initialDiscordWebhook);
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [watchedPortfolioIds, setWatchedPortfolioIds] = useState<string[]>(initialWatchedPortfolioIds);
  const [saving, setSaving] = useState(false);

  function setThreshold(key: keyof Thresholds, value: number) {
    setThresholds((prev) => ({ ...prev, [key]: value }));
  }

  function togglePortfolio(id: string) {
    setWatchedPortfolioIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, discordWebhook, emailEnabled, thresholds, watchedPortfolioIds }),
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved.");
    else toast.error("Failed to save settings.");
  }

  async function testDiscord() {
    if (!discordWebhook) { toast.error("Enter a Discord webhook URL first."); return; }
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
        <p className="text-sm text-muted-foreground mt-1">Notification preferences and alert thresholds.</p>
      </div>

      {/* Profile */}
      <section className="border border-border rounded-lg p-5">
        <SectionHeader icon={User} title="Profile" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={initialEmail} disabled className="opacity-50" />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="border border-border rounded-lg p-5">
        <SectionHeader icon={Bell} title="Notifications" description="Choose how you receive alerts." />
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email alerts</p>
              <p className="text-xs text-muted-foreground mt-0.5">Receive alerts to your email address.</p>
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
              <Button variant="outline" onClick={testDiscord}>Test</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy URL.
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio filter */}
      <section className="border border-border rounded-lg p-5">
        <SectionHeader
          icon={Layers}
          title="Position Portfolios"
          description="Choose which Wheel Tracker portfolios to monitor for exit alerts. Uncheck all to monitor every portfolio."
        />
        {portfolios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {/* wheel-tracker-client not configured or user has no portfolios */}
            No portfolios found. Make sure your Wheel Tracker account uses the same email address.
          </p>
        ) : (
          <div className="space-y-3">
            {portfolios.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{p.name}</span>
                  {watchedPortfolioIds.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">(all)</span>
                  )}
                </div>
                <Switch
                  checked={watchedPortfolioIds.length === 0 || watchedPortfolioIds.includes(p.id)}
                  onCheckedChange={() => togglePortfolio(p.id)}
                />
              </div>
            ))}
            {watchedPortfolioIds.length > 0 && watchedPortfolioIds.length < portfolios.length && (
              <button
                type="button"
                onClick={() => setWatchedPortfolioIds([])}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-1"
              >
                Monitor all portfolios
              </button>
            )}
          </div>
        )}
      </section>

      {/* Thresholds */}
      <section className="border border-border rounded-lg p-5">
        <SectionHeader icon={Sliders} title="Alert Thresholds" description="Customize when signals fire for your subscriptions." />
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>RSI Oversold — CSP signal</Label>
            <Input type="number" min={10} max={50} value={thresholds.rsiOversold} onChange={(e) => setThreshold("rsiOversold", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Default 35. Fires when RSI drops below this.</p>
          </div>
          <div className="space-y-1.5">
            <Label>RSI Overbought — CC signal</Label>
            <Input type="number" min={50} max={90} value={thresholds.rsiOverbought} onChange={(e) => setThreshold("rsiOverbought", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Default 65. Fires when RSI rises above this.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Support proximity (%)</Label>
            <Input type="number" min={0.5} max={10} step={0.5} value={thresholds.supportProximityPct} onChange={(e) => setThreshold("supportProximityPct", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Default 3. Fires when price is within this % of support.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Resistance proximity (%)</Label>
            <Input type="number" min={0.5} max={10} step={0.5} value={thresholds.resistanceProximityPct} onChange={(e) => setThreshold("resistanceProximityPct", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Default 3. Fires when price is within this % of resistance.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Volume surge multiplier</Label>
            <Input type="number" min={1.2} max={5} step={0.1} value={thresholds.volumeSurgeMultiplier} onChange={(e) => setThreshold("volumeSurgeMultiplier", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Default 2×. Fires when volume exceeds this vs 20-day avg.</p>
          </div>
        </div>
      </section>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
