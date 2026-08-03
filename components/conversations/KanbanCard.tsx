import { useState } from "react";
import {
  formatExactDateTime,
  formatLastMessageLabel,
  formatPhone,
  getLastMessageStatus,
  truncate,
} from "@/lib/conversation";
import { cn } from "@/lib/utils";
import { StageMiniBar } from "@/components/conversations/ProgressCard";
import type { Conversation } from "@/types";

interface KanbanCardProps {
  conversation: Conversation;
  onClick?: () => void;
  onDragStart?: (conversationId: string) => void;
  onDragEnd?: () => void;
}

export function KanbanCard({ conversation, onClick, onDragStart, onDragEnd }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const phone = conversation?.patient?.phone;
  const displayName =
    conversation?.patient?.name ||
    (phone ? formatPhone(phone) : "Paciente");

  const msgStatus = getLastMessageStatus(conversation);
  const timeLabel = formatLastMessageLabel(msgStatus);
  const tooltip =
    msgStatus.kind !== "unknown"
      ? `Ultima mensagem: ${formatExactDateTime(msgStatus.at)}`
      : undefined;

  const isWaiting = msgStatus.kind === "waiting";
  const isUrgent = isWaiting && msgStatus.minutes > 60;

  const pd = (conversation?.patientData ?? {}) as Record<string, unknown>;
  const isUrgencia = Boolean(pd.urgencia);
  const missing = conversation?.missingFields ?? [];
  const hasMissing = missing.length > 0;
  const periodo = pd.periodo ? String(pd.periodo) : null;
  const unidade = pd.unidade ? String(pd.unidade) : null;

  const borderClass = isUrgencia
    ? "border-l-4 border-l-danger"
    : isUrgent
      ? "border-l-4 border-l-danger"
      : isWaiting
        ? "border-l-4 border-l-warning"
        : "border-l-4 border-l-transparent";

  const timeLabelClass = isUrgent
    ? "text-danger font-semibold"
    : isWaiting
      ? "text-warning font-semibold"
      : "text-muted-foreground";

  return (
    <button
      draggable
      onDragStart={(e) => {
        if (!conversation?.id) return;
        e.dataTransfer.setData("conversationId", conversation.id);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
        onDragStart?.(conversation.id);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd?.();
      }}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:bg-muted/50 active:cursor-grabbing",
        borderClass,
        isDragging && "opacity-50",
      )}
    >
      {/* Nome + badge IA */}
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium text-primary leading-tight">{displayName}</span>
        {conversation?.aiEnabled === false && (
          <span
            className="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold text-danger"
            title="IA pausada"
          >
            🔴
          </span>
        )}
      </div>

      {/* Última mensagem */}
      {conversation?.lastMessage?.content && (
        <span className="text-xs text-muted-foreground">
          &quot;{truncate(conversation.lastMessage.content, 55)}&quot;
        </span>
      )}

      {/* Tempo */}
      {timeLabel && (
        <span className={cn("text-[10px]", timeLabelClass)} title={tooltip}>
          {timeLabel}
        </span>
      )}

      {/* Stage mini bar */}
      <StageMiniBar
        stage={conversation?.currentState ?? conversation?.stage}
        missingCount={missing.length}
      />

      {/* Badges de indicadores */}
      <div className="flex flex-wrap gap-1 pt-0.5">
        {isUrgencia && (
          <span className="animate-pulse rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold text-danger">
            🔴 Urgência
          </span>
        )}
        {!hasMissing && !isUrgencia && (
          <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold text-success">
            ✓ Dados completos
          </span>
        )}
        {hasMissing && (
          <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
            ⚠ {missing.length} pendente{missing.length > 1 ? "s" : ""}
          </span>
        )}
        {periodo && (
          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">
            📅 {String(periodo)}
          </span>
        )}
        {unidade && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
            🏥 {String(unidade)}
          </span>
        )}
      </div>
    </button>
  );
}
