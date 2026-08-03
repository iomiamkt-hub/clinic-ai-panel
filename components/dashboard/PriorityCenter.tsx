"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Priorities {
  urgent: {
    awaitingConfirmation: number;
    urgencies: number;
    escalated: number;
  };
  attention: {
    notResponded24h: number;
    pendingAppointments: number;
  };
  info: {
    waitingResponse: number;
    activeConversations: number;
  };
  routine: {
    completedToday: number;
  };
}

const EMPTY: Priorities = {
  urgent: { awaitingConfirmation: 0, urgencies: 0, escalated: 0 },
  attention: { notResponded24h: 0, pendingAppointments: 0 },
  info: { waitingResponse: 0, activeConversations: 0 },
  routine: { completedToday: 0 },
};

interface PriorityItem {
  emoji: string;
  count: number;
  label: string;
  href: string;
}

interface PriorityGroup {
  level: "urgent" | "attention" | "info" | "routine";
  title: string;
  items: PriorityItem[];
  bg: string;
  border: string;
  titleColor: string;
  dot: string;
}

function totalAttention(p: Priorities): number {
  return (
    p.urgent.awaitingConfirmation +
    p.urgent.urgencies +
    p.urgent.escalated +
    p.attention.notResponded24h +
    p.attention.pendingAppointments
  );
}

function PriorityCard({ group, loading }: { group: PriorityGroup; loading: boolean }) {
  const router = useRouter();

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border-l-4 p-4 shadow-sm", group.bg, group.border)}>
      <span className={cn("text-[10px] font-bold uppercase tracking-wide", group.titleColor)}>
        {group.title}
      </span>
      <div className="flex flex-col gap-1.5">
        {group.items.map((item, i) => (
          <button
            key={i}
            onClick={() => router.push(item.href)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-black/5"
          >
            <span className="text-base leading-none">{item.emoji}</span>
            <span className="text-2xl font-bold text-foreground">{item.count}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PriorityCenter() {
  const [data, setData] = useState<Priorities>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchPriorities() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metrics/priorities`);
      if (res.ok) {
        const json = await res.json();
        setData({
          urgent: {
            awaitingConfirmation: Number(json?.urgent?.awaitingConfirmation ?? 0),
            urgencies: Number(json?.urgent?.urgencies ?? 0),
            escalated: Number(json?.urgent?.escalated ?? 0),
          },
          attention: {
            notResponded24h: Number(json?.attention?.notResponded24h ?? 0),
            pendingAppointments: Number(json?.attention?.pendingAppointments ?? 0),
          },
          info: {
            waitingResponse: Number(json?.info?.waitingResponse ?? 0),
            activeConversations: Number(json?.info?.activeConversations ?? 0),
          },
          routine: {
            completedToday: Number(json?.routine?.completedToday ?? 0),
          },
        });
      }
    } catch {
      // keep EMPTY defaults
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }

  useEffect(() => {
    fetchPriorities();
    const interval = setInterval(fetchPriorities, 30_000);
    return () => clearInterval(interval);
  }, []);

  const groups: PriorityGroup[] = [
    {
      level: "urgent",
      title: "Urgente",
      bg: "bg-red-50",
      border: "border-red-500",
      titleColor: "text-red-600",
      dot: "bg-red-500",
      items: [
        {
          emoji: "🔴",
          count: data.urgent.awaitingConfirmation,
          label: "aguardando confirmação de agendamento",
          href: "/conversas?stage=CONFIRMING",
        },
        {
          emoji: "🔴",
          count: data.urgent.urgencies,
          label: "urgências precisam de intervenção humana",
          href: "/conversas?status=WAITING_HUMAN",
        },
        {
          emoji: "🔴",
          count: data.urgent.escalated,
          label: "escalados para atendimento humano",
          href: "/conversas?status=WAITING_HUMAN",
        },
      ],
    },
    {
      level: "attention",
      title: "Atenção",
      bg: "bg-yellow-50",
      border: "border-yellow-400",
      titleColor: "text-yellow-700",
      dot: "bg-yellow-400",
      items: [
        {
          emoji: "🟡",
          count: data.attention.notResponded24h,
          label: "pacientes sem resposta há mais de 24h",
          href: "/conversas?period=WEEK",
        },
        {
          emoji: "🟡",
          count: data.attention.pendingAppointments,
          label: "agendamentos pendentes de confirmação manual",
          href: "/agendamentos",
        },
      ],
    },
    {
      level: "info",
      title: "Informativo",
      bg: "bg-green-50",
      border: "border-green-500",
      titleColor: "text-green-700",
      dot: "bg-green-500",
      items: [
        {
          emoji: "🟢",
          count: data.info.waitingResponse,
          label: "pacientes aguardando retorno da clínica",
          href: "/conversas?status=ACTIVE",
        },
        {
          emoji: "🟢",
          count: data.info.activeConversations,
          label: "conversas ativas em andamento",
          href: "/conversas?status=ACTIVE",
        },
      ],
    },
    {
      level: "routine",
      title: "Rotina",
      bg: "bg-blue-50",
      border: "border-blue-400",
      titleColor: "text-blue-700",
      dot: "bg-blue-400",
      items: [
        {
          emoji: "🔵",
          count: data.routine.completedToday,
          label: "atendimentos encerrados hoje",
          href: "/conversas?status=COMPLETED",
        },
      ],
    },
  ];

  const attentionCount = totalAttention(data);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-primary">Centro de Prioridades</h2>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Carregando..."
              : attentionCount > 0
              ? `${attentionCount} ${attentionCount === 1 ? "item precisa" : "itens precisam"} de atenção agora`
              : "Tudo em dia — nenhuma ação urgente"}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchPriorities(); }}
          title="Atualizar"
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-3 w-3" />
          {lastFetch ? lastFetch.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <PriorityCard key={g.level} group={g} loading={loading} />
        ))}
      </div>
    </div>
  );
}
