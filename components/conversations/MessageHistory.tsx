"use client";

import { useEffect, useRef, useState } from "react";
import { differenceInMinutes, differenceInSeconds, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookmarkPlus, Copy, MoreVertical, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, Message, TimelineEvent } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

type ExtMessage = Message & { sentAt?: string };

function msgTs(msg: ExtMessage): string | null {
  return msg.sentAt ?? msg.createdAt ?? null;
}

function fmtTime(v?: string | null) {
  if (!v) return "";
  try { return format(parseISO(v), "HH:mm", { locale: ptBR }); } catch { return ""; }
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/** True → render as centred system chip instead of bubble */
function isSystemMsg(msg: ExtMessage): boolean {
  const c = (msg.content ?? "").trim();
  if (!c) return true;
  const lc = c.toLowerCase();
  return lc.startsWith("[motor]") || lc.startsWith("[system]") || lc.startsWith("[sistema]");
}

/** Strip [SECRETARIA] prefix */
function cleanContent(content?: string | null): string {
  if (!content) return "";
  return content.replace(/^\[SECRETARIA\]\s*/i, "").trim();
}

/** Inline event chip text derived from a LORENA message's content */
function derivedSystemEvent(msg: ExtMessage): string | null {
  if (msg.sender !== "LORENA") return null;
  const c = (msg.content ?? "").toLowerCase();
  if (/horár|horario|agenda/.test(c)) {
    const m = c.match(/(\d+)\s*(horár|slot|vaga)/);
    return m ? `🗓️ Agenda consultada · ${m[1]} horário(s) encontrado(s)` : "🗓️ Agenda consultada";
  }
  if (/agendamento confirmado|agendamento realizado|confirmo o agendamento/.test(c)) return "✅ Agendamento confirmado";
  return null;
}

/** Derived event when HUMAN takes over */
function humanTakeoverEvent(msg: ExtMessage, prev: ExtMessage | null): string | null {
  if (msg.sender !== "HUMAN") return null;
  if (prev?.sender === "HUMAN") return null; // already showing for prev block
  return "👩‍💼 Atendimento assumido pela secretária";
}

/** Memory tags to show below a PATIENT message */
function memoryTags(
  msg: ExtMessage,
  timeline: TimelineEvent[],
): { label: string; cls: string }[] {
  if (msg.sender !== "PATIENT") return [];
  const ts = msgTs(msg);
  if (!ts) return [];
  let msgDate: Date;
  try { msgDate = parseISO(ts); } catch { return []; }

  return timeline
    .filter((ev) => {
      try { return Math.abs(differenceInMinutes(parseISO(ev.timestamp), msgDate)) <= 2; }
      catch { return false; }
    })
    .map((ev) => {
      const e = ev.event.toLowerCase();
      const detail = ev.detail ? `: ${ev.detail}` : "";
      if (e.includes("nome")) return { label: `👤 Nome${detail}`, cls: "bg-gray-100 text-gray-700" };
      if (e.includes("convênio") || e.includes("convenio")) return { label: `💳 Convênio${detail}`, cls: "bg-blue-100 text-blue-700" };
      if (e.includes("data") || e.includes("período") || e.includes("periodo")) return { label: `📅 ${ev.event}${detail}`, cls: "bg-green-100 text-green-700" };
      if (e.includes("unidade")) return { label: `🏥 Unidade${detail}`, cls: "bg-purple-100 text-purple-700" };
      if (e.includes("urgência") || e.includes("urgencia")) return { label: `⚠️ Urgência relatada`, cls: "bg-red-100 text-red-700 animate-pulse" };
      return { label: `🏷️ ${ev.event}`, cls: "bg-gray-100 text-gray-600" };
    });
}

/** True → hide label/avatar (consecutive same sender within 2 min) */
function grouped(prev: ExtMessage | null, curr: ExtMessage): boolean {
  if (!prev || prev.sender !== curr.sender) return false;
  const a = msgTs(prev), b = msgTs(curr);
  if (!a || !b) return false;
  try { return Math.abs(differenceInMinutes(parseISO(a), parseISO(b))) < 2; }
  catch { return false; }
}

// ── System chip ───────────────────────────────────────────────────────────────

function SystemChip({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="shrink-0 rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
        {text}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ── Hover menu ────────────────────────────────────────────────────────────────

function MessageMenu({
  content,
  sender,
  onSaveAsNote,
}: {
  content: string;
  sender: Message["sender"];
  onSaveAsNote: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 flex min-w-[160px] flex-col rounded-lg border border-border bg-white py-1 shadow-lg">
            <button
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              onClick={() => { onSaveAsNote(content); setOpen(false); }}
            >
              <BookmarkPlus className="h-3 w-3" /> Salvar como nota
            </button>
            <button
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              onClick={() => { navigator.clipboard.writeText(content); setOpen(false); }}
            >
              <Copy className="h-3 w-3" /> Copiar texto
            </button>
            {sender === "PATIENT" && (
              <button
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <Star className="h-3 w-3" /> Marcar como importante
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 self-start">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm">🤖</div>
      <div className="flex items-center gap-1.5 rounded-2xl bg-blue-50 px-4 py-2.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
        <span className="ml-1 text-xs text-blue-500">Lorena está digitando...</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  messages: Message[];
  conversation: Conversation | null;
  aiEnabled: boolean;
  onSaveAsNote: (text: string) => void;
}

export function MessageHistory({ messages, conversation, aiEnabled, onSaveAsNote }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const timeline = (conversation?.timeline ?? []) as TimelineEvent[];
  const patientName = conversation?.patient?.name ?? null;

  // Initial scroll (instant)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
    prevLenRef.current = messages.length;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth scroll on new messages
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  // Typing indicator: aiEnabled + last msg is PATIENT + < 30s ago
  const showTyping = (() => {
    if (!aiEnabled) return false;
    const last = messages[messages.length - 1] as ExtMessage | undefined;
    if (!last || last.sender !== "PATIENT") return false;
    const ts = msgTs(last);
    if (!ts) return false;
    try { return differenceInSeconds(new Date(), parseISO(ts)) < 30; }
    catch { return false; }
  })();

  if (messages.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>;
  }

  const extMsgs = messages as ExtMessage[];

  return (
    <div className="flex flex-col gap-1 pb-2">
      {extMsgs.map((msg, idx) => {
        const prev = idx > 0 ? extMsgs[idx - 1] : null;
        const isGrouped = grouped(prev, msg);
        const content = cleanContent(msg.content);
        const ts = msgTs(msg);

        // System message → chip only
        if (isSystemMsg(msg)) {
          const text = content.replace(/^\[(motor|system|sistema)\]\s*/i, "") || "Evento do sistema";
          return <SystemChip key={msg.id ?? idx} text={`⚙️ ${text}`} />;
        }

        // Derived system event chips (before this bubble)
        const sysEvent = derivedSystemEvent(msg);
        const takeoverEvent = humanTakeoverEvent(msg, prev);

        // Memory tags (after PATIENT bubble)
        const tags = memoryTags(msg, timeline);

        // Render
        if (msg.sender === "PATIENT") {
          return (
            <div key={msg.id ?? idx} className="flex flex-col gap-1">
              {!isGrouped && (
                <span className="mt-2 px-1 text-[10px] font-semibold text-muted-foreground">
                  {patientName ?? "Paciente"}
                </span>
              )}
              <div className="group flex items-end gap-2">
                {/* Avatar — only on first of group */}
                {!isGrouped ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                    {initials(patientName)}
                  </div>
                ) : (
                  <div className="w-7 shrink-0" />
                )}
                <div className="flex max-w-[75%] flex-col gap-1">
                  <div
                    className="rounded-[4px_16px_16px_16px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    style={{ borderRadius: "4px 16px 16px 16px" }}
                  >
                    {content}
                  </div>
                  <span className="px-1 text-[10px] text-gray-400">{fmtTime(ts)}</span>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t, i) => (
                        <span key={i} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", t.cls)}>
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <MessageMenu content={content} sender="PATIENT" onSaveAsNote={onSaveAsNote} />
              </div>
            </div>
          );
        }

        if (msg.sender === "LORENA") {
          return (
            <div key={msg.id ?? idx} className="flex flex-col gap-1">
              {sysEvent && <SystemChip text={sysEvent} />}
              {!isGrouped && (
                <span className="mt-2 self-end px-1 text-[10px] font-semibold text-blue-500">🤖 Lorena IA</span>
              )}
              <div className="group flex items-end justify-end gap-2">
                <MessageMenu content={content} sender="LORENA" onSaveAsNote={onSaveAsNote} />
                <div className="flex max-w-[75%] flex-col items-end gap-1">
                  <div
                    className="border-l-[3px] border-blue-500 bg-blue-50 px-3 py-2 text-sm text-gray-900"
                    style={{ borderRadius: "16px 4px 16px 16px" }}
                  >
                    {content}
                  </div>
                  <span className="px-1 text-[10px] text-gray-400">{fmtTime(ts)}</span>
                </div>
              </div>
            </div>
          );
        }

        if (msg.sender === "HUMAN") {
          return (
            <div key={msg.id ?? idx} className="flex flex-col gap-1">
              {takeoverEvent && <SystemChip text={takeoverEvent} />}
              {!isGrouped && (
                <span className="mt-2 self-end px-1 text-[10px] font-semibold text-green-600">
                  {initials("Secretária")} Secretária
                </span>
              )}
              <div className="group flex items-end justify-end gap-2">
                <MessageMenu content={content} sender="HUMAN" onSaveAsNote={onSaveAsNote} />
                <div className="flex max-w-[75%] flex-col items-end gap-1">
                  <div
                    className="border-l-[3px] border-green-500 bg-green-50 px-3 py-2 text-sm text-gray-900"
                    style={{ borderRadius: "16px 4px 16px 16px" }}
                  >
                    {content}
                  </div>
                  <span className="px-1 text-[10px] text-gray-400">{fmtTime(ts)}</span>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}

      {showTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
