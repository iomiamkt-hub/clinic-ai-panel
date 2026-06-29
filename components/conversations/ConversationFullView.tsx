"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FUNNEL_STAGES, formatPhone, getFunnelBadge } from "@/lib/conversation";
import type { Conversation, Message } from "@/types";

function formatDate(value?: string | null, pattern = "dd/MM/yyyy HH:mm") {
  if (!value) return "Nao informado";
  try {
    return format(parseISO(value), pattern, { locale: ptBR });
  } catch {
    return "Nao informado";
  }
}

const senderConfig: Record<Message["sender"], { label: string | null; bubble: string; align: string }> = {
  PATIENT: { label: null, bubble: "bg-secondary text-white", align: "self-end items-end" },
  LORENA: { label: "Lorena", bubble: "bg-primary text-white", align: "self-start items-start" },
  HUMAN: { label: "Secretaria", bubble: "bg-[#6B7280] text-white", align: "self-start items-start" },
};

const TAG_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-pink-100 text-pink-700",
];

function tagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash + tag.charCodeAt(i)) % TAG_COLORS.length;
  return TAG_COLORS[hash];
}

interface ConversationFullViewProps {
  conversationId: string;
}

export function ConversationFullView({ conversationId }: ConversationFullViewProps) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");

  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [aiToggling, setAiToggling] = useState(false);

  const [stage, setStage] = useState<string>("");
  const [stageSaving, setStageSaving] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [tagsSaving, setTagsSaving] = useState(false);

  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const [toast, setToast] = useState("");

  useEffect(() => {
    setLoading(true);
    conversationsApi
      .get(conversationId)
      .then((data) => {
        const conv = data?.conversation ?? null;
        setConversation(conv);
        setMessages(data?.messages ?? []);
        setAiEnabled(conv?.aiEnabled ?? true);
        setStage((conv?.status === "WAITING_HUMAN" ? "WAITING_HUMAN" : conv?.stage) ?? "");
        setTags(conv?.tags ?? []);
        setNotes(conv?.notes ?? "");
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [conversationId]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  function goBack() {
    router.push("/conversas");
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

  async function handleToggleAI() {
    const newValue = !aiEnabled;
    setAiEnabled(newValue);
    setAiToggling(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}/ai`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiEnabled: newValue }),
        },
      );
      if (!response.ok) {
        setAiEnabled(!newValue);
        showToast("Nao foi possivel atualizar a IA. Tente novamente.");
      } else {
        setConversation((prev) => (prev ? { ...prev, aiEnabled: newValue } : prev));
        showToast(newValue ? "IA ativada com sucesso" : "IA pausada com sucesso");
      }
    } catch {
      setAiEnabled(!newValue);
      showToast("Nao foi possivel atualizar a IA. Tente novamente.");
    } finally {
      setAiToggling(false);
    }
  }

  async function handleStageChange(newStage: string) {
    const previous = stage;
    setStage(newStage);
    setStageSaving(true);
    try {
      await conversationsApi.updateStage(conversationId, newStage);
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              stage: newStage === "WAITING_HUMAN" ? prev.stage : (newStage as Conversation["stage"]),
              status: newStage === "WAITING_HUMAN" ? "WAITING_HUMAN" : prev.status,
            }
          : prev,
      );
      showToast("Etapa atualizada com sucesso");
    } catch (err) {
      setStage(previous);
      showToast(getApiErrorMessage(err));
    } finally {
      setStageSaving(false);
    }
  }

  async function handleAddTag() {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) return;
    const updated = [...tags, tag];
    setTags(updated);
    setNewTag("");
    await saveTags(updated);
  }

  async function handleRemoveTag(tag: string) {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    await saveTags(updated);
  }

  async function saveTags(updated: string[]) {
    setTagsSaving(true);
    try {
      await conversationsApi.updateTags(conversationId, updated);
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setTagsSaving(false);
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      await conversationsApi.updateNotes(conversationId, notes);
      showToast("Notas salvas com sucesso");
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setNotesSaving(false);
    }
  }

  const funnel = getFunnelBadge(conversation);
  const firstMessageAt = useMemo(() => {
    if (conversation?.firstMessageAt) return conversation.firstMessageAt;
    return messages.length > 0 ? messages[0]?.createdAt : null;
  }, [conversation, messages]);
  const lastMessageAt = messages.length > 0 ? messages[messages.length - 1]?.createdAt : conversation?.updatedAt;

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Conversas
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-semibold text-primary">
              {conversation?.patient?.name ?? (loading ? "Carregando..." : "Paciente sem nome")}
            </h1>
            <p className="text-xs text-muted-foreground">{formatPhone(conversation?.patient?.phone)}</p>
          </div>
          {conversation && <Badge className={funnel.className}>{funnel.label}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{aiEnabled ? "🟢 IA ativa" : "🔴 IA pausada"}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleToggleAI();
            }}
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
      </div>

      {error && <div className="bg-danger/10 px-6 py-2 text-sm text-danger">{error}</div>}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[65%] flex-col border-r border-border">
          <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-4 scrollbar-thin">
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
                        <p className="mt-1 text-[10px] text-white/70">{formatDate(msg?.createdAt, "dd/MM HH:mm")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border px-6 py-4">
            {replyError && <div className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{replyError}</div>}
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Digite uma resposta como secretaria..."
              rows={2}
            />
            <Button onClick={handleSendReply} disabled={sending || !reply.trim()} className="self-end">
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>

        <div className="flex w-[35%] flex-col gap-6 overflow-y-auto px-6 py-5 scrollbar-thin">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-primary">Dados do paciente</h3>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Nome:</span>{" "}
                {conversation?.patient?.name ?? "Nao informado"}
              </p>
              <p>
                <span className="font-medium text-foreground">Telefone:</span>{" "}
                {formatPhone(conversation?.patient?.phone)}
              </p>
              <p>
                <span className="font-medium text-foreground">Primeira mensagem em:</span>{" "}
                {formatDate(firstMessageAt)}
              </p>
              <p>
                <span className="font-medium text-foreground">Ultima mensagem em:</span>{" "}
                {formatDate(lastMessageAt)}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-primary">Etapa do funil</h3>
            <Select
              value={stage}
              disabled={stageSaving}
              onChange={(e) => handleStageChange(e.target.value)}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {FUNNEL_STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-primary">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tag adicionada.</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", tagColor(tag))}
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} disabled={tagsSaving}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Nova tag"
                className="h-9"
              />
              <Button size="sm" variant="outline" onClick={handleAddTag} disabled={!newTag.trim() || tagsSaving}>
                Adicionar
              </Button>
            </div>
          </section>

          {conversation?.appointment && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-primary">Agendamento</h3>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Data e hora:</span>{" "}
                  {formatDate(conversation.appointment.dateTime)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Medico:</span> {conversation.appointment.doctor}
                </p>
                <p>
                  <span className="font-medium text-foreground">Status:</span> {conversation.appointment.status}
                </p>
              </div>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-primary">Notas da secretaria</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione notas internas sobre este lead..."
              rows={4}
            />
            <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving} className="self-end">
              {notesSaving ? "Salvando..." : "Salvar"}
            </Button>
          </section>
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
