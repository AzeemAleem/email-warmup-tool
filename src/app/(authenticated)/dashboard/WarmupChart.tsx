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
          <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#666666", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#333333" }}
          />
          <YAxis
            tick={{ fill: "#666666", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#333333" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1A1A1A",
              border: "1px solid #333333",
              borderRadius: "8px",
              color: "#E5E5E5",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#B0B0B0" }}
          />
          <Line type="monotone" dataKey="sent" stroke="#C9A96E" strokeWidth={2} dot={false} name="Sent" />
          <Line type="monotone" dataKey="opened" stroke="#C0C0C0" strokeWidth={2} dot={false} name="Opened" />
          <Line type="monotone" dataKey="replied" stroke="#1A3A2F" strokeWidth={2} dot={false} name="Replied" />
          <Line type="monotone" dataKey="rescued" stroke="#B76E79" strokeWidth={2} dot={false} name="Rescued" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
