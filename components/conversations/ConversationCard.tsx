import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { formatPhone, getFunnelBadge, truncate } from "@/lib/conversation";
import type { Conversation } from "@/types";

const statusConfig: Record<Conversation["status"], { label: string; variant: "success" | "warning" | "default" }> = {
  ACTIVE: { label: "Ativa", variant: "success" },
  WAITING_HUMAN: { label: "Aguardando secretaria", variant: "warning" },
  COMPLETED: { label: "Concluida", variant: "default" },
};

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

interface ConversationCardProps {
  conversation: Conversation;
  onClick?: () => void;
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const status = statusConfig[conversation?.status] ?? statusConfig.COMPLETED;
  const funnel = getFunnelBadge(conversation);

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-primary">
          {conversation?.patient?.name ?? "Paciente sem nome"}
        </span>
        <div className="flex items-center gap-1.5">
          {conversation?.aiEnabled === false && <Badge variant="danger">IA pausada</Badge>}
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>

      <span className="text-xs text-muted-foreground">{formatPhone(conversation?.patient?.phone)}</span>

      {conversation?.lastMessage?.content && (
        <span className="text-xs text-muted-foreground">
          &quot;{truncate(conversation.lastMessage.content, 50)}&quot;
        </span>
      )}

      <div className="flex items-center justify-between">
        <Badge className={funnel.className}>{funnel.label}</Badge>
        <span className="text-xs text-muted-foreground">{formatDate(conversation?.updatedAt)}</span>
      </div>
    </button>
  );
}
