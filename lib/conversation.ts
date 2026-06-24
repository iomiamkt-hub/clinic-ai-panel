import type { ConversationStage } from "@/types";

export const stageLabels: Record<string, string> = {
  GREETING: "Saudacao inicial",
  COLLECTING_INFO: "Coletando informacoes",
  CHECKING_AVAILABILITY: "Verificando agenda",
  CONFIRMING: "Confirmando agendamento",
  COMPLETED: "Concluido",
  ESCALATED: "Escalado para humano",
};

export function translateStage(stage?: ConversationStage | null): string {
  if (!stage) return "Nao informado";
  return stageLabels[stage] ?? stage;
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
