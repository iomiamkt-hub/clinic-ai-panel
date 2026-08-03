"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Clock, FileText, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FUNNEL_STAGES, formatPhone, getFunnelBadge } from "@/lib/conversation";
import type { Conversation, Message, TimelineEvent } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: string | null, pattern = "dd/MM/yyyy HH:mm") {
  if (!value) return "Nao informado";
  try {
    return format(parseISO(value), pattern, { locale: ptBR });
  } catch {
    return "Nao informado";
  }
}

const AI_STATE_MAP: Record<string, string> = {
  GREETING:             "👋 Saudação inicial",
  QUALIFYING:           "📋 Coletando informações",
  CHECKING_AVAILABILITY:"🗓️ Verificando agenda",
  CONFIRMING:           "✅ Confirmando horário",
  BOOKING:              "📝 Registrando agendamento",
  COMPLETED:            "🎉 Agendamento concluído",
  ESCALATED:            "👩‍💼 Com a secretária",
};

function aiStateLabel(state?: string | null) {
  if (!state) return null;
  return AI_STATE_MAP[state] ?? state;
}

function getFactIcon(fact: string): string {
  const f = fact.toLowerCase();
  if (f.includes("ansios") || f.includes("ansiedade")) return "⚠️";
  if (f.includes("urgent") || f.includes("rápido") || f.includes("rapido")) return "🚨";
  if (f.includes("indicação") || f.includes("indicacao")) return "👥";
  if (f.includes("desconto")) return "💰";
  if (f.includes("cirurgia")) return "🔬";
  if (f.includes("dor")) return "🩺";
  return "💬";
}

function getTimelineIcon(event: string): string {
  const e = event.toLowerCase();
  if (e.includes("lead criado") || e.includes("conversa criada")) return "🆕";
  if (e.includes("nome")) return "👤";
  if (e.includes("convênio") || e.includes("convenio")) return "💳";
  if (e.includes("horário") || e.includes("horario")) return "🗓️";
  if (e.includes("agendamento") || e.includes("agendado")) return "✅";
  if (e.includes("escalad") || e.includes("secretar")) return "👩‍💼";
  if (e.includes("motor:") || e.includes("decisão") || e.includes("decisao")) return "⚙️";
  return "•";
}

function getTimelineDotColor(event: string): string {
  const e = event.toLowerCase();
  if (e.includes("agendado") || e.includes("agendamento") || e.includes("confirmado")) return "bg-success";
  if (e.includes("escalad") || e.includes("pendente") || e.includes("aguardando")) return "bg-warning";
  if (e.includes("erro") || e.includes("urgência") || e.includes("urgencia")) return "bg-danger";
  return "bg-blue-400";
}

