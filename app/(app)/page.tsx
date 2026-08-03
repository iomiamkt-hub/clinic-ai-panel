"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, Bot, CalendarCheck, Clock, MessageSquare,
  RefreshCw, TrendingUp, Users,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

// ── Palette ───────────────────────────────────────────────────────────────────

const COLORS = ["#FF6B00", "#1A2332", "#22C55E", "#3B82F6", "#EAB308", "#EF4444", "#8B5CF6", "#EC4899"];

// ── Generic fetch with fallback ───────────────────────────────────────────────

async function apiFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

// Convert any API response shape into { name, value }[] for charts
function toChartArray(raw: unknown): { name: string; value: number }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const name = String(o.name ?? o.label ?? o.key ?? "");
        const value = Number(o.value ?? o.count ?? 0);
        return { name, value };
      }
      return { name: String(item), value: 0 };
    });
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([k, v]) => ({
      name: k,
      value: Number(v) || 0,
    }));
  }
  return [];
}

// Convert funnel: accepts array or object with known keys
function toFunnelArray(raw: unknown): { label: string; value: number }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return { label: String(o.label ?? o.name ?? ""), value: Number(o.value ?? o.count ?? 0) };
    });
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    // Known keys the backend might use
    const KEYS = [
      { k: "total",     label: "Leads iniciados" },
      { k: "responded", label: "Responderam" },
      { k: "chose",     label: "Escolheram horário" },
      { k: "confirmed", label: "Confirmaram" },
      { k: "booked",    label: "Agendados" },
    ];
    const mapped = KEYS.filter(({ k }) => k in o).map(({ k, label }) => ({
      label: String(o[`${k}Label`] ?? label),
      value: Number(o[k]) || 0,
    }));
    if (mapped.length) return mapped;
    // Fallback: treat every key as a step
    return Object.entries(o).map(([k, v]) => ({ label: k, value: Number(v) || 0 }));
  }
  return [];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  messagesToday: number;
  activeConversations: number;
  confirmedAppointments: number;
  escalatedToHuman: number;
  completedToday: number;
  waitingHumanToday: number;
  pendingAppointments: number;
  awaitingReturn: number;
  conversionRate: number;
  avgTimeToAppointment: number | null;
  messagesLast7Days: { date: string; count: number }[];
}

interface FunnelStep { label: string; value: number }
interface WaitingPatient { id: string; name: string; phone: string; waitingMin: number; lastMessage: string }
interface TimelineItem { time: string; event: string; detail?: string; patient?: string }
interface AiMetrics {
  completedNoHuman: number;
  escalated: number;
  autoCompletionRate: number;
  fieldsCollected: number;
  escalationReasons: { name: string; value: number }[];
  nextActions: { name: string; value: number }[];
  states: { name: string; value: number }[];
}
interface CommercialMetrics {
  byInsurance: { name: string; value: number }[];
  byUnit: { name: string; value: number }[];
  avgAiResponseMin: number | null;
  avgTimeToBookMin: number | null;
  avgFullAttendanceMin: number | null;
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, accent = "default", loading = false,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  accent?: "default" | "orange" | "green" | "red" | "blue" | "yellow";
  loading?: boolean;
}) {
  const accentCls: Record<string, string> = {
    default: "text-primary",
    orange: "text-secondary",
    green: "text-success",
    red: "text-danger",
    blue: "text-blue-600",
    yellow: "text-warning",
  };
  const iconBg: Record<string, string> = {
    default: "bg-primary/10",
    orange: "bg-secondary/10",
    green: "bg-success/10",
    red: "bg-danger/10",
    blue: "bg-blue-100",
    yellow: "bg-warning/10",
  };
  if (loading) return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", iconBg[accent])}>
            <Icon className={cn("h-4 w-4", accentCls[accent])} />
          </div>
        )}
      </div>
      <span className={cn("text-2xl font-bold", accentCls[accent])}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Skeleton({ h = 48 }: { h?: number }) {
  return <div className={`animate-pulse rounded-lg bg-muted`} style={{ height: h }} />;
}

