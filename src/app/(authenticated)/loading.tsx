export default function AuthenticatedLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-gray-800" />
        <div className="h-4 w-72 max-w-full rounded-md bg-gray-800/70" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-700 bg-surface p-5 space-y-3"
          >
            <div className="h-3 w-20 rounded bg-gray-800" />
            <div className="h-8 w-16 rounded bg-gray-800" />
            <div className="h-3 w-28 rounded bg-gray-800/70" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-700 bg-surface p-5 space-y-4">
        <div className="h-4 w-40 rounded bg-gray-800" />
        <div className="h-40 w-full rounded-lg bg-gray-800/50" />
      </div>
    </div>
  );
}
