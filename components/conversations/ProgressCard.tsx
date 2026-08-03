"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConversationMemory {
  conversationId?: string;
  patientFields?: Record<string, unknown>;
  conversationFields?: Record<string, unknown>;
  flags?: Record<string, unknown>;
  currentState?: string | null;
  nextAction?: string | null;
  missingFields?: string[];
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGE_PT: Record<string, string> = {
  WELCOME:                 "Saudação",
  COLLECTING:              "Coletando dados",
  CHECKING:                "Verificando agenda",
  CHOOSING:                "Escolhendo horário",
  COLLECTING_COMPLEMENT:   "Dados finais",
  CONFIRMING:              "Confirmando",
  BOOKING:                 "Registrando",
  FINISHED:                "Concluído",
  WAITING_HUMAN:           "Com secretária",
  // aliases from old AI state names
  GREETING:                "Saudação",
  QUALIFYING:              "Coletando dados",
  CHECKING_AVAILABILITY:   "Verificando agenda",
  COMPLETED:               "Concluído",
  ESCALATED:               "Com secretária",
};

type StageColor = "blue" | "yellow" | "orange" | "green" | "gray" | "purple";

const STAGE_COLOR: Record<string, StageColor> = {
  WELCOME:               "blue",
  GREETING:              "blue",
  COLLECTING:            "blue",
  QUALIFYING:            "blue",
  CHECKING:              "yellow",
  CHECKING_AVAILABILITY: "yellow",
  CHOOSING:              "yellow",
  COLLECTING_COMPLEMENT: "orange",
  CONFIRMING:            "green",
  BOOKING:               "green",
  FINISHED:              "gray",
  COMPLETED:             "gray",
  WAITING_HUMAN:         "purple",
  ESCALATED:             "purple",
};

const TOOL_BY_STAGE: Record<string, string | null> = {
  CHECKING:              "check_availability",
  CHECKING_AVAILABILITY: "check_availability",
  BOOKING:               "book_appointment",
  CONFIRMING:            "book_appointment",
  WAITING_HUMAN:         "escalate_to_human",
  ESCALATED:             "escalate_to_human",
};

