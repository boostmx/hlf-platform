import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import prisma from "@/server/prisma";
import { redirect } from "next/navigation";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) redirect("/dashboard");

  const tickers = await prisma.ticker.findMany({ orderBy: { symbol: "asc" } });
  return <AdminClient tickers={tickers} />;
}
