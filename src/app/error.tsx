"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = error.message || "";
  const isDb =
    /P1001|P1012|Can't reach database|PrismaClient|database server/i.test(msg);

  return (
    <div className="max-w-lg mx-auto mt-16 space-y-4 text-center">
      <h1 className="text-xl font-semibold text-white">Page failed to load</h1>
      <p className="text-sm text-gray-400">
        {isDb
          ? "Cannot reach the database. On Vercel, set DATABASE_URL to the Supabase Transaction pooler (port 6543 + pgbouncer=true) and DIRECT_URL to the Session pooler (port 5432), then redeploy."
          : "An unexpected server error occurred. Open Vercel → Deployments → Logs for the full stack trace."}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-600 font-mono">Digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded bg-indigo-600 text-sm text-white hover:bg-indigo-500"
      >
        Try again
      </button>
    </div>
  );
}
