"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Send } from "lucide-react";
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
}

export function ConversationDetail({ conversationId, onClose }: ConversationDetailProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [aiToggling, setAiToggling] = useState(false);
  const [toast, setToast] = useState("");
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);

  useEffect(() => {
    setAiEnabled(conversation?.aiEnabled ?? true);
  }, [conversation?.aiEnabled]);

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

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleToggleAi() {
    if (!conversation) return;
    const nextValue = !aiEnabled;
    setAiEnabled(nextValue);
    setAiToggling(true);
    try {
      await conversationsApi.setAiEnabled(conversationId, nextValue);
      setConversation((prev) => (prev ? { ...prev, aiEnabled: nextValue } : prev));
      showToast(nextValue ? "IA ativada com sucesso" : "IA pausada com sucesso");
    } catch (err) {
      setAiEnabled(!nextValue);
      showToast(getApiErrorMessage(err));
    } finally {
      setAiToggling(false);
    }
  }

  const funnel = getFunnelBadge(conversation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30">
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div
          data-testid="ai-toggle"
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 500 }}>
            {aiEnabled ? "🟢 IA ativa" : "🔴 IA pausada"}
          </span>
          <button
            onClick={handleToggleAi}
            disabled={aiToggling}
            style={{
              position: "relative",
              display: "inline-flex",
              height: "24px",
              width: "44px",
              alignItems: "center",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              backgroundColor: aiEnabled ? "#22c55e" : "#ef4444",
              transition: "background-color 0.2s",
              opacity: aiToggling ? 0.6 : 1,
            }}
          >
            <span
              style={{
                display: "inline-block",
                height: "16px",
                width: "16px",
                borderRadius: "9999px",
                backgroundColor: "white",
                transform: aiEnabled ? "translateX(24px)" : "translateX(4px)",
                transition: "transform 0.2s",
              }}
            />
          </button>
        </div>

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

        {toast && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-white shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
