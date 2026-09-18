"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-gray-950 text-gray-100 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-gray-400">
            {/P1001|Can't reach database|Prisma/i.test(error.message || "")
              ? "Database connection failed. Check Vercel DATABASE_URL / DIRECT_URL (Supabase pooler)."
              : "A server error occurred. Check Vercel function logs for details."}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-600 font-mono">Digest: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded bg-indigo-600 text-sm hover:bg-indigo-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
