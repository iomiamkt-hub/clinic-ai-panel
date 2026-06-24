"use client";

import { useEffect, useMemo, useState } from "react";
import { List, LayoutGrid } from "lucide-react";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { ConversationDetail } from "@/components/conversations/ConversationDetail";
import { KanbanBoard } from "@/components/conversations/KanbanBoard";
import { Select } from "@/components/ui/select";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { FUNNEL_STAGES, getFunnelKey, type FunnelKey } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

type ViewMode = "list" | "kanban";

const VIEW_MODE_KEY = "conversas-view-mode";

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState<FunnelKey | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    if (stored === "list" || stored === "kanban") setViewMode(stored);
  }, []);

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

  const filtered = useMemo(
    () =>
      stageFilter === "ALL" ? conversations : conversations.filter((c) => getFunnelKey(c) === stageFilter),
    [conversations, stageFilter],
  );

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
            onClick={() => setStageFilter((prev) => (prev === stage.key ? "ALL" : stage.key))}
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
          onChange={(e) => setStageFilter(e.target.value as FunnelKey | "ALL")}
          className="w-56"
        >
          <option value="ALL">Todos</option>
          {FUNNEL_STAGES.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </Select>
      </div>

      {error && <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      {viewMode === "kanban" ? (
        loading ? (
          <div className="flex gap-3 overflow-x-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 w-[280px] min-w-[280px] animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <KanbanBoard conversations={filtered} onCardClick={(id) => setSelectedId(id)} />
        )
      ) : (
        <div className="flex flex-col gap-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
          ) : (
            filtered.map((c) => (
              <ConversationCard key={c?.id} conversation={c} onClick={() => setSelectedId(c?.id ?? null)} />
            ))
          )}
        </div>
      )}

      {selectedId && (
        <ConversationDetail conversationId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
