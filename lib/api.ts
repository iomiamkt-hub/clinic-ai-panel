import axios from "axios";
import type {
  Appointment,
  ClinicConfig,
  Conversation,
  Message,
  MetricsSummary,
  WeekSchedule,
} from "@/types";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "O servidor demorou para responder. Tente novamente.";
    }
    if (!error.response) {
      return "Nao foi possivel conectar ao servidor. Verifique sua conexao.";
    }
    return error.response.data?.message ?? "Ocorreu um erro ao comunicar com o servidor.";
  }
  return "Ocorreu um erro inesperado.";
}

export const metricsApi = {
  getSummary: () => api.get<MetricsSummary>("/api/metrics/summary").then((r) => r.data),
};

export const conversationsApi = {
  list: () => api.get<Conversation[]>("/api/conversations").then((r) => r.data),
  get: (id: string) =>
    api.get<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${id}`).then(
      (r) => r.data,
    ),
  updateStatus: (id: string, status: Conversation["status"]) =>
    api.patch(`/api/conversations/${id}/status`, { status }).then((r) => r.data),
  reply: (id: string, message: string) =>
    api.post<Message>(`/api/conversations/${id}/reply`, { message }).then((r) => r.data),
  updateStage: (id: string, stage: string) =>
    api.patch<{ aiPausedAutomatically?: boolean }>(`/api/conversations/${id}/stage`, { stage }).then((r) => r.data),
  updateTags: (id: string, tags: string[]) =>
    api.patch(`/api/conversations/${id}/tags`, { tags }).then((r) => r.data),
  updateNotes: (id: string, notes: string) =>
    api.patch(`/api/conversations/${id}/notes`, { notes }).then((r) => r.data),
};

export const appointmentsApi = {
  list: (params?: { date?: string; status?: string }) =>
    api.get<Appointment[]>("/api/appointments", { params }).then((r) => r.data),
};

export const configApi = {
  getPrompt: () => api.get<{ prompt: string }>("/api/config/prompt").then((r) => r.data),
  savePrompt: (prompt: string) => api.post("/api/config/prompt", { prompt }).then((r) => r.data),
  getConfig: () => api.get<ClinicConfig>("/api/config").then((r) => r.data),
  updateConfig: (config: Partial<ClinicConfig>) =>
    api.patch("/api/config", config).then((r) => r.data),
  updateGlobalAi: (globalAiEnabled: boolean) =>
    api.patch("/api/config/ai", { globalAiEnabled }).then((r) => r.data),
  updateSchedule: (schedule: WeekSchedule) =>
    api.patch("/api/config/schedule", { schedule }).then((r) => r.data),
  updateOutOfHoursMessage: (message: string) =>
    api.patch("/api/config/out-of-hours-message", { message }).then((r) => r.data),
};

export const chatApi = {
  test: (message: string) =>
    api.post<{ response: string }>("/api/chat/test", { message }).then((r) => r.data),
};
