"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Unidade {
  nome: string;
  cidade: string;
  telefone: string;
  endereco: string;
}

type ScriptedMode = "auto" | "guided" | "fixed";
interface ScriptedMessage {
  mode: ScriptedMode;
  fixedText?: string;
  guidedText?: string;
}
type ScriptedMessages = Record<string, ScriptedMessage>;

// Which collection a configurable field belongs to (or none)
type WhenToAsk = "checking" | "complement" | "novoOnly" | "never";

// Per-field UI state: where + how
interface FieldConfig {
  whenToAsk: WhenToAsk;
  mode: ScriptedMode;
  fixedText: string;
  guidedText: string;
}

interface BehaviorConfig {
  // Identidade
  nomeIA: string;
  personalidade: string;
  usarEmojis: boolean;
  tratamentoInformal: boolean;
  tratamentoFormal: boolean;
  // Clínica
  nomeClinica: string;
  medicoResponsavel: string;
  especialidade: string;
  unidades: Unidade[];
  convenios: string[];
  // Regras
  confirmarAgendamento: boolean;
  mensagensCurtas: boolean;
  nuncaInformarValores: boolean;
  encaminharUrgencias: boolean;
  perguntarConvenio: boolean;
  // Conhecimento
  conhecimento: string;
  // Restrições
  restricoes: string[];
  // Conteúdo clínico
  preConsultaInstructions: string;
  newPatientMessage: string;
  waitlistInstructions: string;
  // Fluxo e Abordagem — unified per-field config
  fieldsConfig: Record<string, FieldConfig>;
  // Ordered list of keys for "Antes de verificar agenda" (includes CHECKING_ALWAYS + checking configurable fields)
  checkingOrder: string[];
  // Event messages (saudacao_inicial etc.)
  scriptedMessages: ScriptedMessages;
}

// ── Flow field definitions ─────────────────────────────────────────────────────

const CHECKING_ALWAYS = ["nome_completo", "unidade"];
const CHECKING_ALWAYS_LABELS: Record<string, string> = {
  nome_completo: "Nome completo",
  unidade: "Unidade",
};
const DEFAULT_CHECKING_ORDER = [
  "nome_completo",
  "unidade",
  ...["data_preferida", "periodo_preferido", "classificacao"],
];

// Fields eligible for "Só paciente novo" option in the dropdown
const NOVO_ONLY_ELIGIBLE = new Set(["cpf", "rg", "endereco", "email", "profissao", "filiacao"]);

interface FieldDef {
  key: string;
  label: string;
  defaultWhen: WhenToAsk;
}

const CONFIGURABLE_FIELDS: FieldDef[] = [
  { key: "data_preferida",    label: "Data preferida",          defaultWhen: "checking"   },
  { key: "periodo_preferido", label: "Período/horário",         defaultWhen: "checking"   },
  { key: "classificacao",     label: "Classificação",           defaultWhen: "checking"   },
  { key: "convenio",          label: "Convênio",                defaultWhen: "complement" },
  { key: "motivo",            label: "Motivo da consulta",      defaultWhen: "complement" },
  { key: "data_nascimento",   label: "Data de nascimento",      defaultWhen: "complement" },
  { key: "cpf",               label: "CPF",                     defaultWhen: "novoOnly"   },
  { key: "rg",                label: "RG",                      defaultWhen: "novoOnly"   },
  { key: "endereco",          label: "Endereço",                defaultWhen: "novoOnly"   },
  { key: "email",             label: "E-mail",                  defaultWhen: "novoOnly"   },
  { key: "profissao",         label: "Profissão",               defaultWhen: "novoOnly"   },
  { key: "filiacao",          label: "Filiação",                defaultWhen: "novoOnly"   },
];

const EVENT_FIELDS: { key: string; label: string }[] = [
  { key: "saudacao_inicial",        label: "Saudação inicial" },
  { key: "confirmacao_agendamento", label: "Confirmação do agendamento" },
  { key: "encerramento",            label: "Encerramento" },
  { key: "transferencia_humano",    label: "Transferência para atendimento humano" },
];

const WHEN_OPTIONS: { value: WhenToAsk; label: string }[] = [
  { value: "checking",   label: "Antes de verificar agenda" },
  { value: "complement", label: "Depois de escolher horário" },
  { value: "novoOnly",   label: "Só paciente novo" },
  { value: "never",      label: "Não perguntar" },
];

