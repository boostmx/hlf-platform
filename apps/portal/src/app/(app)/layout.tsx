import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/server/auth/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return <AppShell>{children}</AppShell>;
}