function fmtMin(min: number | null | undefined): string {
  if (min == null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  return `${(min / 60).toFixed(1)} h`;
}

function fmtDate(ts: string): string {
  try { return format(parseISO(ts), "dd/MM", { locale: ptBR }); } catch { return ts; }
}

// ── Tab: Executivo ────────────────────────────────────────────────────────────

function TabExecutivo({ refresh }: { refresh: number }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, f] = await Promise.all([
      apiFetch<unknown>("/api/metrics/summary", {}),
      apiFetch<unknown>("/api/metrics/funnel", []),
    ]);
    const raw = (s ?? {}) as Record<string, unknown>;
    const days = Array.isArray(raw.messagesLast7Days) ? raw.messagesLast7Days as { date: string; count: number }[] : [];
    setSummary({
      messagesToday: Number(raw.messagesToday ?? 0),
      activeConversations: Number(raw.activeConversations ?? 0),
      confirmedAppointments: Number(raw.confirmedAppointments ?? 0),
      escalatedToHuman: Number(raw.escalatedToHuman ?? 0),
      completedToday: Number(raw.completedToday ?? 0),
      waitingHumanToday: Number(raw.waitingHumanToday ?? 0),
      pendingAppointments: Number(raw.pendingAppointments ?? 0),
      awaitingReturn: Number(raw.awaitingReturn ?? 0),
      conversionRate: Number(raw.conversionRate ?? 0),
      avgTimeToAppointment: raw.avgTimeToAppointment != null ? Number(raw.avgTimeToAppointment) : null,
      messagesLast7Days: days,
    });
    setFunnel(toFunnelArray(f));
    setLoading(false);
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load, refresh]);

  const chartData = (Array.isArray(summary?.messagesLast7Days) ? summary!.messagesLast7Days : []).map((d) => ({
    ...d, label: fmtDate(d.date),
  }));

  const maxFunnel = funnel[0]?.value || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs grandes */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard loading={loading} title="Pacientes atendidos hoje" value={summary?.messagesToday ?? 0} icon={Users} accent="blue" />
        <KpiCard loading={loading} title="Agendamentos realizados" value={summary?.confirmedAppointments ?? 0} icon={CalendarCheck} accent="green" />
        <KpiCard
          loading={loading}
          title="Taxa de conversão"
          value={`${(summary?.conversionRate ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
          accent="orange"
        />
        <KpiCard
          loading={loading}
          title="Tempo médio até agendamento"
          value={fmtMin(summary?.avgTimeToAppointment)}
          icon={Clock}
          accent="default"
        />
      </div>

      {/* KPIs menores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard loading={loading} title="Encerrados hoje" value={summary?.completedToday ?? 0} accent="green" />
        <KpiCard loading={loading} title="Transferidos p/ humano" value={summary?.waitingHumanToday ?? 0} accent="yellow" />
        <KpiCard loading={loading} title="Agendamentos pendentes" value={summary?.pendingAppointments ?? 0} accent="orange" />
        <KpiCard loading={loading} title="Aguardando retorno (+2h)" value={summary?.awaitingReturn ?? 0} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico de barras */}
        <SectionCard title="Mensagens por dia (últimos 7 dias)">
          {loading ? <Skeleton h={240} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Mensagens" fill="#FF6B00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Funil */}
        <SectionCard title="Funil de conversão">
          {loading ? <Skeleton h={240} /> : funnel.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Dados do funil não disponíveis.</p>
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              {funnel.map((step, i) => {
                const pct = Math.round((step.value / maxFunnel) * 100);
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{step.label}</span>
                      <span className="font-bold text-secondary">{step.value}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-secondary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ── Tab: Operacional ──────────────────────────────────────────────────────────

function TabOperacional({ refresh }: { refresh: number }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState<WaitingPatient[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [ops, setOps] = useState<{
    active: number; waitingReply: number; aiWaiting: number;
    urgencias: number; pendingAppt: number; escalated: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [w, t, o] = await Promise.all([
      apiFetch<unknown>("/api/metrics/waiting", []),
      apiFetch<unknown>("/api/metrics/timeline-today", []),
      apiFetch<unknown>("/api/metrics/summary", {}),
    ]);
    setWaiting(Array.isArray(w) ? w as WaitingPatient[] : []);
    setTimeline(Array.isArray(t) ? t as TimelineItem[] : []);
    const raw = (o ?? {}) as Record<string, unknown>;
    setOps({
      active: Number(raw.activeConversations ?? 0),
      waitingReply: Number(raw.waitingReply ?? 0),
      aiWaiting: Number(raw.aiWaiting ?? 0),
      urgencias: Number(raw.urgencias ?? 0),
      pendingAppt: Number(raw.pendingAppointments ?? 0),
      escalated: Number(raw.escalatedToHuman ?? 0),
    });
    setLoading(false);
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load, refresh]);

  return (
    <div className="flex flex-col gap-6">
      {/* Situação atual */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard loading={loading} title="Conversas em andamento" value={ops?.active ?? 0} icon={MessageSquare} accent="blue" />
        <KpiCard loading={loading} title="Aguardando resposta (+5 min)" value={ops?.waitingReply ?? 0} icon={Clock} accent="red" />
        <KpiCard loading={loading} title="IA aguardando paciente" value={ops?.aiWaiting ?? 0} icon={Bot} accent="default" />
        <KpiCard loading={loading} title="Urgências ativas" value={ops?.urgencias ?? 0} icon={AlertTriangle} accent="red" />
      </div>

      {/* Pendências */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard loading={loading} title="Agendamentos pendentes" value={ops?.pendingAppt ?? 0} icon={CalendarCheck} accent="yellow" />
        <KpiCard loading={loading} title="Conversas escaladas" value={ops?.escalated ?? 0} icon={Users} accent="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lista de espera */}
        <SectionCard title="Pacientes aguardando resposta">
          {loading ? <Skeleton h={200} /> : waiting.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum paciente aguardando no momento.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {waiting.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-primary">{p.name || p.phone}</span>
                    <span className="truncate text-xs text-muted-foreground">&ldquo;{p.lastMessage}&rdquo;</span>
                    <span className={cn(
                      "text-[10px] font-semibold",
                      p.waitingMin > 30 ? "text-danger" : p.waitingMin > 10 ? "text-warning" : "text-muted-foreground",
                    )}>
                      ⏱ {p.waitingMin} min esperando
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/conversas/${p.id}`)}
                    className="shrink-0 rounded-lg border border-secondary px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/5"
                  >
                    Abrir
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Linha do tempo do dia */}
        <SectionCard title="Linha do tempo de hoje">
          {loading ? <Skeleton h={200} /> : timeline.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum evento registrado hoje.</p>
          ) : (
            <ol className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
              {timeline.slice(0, 20).map((ev, i) => (
                <li key={i} className="flex gap-3 text-xs">
                  <span className="shrink-0 font-semibold text-muted-foreground">{ev.time}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{ev.event}</span>
                    {ev.patient && <span className="text-muted-foreground">{ev.patient}</span>}
                    {ev.detail && <span className="text-muted-foreground/70">{ev.detail}</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ── Tab: IA ───────────────────────────────────────────────────────────────────

function TabIA({ refresh }: { refresh: number }) {
  const [ai, setAi] = useState<AiMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [summary, reasons, engine, states] = await Promise.all([
      apiFetch<unknown>("/api/metrics/summary", {}),
      apiFetch<unknown>("/api/metrics/escalation-reasons", []),
      apiFetch<unknown>("/api/metrics/decision-engine", []),
      apiFetch<unknown>("/api/metrics/states", []),
    ]);
    const raw = (summary ?? {}) as Record<string, unknown>;
    // decision-engine may return { actions: {…}, states: {…} } or a flat array
    let actionsRaw: unknown = engine;
    let statesRaw: unknown = states;
    if (engine && !Array.isArray(engine) && typeof engine === "object") {
      const eng = engine as Record<string, unknown>;
      if (eng.actions) actionsRaw = eng.actions;
      if (eng.states) statesRaw = eng.states;
    }
    setAi({
      completedNoHuman: Number(raw.completedNoHuman ?? 0),
      escalated: Number(raw.escalatedToHuman ?? 0),
      autoCompletionRate: Number(raw.autoCompletionRate ?? 0),
      fieldsCollected: Number(raw.fieldsCollected ?? 0),
      escalationReasons: toChartArray(reasons),
      nextActions: toChartArray(actionsRaw),
      states: toChartArray(statesRaw),
    });
    setLoading(false);
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load, refresh]);

  const ACTION_LABELS: Record<string, string> = {
    ASK_FIELD: "Perguntar campo",
    CHECK_AVAILABILITY: "Consultar agenda",
    BOOK_APPOINTMENT: "Registrar agendamento",
    ESCALATE_HUMAN: "Escalar p/ humano",
  };

  const STATE_LABELS: Record<string, string> = {
    QUALIFYING: "Qualificando",
    CHECKING_AVAILABILITY: "Verificando agenda",
    CONFIRMING: "Confirmando",
    COMPLETED: "Concluído",
    ESCALATED: "Escalado",
    GREETING: "Saudação",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard loading={loading} title="Concluídos sem humano" value={ai?.completedNoHuman ?? 0} icon={Bot} accent="green" />
        <KpiCard loading={loading} title="Escalados para humano" value={ai?.escalated ?? 0} icon={Users} accent="red" />
        <KpiCard loading={loading} title="Taxa de conclusão automática" value={`${(ai?.autoCompletionRate ?? 0).toFixed(1)}%`} icon={TrendingUp} accent="orange" />
        <KpiCard loading={loading} title="Campos coletados automaticamente" value={ai?.fieldsCollected ?? 0} icon={MessageSquare} accent="blue" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pizza motivos de escalada */}
        <SectionCard title="Motivos de escalada">
          {loading ? <Skeleton h={240} /> : (ai?.escalationReasons ?? []).length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Dados não disponíveis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={ai!.escalationReasons} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {ai!.escalationReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Próximas ações */}
        <SectionCard title="Motor de decisão — ações mais executadas">
          {loading ? <Skeleton h={240} /> : (ai?.nextActions ?? []).length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Dados não disponíveis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ai!.nextActions.map((a) => ({ ...a, name: ACTION_LABELS[a.name] ?? a.name }))} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                <Tooltip />
                <Bar dataKey="value" name="Execuções" fill="#1A2332" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Estados dos pacientes */}
      <SectionCard title="Estado atual dos pacientes">
        {loading ? <Skeleton h={60} /> : (ai?.states ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Dados não disponíveis.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {ai!.states.map((s) => (
              <div key={s.name} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <span className="text-lg font-bold text-primary">{s.value}</span>
                <span className="text-xs text-muted-foreground">{STATE_LABELS[s.name] ?? s.name}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ── Tab: Comercial ────────────────────────────────────────────────────────────

function TabComercial({ refresh }: { refresh: number }) {
  const [com, setCom] = useState<CommercialMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [ins, unit, summary] = await Promise.all([
      apiFetch<unknown>("/api/metrics/by-insurance", []),
      apiFetch<unknown>("/api/metrics/by-unit", []),
      apiFetch<unknown>("/api/metrics/summary", {}),
    ]);
    const raw = (summary ?? {}) as Record<string, unknown>;
    setCom({
      byInsurance: toChartArray(ins),
      byUnit: toChartArray(unit),
      avgAiResponseMin: raw.avgAiResponseMin != null ? Number(raw.avgAiResponseMin) : null,
      avgTimeToBookMin: raw.avgTimeToBookMin != null ? Number(raw.avgTimeToBookMin) : null,
      avgFullAttendanceMin: raw.avgFullAttendanceMin != null ? Number(raw.avgFullAttendanceMin) : null,
    });
    setLoading(false);
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load, refresh]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tempos médios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard loading={loading} title="Tempo médio resposta da IA" value={fmtMin(com?.avgAiResponseMin)} icon={Bot} accent="blue" />
        <KpiCard loading={loading} title="Tempo médio até agendamento" value={fmtMin(com?.avgTimeToBookMin)} icon={CalendarCheck} accent="green" />
        <KpiCard loading={loading} title="Tempo médio atendimento completo" value={fmtMin(com?.avgFullAttendanceMin)} icon={Clock} accent="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribuição por convênio */}
        <SectionCard title="Distribuição por convênio">
          {loading ? <Skeleton h={260} /> : (com?.byInsurance ?? []).length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Dados não disponíveis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={com!.byInsurance} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                  {com!.byInsurance.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Distribuição por unidade */}
        <SectionCard title="Distribuição por unidade">
          {loading ? <Skeleton h={260} /> : (com?.byUnit ?? []).length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Dados não disponíveis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={com!.byUnit} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Pacientes" radius={[4, 4, 0, 0]}>
                  {com!.byUnit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type TabKey = "executivo" | "operacional" | "ia" | "comercial";

const TABS: { key: TabKey; label: string }[] = [
  { key: "executivo", label: "Executivo" },
  { key: "operacional", label: "Operacional" },
  { key: "ia", label: "IA" },
  { key: "comercial", label: "Comercial" },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("executivo");
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Auto-refresh every 60 s
  useEffect(() => {
    setLastUpdated(format(new Date(), "HH:mm", { locale: ptBR }));
    const interval = setInterval(() => {
      setRefreshTick((t) => t + 1);
      setLastUpdated(format(new Date(), "HH:mm", { locale: ptBR }));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  function manualRefresh() {
    setRefreshTick((t) => t + 1);
    setLastUpdated(format(new Date(), "HH:mm", { locale: ptBR }));
  }

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" description="Visão geral do atendimento da clínica" />

      <div className="flex flex-col gap-6 p-6">
        {/* Tab bar + timestamp */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-primary",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">Atualizado às {lastUpdated}</span>
            )}
            <button
              onClick={manualRefresh}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "executivo"   && <TabExecutivo   refresh={refreshTick} />}
        {activeTab === "operacional" && <TabOperacional refresh={refreshTick} />}
        {activeTab === "ia"          && <TabIA          refresh={refreshTick} />}
        {activeTab === "comercial"   && <TabComercial   refresh={refreshTick} />}
      </div>
    </div>
  );
}
