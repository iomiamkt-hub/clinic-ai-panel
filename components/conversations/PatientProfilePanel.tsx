"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink, Send, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { conversationsApi, getApiErrorMessage } from "@/lib/api";
import { formatPhone } from "@/lib/conversation";
import { cn } from "@/lib/utils";
import type { Conversation, TimelineEvent } from "@/types";

// Labels amigáveis para campos do patientData
const PATIENT_DATA_LABELS: Record<string, string> = {
  nome: "Nome",
  cpf: "CPF",
  telefone: "Telefone",
  nascimento: "Nascimento",
  convenio: "Convênio",
  unidade: "Unidade",
  motivo: "Motivo",
  periodo: "Período preferido",
  urgencia: "Urgência",
};

const PATIENT_DATA_ORDER = ["nome", "cpf", "telefone", "nascimento", "convenio", "unidade", "motivo", "periodo"];

function formatTimestamp(ts?: string) {
  if (!ts) return "";
  try {
    return format(parseISO(ts), "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return ts;
  }
}

function statusBadge(conv: Conversation) {
  const pd = (conv.patientData ?? {}) as Record<string, unknown>;
  if (pd.urgencia) return { label: "🔴 Urgência", className: "bg-danger/10 text-danger" };
  if ((conv.missingFields ?? []).length > 0) return { label: "🟡 Dados pendentes", className: "bg-warning/10 text-warning" };
  return { label: "🟢 Em atendimento", className: "bg-success/10 text-success" };
}

interface Props {
  conversation: Conversation;
  onClose: () => void;
  onConversationUpdate?: (updated: Conversation) => void;
}

export function PatientProfilePanel({ conversation, onClose, onConversationUpdate }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(conversation.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    setNotes(conversation.notes ?? "");
  }, [conversation.id, conversation.notes]);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      await conversationsApi.updateNotes(conversation.id, notes);
      onConversationUpdate?.({ ...conversation, notes });
      showToastMsg("Observações salvas.");
    } catch (err) {
      showToastMsg(getApiErrorMessage(err));
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleSendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await conversationsApi.reply(conversation.id, reply.trim());
      setReply("");
      setShowReply(false);
      showToastMsg("Mensagem enviada.");
    } catch (err) {
      showToastMsg(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const badge = statusBadge(conversation);
  const pd = (conversation.patientData ?? {}) as Record<string, unknown>;
  const timeline = (conversation.timeline ?? []) as TimelineEvent[];
  const recentTimeline = [...timeline].reverse().slice(0, 8);
  const missing = conversation.missingFields ?? [];
  const name = conversation.patient?.name ?? conversation.patient?.phone ?? "Paciente";

  return (
    <div className="flex h-full w-[380px] min-w-[340px] flex-col border-l border-border bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-primary">{name}</h2>
          <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badge.className)}>
            {badge.label}
          </span>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 border-b border-border px-4 py-3">
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => router.push(`/conversas/${conversation.id}`)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir conversa
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => setShowReply((v) => !v)}
        >
          <Send className="h-3.5 w-3.5" />
          Responder
        </Button>
      </div>

      {/* Quick reply input */}
      {showReply && (
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Digite a mensagem da secretária..."
            rows={2}
          />
          <Button size="sm" onClick={handleSendReply} disabled={sending || !reply.trim()} className="self-end">
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 scrollbar-thin">
        {/* Resumo */}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo</h3>
          <p className={cn("text-sm", conversation.patientSummary ? "italic text-primary" : "italic text-muted-foreground/60")}>
            {conversation.patientSummary ?? "Resumo sendo gerado..."}
          </p>
        </section>

        {/* Dados */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados</h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {PATIENT_DATA_ORDER.map((key) => {
              const val = pd[key];
              const isMissing = !val && missing.includes(key);
              return (
                <div key={key} className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {PATIENT_DATA_LABELS[key] ?? key}
                  </span>
                  {val ? (
                    <span className="text-xs text-primary">{String(val)}</span>
                  ) : (
                    <span className={cn("text-xs", isMissing ? "font-medium text-warning" : "text-muted-foreground/50")}>
                      {isMissing ? "⚠ Pendente" : "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Campos extras do patientData não mapeados */}
          {Object.entries(pd)
            .filter(([k]) => !PATIENT_DATA_ORDER.includes(k) && k !== "urgencia")
            .map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="font-medium capitalize text-muted-foreground">{k}:</span>
                <span className="text-primary">{String(v ?? "")}</span>
              </div>
            ))}
        </section>

        {/* Próxima ação */}
        {conversation.nextAction && (
          <section className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próxima ação da IA</h3>
            <span className="inline-flex w-fit items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              {conversation.nextAction}
            </span>
          </section>
        )}

        {/* Linha do tempo */}
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3 w-3" />
            Linha do tempo
          </h3>
          {recentTimeline.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">Nenhum evento ainda.</p>
          ) : (
            <ol className="flex flex-col gap-1.5 border-l-2 border-border pl-3">
              {recentTimeline.map((ev, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">{formatTimestamp(ev.timestamp)}</span>
                  <span className="text-xs text-primary">{ev.event}</span>
                  {ev.detail && <span className="text-[11px] text-muted-foreground">{ev.detail}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Observações */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas internas da secretária..."
            rows={3}
          />
          <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving} className="self-end">
            {notesSaving ? "Salvando..." : "Salvar"}
          </Button>
        </section>
      </div>

      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white shadow">
          {toast}
        </div>
      )}
    </div>
  );
}
