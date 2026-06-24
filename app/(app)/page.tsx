"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Users, CalendarCheck, AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/metrics/MetricCard";
import { MessagesChart } from "@/components/metrics/MessagesChart";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { metricsApi, getApiErrorMessage } from "@/lib/api";
import type { MetricsSummary } from "@/types";

export default function DashboardPage() {
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    metricsApi
      .getSummary()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" description="Visao geral do atendimento da clinica" />

      <div className="flex flex-col gap-6 p-8">
        {error && (
          <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Mensagens hoje" value={data?.messagesToday ?? 0} icon={MessageSquare} accent="secondary" />
            <MetricCard title="Conversas ativas" value={data?.activeConversations ?? 0} icon={Users} accent="primary" />
            <MetricCard title="Agendamentos confirmados" value={data?.confirmedAppointments ?? 0} icon={CalendarCheck} accent="success" />
            <MetricCard title="Escaladas para humano" value={data?.escalatedToHuman ?? 0} icon={AlertTriangle} accent="warning" />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Volume de mensagens (ultimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[280px] animate-pulse rounded-md bg-muted" />
            ) : (
              <MessagesChart data={data?.messagesLast7Days ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ultimas conversas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))
            ) : data?.recentConversations.length ? (
              data.recentConversations.map((c) => <ConversationCard key={c.id} conversation={c} />)
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
