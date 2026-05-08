import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const tickers = await prisma.ticker.findMany({ orderBy: { symbol: "asc" } });
  return <AdminClient tickers={tickers} />;
}
