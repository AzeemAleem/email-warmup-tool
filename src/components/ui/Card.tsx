import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-gray-900 border border-gray-800 p-5",
        className
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
  color?: "green" | "amber" | "red" | "blue" | "indigo";
}

const colorMap = {
  green: "text-green-400",
  amber: "text-amber-400",
  red: "text-red-400",
  blue: "text-blue-400",
  indigo: "text-indigo-400",
};

export function StatCard({ label, value, sub, color = "indigo" }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={clsx("mt-1 text-3xl font-bold", colorMap[color])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </Card>
  );
}
