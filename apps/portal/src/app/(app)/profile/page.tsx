import { redirect } from "next/navigation";
import { authPrisma } from "@hlf/auth-db";
import { auth } from "@/server/auth/auth";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await authPrisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/sign-in");

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Updates here apply to every HLF app — wheel, bookkeeping, budget, alerts.
        </p>
      </header>

      <ProfileForm
        initial={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          bio: user.bio ?? "",
          avatarUrl: user.avatarUrl ?? "",
        }}
      />

      <PasswordForm />
    </div>
  );
}
