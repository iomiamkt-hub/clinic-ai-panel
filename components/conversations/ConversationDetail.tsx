"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, UserCheck, Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatPhone, getFunnelBadge } from "@/lib/conversation";
import type { Conversation, Message } from "@/types";

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return format(parseISO(value), "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}

const senderConfig: Record<Message["sender"], { label: string | null; bubble: string; align: string }> = {
  PATIENT: { label: null, bubble: "bg-secondary text-white", align: "self-end items-end" },
  LORENA: { label: "Lorena", bubble: "bg-primary text-white", align: "self-start items-start" },
  HUMAN: { label: "Secretaria", bubble: "bg-[#6B7280] text-white", align: "self-start items-start" },
};

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
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");

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

  async function handleSendReply() {
    if (!reply.trim()) return;
    setSending(true);
    setReplyError("");
    try {
      const sent = await conversationsApi.reply(conversationId, reply.trim());
      const newMessage: Message = {
        id: sent?.id ?? crypto.randomUUID(),
        conversationId,
        sender: "HUMAN",
        content: sent?.content ?? reply.trim(),
        createdAt: sent?.createdAt ?? new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setReply("");
    } catch (err) {
      setReplyError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const funnel = getFunnelBadge(conversation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-primary">
              {conversation?.patient?.name ?? (loading ? "Carregando..." : "Paciente sem nome")}
            </h2>
            <p className="text-xs text-muted-foreground">{formatPhone(conversation?.patient?.phone)}</p>
            {conversation && <Badge className={funnel.className}>{funnel.label}</Badge>}
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
              {(messages ?? []).map((msg) => {
                const config = senderConfig[msg?.sender] ?? senderConfig.PATIENT;
                return (
                  <div key={msg?.id ?? Math.random()} className={cn("flex max-w-[80%] flex-col gap-0.5", config.align)}>
                    {config.label && (
                      <span className="px-1 text-[10px] font-medium text-muted-foreground">{config.label}</span>
                    )}
                    <div className={cn("rounded-lg px-3 py-2 text-sm", config.bubble)}>
                      <p>{msg?.content ?? ""}</p>
                      <p className="mt-1 text-[10px] text-white/70">{formatDate(msg?.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
          {replyError && <div className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{replyError}</div>}
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            autoComplete="off"
            placeholder="Digite uma resposta como secretaria..."
            rows={2}
          />
          <Button
            onClick={handleSendReply}
            disabled={sending || !reply.trim()}
            className="self-end"
          >
            <Send className="h-4 w-4" />
            {sending ? "Enviando..." : "Enviar"}
          </Button>
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
