import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import type { Thresholds } from "@/lib/signals";
import { DEFAULT_THRESHOLDS } from "@/lib/signals";
import { fetchWheelPortfolios, isWheelTrackerConfigured } from "@/lib/wheel-tracker-client";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, discordWebhook: true, emailEnabled: true, thresholds: true, watchedPortfolioIds: true },
  }).catch(() => null);

  const resolvedUser = user ?? {
    email: session.user.email,
    name: session.user.name ?? "",
    discordWebhook: null,
    emailEnabled: true,
    thresholds: null,
    watchedPortfolioIds: null,
  };

  const thresholds: Thresholds = (resolvedUser.thresholds as Thresholds | null) ?? DEFAULT_THRESHOLDS;
  const watchedPortfolioIds: string[] = (resolvedUser.watchedPortfolioIds as string[] | null) ?? [];

  const portfolios = isWheelTrackerConfigured()
    ? await fetchWheelPortfolios(resolvedUser.email).catch(() => [])
    : [];

  return (
    <SettingsClient
      initialEmail={resolvedUser.email}
      initialName={resolvedUser.name ?? ""}
      initialDiscordWebhook={resolvedUser.discordWebhook ?? ""}
      initialEmailEnabled={resolvedUser.emailEnabled}
      initialThresholds={thresholds}
      portfolios={portfolios}
      initialWatchedPortfolioIds={watchedPortfolioIds}
    />
  );
}
