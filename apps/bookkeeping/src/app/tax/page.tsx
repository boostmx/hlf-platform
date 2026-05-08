import { redirect } from "next/navigation";

// Tax Estimate is now inside Records (/records?tab=tax)
export default function TaxPage() {
  redirect("/records?tab=tax");
}
