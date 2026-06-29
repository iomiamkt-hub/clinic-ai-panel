import { useMemo, useState } from "react";
import { KanbanCard } from "@/components/conversations/KanbanCard";
import { FUNNEL_STAGES, getFunnelKey, getWaitingMinutes, type FunnelKey } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface KanbanBoardProps {
  conversations: Conversation[];
  onCardClick: (id: string) => void;
  onMoveCard: (conversationId: string, newStageKey: FunnelKey) => void;
}

export function KanbanBoard({ conversations, onCardClick, onMoveCard }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<FunnelKey | null>(null);

  const columns = useMemo(() => {
    return FUNNEL_STAGES.map((stage) => {
      const items = conversations.filter((c) => getFunnelKey(c) === stage.key);
      items.sort((a, b) => {
        const waitA = getWaitingMinutes(a) ?? -1;
        const waitB = getWaitingMinutes(b) ?? -1;
        if (waitA !== waitB) return waitB - waitA;
        return new Date(b?.updatedAt ?? 0).getTime() - new Date(a?.updatedAt ?? 0).getTime();
      });
      return { ...stage, items };
    });
  }, [conversations]);

  return (
    <div className="flex h-[calc(100vh-220px)] gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        <div
          key={column.key}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverColumn(column.key);
          }}
          onDragLeave={() => {
            setDragOverColumn((prev) => (prev === column.key ? null : prev));
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverColumn(null);
            const conversationId = e.dataTransfer.getData("conversationId");
            if (conversationId) onMoveCard(conversationId, column.key);
          }}
          className={cn(
            "flex h-full w-[280px] min-w-[280px] flex-col rounded-lg border border-border bg-muted/30 transition-colors",
            dragOverColumn === column.key && "border-2 border-dashed border-secondary bg-secondary/5",
          )}
        >
          <div className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${column.className}`}>
            <span className="text-xs font-semibold">{column.label}</span>
            <span className="text-xs font-semibold">{column.items.length}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-2 scrollbar-thin">
            {column.items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma conversa</p>
            ) : (
              column.items.map((c) => (
                <div key={c?.id} className="kanban-card-enter">
                  <KanbanCard
                    conversation={c}
                    onClick={() => onCardClick(c?.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
