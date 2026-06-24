"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { ConversationDetail } from "@/components/conversations/ConversationDetail";
import { Select } from "@/components/ui/select";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import type { Conversation, ConversationStatus } from "@/types";

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    conversationsApi
      .list()
      .then((data) => setConversations(data ?? []))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? conversations
        : conversations.filter((c) => c?.status === statusFilter),
    [conversations, statusFilter],
  );

  function handleStatusChanged(updated: Conversation) {
    setConversations((prev) => prev.map((c) => (c?.id === updated?.id ? updated : c)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ConversationStatus | "ALL")}
          className="w-56"
        >
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativa</option>
          <option value="WAITING_HUMAN">Aguardando humano</option>
          <option value="COMPLETED">Concluida</option>
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
        <ConversationDetail
          conversationId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChanged={handleStatusChanged}
        />
      )}
    </div>
  );
}
