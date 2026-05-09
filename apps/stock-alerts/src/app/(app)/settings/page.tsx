import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { fetchWheelPortfolios, isWheelTrackerConfigured } from "@/lib/wheel-tracker-client";
import { getUserPreferences } from "@/server/userPreferences";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const prefs = await getUserPreferences(session.user.id);

  const portfolios = isWheelTrackerConfigured()
    ? await fetchWheelPortfolios(session.user.email).catch(() => [])
    : [];

  return (
    <SettingsClient
      initialEmail={session.user.email}
      initialName={`${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim()}
      initialDiscordWebhook={prefs.discordWebhook ?? ""}
      initialEmailEnabled={prefs.emailEnabled}
      initialThresholds={prefs.thresholds}
      portfolios={portfolios}
      initialWatchedPortfolioIds={prefs.watchedPortfolioIds}
    />
  );
}
