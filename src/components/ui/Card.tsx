import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-surface border border-gray-700 p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color?: "green" | "amber" | "red" | "blue" | "indigo" | "gold";
}

const colorMap = {
  green: "text-emerald-700 dark:text-emerald-400",
  amber: "text-amber-700 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  blue: "text-pacify-navy dark:text-sky-400",
  indigo: "text-pacify-gold",
  gold: "text-pacify-gold",
};

export function StatCard({
  label,
  value,
  sub,
  color = "gold",
}: StatCardProps) {
  return (
    <Card>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={clsx("mt-1 text-3xl font-bold", colorMap[color])}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}
