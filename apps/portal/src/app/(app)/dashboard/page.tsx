import { auth } from "@/server/auth/auth";
import {
  fetchAlertsSummary,
  fetchBookkeepingSummary,
  fetchBudgetSummary,
  fetchWheelSummary,
} from "@/lib/clients";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const firstName = session?.user?.firstName ?? "";

  const [wheel, bookkeeping, budget, alerts] = await Promise.all([
    fetchWheelSummary(email),
    fetchBookkeepingSummary(email),
    fetchBudgetSummary(email),
    fetchAlertsSummary(email),
  ]);

  return (
    <DashboardView
      firstName={firstName}
      wheel={wheel.data}
      bookkeeping={bookkeeping.data}
      budget={budget.data}
      alerts={alerts.data}
      errors={{
        wheel: wheel.error,
        bookkeeping: bookkeeping.error,
        budget: budget.error,
        alerts: alerts.error,
      }}
    />
  );
}
