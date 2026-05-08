import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <Link href="/dashboard" className="text-primary hover:underline">
        Back to Dashboard
      </Link>
    </div>
  );
}
