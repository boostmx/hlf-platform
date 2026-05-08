import { auth } from "@/server/auth/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function ProtectedPage({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");

  // Personal app — admin accounts only
  if (!session.user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            This is a private application. Your account doesn&apos;t have access.
          </p>
        </div>
        <a
          href="/api/auth/signout?callbackUrl=/login"
          className="text-sm text-primary hover:underline"
        >
          Sign out
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