const DEFAULT_CONFIG: BehaviorConfig = {
  nomeIA: "Lorena",
  personalidade: "",
  usarEmojis: true,
  tratamentoInformal: true,
  tratamentoFormal: false,
  nomeClinica: "",
  medicoResponsavel: "",
  especialidade: "",
  unidades: [],
  convenios: [],
  confirmarAgendamento: true,
  mensagensCurtas: true,
  nuncaInformarValores: false,
  encaminharUrgencias: true,
  perguntarConvenio: false,
  conhecimento: "",
  preConsultaInstructions: "",
  newPatientMessage: "",
  waitlistInstructions: "",
  fieldsConfig: Object.fromEntries(
    CONFIGURABLE_FIELDS.map((f) => [
      f.key,
      { whenToAsk: f.defaultWhen, mode: "auto" as ScriptedMode, fixedText: "", guidedText: "" },
    ]),
  ),
  checkingOrder: DEFAULT_CHECKING_ORDER,
  scriptedMessages: Object.fromEntries(
    EVENT_FIELDS.map((f) => [f.key, { mode: "auto" as ScriptedMode, fixedText: "", guidedText: "" }]),
  ),
  restricoes: [
    "Nunca emitir diagnóstico médico",
    "Nunca prometer disponibilidade sem verificar",
    "Nunca alterar agendamento sem confirmação",
  ],
};

// ── Parse API response → BehaviorConfig ───────────────────────────────────────
// Backend canonical names (post-consolidation) are English camelCase flat fields.
// Legacy Portuguese / nested aliases are kept as fallback for old data.

function parseApiResponse(data: Record<string, unknown>): Partial<BehaviorConfig> {
  const parsed: Partial<BehaviorConfig> = {};

  // Nested fallback objects (legacy backend shape — may no longer be returned)
  const ident = (data.personalidade as Record<string, unknown> | undefined) ?? {};
  const info  = (data.informacoesClinica as Record<string, unknown> | undefined) ?? {};
  const rules = (
    (data.regrasAtendimento as Record<string, unknown> | undefined) ??
    (data.rules as Record<string, unknown> | undefined) ??
    {}
  );

  // ── Identidade ──────────────────────────────────────────────────────────────
  parsed.nomeIA             = String(data.nomeIA ?? ident.nomeIA ?? DEFAULT_CONFIG.nomeIA);
  // `personalidade` at top-level is the string description when the backend is flat
  const persValue = typeof data.personalidade === "string" ? data.personalidade : (ident.personalidade ?? "");
  parsed.personalidade      = String(persValue);
  parsed.usarEmojis         = Boolean(data.usarEmojis ?? ident.usarEmojis ?? true);
  parsed.tratamentoInformal = Boolean(data.tratamentoInformal ?? ident.tratamentoInformal ?? true);
  parsed.tratamentoFormal   = Boolean(data.tratamentoFormal ?? ident.tratamentoFormal ?? false);

  // ── Clínica — canonical English names, Portuguese legacy as fallback ─────────
  parsed.nomeClinica       = String(data.clinicName ?? data.nomeClinica ?? info.nomeClinica ?? "");
  parsed.medicoResponsavel = String(data.doctorName ?? data.medicoResponsavel ?? info.medicoResponsavel ?? "");
  parsed.especialidade     = String(data.specialty ?? data.especialidade ?? info.especialidade ?? "");

  const unitsRaw = data.units ?? data.unidades ?? info.unidades;
  parsed.unidades = Array.isArray(unitsRaw) ? (unitsRaw as Unidade[]) : [];

  // `insurances` is the canonical field; `convenios` / `informacoesClinica.convenios` are legacy
  const insRaw = data.insurances ?? data.convenios ?? info.convenios;
  parsed.convenios = Array.isArray(insRaw) ? (insRaw as string[]) : [];

  // ── Regras ──────────────────────────────────────────────────────────────────
  parsed.confirmarAgendamento = Boolean(data.confirmarAgendamento ?? rules.confirmarAgendamento ?? true);
  parsed.mensagensCurtas      = Boolean(data.mensagensCurtas ?? rules.mensagensCurtas ?? true);
  parsed.nuncaInformarValores = Boolean(data.nuncaInformarValores ?? rules.nuncaInformarValores ?? false);
  parsed.encaminharUrgencias  = Boolean(data.encaminharUrgencias ?? rules.encaminharUrgencias ?? true);
  parsed.perguntarConvenio    = Boolean(
    data.askInsuranceBeforeAvailability ??
    rules.askInsuranceBeforeAvailability ??
    data.perguntarConvenio ??
    rules.perguntarConvenio ??
    false,
  );

  // ── Conhecimento / Restrições — canonical English names, Portuguese as fallback
  parsed.conhecimento = String(data.customKnowledge ?? data.conhecimento ?? "");
  const restRaw = data.restrictions ?? data.restricoes;
  parsed.restricoes = Array.isArray(restRaw) ? (restRaw as string[]) : DEFAULT_CONFIG.restricoes;

  // ── Conteúdo clínico ─────────────────────────────────────────────────────────
  const cc = (data.clinicalContent as Record<string, unknown> | undefined) ?? {};
  parsed.preConsultaInstructions = String(cc.preConsultaInstructions ?? data.preConsultaInstructions ?? "");
  parsed.newPatientMessage       = String(cc.newPatientMessage ?? data.newPatientMessage ?? "");
  parsed.waitlistInstructions    = String(cc.waitlistInstructions ?? data.waitlistInstructions ?? "");

  // ── Fluxo e Abordagem ────────────────────────────────────────────────────────
  const fc = (data.flowConfig as Record<string, unknown> | undefined) ?? {};
  const toStrArr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  const checkingArr   = toStrArr(fc.checkingRequires);
  const complementArr = toStrArr(fc.complementRequires);
  const novoArr       = toStrArr(fc.complementNovoOnlyRequires);

  const sm = (data.scriptedMessages as Record<string, unknown> | undefined) ?? {};
  const parseScripted = (raw: unknown): ScriptedMessage => {
    const r = raw as Record<string, unknown> | undefined;
    if (!r) return { mode: "auto", fixedText: "", guidedText: "" };
    const mode = r.mode === "fixed" ? "fixed" : r.mode === "guided" ? "guided" : "auto";
    return { mode, fixedText: String(r.fixedText ?? ""), guidedText: String(r.guidedText ?? "") };
  };

  // checkingOrder: use backend array order (includes nome_completo, unidade); fallback to default
  parsed.checkingOrder = checkingArr.length > 0 ? checkingArr : DEFAULT_CHECKING_ORDER;

  // Derive fieldsConfig from the three arrays + scriptedMessages
  const parsedFields: Record<string, FieldConfig> = {};
  for (const f of CONFIGURABLE_FIELDS) {
    const whenToAsk: WhenToAsk =
      checkingArr.includes(f.key)   ? "checking"   :
      complementArr.includes(f.key) ? "complement" :
      novoArr.includes(f.key)       ? "novoOnly"   : "never";
    const scripted = parseScripted(sm[f.key]);
    parsedFields[f.key] = {
      whenToAsk,
      mode:       scripted.mode,
      fixedText:  scripted.fixedText ?? "",
      guidedText: scripted.guidedText ?? "",
    };
  }
  parsed.fieldsConfig = parsedFields;

  // Parse event scriptedMessages
  const parsedSm: ScriptedMessages = {};
  for (const f of EVENT_FIELDS) {
    parsedSm[f.key] = parseScripted(sm[f.key]);
  }
  parsed.scriptedMessages = parsedSm;

  return parsed;
}

