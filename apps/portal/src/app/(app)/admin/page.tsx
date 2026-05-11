import { redirect } from "next/navigation";
import { authPrisma } from "@hlf/auth-db";
import { auth } from "@/server/auth/auth";
import { AdminUsersTable } from "./admin-users";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  if (!session.user.isAdmin) redirect("/dashboard");

  const users = await authPrisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage HLF user identity. Changes here apply across every app.
        </p>
      </header>

      <AdminUsersTable
        currentUserId={session.user.id}
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
