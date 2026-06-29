import type { Conversation, ConversationStage } from "@/types";

interface FunnelBadgeConfig {
  label: string;
  className: string;
}

const stageBadgeConfig: Record<string, FunnelBadgeConfig> = {
  GREETING: { label: "Lead novo", className: "bg-sky-100 text-sky-700" },
  COLLECTING_INFO: { label: "Em atendimento", className: "bg-yellow-100 text-yellow-700" },
  CHECKING_AVAILABILITY: { label: "Verificando agenda", className: "bg-orange-100 text-orange-600" },
  CONFIRMING: { label: "Confirmando", className: "bg-secondary/15 text-secondary" },
  COMPLETED: { label: "Agendado", className: "bg-success/15 text-success" },
  ESCALATED: { label: "Aguardando secretaria", className: "bg-danger/15 text-danger" },
};

const waitingHumanBadge: FunnelBadgeConfig = { label: "Com secretaria", className: "bg-purple-100 text-purple-700" };

const defaultBadge: FunnelBadgeConfig = { label: "Nao informado", className: "bg-muted text-muted-foreground" };

export type FunnelKey =
  | "GREETING"
  | "COLLECTING_INFO"
  | "CHECKING_AVAILABILITY"
  | "CONFIRMING"
  | "COMPLETED"
  | "WAITING_HUMAN";

export const FUNNEL_STAGES: { key: FunnelKey; label: string; className: string }[] = [
  { key: "GREETING", ...stageBadgeConfig.GREETING },
  { key: "COLLECTING_INFO", ...stageBadgeConfig.COLLECTING_INFO },
  { key: "CHECKING_AVAILABILITY", ...stageBadgeConfig.CHECKING_AVAILABILITY },
  { key: "CONFIRMING", ...stageBadgeConfig.CONFIRMING },
  { key: "COMPLETED", ...stageBadgeConfig.COMPLETED },
  { key: "WAITING_HUMAN", ...waitingHumanBadge },
];

export const STAGE_PATCH_VALUE: Record<FunnelKey, string> = {
  GREETING: "GREETING",
  COLLECTING_INFO: "COLLECTING_INFO",
  CHECKING_AVAILABILITY: "CHECKING_AVAILABILITY",
  CONFIRMING: "CONFIRMING",
  COMPLETED: "COMPLETED",
  WAITING_HUMAN: "ESCALATED",
};

export function getFunnelKey(conversation?: Pick<Conversation, "status" | "stage"> | null): FunnelKey | null {
  if (!conversation) return null;
  if (conversation.status === "WAITING_HUMAN") return "WAITING_HUMAN";
  if (!conversation.stage) return null;
  return FUNNEL_STAGES.some((s) => s.key === conversation.stage) ? (conversation.stage as FunnelKey) : null;
}

export function getFunnelBadge(conversation?: Pick<Conversation, "status" | "stage"> | null): FunnelBadgeConfig {
  if (!conversation) return defaultBadge;
  if (conversation.status === "WAITING_HUMAN") return waitingHumanBadge;
  if (!conversation.stage) return defaultBadge;
  return stageBadgeConfig[conversation.stage] ?? { label: conversation.stage, className: defaultBadge.className };
}

export function translateStage(stage?: ConversationStage | null): string {
  if (!stage) return "Nao informado";
  return stageBadgeConfig[stage]?.label ?? stage;
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return "Telefone nao informado";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function truncate(text?: string | null, maxLength = 50): string {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}

export function formatTimeAgo(value?: string | null): string {
  if (!value) return "";
  try {
    const diffMs = Date.now() - new Date(value).getTime();
    if (Number.isNaN(diffMs)) return "";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia${days > 1 ? "s" : ""}`;
  } catch {
    return "";
  }
}

export function getWaitingMinutes(conversation?: Pick<Conversation, "lastMessage"> | null): number | null {
  if (!conversation?.lastMessage || conversation.lastMessage.sender !== "PATIENT") return null;
  if (!conversation.lastMessage.createdAt) return null;
  try {
    const diffMs = Date.now() - new Date(conversation.lastMessage.createdAt).getTime();
    if (Number.isNaN(diffMs)) return null;
    return diffMs / 60000;
  } catch {
    return null;
  }
}