const senderConfig: Record<Message["sender"], { label: string | null; bubble: string; align: string }> = {
  PATIENT: { label: null, bubble: "bg-secondary text-white", align: "self-end items-end" },
  LORENA:  { label: "Lorena", bubble: "bg-primary text-white", align: "self-start items-start" },
  HUMAN:   { label: "Secretaria", bubble: "bg-[#6B7280] text-white", align: "self-start items-start" },
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

// ── Componente ────────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<"conversa" | "memoria">("conversa");

  // ── Fetch & parse ──────────────────────────────────────────────────────────

  const parseAndApply = useCallback(
    (data: unknown, initial = false) => {
      console.log("Conversation data:", JSON.stringify(data, null, 2));
      const raw = data as Record<string, unknown>;
      const conv: Conversation | null =
        (raw?.conversation as Conversation) ??
        (raw?.id ? (raw as unknown as Conversation) : null);
      const msgs: Message[] =
        (raw?.messages as Message[]) ??
        (conv?.messages as unknown as Message[]) ??
        [];

      setConversation(conv);
      setMessages(msgs);
      if (initial) {
        setAiEnabled(conv?.aiEnabled ?? true);
        setStage((conv?.status === "WAITING_HUMAN" ? "WAITING_HUMAN" : conv?.stage) ?? "");
        setTags(conv?.tags ?? []);
        setNotes(conv?.notes ?? "");
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);
    conversationsApi
      .get(conversationId)
      .then((data) => parseAndApply(data, true))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [conversationId, parseAndApply]);

  // Polling a cada 15 s — atualiza painel sem recarregar a página
  useEffect(() => {
    const interval = setInterval(() => {
      conversationsApi
        .get(conversationId)
        .then((data) => parseAndApply(data, false))
        .catch(() => {/* silencioso — não sobrescreve erro inicial */});
    }, 15000);
    return () => clearInterval(interval);
  }, [conversationId, parseAndApply]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  function goBack() { router.push("/conversas"); }

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
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiEnabled: newValue }) },
      );
      if (!response.ok) {
        setAiEnabled(!newValue);
        showToast("Nao foi possivel atualizar a IA.");
      } else {
        setConversation((prev) => (prev ? { ...prev, aiEnabled: newValue } : prev));
        showToast(newValue ? "IA ativada" : "IA pausada");
      }
    } catch {
      setAiEnabled(!newValue);
      showToast("Nao foi possivel atualizar a IA.");
    } finally {
      setAiToggling(false);
    }
  }

  async function handleStageChange(newStage: string) {
    const previous = stage;
    setStage(newStage);
    setStageSaving(true);
    try {
      const result = await conversationsApi.updateStage(conversationId, newStage);
      const aiPausedAuto = result?.aiPausedAutomatically === true;
      setConversation((prev) =>
        prev ? {
          ...prev,
          stage: newStage === "WAITING_HUMAN" ? prev.stage : (newStage as Conversation["stage"]),
          status: newStage === "WAITING_HUMAN" ? "WAITING_HUMAN" : prev.status,
          ...(aiPausedAuto ? { aiEnabled: false } : {}),
        } : prev,
      );
      if (aiPausedAuto) {
        setAiEnabled(false);
        showToast("✅ Lead marcado como Agendado. IA pausada automaticamente.");
      } else {
        showToast("Etapa atualizada");
      }
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
    try { await conversationsApi.updateTags(conversationId, updated); }
    catch (err) { showToast(getApiErrorMessage(err)); }
    finally { setTagsSaving(false); }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      await conversationsApi.updateNotes(conversationId, notes);
      showToast("Notas salvas");
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setNotesSaving(false);
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const funnel = getFunnelBadge(conversation);

  const firstMessageAt = useMemo(() => {
    if (messages.length > 0) {
      const m = messages[0] as Message & { sentAt?: string };
      return m?.sentAt ?? m?.createdAt ?? null;
    }
    return conversation?.firstMessageAt ?? null;
  }, [conversation, messages]);

  const lastMessageAt = useMemo(() => {
    if (messages.length > 0) {
      const m = messages[messages.length - 1] as Message & { sentAt?: string };
      return m?.sentAt ?? m?.createdAt ?? null;
    }
    return conversation?.lastMessageAt ?? null;
  }, [conversation, messages]);

  // Confidence: lê de conv.structuredOutput?.confidence (campo JSON livre)
  const confidence = useMemo((): number | null => {
    const raw = conversation as (Conversation & { structuredOutput?: Record<string, unknown> }) | null;
    const c = raw?.structuredOutput?.confidence;
    if (typeof c === "number") return c;
    if (typeof c === "string") { const n = parseFloat(c); return isNaN(n) ? null : n; }
    return null;
  }, [conversation]);

  const confidenceColor = confidence === null ? null
    : confidence >= 90 ? "bg-success"
    : confidence >= 70 ? "bg-warning"
    : "bg-danger";

  const confidenceLabel = confidence === null ? null
    : confidence >= 90 ? null
    : confidence >= 70 ? "IA com dúvida"
    : "Secretária pode precisar assumir";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
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
              {loading ? "Carregando..." : (conversation?.patient?.name ?? conversation?.patient?.phone ?? "Paciente sem nome")}
            </h1>
            <p className="text-xs text-muted-foreground">{formatPhone(conversation?.patient?.phone)}</p>
          </div>
          {conversation && <Badge className={funnel.className}>{funnel.label}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{aiEnabled ? "🟢 IA ativa" : "🔴 IA pausada"}</span>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleToggleAI(); }}
            disabled={aiToggling}
            style={{
              position: "relative", display: "inline-flex", height: "24px", width: "44px",
              alignItems: "center", borderRadius: "9999px", border: "none", cursor: "pointer",
              backgroundColor: aiEnabled ? "#22c55e" : "#ef4444", transition: "background-color 0.2s",
              opacity: aiToggling ? 0.6 : 1,
            }}
          >
            <span style={{
              display: "inline-block", height: "16px", width: "16px", borderRadius: "9999px",
              backgroundColor: "white",
              transform: aiEnabled ? "translateX(24px)" : "translateX(4px)",
              transition: "transform 0.2s",
            }} />
          </button>
        </div>
      </div>

      {error && <div className="bg-danger/10 px-6 py-2 text-sm text-danger">{error}</div>}

      <div className="flex flex-1 overflow-hidden">
        {/* ── Coluna esquerda: abas ── */}
        <div className="flex w-[65%] flex-col border-r border-border">
          <div className="flex border-b border-border">
            {(["conversa", "memoria"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "border-b-2 border-secondary text-secondary"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {tab === "conversa" ? "💬 Conversa" : "🧠 Memória da IA"}
              </button>
            ))}
          </div>

          {activeTab === "conversa" ? (
            <>
              <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-4 scrollbar-thin">
                {loading ? (
                  <p className="text-center text-sm text-muted-foreground">Carregando historico...</p>
                ) : (messages ?? []).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {(messages ?? []).map((msg) => {
                      const cfg = senderConfig[msg?.sender] ?? senderConfig.PATIENT;
                      return (
                        <div key={msg?.id ?? Math.random()} className={cn("flex max-w-[80%] flex-col gap-0.5", cfg.align)}>
                          {cfg.label && <span className="px-1 text-[10px] font-medium text-muted-foreground">{cfg.label}</span>}
                          <div className={cn("rounded-lg px-3 py-2 text-sm", cfg.bubble)}>
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
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Digite uma resposta como secretaria..." rows={2} />
                <Button onClick={handleSendReply} disabled={sending || !reply.trim()} className="self-end">
                  <Send className="h-4 w-4" />
                  {sending ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </>
          ) : (
            /* ── Aba Memória da IA ── */
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5 scrollbar-thin">
              {conversation?.currentState && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado atual</h3>
                  <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {aiStateLabel(conversation.currentState)}
                  </span>
                </section>
              )}
              {conversation?.nextAction && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próxima ação</h3>
                  <span className="inline-flex w-fit rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                    {conversation.nextAction}
                  </span>
                </section>
              )}
              {(conversation?.missingFields ?? []).length > 0 && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Campos pendentes
                    <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger">
                      {conversation!.missingFields!.length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {conversation!.missingFields!.map((f) => (
                      <span key={f} className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">✗ {f}</span>
                    ))}
                  </div>
                </section>
              )}
              {conversation?.patientData && Object.keys(conversation.patientData).length > 0 && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados coletados</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(conversation.patientData).map(([key, val]) => (
                      <div key={key} className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{key}</span>
                        <span className="text-xs font-medium text-primary">{String(val ?? "")}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {conversation?.behaviorProfile && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfil comportamental</h3>
                  <p className="text-sm italic text-muted-foreground">{conversation.behaviorProfile}</p>
                </section>
              )}
              {(conversation?.conversationFacts ?? []).length > 0 && (
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fatos contextuais</h3>
                  <ul className="flex flex-col gap-1">
                    {conversation!.conversationFacts!.map((fact, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="mt-0.5 shrink-0">{getFactIcon(fact)}</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <TimelineSection conversation={conversation} formatDate={formatDate} full />
            </div>
          )}
        </div>

        {/* ── Coluna direita: painel do paciente ── */}
        <div className="flex w-[35%] flex-col gap-0 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col gap-5 px-6 py-5">

            {/* 1. Dados do paciente */}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-primary">Dados do paciente</h3>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Nome:</span>{" "}{conversation?.patient?.name ?? conversation?.patient?.phone ?? "Nao informado"}</p>
                <p><span className="font-medium text-foreground">Telefone:</span>{" "}{formatPhone(conversation?.patient?.phone)}</p>
                <p><span className="font-medium text-foreground">Primeira mensagem:</span>{" "}{formatDate(firstMessageAt)}</p>
                <p><span className="font-medium text-foreground">Ultima mensagem:</span>{" "}{formatDate(lastMessageAt)}</p>
              </div>
            </section>

            {/* 2. Etapa do funil + Estado da IA */}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-primary">Etapa do funil</h3>
              <Select value={stage} disabled={stageSaving} onChange={(e) => handleStageChange(e.target.value)}>
                <option value="" disabled>Selecione...</option>
                {FUNNEL_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
              {conversation?.currentState && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className="text-xs font-semibold text-muted-foreground">Estado da IA:</span>
                  <span className="text-xs font-semibold text-primary">{aiStateLabel(conversation.currentState)}</span>
                </div>
              )}
            </section>

            {/* 3. Confiança da IA */}
            {confidence !== null && (
              <section className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary">Confiança da IA</h3>
                  <span className={cn("text-xs font-bold", confidence >= 90 ? "text-success" : confidence >= 70 ? "text-warning" : "text-danger")}>
                    {Math.round(confidence)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", confidenceColor)}
                    style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                  />
                </div>
                {confidenceLabel && (
                  <p className={cn("text-xs font-medium", confidence >= 70 ? "text-warning" : "text-danger")}>
                    ⚠ {confidenceLabel}
                  </p>
                )}
              </section>
            )}

            {/* 4. Resumo automático */}
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <FileText className="h-3.5 w-3.5" />
                Resumo do paciente
              </h3>
              {conversation?.patientSummary ? (
                <div className="rounded-lg border-l-4 border-blue-400 bg-blue-50 px-3 py-2.5">
                  <p className="text-sm italic text-blue-800">{conversation.patientSummary}</p>
                  {lastMessageAt && (
                    <p className="mt-1 text-[10px] text-blue-400">Atualizado em {formatDate(lastMessageAt, "dd/MM HH:mm")}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border-l-4 border-muted bg-muted/30 px-3 py-2.5">
                  <p className="text-sm italic text-muted-foreground">Resumo sendo gerado automaticamente...</p>
                </div>
              )}
            </section>

            {/* 5. Próxima ação (card expandido) */}
            {(conversation?.nextAction || (conversation?.missingFields ?? []).length > 0) && (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-primary">Próxima ação</h3>
                <div className="flex flex-col gap-2 rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2.5">
                  {conversation?.currentState && (
                    <div className="flex gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground w-14 shrink-0">Tipo:</span>
                      <span className="text-primary">{aiStateLabel(conversation.currentState)}</span>
                    </div>
                  )}
                  {conversation?.nextAction && (
                    <div className="flex gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground w-14 shrink-0">Ação:</span>
                      <span className="font-medium text-secondary">{conversation.nextAction}</span>
                    </div>
                  )}
                  <div className="flex gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground w-14 shrink-0">Motivo:</span>
                    <span className="text-muted-foreground">
                      {(conversation?.missingFields ?? []).length > 0
                        ? conversation!.missingFields![0]
                        : "Todos os dados coletados"}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* 6. Dados coletados */}
            {conversation?.patientData && Object.keys(conversation.patientData).length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-primary">Dados coletados</h3>
                  {(conversation.missingFields ?? []).length > 0 && (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                      {conversation.missingFields!.length} pendente{conversation.missingFields!.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {Object.entries(conversation.patientData).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <span className="text-success">✓</span>
                      <span className="font-medium capitalize text-foreground">{key}:</span>
                      <span className="text-muted-foreground">{String(value ?? "")}</span>
                    </div>
                  ))}
                  {(conversation.missingFields ?? []).map((field) => (
                    <div key={field} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                      <span>✗</span>
                      <span className="capitalize">{field}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Insights do paciente */}
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                💡 Insights do paciente
              </h3>
              {(conversation?.conversationFacts ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum insight registrado ainda.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {(conversation!.conversationFacts!).map((fact, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                      <span className="shrink-0">{getFactIcon(fact)}</span>
                      <span className="text-muted-foreground">{fact}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 8. Linha do tempo visual */}
            <TimelineSection conversation={conversation} formatDate={formatDate} />

            {/* 9. Tags */}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-primary">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma tag adicionada.</p>
                ) : (
                  tags.map((tag) => (
                    <span key={tag} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", tagColor(tag))}>
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} disabled={tagsSaving}><X className="h-3 w-3" /></button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Nova tag"
                  className="h-9"
                />
                <Button size="sm" variant="outline" onClick={handleAddTag} disabled={!newTag.trim() || tagsSaving}>Adicionar</Button>
              </div>
            </section>

            {/* 10. Agendamento */}
            {conversation?.appointment && (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-primary">Agendamento</h3>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Data e hora:</span>{" "}{formatDate(conversation.appointment.dateTime)}</p>
                  <p><span className="font-medium text-foreground">Médico:</span> {conversation.appointment.doctor}</p>
                  <p><span className="font-medium text-foreground">Status:</span> {conversation.appointment.status}</p>
                </div>
              </section>
            )}

            {/* 11. Notas da secretária */}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-primary">Notas da secretaria</h3>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adicione notas internas sobre este lead..." rows={4} />
              <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving} className="self-end">
                {notesSaving ? "Salvando..." : "Salvar"}
              </Button>
            </section>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: Timeline ───────────────────────────────────────────────────

function TimelineSection({
  conversation,
  formatDate: fmt,
  full = false,
}: {
  conversation: Conversation | null;
  formatDate: (v?: string | null, p?: string) => string;
  full?: boolean;
}) {
  const timeline = (conversation?.timeline ?? []) as TimelineEvent[];
  const events = full ? timeline : timeline.slice(0, 10);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Clock className="h-3.5 w-3.5" />
        Linha do tempo{full ? " completa" : ""}
      </h3>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((ev, i) => {
            const icon = getTimelineIcon(ev.event);
            const dotColor = getTimelineDotColor(ev.event);
            const isLast = i === events.length - 1;
            return (
              <li key={i} className="flex gap-3">
                {/* Linha vertical + ponto */}
                <div className="flex flex-col items-center">
                  <div className={cn("mt-1 h-3 w-3 shrink-0 rounded-full text-center text-[8px] leading-3 text-white", dotColor)}>
                    {icon.length <= 2 ? "" : ""}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-border" />}
                </div>
                {/* Conteúdo */}
                <div className={cn("flex flex-col gap-0.5 pb-3", isLast && "pb-0")}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                      {fmt(ev.timestamp, "dd/MM HH:mm")}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {icon} {ev.event}
                    </span>
                  </div>
                  {ev.detail && <span className="text-[11px] text-muted-foreground">{ev.detail}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