// ── Build structured payload for POST /api/config/clinic ─────────────────────
// Sends canonical English field names (post-consolidation backend).
// Portuguese aliases are included for backward compat with older backend versions.

function buildPayload(config: BehaviorConfig) {
  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    nomeIA:             config.nomeIA,
    personalidade:      config.personalidade,
    usarEmojis:         config.usarEmojis,
    tratamentoInformal: config.tratamentoInformal,
    tratamentoFormal:   config.tratamentoFormal,

    // ── Clinic info — canonical English names ─────────────────────────────────
    clinicName:        config.nomeClinica,
    doctorName:        config.medicoResponsavel,
    specialty:         config.especialidade,
    units:             config.unidades,
    insurances:        config.convenios,   // canonical field (was convenios)
    // Portuguese aliases (backward compat)
    nomeClinica:       config.nomeClinica,
    medicoResponsavel: config.medicoResponsavel,
    especialidade:     config.especialidade,
    unidades:          config.unidades,
    convenios:         config.convenios,

    // ── Rules ─────────────────────────────────────────────────────────────────
    confirmarAgendamento:           config.confirmarAgendamento,
    mensagensCurtas:                config.mensagensCurtas,
    nuncaInformarValores:           config.nuncaInformarValores,
    encaminharUrgencias:            config.encaminharUrgencias,
    askInsuranceBeforeAvailability: config.perguntarConvenio,
    perguntarConvenio:              config.perguntarConvenio,

    // ── Knowledge / Restrictions — canonical English names ────────────────────
    customKnowledge: config.conhecimento,
    restrictions:    config.restricoes,
    // Portuguese aliases (backward compat)
    conhecimento:    config.conhecimento,
    restricoes:      config.restricoes,

    // ── Clinical content ──────────────────────────────────────────────────────
    clinicalContent: {
      preConsultaInstructions: config.preConsultaInstructions,
      newPatientMessage:       config.newPatientMessage,
      waitlistInstructions:    config.waitlistInstructions,
    },
    preConsultaInstructions: config.preConsultaInstructions,
    newPatientMessage:       config.newPatientMessage,
    waitlistInstructions:    config.waitlistInstructions,

    // ── Flow & scripted messages ───────────────────────────────────────────────
    flowConfig: {
      // Use checkingOrder directly — it already includes CHECKING_ALWAYS and preserves user's chosen order
      checkingRequires: config.checkingOrder,
      complementRequires: CONFIGURABLE_FIELDS
        .filter((f) => config.fieldsConfig[f.key]?.whenToAsk === "complement")
        .map((f) => f.key),
      complementNovoOnlyRequires: CONFIGURABLE_FIELDS
        .filter((f) => config.fieldsConfig[f.key]?.whenToAsk === "novoOnly")
        .map((f) => f.key),
    },
    // scriptedMessages for all configurable fields + event fields
    scriptedMessages: {
      ...Object.fromEntries(
        CONFIGURABLE_FIELDS.map((f) => {
          const fc = config.fieldsConfig[f.key];
          if (!fc || fc.whenToAsk === "never") return [f.key, null];
          return [f.key, { mode: fc.mode, fixedText: fc.fixedText, guidedText: fc.guidedText }];
        }).filter(([, v]) => v !== null),
      ),
      ...config.scriptedMessages,
    },
  };
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded accent-secondary"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-primary">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

