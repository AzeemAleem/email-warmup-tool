"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { Card } from "@/components/ui/Card";

interface EventPoint {
  scheduledFor: Date;
  status: string;
}

interface ChartDataPoint {
  date: string;
  sent: number;
  opened: number;
  replied: number;
  rescued: number;
}

interface WarmupChartProps {
  events: EventPoint[];
}

export function WarmupChart({ events }: WarmupChartProps) {
  // Build 14-day aggregation
  const now = new Date();
  const days: ChartDataPoint[] = [];

  for (let i = 13; i >= 0; i--) {
    const day = startOfDay(subDays(now, i));
    const dayStr = format(day, "MMM d");
    const dayStart = day.getTime();
    const dayEnd = dayStart + 86400000;

    const dayEvents = events.filter((e) => {
      const t = new Date(e.scheduledFor).getTime();
      return t >= dayStart && t < dayEnd;
    });

    days.push({
      date: dayStr,
      sent: dayEvents.filter((e) => ["SENT", "OPENED", "REPLIED", "RESCUED_FROM_SPAM"].includes(e.status)).length,
      opened: dayEvents.filter((e) => ["OPENED", "REPLIED"].includes(e.status)).length,
      replied: dayEvents.filter((e) => e.status === "REPLIED").length,
      rescued: dayEvents.filter((e) => e.status === "RESCUED_FROM_SPAM").length,
    });
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-white mb-4">
        Activity — Last 14 Days
      </h2>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={days} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#1f2937" }}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#1f2937" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#e5e7eb",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }}
          />
          <Line type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={2} dot={false} name="Sent" />
          <Line type="monotone" dataKey="opened" stroke="#06b6d4" strokeWidth={2} dot={false} name="Opened" />
          <Line type="monotone" dataKey="replied" stroke="#22c55e" strokeWidth={2} dot={false} name="Replied" />
          <Line type="monotone" dataKey="rescued" stroke="#f59e0b" strokeWidth={2} dot={false} name="Rescued" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
