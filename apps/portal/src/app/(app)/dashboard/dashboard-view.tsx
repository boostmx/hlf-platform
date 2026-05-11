import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Wallet,
  Target,
  Bell,
  Briefcase,
  Banknote,
  PiggyBank,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hlf/ui/card";
import { Badge } from "@hlf/ui/badge";
import { APPS, getAppUrl } from "@/lib/apps";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type {
  AlertsSummary,
  BookkeepingSummary,
  BudgetSummary,
  WheelSummary,
} from "@/lib/clients/types";

const APP_ICON = {
  wheel: TrendingUp,
  bookkeeping: Wallet,
  budget: Target,
  alerts: Bell,
} as const;

type Props = {
  firstName: string;
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  alerts: AlertsSummary | null;
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
    alerts?: string;
  };
};

export function DashboardView({ firstName, wheel, bookkeeping, budget, alerts, errors }: Props) {
  const greeting = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your HLF suite at a glance — month to date.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          icon={Briefcase}
          label="Open Positions"
          value={wheel ? String(wheel.openTradeCount + wheel.openLotCount) : "—"}
          sub={
            wheel
              ? `${wheel.openTradeCount} trades · ${wheel.openLotCount} lots`
              : errors.wheel ?? "Loading…"
          }
        />
        <KpiCard
          icon={TrendingUp}
          label="MTD Trading P&L"
          value={wheel ? formatCurrency(wheel.mtdRealizedPnl) : "—"}
          sub={wheel ? `YTD ${formatCurrency(wheel.ytdRealizedPnl, { compact: true })}` : errors.wheel ?? "Loading…"}
          tone={wheel ? (wheel.mtdRealizedPnl >= 0 ? "positive" : "negative") : "neutral"}
        />
        <KpiCard
          icon={Banknote}
          label="MTD Net"
          value={bookkeeping ? formatCurrency(bookkeeping.mtdNet) : "—"}
          sub={
            bookkeeping
              ? `Income ${formatCurrency(bookkeeping.mtdIncome, { compact: true })} · Exp ${formatCurrency(bookkeeping.mtdExpenses, { compact: true })}`
              : errors.bookkeeping ?? "Loading…"
          }
          tone={bookkeeping ? (bookkeeping.mtdNet >= 0 ? "positive" : "negative") : "neutral"}
        />
        <KpiCard
          icon={PiggyBank}
          label="Budget Remaining"
          value={budget ? formatCurrency(budget.remaining) : "—"}
          sub={
            budget && budget.monthlyBudgetTotal > 0
              ? `${formatCurrency(budget.mtdSpent, { compact: true })} of ${formatCurrency(budget.monthlyBudgetTotal, { compact: true })}${budget.fireScorePct != null ? ` · FIRE ${formatPercent(budget.fireScorePct)}` : ""}`
              : errors.budget ?? "No budget set"
          }
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Apps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {APPS.map((app) => {
            const Icon = APP_ICON[app.key];
            const href = getAppUrl(app);
            const hasError = Boolean(errors[app.key]);
            return (
              <a
                key={app.key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="h-full transition-all hover:border-primary/60 hover:shadow-sm">
                  <CardContent className="p-4 flex flex-col h-full gap-3">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: app.accent }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{app.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {app.description}
                      </p>
                    </div>
                    {hasError && (
                      <Badge variant="outline" className="self-start text-[10px] font-normal">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        offline
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" />
              Recent alerts
            </CardTitle>
            {alerts && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {alerts.alertsToday} today · {alerts.alertsThisWeek} this week
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {alerts == null && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {errors.alerts ?? "Loading alerts…"}
              </p>
            )}
            {alerts && alerts.recentAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No recent alerts. Stock Alerts will fire when signals trigger.
              </p>
            )}
            {alerts && alerts.recentAlerts.length > 0 && (
              <ul className="divide-y divide-border -mt-1">
                {alerts.recentAlerts.map((a) => (
                  <li key={a.id} className="py-2.5 flex items-start gap-3">
                    <div className="font-mono text-xs font-semibold w-12 shrink-0 mt-0.5">
                      {a.ticker}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug truncate">{a.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatAlertType(a.type)} · {formatRelativeTime(a.sentAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {APPS.map((app) => (
              <Link
                key={app.key}
                href={getAppUrl(app)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors group"
              >
                <span className="text-sm">{app.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        </div>
        <p className={`text-xl md:text-2xl font-bold font-mono ${toneClass}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</p>
      </CardContent>
    </Card>
  );
}

function formatAlertType(type: string) {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
