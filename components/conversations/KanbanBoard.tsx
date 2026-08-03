import { useEffect, useMemo, useState } from "react";
import { KanbanCard } from "@/components/conversations/KanbanCard";
import { FUNNEL_STAGES, getFunnelKey, getLastMessageStatus, type FunnelKey } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

interface DynamicColumn {
  id: string;
  name: string;
  color: string;
  type: string;
  visible: boolean;
  order: number;
  key?: string;
}

interface KanbanBoardProps {
  conversations: Conversation[];
  onCardClick: (id: string) => void;
  onMoveCard: (conversationId: string, newStageKey: FunnelKey) => void;
}

export function KanbanBoard({ conversations, onCardClick, onMoveCard }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<FunnelKey | null>(null);
  const [dynamicCols, setDynamicCols] = useState<DynamicColumn[] | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kanban/columns`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicCols(
            data
              .filter((c: DynamicColumn) => c.visible !== false)
              .sort((a: DynamicColumn, b: DynamicColumn) => (a.order ?? 0) - (b.order ?? 0)),
          );
        }
      })
      .catch(() => {/* fall through to static */});
  }, []);

  // Resolve column key: prefer explicit key, then map by name to FUNNEL_STAGES
  function resolveKey(col: DynamicColumn): FunnelKey {
    if (col.key) return col.key as FunnelKey;
    const match = FUNNEL_STAGES.find((s) => s.label.toLowerCase() === col.name.toLowerCase());
    return (match?.key ?? col.name.toUpperCase().replace(/\s+/g, "_")) as FunnelKey;
  }

  const columns = useMemo(() => {
    const stages = dynamicCols
      ? dynamicCols.map((col) => ({
          key: resolveKey(col),
          label: col.name,
          className: "",
          color: col.color,
        }))
      : FUNNEL_STAGES;

    return stages.map((stage: { key: FunnelKey; label: string; className: string; color?: string }) => {
      const items = conversations.filter((c) => getFunnelKey(c) === stage.key);
      items.sort((a, b) => {
        const sA = getLastMessageStatus(a);
        const sB = getLastMessageStatus(b);
        const waitingA = sA.kind === "waiting";
        const waitingB = sB.kind === "waiting";
        if (waitingA !== waitingB) return waitingA ? -1 : 1;
        if (waitingA && waitingB) return (sB.minutes ?? 0) - (sA.minutes ?? 0);
        const atA = sA.kind !== "unknown" ? new Date(sA.at).getTime() : 0;
        const atB = sB.kind !== "unknown" ? new Date(sB.at).getTime() : 0;
        return atB - atA;
      });
      return { ...stage, items };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, dynamicCols]);

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
          <div
            className={cn("flex items-center justify-between rounded-t-lg px-3 py-2", !column.color && column.className)}
            style={column.color ? { backgroundColor: column.color + "22", borderBottom: `2px solid ${column.color}` } : undefined}
          >
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
