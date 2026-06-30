import { useState } from "react";
import {
  formatExactDateTime,
  formatLastMessageLabel,
  getLastMessageStatus,
  truncate,
} from "@/lib/conversation";
import { cn } from "@/lib/utils";
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
    conversation?.patient?.name || (phone ? phone.replace("55", "+55 ") : "Paciente");

  const msgStatus = getLastMessageStatus(conversation);
  const timeLabel = formatLastMessageLabel(msgStatus);
  const tooltip =
    msgStatus.kind !== "unknown"
      ? `Ultima mensagem: ${formatExactDateTime(msgStatus.at)}`
      : undefined;

  const isWaiting = msgStatus.kind === "waiting";
  const isUrgent = isWaiting && msgStatus.minutes > 60;

  const borderClass = isUrgent
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
        "flex w-full cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:bg-muted/50 active:cursor-grabbing",
        borderClass,
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium text-primary">{displayName}</span>
        {conversation?.aiEnabled === false && (
          <span
            className="shrink-0 rounded-full bg-danger/10 px-1.5 py-0.5 text-[9px] font-semibold text-danger"
            title="IA pausada"
          >
            🔴
          </span>
        )}
      </div>

      {conversation?.lastMessage?.content && (
        <span className="text-xs text-muted-foreground">
          &quot;{truncate(conversation.lastMessage.content, 60)}&quot;
        </span>
      )}

      {timeLabel && (
        <span className={cn("text-[10px]", timeLabelClass)} title={tooltip}>
          {timeLabel}
        </span>
      )}
    </button>
  );
}
