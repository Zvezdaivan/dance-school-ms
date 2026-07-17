import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="card mx-auto mt-16 max-w-md text-center">
      <h1 className="text-xl font-bold text-gray-900">Access denied</h1>
      <p className="mt-2 text-sm text-gray-500">
        Your account does not have permission to view that page. Contact an administrator if you believe this is a
        mistake.
      </p>
      <Link href="/dashboard" className="btn btn-primary mt-5">
        Back to dashboard
      </Link>
    </div>
  );
}
