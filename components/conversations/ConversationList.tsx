"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { List, LayoutGrid, Search } from "lucide-react";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { KanbanBoard } from "@/components/conversations/KanbanBoard";
import { PatientProfilePanel } from "@/components/conversations/PatientProfilePanel";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { FUNNEL_STAGES, STAGE_PATCH_VALUE, getFunnelKey, type FunnelKey } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

type ViewMode = "list" | "kanban";
type StageFilter = FunnelKey | "ALL" | "AI_PAUSED";
type StatusFilter = "ALL" | "ACTIVE" | "WAITING_HUMAN" | "COMPLETED";
type PeriodFilter = "ALL" | "TODAY" | "WEEK" | "MONTH";

const VIEW_MODE_KEY = "conversas-view-mode";
const STAGE_FILTER_KEY = "conversas-stage-filter";

function isToday(dateStr?: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isThisWeek(dateStr?: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  return d >= weekAgo;
}

function isThisMonth(dateStr?: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function ConversationList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    const storedView = window.localStorage.getItem(VIEW_MODE_KEY);
    if (storedView === "list" || storedView === "kanban") setViewMode(storedView);
    const storedStage = window.localStorage.getItem(STAGE_FILTER_KEY);
    if (storedStage) setStageFilter(storedStage as StageFilter);
  }, []);

  function changeStageFilter(value: StageFilter) {
    setStageFilter(value);
    window.localStorage.setItem(STAGE_FILTER_KEY, value);
  }

  function openConversation(id?: string | null) {
    if (!id) return;
    router.push(`/conversas/${id}`);
  }

  function openKanbanProfile(id?: string | null) {
    if (!id) return;
    const conv = conversations.find((c) => c?.id === id) ?? null;
    setSelectedConversation(conv);
  }

  function showToast(message: string, variant: "success" | "error" = "success") {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleMoveCard(conversationId: string, newStageKey: FunnelKey) {
    const current = conversations.find((c) => c?.id === conversationId);
    if (!current) return;
    const currentKey = getFunnelKey(current);
    if (currentKey === newStageKey) return;

    const previousStage = current.stage;
    const previousStatus = current.status;
    const stageValue = STAGE_PATCH_VALUE[newStageKey];
    const targetLabel = FUNNEL_STAGES.find((s) => s.key === newStageKey)?.label ?? newStageKey;

    setConversations((prev) =>
      prev.map((c) =>
        c?.id === conversationId
          ? {
              ...c,
              stage: stageValue as Conversation["stage"],
              status: newStageKey === "WAITING_HUMAN" ? "WAITING_HUMAN" : c.status === "WAITING_HUMAN" ? "ACTIVE" : c.status,
            }
          : c,
      ),
    );

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}/stage`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: stageValue }),
        },
      );
      if (!response.ok) throw new Error("Falha ao mover o card");
      const body = await response.json().catch(() => ({}));
      if (body?.aiPausedAutomatically === true) {
        setConversations((prev) =>
          prev.map((c) => (c?.id === conversationId ? { ...c, aiEnabled: false } : c)),
        );
        showToast(`Lead movido para ${targetLabel}. IA pausada automaticamente.`, "success");
      } else {
        showToast(`Lead movido para ${targetLabel}`, "success");
      }
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c?.id === conversationId ? { ...c, stage: previousStage, status: previousStatus } : c,
        ),
      );
      showToast("Nao foi possivel mover o lead. Tente novamente.", "error");
    }
  }

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  function fetchConversations() {
    return conversationsApi
      .list()
      .then((data) => setConversations(data ?? []))
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const counts = useMemo(() => {
    const map = new Map<FunnelKey, number>(FUNNEL_STAGES.map((s) => [s.key, 0]));
    for (const c of conversations) {
      const key = getFunnelKey(c);
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [conversations]);

  const filtered = useMemo(() => {
    let list = conversations;
    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const name = (c?.patient?.name ?? "").toLowerCase();
        const phone = (c?.patient?.phone ?? "").replace(/\D/g, "");
        return name.includes(q) || phone.includes(q.replace(/\D/g, ""));
      });
    }
    // stage
    if (stageFilter === "AI_PAUSED") list = list.filter((c) => c?.aiEnabled === false);
    else if (stageFilter !== "ALL") list = list.filter((c) => getFunnelKey(c) === stageFilter);
    // status
    if (statusFilter !== "ALL") list = list.filter((c) => c?.status === statusFilter);
    // period
    if (periodFilter === "TODAY") list = list.filter((c) => isToday(c?.updatedAt ?? c?.createdAt));
    else if (periodFilter === "WEEK") list = list.filter((c) => isThisWeek(c?.updatedAt ?? c?.createdAt));
    else if (periodFilter === "MONTH") list = list.filter((c) => isThisMonth(c?.updatedAt ?? c?.createdAt));
    return list;
  }, [conversations, stageFilter, statusFilter, periodFilter, searchQuery]);

  const summaryActive = conversations.filter((c) => c?.status === "ACTIVE").length;
  const summaryBooked = conversations.filter((c) => c?.stage === "COMPLETED").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header row 1: title + summary */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Conversas</h1>
          <p className="text-xs text-muted-foreground">
            {conversations.length} leads · {summaryActive} ativos · {summaryBooked} agendados
          </p>
        </div>
        {/* View toggle */}
        <div className="flex gap-1 rounded-lg border border-border bg-white p-1">
          <button
            onClick={() => changeViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "list" ? "bg-secondary text-white" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
          <button
            onClick={() => changeViewMode("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "kanban" ? "bg-secondary text-white" : "text-muted-foreground hover:bg-muted",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>
      </div>

      {/* Header row 2: filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nome ou telefone..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Status */}
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="h-8 w-44 text-xs">
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="WAITING_HUMAN">Aguardando secretária</option>
          <option value="COMPLETED">Concluído</option>
        </Select>

        {/* Stage */}
        <Select value={stageFilter} onChange={(e) => changeStageFilter(e.target.value as StageFilter)} className="h-8 w-44 text-xs">
          <option value="ALL">Todas as etapas</option>
          {FUNNEL_STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
          <option value="AI_PAUSED">IA pausada</option>
        </Select>

        {/* Period */}
        <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)} className="h-8 w-36 text-xs">
          <option value="ALL">Todo período</option>
          <option value="TODAY">Hoje</option>
          <option value="WEEK">Esta semana</option>
          <option value="MONTH">Este mês</option>
        </Select>

        {/* Count chip */}
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="flex min-h-0 flex-1 gap-0">
        <div className="flex min-w-0 flex-1 flex-col">
          {viewMode === "kanban" ? (
            loading ? (
              <div className="flex gap-3 overflow-x-auto">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-64 w-[280px] min-w-[280px] animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <KanbanBoard
                conversations={filtered}
                onCardClick={(id) => openKanbanProfile(id)}
                onMoveCard={handleMoveCard}
              />
            )
          ) : (
            <div className="flex flex-col gap-2">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
              ) : (
                filtered.map((c) => (
                  <ConversationCard key={c?.id} conversation={c} onClick={() => openConversation(c?.id)} />
                ))
              )}
            </div>
          )}
        </div>

        {selectedConversation && (
          <PatientProfilePanel
            conversation={selectedConversation}
            onClose={() => setSelectedConversation(null)}
            onConversationUpdate={(updated) => {
              setConversations((prev) => prev.map((c) => (c?.id === updated.id ? updated : c)));
              setSelectedConversation(updated);
            }}
          />
        )}
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-xs font-medium text-white shadow-lg",
            toast.variant === "success" ? "bg-primary" : "bg-danger",
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
