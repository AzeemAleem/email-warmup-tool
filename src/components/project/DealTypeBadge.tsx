import { clsx } from "clsx";

export function DealTypeBadge({
  dealType,
  size = "sm",
}: {
  dealType: string;
  size?: "sm" | "md";
}) {
  const won = dealType === "WON";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        won
          ? "bg-emerald-500/15 text-emerald-800 border-emerald-600/30 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-600/50"
          : "bg-amber-500/15 text-amber-800 border-amber-600/30 dark:bg-amber-900/30 dark:text-amber-300/90 dark:border-amber-700/40",
      )}
      title={won ? "Order confirmed / won" : "Quotation only"}
    >
      {won ? "Won" : "Quotation"}
    </span>
  );
}

/** Client-level badge derived from their projects */
export function ClientDealBadge({
  hasWon,
}: {
  hasWon: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        hasWon
          ? "bg-emerald-500/15 text-emerald-800 border-emerald-600/30 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-600/50"
          : "bg-amber-500/15 text-amber-800 border-amber-600/30 dark:bg-amber-900/30 dark:text-amber-300/90 dark:border-amber-700/40",
      )}
      title={
        hasWon
          ? "Has at least one confirmed / won order"
          : "Quotation-only (no won orders yet)"
      }
    >
      {hasWon ? "Customer" : "Prospect"}
    </span>
  );
}
