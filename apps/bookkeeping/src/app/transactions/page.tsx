import { redirect } from "next/navigation";

// Transactions are now inside Records (/records?tab=transactions)
export default function TransactionsPage() {
  redirect("/records?tab=transactions");
}
