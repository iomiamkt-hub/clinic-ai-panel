"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarRange, CalendarCheck2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MetricCard } from "@/components/metrics/MetricCard";
import { appointmentsApi, getApiErrorMessage } from "@/lib/api";

// ── API shape from GET /api/appointments ──────────────────────────────────────

interface ApiAppointment {
  id: string;
  scheduledAt: string | null;
  doctorName: string | null;
  status: string;
  notes: string | null;
  patient?: {
    id?: string;
    name?: string | null;
    phone?: string;
  } | null;
  // legacy fields (keep reading them as fallback)
  patientName?: string | null;
  dateTime?: string | null;
  doctor?: string | null;
}

// ── Date helpers (São Paulo timezone) ────────────────────────────────────────

function toSaoPauloMidnight(date: Date): Date {
  // Get the date string in SP timezone, then parse as local midnight
  const spStr = date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const [day, month, year] = spStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function isTodaySP(date: Date): boolean {
  const now = new Date();
  const d = toSaoPauloMidnight(date);
  const today = toSaoPauloMidnight(now);
  return d.getTime() === today.getTime();
}

function isThisWeekSP(date: Date): boolean {
  const now = new Date();
  const d = toSaoPauloMidnight(date);
  const today = toSaoPauloMidnight(now);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return d >= weekStart && d <= weekEnd;
}

function isThisMonthSP(date: Date): boolean {
  const now = new Date();
  const d = toSaoPauloMidnight(date);
  const firstOfMonth = toSaoPauloMidnight(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastOfMonth = toSaoPauloMidnight(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return d >= firstOfMonth && d <= lastOfMonth;
}

// ── Display helpers ───────────────────────────────────────────────────────────

function formatDateTime(scheduledAt: string | null | undefined, dateTime: string | null | undefined): string {
  const raw = scheduledAt ?? dateTime;
  if (!raw) return "Data não informada";
  try {
    return new Date(raw).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Data inválida";
  }
}

function getPatientName(a: ApiAppointment): string {
  return a.patient?.name ?? a.patient?.phone ?? a.patientName ?? "Paciente";
}

function getDoctorName(a: ApiAppointment): string {
  return a.doctorName ?? a.doctor ?? "Dra. Bruna Gomide";
}

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED:  "Confirmado",
  PENDING:    "Pendente",
  CANCELLED:  "Cancelado",
  COMPLETED:  "Concluído",
};

function statusLabel(s?: string | null): string {
  return STATUS_LABELS[s ?? ""] ?? (s ?? "Pendente");
}

function statusVariant(s?: string | null): "success" | "warning" | "danger" | "default" {
  if (s === "CONFIRMED" || s === "COMPLETED") return "success";
  if (s === "CANCELLED") return "danger";
  return "warning";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    appointmentsApi
      .list()
      .then((data) => {
        const list = (data ?? []) as ApiAppointment[];
        console.log("Appointments data:", JSON.stringify(list?.slice(0, 2), null, 2));
        setAppointments(list);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    let today = 0, week = 0, month = 0;
    for (const a of appointments) {
      const raw = a?.scheduledAt ?? a?.dateTime;
      if (!raw) continue;
      try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) continue;
        if (isTodaySP(d)) today++;
        if (isThisWeekSP(d)) week++;
        if (isThisMonthSP(d)) month++;
      } catch {
        // skip unparseable
      }
    }
    return { today, week, month };
  }, [appointments]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "ALL" && a?.status !== statusFilter) return false;
      if (dateFilter) {
        const raw = a?.scheduledAt ?? a?.dateTime;
        if (!raw) return false;
        // Compare the SP-timezone date string against the filter (YYYY-MM-DD)
        const spDate = new Date(raw).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
        if (spDate !== dateFilter) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, dateFilter]);

  return (
    <div className="flex flex-col">
      <Header title="Agendamentos" description="Consultas marcadas pela Lorena" />

      <div className="flex flex-col gap-6 p-8">
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Hoje" value={counts.today} icon={CalendarDays} accent="secondary" />
          <MetricCard title="Esta semana" value={counts.week} icon={CalendarRange} accent="primary" />
          <MetricCard title="Este mês" value={counts.month} icon={CalendarCheck2} accent="success" />
        </div>

        <div className="flex items-center gap-3">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-48" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-56">
            <option value="ALL">Todos os status</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="PENDING">Pendente</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
        </div>

        {error && <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
            ) : (
              filtered.map((a) => (
                <div key={a?.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-primary">{getPatientName(a)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a?.scheduledAt, a?.dateTime)}
                      {" · "}
                      {getDoctorName(a)}
                    </p>
                    {a?.notes && (
                      <p className="text-[11px] text-muted-foreground/70 italic">{a.notes}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant(a?.status)}>
                    {statusLabel(a?.status)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
