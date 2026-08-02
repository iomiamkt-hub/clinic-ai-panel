"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { List, LayoutGrid } from "lucide-react";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { KanbanBoard } from "@/components/conversations/KanbanBoard";
import { PatientProfilePanel } from "@/components/conversations/PatientProfilePanel";
import { Select } from "@/components/ui/select";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { FUNNEL_STAGES, STAGE_PATCH_VALUE, getFunnelKey, type FunnelKey } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

type ViewMode = "list" | "kanban";
type StageFilter = FunnelKey | "ALL" | "AI_PAUSED";

const VIEW_MODE_KEY = "conversas-view-mode";
const STAGE_FILTER_KEY = "conversas-stage-filter";

export function ConversationList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
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
    if (stageFilter === "ALL") return conversations;
    if (stageFilter === "AI_PAUSED") return conversations.filter((c) => c?.aiEnabled === false);
    return conversations.filter((c) => getFunnelKey(c) === stageFilter);
  }, [conversations, stageFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => changeViewMode("list")}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            viewMode === "list"
              ? "border-secondary bg-secondary text-white"
              : "border-border bg-white text-muted-foreground",
          )}
        >
          <List className="h-3.5 w-3.5" />
          Lista
        </button>
        <button
          onClick={() => changeViewMode("kanban")}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            viewMode === "kanban"
              ? "border-secondary bg-secondary text-white"
              : "border-border bg-white text-muted-foreground",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Kanban
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FUNNEL_STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => changeStageFilter(stageFilter === stage.key ? "ALL" : stage.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              stage.className,
              stageFilter === stage.key && "ring-2 ring-offset-1 ring-primary",
            )}
          >
            {stage.label}: {counts.get(stage.key) ?? 0}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={stageFilter}
          onChange={(e) => changeStageFilter(e.target.value as StageFilter)}
          className="w-56"
        >
          <option value="ALL">Todos</option>
          {FUNNEL_STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
          <option value="AI_PAUSED">IA pausada</option>
        </Select>
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
