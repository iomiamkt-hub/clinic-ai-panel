"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, UserCheck, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/conversation";
import type { Conversation, Message } from "@/types";

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return format(parseISO(value), "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

interface ConversationDetailProps {
  conversationId: string;
  onClose: () => void;
  onStatusChanged: (conversation: Conversation) => void;
}

export function ConversationDetail({ conversationId, onClose, onStatusChanged }: ConversationDetailProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    conversationsApi
      .get(conversationId)
      .then((data) => {
        setConversation(data?.conversation ?? null);
        setMessages(data?.messages ?? []);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [conversationId]);

  async function handleStatusChange(status: Conversation["status"]) {
    if (!conversation) return;
    setUpdating(true);
    setError("");
    setSuccess("");
    try {
      await conversationsApi.updateStatus(conversation.id, status);
      const updated = { ...conversation, status };
      setConversation(updated);
      onStatusChanged(updated);
      setSuccess(
        status === "WAITING_HUMAN" ? "Atendimento assumido com sucesso" : "IA reativada com sucesso",
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-primary">
              {conversation?.patient?.name ?? (loading ? "Carregando..." : "Paciente sem nome")}
            </h2>
            <p className="text-xs text-muted-foreground">{formatPhone(conversation?.patient?.phone)}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="bg-danger/10 px-5 py-2 text-sm text-danger">{error}</div>}
        {success && <div className="bg-success/10 px-5 py-2 text-sm text-success">{success}</div>}

        <div className="flex-1 overflow-y-auto bg-muted/30 px-5 py-4 scrollbar-thin">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">Carregando historico...</p>
          ) : (messages ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(messages ?? []).map((msg) => (
                <div
                  key={msg?.id ?? Math.random()}
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    msg?.sender === "PATIENT"
                      ? "self-start bg-white text-primary shadow-sm"
                      : "self-end bg-secondary text-white",
                  )}
                >
                  <p>{msg?.content ?? ""}</p>
                  <p className={cn("mt-1 text-[10px]", msg?.sender === "PATIENT" ? "text-muted-foreground" : "text-white/70")}>
                    {formatDate(msg?.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-4">
          {conversation?.status !== "WAITING_HUMAN" ? (
            <Button
              variant="secondary"
              className="flex-1"
              disabled={updating || !conversation}
              onClick={() => handleStatusChange("WAITING_HUMAN")}
            >
              <UserCheck className="h-4 w-4" />
              Assumir atendimento
            </Button>
          ) : (
            <Button className="flex-1" disabled={updating || !conversation} onClick={() => handleStatusChange("ACTIVE")}>
              <Bot className="h-4 w-4" />
              Reativar IA
            </Button>
          )}
          {conversation && (
            <Badge variant={conversation.status === "ACTIVE" ? "success" : conversation.status === "WAITING_HUMAN" ? "warning" : "default"}>
              {conversation.status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
