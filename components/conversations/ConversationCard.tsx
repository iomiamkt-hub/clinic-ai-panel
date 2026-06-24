import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { Conversation } from "@/types";

const statusConfig: Record<Conversation["status"], { label: string; variant: "success" | "warning" | "default" }> = {
  ACTIVE: { label: "Ativa", variant: "success" },
  WAITING_HUMAN: { label: "Aguardando humano", variant: "warning" },
  COMPLETED: { label: "Concluida", variant: "default" },
};

interface ConversationCardProps {
  conversation: Conversation;
  onClick?: () => void;
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const status = statusConfig[conversation.status];

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-primary">{conversation.patientName}</span>
        <span className="text-xs text-muted-foreground">{conversation.phone}</span>
        <span className="text-xs text-muted-foreground">Etapa: {conversation.stage}</span>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-xs text-muted-foreground">
          {format(parseISO(conversation.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </span>
      </div>
    </button>
  );
}
