import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { SettingsContent } from "@/features/bookkeeping/components/SettingsContent";

export const metadata = { title: "Settings — HLF Bookkeeping" };

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <SettingsContent />
    </ProtectedPage>
  );
}
