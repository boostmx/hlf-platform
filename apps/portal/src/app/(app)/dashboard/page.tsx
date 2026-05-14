import { auth } from "@/server/auth/auth";
import {
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

  const [wheel, bookkeeping, budget] = await Promise.all([
    fetchWheelSummary(email),
    fetchBookkeepingSummary(email),
    fetchBudgetSummary(email),
  ]);

  return (
    <DashboardView
      firstName={firstName}
      wheel={wheel.data}
      bookkeeping={bookkeeping.data}
      budget={budget.data}
      errors={{
        wheel: wheel.error,
        bookkeeping: bookkeeping.error,
        budget: budget.error,
      }}
    />
  );
}
