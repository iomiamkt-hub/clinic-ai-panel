"use client";

import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Conversation, Message } from "@/types";

// ── Normalise any message shape the API might return ──────────────────────────

type RawMsg = Record<string, unknown>;

type NormSender = "PATIENT" | "LORENA" | "HUMAN";

interface NormMessage {
  id: string;
  sender: NormSender;
  content: string;
  ts: string | null;
}

function normaliseSender(raw: RawMsg): NormSender {
  const s = String(raw.sender ?? "");
  if (s === "PATIENT") return "PATIENT";
  if (s === "LORENA") return "LORENA";
  if (s === "HUMAN") return "HUMAN";

  // role field (USER / ASSISTANT)
  const role = String(raw.role ?? "").toUpperCase();
  if (role === "USER") return "PATIENT";
  if (role === "ASSISTANT") {
    const c = String(raw.content ?? "");
    if (/^\[SECRETARIA\]/i.test(c)) return "HUMAN";
    return "LORENA";
  }

  // direction field
  const dir = String(raw.direction ?? "").toUpperCase();
  if (dir === "INBOUND") return "PATIENT";
  if (dir === "OUTBOUND") return "LORENA";

  return "PATIENT"; // safe fallback — renders something rather than nothing
}

function normalise(msgs: unknown[]): NormMessage[] {
  return msgs.map((m, i) => {
    const raw = (m ?? {}) as RawMsg;
    const content = String(raw.content ?? raw.text ?? raw.body ?? "");
    const ts = (raw.sentAt ?? raw.createdAt ?? raw.timestamp ?? null) as string | null;
    return {
      id: String(raw.id ?? i),
      sender: normaliseSender(raw),
      content,
      ts,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: string | null): string {
  if (!ts) return "";
  try { return format(parseISO(ts), "HH:mm", { locale: ptBR }); } catch { return ""; }
}

function cleanContent(content: string): string {
  return content.replace(/^\[SECRETARIA\]\s*/i, "").trim();
}

function isSystemLine(content: string): boolean {
  if (!content.trim()) return true;
  const lc = content.toLowerCase();
  return lc.startsWith("[motor]") || lc.startsWith("[system]") || lc.startsWith("[sistema]");
}

function initials(name?: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── System divider ────────────────────────────────────────────────────────────

function SystemChip({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="shrink-0 rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
        ⚙️ {text.replace(/^\[(motor|system|sistema)\]\s*/i, "") || "Evento do sistema"}
      </span>
      <div className="h-px flex-1 bg-border" />
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

export function MessageHistory({ messages, conversation }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  const patientName = conversation?.patient?.name ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
    prevLen.current = messages.length;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > prevLen.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLen.current = messages.length;
  }, [messages.length]);

  const normed = normalise(messages as unknown as RawMsg[]);

  if (normed.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-1 pb-2">
      {normed.map((msg) => {
        const content = cleanContent(msg.content);

        if (isSystemLine(msg.content)) {
          return <SystemChip key={msg.id} text={msg.content} />;
        }

        if (msg.sender === "PATIENT") {
          return (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <span className="mt-2 px-1 text-[10px] font-semibold text-muted-foreground">
                {patientName ?? "Paciente"}
              </span>
              <div className="flex items-end gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                  {initials(patientName)}
                </div>
                <div className="flex max-w-[75%] flex-col gap-0.5">
                  <div
                    className="border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                    style={{ borderRadius: "4px 16px 16px 16px" }}
                  >
                    {content || msg.content}
                  </div>
                  <span className="px-1 text-[10px] text-gray-400">{fmtTime(msg.ts)}</span>
                </div>
              </div>
            </div>
          );
        }

        if (msg.sender === "LORENA") {
          return (
            <div key={msg.id} className="flex flex-col items-end gap-0.5">
              <span className="mt-2 px-1 text-[10px] font-semibold text-blue-500">🤖 Lorena IA</span>
              <div className="flex max-w-[75%] flex-col items-end gap-0.5">
                <div
                  className="border-l-[3px] border-blue-500 bg-blue-50 px-3 py-2 text-sm text-gray-900"
                  style={{ borderRadius: "16px 4px 16px 16px" }}
                >
                  {content || msg.content}
                </div>
                <span className="px-1 text-[10px] text-gray-400">{fmtTime(msg.ts)}</span>
              </div>
            </div>
          );
        }

        if (msg.sender === "HUMAN") {
          return (
            <div key={msg.id} className="flex flex-col items-end gap-0.5">
              <span className="mt-2 px-1 text-[10px] font-semibold text-green-600">👩‍💼 Secretária</span>
              <div className="flex max-w-[75%] flex-col items-end gap-0.5">
                <div
                  className="border-l-[3px] border-green-500 bg-green-50 px-3 py-2 text-sm text-gray-900"
                  style={{ borderRadius: "16px 4px 16px 16px" }}
                >
                  {content || msg.content}
                </div>
                <span className="px-1 text-[10px] text-gray-400">{fmtTime(msg.ts)}</span>
              </div>
            </div>
          );
        }

        return null;
      })}

      <div ref={bottomRef} />
    </div>
  );
}
