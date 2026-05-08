import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { BookkeepingDashboard } from "@/features/bookkeeping/components/BookkeepingDashboard";

export const metadata = { title: "Dashboard — HLF Bookkeeping" };

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <BookkeepingDashboard />
    </ProtectedPage>
  );
}
