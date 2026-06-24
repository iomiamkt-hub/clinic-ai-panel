"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { ConversationDetail } from "@/components/conversations/ConversationDetail";
import { Select } from "@/components/ui/select";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { FUNNEL_STAGES, getFunnelKey, type FunnelKey } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState<FunnelKey | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    conversationsApi
      .list()
      .then((data) => setConversations(data ?? []))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
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

      {selectedId && (
        <ConversationDetail conversationId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
