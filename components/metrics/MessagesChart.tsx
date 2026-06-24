"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessagesChartProps {
  data: { date: string; count: number }[];
}

export function MessagesChart({ data }: MessagesChartProps) {
  const formatted = (data ?? []).map((d) => {
    let label = "";
    try {
      label = d?.date ? format(parseISO(d.date), "dd/MM", { locale: ptBR }) : "";
    } catch {
      label = "";
    }
    return { ...d, label };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, borderColor: "#E2E5EA", fontSize: 13 }}
          labelStyle={{ color: "#1A2332", fontWeight: 600 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Mensagens"
          stroke="#FF6B00"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#FF6B00" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
