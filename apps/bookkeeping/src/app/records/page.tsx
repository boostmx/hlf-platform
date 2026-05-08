import { Suspense } from "react";
import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { RecordsPageContent } from "@/features/bookkeeping/components/RecordsPageContent";

export const metadata = { title: "Records — HLF Bookkeeping" };

export default function RecordsPage() {
  return (
    <ProtectedPage>
      <Suspense>
        <RecordsPageContent />
      </Suspense>
    </ProtectedPage>
  );
}
