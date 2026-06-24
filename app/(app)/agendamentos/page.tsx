"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO, isToday, isThisWeek, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CalendarRange, CalendarCheck2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MetricCard } from "@/components/metrics/MetricCard";
import { appointmentsApi, getApiErrorMessage } from "@/lib/api";
import type { Appointment } from "@/types";

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    appointmentsApi
      .list()
      .then((data) => setAppointments(data ?? []))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "ALL" && a?.status !== statusFilter) return false;
      if (dateFilter && !a?.dateTime?.startsWith(dateFilter)) return false;
      return true;
    });
  }, [appointments, statusFilter, dateFilter]);

  const counts = useMemo(() => {
    const dates = appointments
      .map((a) => (a?.dateTime ? parseISO(a.dateTime) : null))
      .filter((d): d is Date => d !== null);
    return {
      today: dates.filter(isToday).length,
      week: dates.filter((d) => isThisWeek(d, { locale: ptBR })).length,
      month: dates.filter(isThisMonth).length,
    };
  }, [appointments]);

  function formatDateTime(value?: string) {
    if (!value) return "Data nao informada";
    try {
      return format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data invalida";
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Agendamentos" description="Consultas marcadas pela Lorena" />

      <div className="flex flex-col gap-6 p-8">
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Hoje" value={counts.today} icon={CalendarDays} accent="secondary" />
          <MetricCard title="Esta semana" value={counts.week} icon={CalendarRange} accent="primary" />
          <MetricCard title="Este mes" value={counts.month} icon={CalendarCheck2} accent="success" />
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
                  <div>
                    <p className="text-sm font-medium text-primary">{a?.patientName ?? "Paciente"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a?.dateTime)} - {a?.doctor ?? "Medico nao informado"}
                    </p>
                  </div>
                  <Badge
                    variant={a?.status === "CONFIRMED" ? "success" : a?.status === "CANCELLED" ? "danger" : "warning"}
                  >
                    {a?.status ?? "PENDING"}
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