function ModeSelector({
  mode,
  onMode,
}: {
  mode: ScriptedMode;
  onMode: (m: ScriptedMode) => void;
}) {
  const opts: { value: ScriptedMode; label: string }[] = [
    { value: "auto",   label: "Automático" },
    { value: "guided", label: "Orientado"  },
    { value: "fixed",  label: "Fixo"       },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/30 p-0.5 text-[11px] font-medium shrink-0">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => onMode(o.value)}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors",
            mode === o.value
              ? o.value === "fixed"  ? "bg-white shadow-sm text-secondary"
              : o.value === "guided" ? "bg-white shadow-sm text-amber-600"
              :                        "bg-white shadow-sm text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ModeTextareas({
  mode,
  fixedText,
  guidedText,
  onFixedText,
  onGuidedText,
}: {
  mode: ScriptedMode;
  fixedText: string;
  guidedText: string;
  onFixedText: (t: string) => void;
  onGuidedText: (t: string) => void;
}) {
  const hint = (
    <p className="text-[10px] text-muted-foreground">
      Use <code className="rounded bg-muted px-1 py-0.5">[Nome]</code> para inserir o nome do paciente automaticamente.
    </p>
  );
  if (mode === "fixed") return (
    <div className="flex flex-col gap-1 pt-1">
      <Textarea value={fixedText} onChange={(e) => onFixedText(e.target.value)} placeholder="Texto exato a ser enviado..." rows={3} />
      {hint}
    </div>
  );
  if (mode === "guided") return (
    <div className="flex flex-col gap-1 pt-1">
      <Textarea value={guidedText} onChange={(e) => onGuidedText(e.target.value)} placeholder="O que a Lorena deve levar em conta ao perguntar isso..." rows={2} />
      {hint}
    </div>
  );
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function BehaviorEditor() {
  const [config, setConfig] = useState<BehaviorConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: "success" | "error" } | null>(null);

  // ── Flow helpers ──────────────────────────────────────────────────────────

  function setFieldWhen(key: string, whenToAsk: WhenToAsk) {
    setConfig((prev) => {
      const wasChecking = prev.fieldsConfig[key]?.whenToAsk === "checking";
      const nowChecking = whenToAsk === "checking";
      let newOrder = prev.checkingOrder;
      if (!wasChecking && nowChecking) {
        // Append to end of checking order
        newOrder = [...prev.checkingOrder, key];
      } else if (wasChecking && !nowChecking) {
        // Remove from checking order
        newOrder = prev.checkingOrder.filter((k) => k !== key);
      }
      return {
        ...prev,
        fieldsConfig: { ...prev.fieldsConfig, [key]: { ...prev.fieldsConfig[key], whenToAsk } },
        checkingOrder: newOrder,
      };
    });
  }

  function moveChecking(key: string, direction: "up" | "down") {
    setConfig((prev) => {
      const arr = [...prev.checkingOrder];
      const idx = arr.indexOf(key);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, checkingOrder: arr };
    });
  }

  function setFieldMode(key: string, mode: ScriptedMode) {
    setConfig((prev) => ({
      ...prev,
      fieldsConfig: { ...prev.fieldsConfig, [key]: { ...prev.fieldsConfig[key], mode } },
    }));
  }

  function setFieldText(key: string, textKey: "fixedText" | "guidedText", value: string) {
    setConfig((prev) => ({
      ...prev,
      fieldsConfig: { ...prev.fieldsConfig, [key]: { ...prev.fieldsConfig[key], [textKey]: value } },
    }));
  }

  function setEventMode(key: string, mode: ScriptedMode) {
    setConfig((prev) => ({
      ...prev,
      scriptedMessages: { ...prev.scriptedMessages, [key]: { ...prev.scriptedMessages[key], mode } },
    }));
  }

  function setEventText(key: string, textKey: "fixedText" | "guidedText", value: string) {
    setConfig((prev) => ({
      ...prev,
      scriptedMessages: { ...prev.scriptedMessages, [key]: { ...prev.scriptedMessages[key], [textKey]: value } },
    }));
  }

  // Convênios
  const [newConvenio, setNewConvenio] = useState("");
  // Restrições
  const [newRestricao, setNewRestricao] = useState("");
  // Prompt preview / edit
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  // ── Load config on mount ───────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/clinic`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          setConfig((prev) => ({
            ...prev,
            ...parseApiResponse(data as Record<string, unknown>),
          }));
        }
      })
      .catch(() => {/* silently use defaults */});
  }, []);

  function set<K extends keyof BehaviorConfig>(key: K, value: BehaviorConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function showToast(msg: string, variant: "success" | "error" = "success") {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch prompt preview from backend (source of truth) ───────────────────

  const fetchPromptPreview = useCallback(async () => {
    setLoadingPrompt(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/prompt`);
      const data = await res.json();
      setPromptText(data?.prompt ?? data?.content ?? JSON.stringify(data, null, 2));
    } catch {
      setPromptText("Erro ao carregar o prompt. Verifique a conexão com o servidor.");
    } finally {
      setLoadingPrompt(false);
    }
  }, []);

  // ── Save — sends structured fields, backend mounts the final prompt text ──

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/clinic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(config)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Configurações salvas com sucesso!");
      // Re-fetch the prompt preview so the displayed text reflects the new build
      if (showPrompt) {
        await fetchPromptPreview();
      }
    } catch {
      showToast("Erro ao salvar configurações. Tente novamente.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePrompt() {
    if (showPrompt) { setShowPrompt(false); return; }
    setShowPrompt(true);
    await fetchPromptPreview();
  }

  async function handleSavePrompt() {
    if (!promptText.trim() || promptText.trim().length < 50) {
      showToast("O texto do prompt parece muito curto. Verifique antes de salvar.", "error");
      return;
    }
    setSavingPrompt(true);
    try {
      // Try key-value endpoint first, fall back to legacy prompt endpoint
      let saved = false;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/key/lorena_prompt`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: promptText }),
        });
        if (res.ok) saved = true;
      } catch { /* try legacy */ }
      if (!saved) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      showToast("Texto do prompt salvo! A Lorena já está usando o novo comportamento.");
    } catch {
      showToast("Erro ao salvar o texto do prompt. Tente novamente.", "error");
    } finally {
      setSavingPrompt(false);
    }
  }

  // ── Unidades helpers ───────────────────────────────────────────────────────

  function addUnidade() {
    set("unidades", [...config.unidades, { nome: "", cidade: "", telefone: "", endereco: "" }]);
  }

  function updateUnidade(idx: number, field: keyof Unidade, value: string) {
    const updated = config.unidades.map((u, i) => (i === idx ? { ...u, [field]: value } : u));
    set("unidades", updated);
  }

  function removeUnidade(idx: number) {
    set("unidades", config.unidades.filter((_, i) => i !== idx));
  }

  // ── Convênios helpers ──────────────────────────────────────────────────────

  function addConvenio() {
    const v = newConvenio.trim();
    if (!v || config.convenios.includes(v)) return;
    set("convenios", [...config.convenios, v]);
    setNewConvenio("");
  }

  function removeConvenio(c: string) {
    set("convenios", config.convenios.filter((x) => x !== c));
  }

  // ── Restrições helpers ─────────────────────────────────────────────────────

  function addRestricao() {
    const v = newRestricao.trim();
    if (!v || config.restricoes.includes(v)) return;
    set("restricoes", [...config.restricoes, v]);
    setNewRestricao("");
  }

  function removeRestricao(r: string) {
    set("restricoes", config.restricoes.filter((x) => x !== r));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* ── Aviso ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              Este painel define o comportamento da IA.
            </p>
            <p className="mt-0.5 text-xs text-blue-600">
              O fluxo do atendimento, memória do paciente, agendamentos e ferramentas são controlados automaticamente pelo sistema.
            </p>
          </div>
        </div>
        <div className="shrink-0 sm:ml-auto">
          <ul className="flex flex-col gap-1">
            {[
              "Fluxo de atendimento",
              "Próxima pergunta",
              "Memória do paciente",
              "Agendamento",
              "Ferramentas",
              "Máquina de estados",
            ].map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-xs text-blue-700">
                <span className="font-bold text-blue-500">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bloco 1: Identidade ── */}
      <SectionCard
        title="Identidade da IA"
        description="Como a assistente se apresenta e se comunica"
      >
        <div className="flex flex-col gap-1">
          <FieldLabel>Nome da IA</FieldLabel>
          <Input
            value={config.nomeIA}
            onChange={(e) => set("nomeIA", e.target.value)}
            placeholder="Lorena"
            className="max-w-xs"
          />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel>Personalidade</FieldLabel>
          <Textarea
            value={config.personalidade}
            onChange={(e) => set("personalidade", e.target.value)}
            placeholder="Fale de forma acolhedora. Use frases curtas."
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Estilo de comunicação</FieldLabel>
          <Toggle checked={config.usarEmojis} onChange={(v) => set("usarEmojis", v)} label="Usar emojis (máximo 1 por mensagem)" />
          <Toggle checked={config.tratamentoInformal} onChange={(v) => set("tratamentoInformal", v)} label='Tratamento informal (você)' />
          <Toggle checked={config.tratamentoFormal} onChange={(v) => set("tratamentoFormal", v)} label='Tratamento formal (senhor/senhora)' />
        </div>
      </SectionCard>

      {/* ── Bloco 2: Informações da clínica ── */}
      <SectionCard
        title="Informações da clínica"
        description="Dados usados automaticamente pela IA"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <FieldLabel>Nome da clínica</FieldLabel>
            <Input value={config.nomeClinica} onChange={(e) => set("nomeClinica", e.target.value)} placeholder="Clínica Novo Olhar" />
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel>Médico/a responsável</FieldLabel>
            <Input value={config.medicoResponsavel} onChange={(e) => set("medicoResponsavel", e.target.value)} placeholder="Dra. Bruna" />
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel>Especialidade</FieldLabel>
            <Input value={config.especialidade} onChange={(e) => set("especialidade", e.target.value)} placeholder="Oftalmologia" />
          </div>
        </div>

        {/* Unidades */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Unidades</FieldLabel>
          {config.unidades.map((u, idx) => (
            <div key={idx} className="relative rounded-lg border border-border bg-muted/30 p-3">
              <button
                onClick={() => removeUnidade(idx)}
                className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Nome</span>
                  <Input value={u.nome} onChange={(e) => updateUnidade(idx, "nome", e.target.value)} placeholder="Unidade Centro" className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Cidade</span>
                  <Input value={u.cidade} onChange={(e) => updateUnidade(idx, "cidade", e.target.value)} placeholder="Salvador" className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Telefone</span>
                  <Input value={u.telefone} onChange={(e) => updateUnidade(idx, "telefone", e.target.value)} placeholder="(71) 3333-4444" className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Endereço</span>
                  <Input value={u.endereco} onChange={(e) => updateUnidade(idx, "endereco", e.target.value)} placeholder="Rua das Flores, 100" className="h-8 text-xs" />
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addUnidade} className="w-fit gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Adicionar unidade
          </Button>
        </div>

        {/* Convênios */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Convênios aceitos</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {config.convenios.map((c) => (
              <span key={c} className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {c}
                <button onClick={() => removeConvenio(c)} className="text-blue-400 hover:text-blue-700">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newConvenio}
              onChange={(e) => setNewConvenio(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addConvenio(); } }}
              placeholder="Ex: Unimed, Bradesco Saúde..."
              className="max-w-xs"
            />
            <Button variant="outline" size="sm" onClick={addConvenio} disabled={!newConvenio.trim()} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* ── Bloco 3: Regras ── */}
      <SectionCard
        title="Regras do atendimento"
        description="Comportamentos automáticos da IA"
      >
        <div className="flex flex-col gap-3">
          <Toggle checked={config.confirmarAgendamento} onChange={(v) => set("confirmarAgendamento", v)} label="Confirmar com o paciente antes de registrar o agendamento" />
          <Toggle checked={config.mensagensCurtas} onChange={(v) => set("mensagensCurtas", v)} label="Priorizar mensagens curtas e objetivas" />
          <Toggle checked={config.nuncaInformarValores} onChange={(v) => set("nuncaInformarValores", v)} label="Nunca informar valores ou preços" />
          <Toggle checked={config.encaminharUrgencias} onChange={(v) => set("encaminharUrgencias", v)} label="Encaminhar urgências para atendimento humano" />

          {/* Convênio checkbox — with hint about recommended value */}
          <div className="flex flex-col gap-1">
            <Toggle
              checked={config.perguntarConvenio}
              onChange={(v) => set("perguntarConvenio", v)}
              label="Perguntar convênio antes de verificar agenda"
            />
            <p className="ml-6 text-[11px] text-muted-foreground">
              Recomendado: deixar <strong>desmarcado</strong> — o convênio é perguntado automaticamente após o paciente escolher o horário.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── Bloco 4: Conhecimento ── */}
      <SectionCard
        title="Conhecimento da clínica"
        description="Informações específicas que a IA deve conhecer"
      >
        <Textarea
          value={config.conhecimento}
          onChange={(e) => set("conhecimento", e.target.value)}
          placeholder="Ex: A Dra. Bruna orienta pacientes com catarata a levarem exames recentes. O estacionamento fica ao lado da clínica. Não atendemos crianças menores de 5 anos."
          rows={5}
        />
      </SectionCard>

      {/* ── Bloco 5: Restrições ── */}
      <SectionCard
        title="Restrições"
        description="O que a IA nunca deve fazer"
      >
        <div className="flex flex-wrap gap-2">
          {config.restricoes.map((r) => (
            <span key={r} className="flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
              {r}
              <button onClick={() => removeRestricao(r)} className="text-danger/60 hover:text-danger">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newRestricao}
            onChange={(e) => setNewRestricao(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRestricao(); } }}
            placeholder="Adicionar restrição..."
          />
          <Button variant="outline" size="sm" onClick={addRestricao} disabled={!newRestricao.trim()} className="gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </SectionCard>

      {/* ── Fluxo e Abordagem ── */}
      <SectionCard
        title="Fluxo e Abordagem"
        description="Quais informações pedir em cada etapa e como a Lorena aborda cada uma"
      >
        {/* Antes de verificar agenda — ordered list with reorder controls */}
        <div className="flex flex-col gap-1">
          <FieldLabel>Antes de verificar agenda</FieldLabel>
          <p className="text-[11px] text-muted-foreground mb-1">
            A Lorena pergunta esses dados nesta ordem antes de buscar horários disponíveis. Use as setas para reordenar.
          </p>
          {config.checkingOrder.map((key, idx) => {
            const isFixed = CHECKING_ALWAYS.includes(key);
            const fieldDef = CONFIGURABLE_FIELDS.find((f) => f.key === key);
            const label = isFixed ? CHECKING_ALWAYS_LABELS[key] : (fieldDef?.label ?? key);
            const fc = isFixed ? null : (config.fieldsConfig[key] ?? { whenToAsk: "checking", mode: "auto", fixedText: "", guidedText: "" });
            const isFirst = idx === 0;
            const isLast = idx === config.checkingOrder.length - 1;
            return (
              <div key={key} className="rounded-lg border border-border bg-white p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveChecking(key, "up")}
                      disabled={isFirst}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Mover para cima"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveChecking(key, "down")}
                      disabled={isLast}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-medium text-foreground w-36 shrink-0">{label}</span>
                  {isFixed ? (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">sempre obrigatório</span>
                  ) : (
                    <>
                      <select
                        value="checking"
                        onChange={(e) => setFieldWhen(key, e.target.value as WhenToAsk)}
                        className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        {WHEN_OPTIONS
                          .filter((o) => o.value !== "novoOnly" || NOVO_ONLY_ELIGIBLE.has(key))
                          .map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                      </select>
                      {fc && (
                        <div className="ml-auto">
                          <ModeSelector mode={fc.mode} onMode={(m) => setFieldMode(key, m)} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {fc && (
                  <ModeTextareas
                    mode={fc.mode}
                    fixedText={fc.fixedText}
                    guidedText={fc.guidedText}
                    onFixedText={(t) => setFieldText(key, "fixedText", t)}
                    onGuidedText={(t) => setFieldText(key, "guidedText", t)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <hr className="border-border" />

        {/* Configurable fields not in checking — other groups */}
        <div className="flex flex-col gap-1">
          <FieldLabel>Outros campos</FieldLabel>
          <p className="text-[11px] text-muted-foreground mb-1">Escolha quando cada campo é perguntado e como a Lorena o aborda.</p>
          {CONFIGURABLE_FIELDS.filter(({ key }) => config.fieldsConfig[key]?.whenToAsk !== "checking").map(({ key, label }) => {
            const fc = config.fieldsConfig[key] ?? { whenToAsk: "never", mode: "auto", fixedText: "", guidedText: "" };
            const isActive = fc.whenToAsk !== "never";
            return (
              <div key={key} className={cn("rounded-lg border p-3 flex flex-col gap-2", isActive ? "border-border bg-white" : "border-border/50 bg-muted/20")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground w-36 shrink-0">{label}</span>
                  <select
                    value={fc.whenToAsk}
                    onChange={(e) => setFieldWhen(key, e.target.value as WhenToAsk)}
                    className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {WHEN_OPTIONS
                      .filter((o) => o.value !== "novoOnly" || NOVO_ONLY_ELIGIBLE.has(key))
                      .map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                  </select>
                  {isActive && (
                    <div className="ml-auto">
                      <ModeSelector mode={fc.mode} onMode={(m) => setFieldMode(key, m)} />
                    </div>
                  )}
                </div>
                {isActive && (
                  <ModeTextareas
                    mode={fc.mode}
                    fixedText={fc.fixedText}
                    guidedText={fc.guidedText}
                    onFixedText={(t) => setFieldText(key, "fixedText", t)}
                    onGuidedText={(t) => setFieldText(key, "guidedText", t)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <hr className="border-border" />

        {/* Event messages */}
        <div className="flex flex-col gap-1">
          <FieldLabel>Mensagens de evento</FieldLabel>
          <p className="text-[11px] text-muted-foreground mb-1">Enviadas automaticamente em momentos fixos do atendimento — sempre ocorrem.</p>
          {EVENT_FIELDS.map(({ key, label }) => {
            const sm = config.scriptedMessages[key] ?? { mode: "auto", fixedText: "", guidedText: "" };
            return (
              <div key={key} className="rounded-lg border border-border bg-white p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <ModeSelector mode={sm.mode} onMode={(m) => setEventMode(key, m)} />
                </div>
                <ModeTextareas
                  mode={sm.mode}
                  fixedText={sm.fixedText ?? ""}
                  guidedText={sm.guidedText ?? ""}
                  onFixedText={(t) => setEventText(key, "fixedText", t)}
                  onGuidedText={(t) => setEventText(key, "guidedText", t)}
                />
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Instruções pré-consulta ── */}
      <SectionCard
        title="Instruções pré-consulta"
        description="Texto enviado ao paciente após o agendamento ser confirmado"
      >
        <Textarea
          value={config.preConsultaInstructions}
          onChange={(e) => set("preConsultaInstructions", e.target.value)}
          placeholder="Ex: Lembre-se de trazer RG, cartão do convênio e exames anteriores. Chegue 15 minutos antes do horário marcado."
          rows={7}
        />
      </SectionCard>

      {/* ── Bloco 7: Mensagem para paciente novo ── */}
      <SectionCard
        title="Mensagem para paciente novo"
        description="Texto enviado quando o paciente entra em contato pela primeira vez"
      >
        <Textarea
          value={config.newPatientMessage}
          onChange={(e) => set("newPatientMessage", e.target.value)}
          placeholder="Ex: Olá! Seja bem-vindo à nossa clínica. Para agendar sua primeira consulta, preciso de algumas informações..."
          rows={11}
        />
      </SectionCard>

      {/* ── Bloco 8: Lista de espera ── */}
      <SectionCard
        title="Lista de espera"
        description="Texto enviado quando não há horário disponível e o paciente entra para a lista de espera"
      >
        <Textarea
          value={config.waitlistInstructions}
          onChange={(e) => set("waitlistInstructions", e.target.value)}
          placeholder="Ex: No momento não há horários disponíveis. Vou anotá-lo(a) na lista de espera e entraremos em contato assim que surgir uma vaga."
          rows={7}
        />
      </SectionCard>

      {/* ── Salvar ── */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="self-start bg-secondary px-6 text-white hover:bg-secondary/90"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </Button>

      {/* ── Ver / Editar prompt gerado ── */}
      <div className="rounded-xl border border-border bg-white shadow-sm">
        <button
          onClick={handleTogglePrompt}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-primary">Ver / Editar prompt gerado</p>
            <p className="text-xs text-muted-foreground">Texto final montado pelo servidor — editável para ajustes pontuais</p>
          </div>
          {showPrompt ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showPrompt && (
          <div className="border-t border-border px-5 py-4 flex flex-col gap-3">
            {/* Warning about manual edit being overwritten */}
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <p className="text-[11px] text-warning">
                <strong>Atenção:</strong> Editar este texto diretamente sobrescreve o que os campos acima geram.
                Da próxima vez que você salvar as <strong>configurações estruturadas</strong> (botão principal acima),
                este texto manual será substituído pelo prompt gerado automaticamente.
              </p>
            </div>
            {/* Info note */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
              <p className="text-[11px] text-blue-700">
                Este texto inclui automaticamente as <strong>regras fixas de comportamento da IA</strong> (não editáveis por este painel) além dos campos configurados acima.
              </p>
            </div>
            {loadingPrompt ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : (
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={18}
                spellCheck={false}
                className="w-full resize-none rounded-lg border border-border bg-gray-50 px-4 py-3 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {promptText.length.toLocaleString("pt-BR")} caracteres · mínimo 50 obrigatório
              </p>
              <Button
                onClick={handleSavePrompt}
                disabled={savingPrompt || loadingPrompt || promptText.trim().length < 50}
                className="gap-1.5 bg-warning text-white hover:bg-warning/90"
              >
                {savingPrompt ? "Salvando..." : "Salvar texto manualmente"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-xs font-medium text-white shadow-lg",
            toast.variant === "success" ? "bg-primary" : "bg-danger",
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
