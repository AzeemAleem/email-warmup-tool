import { clsx } from "clsx";

type Status = "ACTIVE" | "PAUSED" | "ERROR" | "REMOVED" | "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "REPLIED" | "RESCUED_FROM_SPAM" | "FAILED" | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  PAUSED: { label: "Paused", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  ERROR: { label: "Error", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  REMOVED: { label: "Removed", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  QUEUED: { label: "Queued", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  SENT: { label: "Sent", className: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  DELIVERED: { label: "Delivered", className: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  OPENED: { label: "Opened", className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  REPLIED: { label: "Replied", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  RESCUED_FROM_SPAM: { label: "Rescued", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  FAILED: { label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
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