const COLOR_STYLES: Record<StageColor, { badge: string; bar: string; dot: string }> = {
  blue:   { badge: "bg-blue-100 text-blue-700",   bar: "bg-blue-400",   dot: "bg-blue-400" },
  yellow: { badge: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-400", dot: "bg-yellow-400" },
  orange: { badge: "bg-orange-100 text-orange-700", bar: "bg-orange-400", dot: "bg-orange-400" },
  green:  { badge: "bg-green-100 text-green-700",  bar: "bg-green-500",  dot: "bg-green-500" },
  gray:   { badge: "bg-gray-100 text-gray-600",    bar: "bg-gray-300",   dot: "bg-gray-400" },
  purple: { badge: "bg-purple-100 text-purple-700", bar: "bg-purple-500", dot: "bg-purple-500" },
};

// ── Field definitions ─────────────────────────────────────────────────────────

interface FieldDef {
  key: string;           // display label
  paths: string[];       // keys in patientFields/conversationFields to check
}

const FIELD_DEFS: FieldDef[] = [
  { key: "Nome",          paths: ["nome_completo", "nome", "name"] },
  { key: "Telefone",      paths: ["telefone", "phone"] },
  { key: "Unidade",       paths: ["unidade", "unit"] },
  { key: "Data preferida",paths: ["data_preferida", "data", "date"] },
  { key: "Período",       paths: ["periodo", "period"] },
  { key: "Convênio",      paths: ["convenio", "plano", "insurance", "particular"] },
  { key: "Nascimento",    paths: ["data_nascimento", "nascimento", "birthdate"] },
  { key: "Horário",       paths: ["horario", "slot", "slotRuntime"] },
];

function hasField(fields: Record<string, unknown>, paths: string[]): boolean {
  return paths.some((p) => {
    const v = fields[p];
    if (v == null) return false;
    if (typeof v === "object" && !Array.isArray(v)) {
      // handle slotRuntime.selected
      const o = v as Record<string, unknown>;
      return Object.values(o).some((val) => val != null && val !== "");
    }
    return String(v).trim() !== "";
  });
}

// ── Mini badge (exported for KanbanCard use) ──────────────────────────────────

export function StageMiniBar({
  stage,
  missingCount,
}: {
  stage?: string | null;
  missingCount: number;
}) {
  if (!stage) return null;
  const color = STAGE_COLOR[stage] ?? "blue";
  const styles = COLOR_STYLES[color];
  const label = STAGE_PT[stage] ?? stage;

  return (
    <div className="flex flex-col gap-1 pt-0.5">
      <div className={cn("h-1 w-full overflow-hidden rounded-full bg-muted")}>
        <div className={cn("h-full rounded-full", styles.bar)} style={{ width: "100%" }} />
      </div>
      <span className="text-[9px] font-semibold text-muted-foreground">
        {label.toUpperCase()}
        {missingCount > 0 ? ` • ${missingCount} campo${missingCount > 1 ? "s" : ""} pendente${missingCount > 1 ? "s" : ""}` : " • aguardando confirmação"}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ProgressCardProps {
  conversationId: string;
  patientName?: string | null;
  /** Optional: pass currentState from conversation to avoid extra fetch */
  currentState?: string | null;
}

export function ProgressCard({ conversationId, patientName, currentState: initialState }: ProgressCardProps) {
  const [memory, setMemory] = useState<ConversationMemory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}/memory`,
        );
        if (res.ok && !cancelled) {
          const json = await res.json();
          setMemory(json);
        }
      } catch {
        // silently keep null
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    fetch_();
    const interval = setInterval(fetch_, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [conversationId]);

  const stage = memory?.currentState ?? initialState ?? null;
  const color: StageColor = (stage ? STAGE_COLOR[stage] : undefined) ?? "blue";
  const styles = COLOR_STYLES[color];
  const stageLabel = stage ? (STAGE_PT[stage] ?? stage) : "—";
  const nextTool = stage ? (TOOL_BY_STAGE[stage] ?? null) : null;

  // Merge patientFields + conversationFields for field resolution
  const allFields: Record<string, unknown> = {
    ...(memory?.patientFields ?? {}),
    ...(memory?.conversationFields ?? {}),
  };

  if (loading) {
    return (
      <div className="h-36 animate-pulse rounded-xl bg-muted" />
    );
  }

  // When there's no memory data at all, render a minimal placeholder
  if (!memory) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">Memória da IA não disponível para esta conversa.</p>
      </div>
    );
  }

  const fieldRows = FIELD_DEFS.map((def) => ({
    key: def.key,
    filled: hasField(allFields, def.paths),
  }));

  const filled = fieldRows.filter((f) => f.filled).length;
  const total = fieldRows.length;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {/* Header: name + stage */}
      <div className={cn("flex items-center justify-between px-4 py-2.5", styles.badge)}>
        <span className="text-sm font-bold text-foreground truncate pr-2">
          {patientName ?? "Paciente"}
        </span>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold", styles.badge)}>
          Etapa: {stageLabel}
        </span>
      </div>

      {/* Field grid */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 px-4 py-3">
        {fieldRows.map(({ key, filled: ok }) => (
          <div key={key} className="flex items-center gap-1 text-xs">
            <span className={ok ? "text-success" : "text-danger/60"}>{ok ? "✅" : "❌"}</span>
            <span className={ok ? "text-foreground font-medium" : "text-muted-foreground"}>{key}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", styles.bar)}
            style={{ width: `${Math.round((filled / total) * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{filled}/{total} campos coletados</span>
      </div>

      {/* Footer: next action + tool */}
      {(memory.nextAction || nextTool) && (
        <div className="flex flex-col gap-1 border-t border-border px-4 py-2.5">
          {memory.nextAction && (
            <div className="flex items-start gap-2 text-xs">
              <span className="shrink-0 font-semibold text-muted-foreground">Próxima ação:</span>
              <span className="text-foreground">{memory.nextAction}</span>
            </div>
          )}
          {nextTool && (
            <div className="flex items-center gap-2 text-xs">
              <span className="shrink-0 font-semibold text-muted-foreground">Tool seguinte:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-secondary">{nextTool}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
