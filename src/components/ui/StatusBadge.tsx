import { clsx } from "clsx";

type Status = "ACTIVE" | "PAUSED" | "ERROR" | "REMOVED" | "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "REPLIED" | "RESCUED_FROM_SPAM" | "FAILED" | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-500/15 text-green-800 border-green-600/30 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30" },
  PAUSED: { label: "Paused", className: "bg-amber-500/15 text-amber-800 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30" },
  ERROR: { label: "Error", className: "bg-red-500/15 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30" },
  REMOVED: { label: "Removed", className: "bg-gray-500/15 text-gray-500 border-gray-500/30" },
  QUEUED: { label: "Queued", className: "bg-pacify-navy/10 text-pacify-navy border-pacify-navy/20 dark:bg-pacify-navy/40 dark:text-pacify-silver dark:border-pacify-navy/50" },
  SENT: { label: "Sent", className: "bg-pacify-gold/15 text-pacify-gold border-pacify-gold/30" },
  DELIVERED: { label: "Delivered", className: "bg-pacify-forest/10 text-pacify-forest border-pacify-forest/20 dark:bg-pacify-forest/40 dark:text-pacify-gold dark:border-pacify-forest/50" },
  OPENED: { label: "Opened", className: "bg-pacify-silver/20 text-gray-600 border-gray-400/40 dark:bg-pacify-silver/15 dark:text-pacify-silver dark:border-pacify-silver/30" },
  REPLIED: { label: "Replied", className: "bg-green-500/15 text-green-800 border-green-600/30 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30" },
  RESCUED_FROM_SPAM: { label: "Rescued", className: "bg-orange-500/15 text-orange-800 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30" },
  FAILED: { label: "Failed", className: "bg-red-500/15 text-red-700 border-red-500/30 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-500/15 text-gray-500 border-gray-500/30",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
