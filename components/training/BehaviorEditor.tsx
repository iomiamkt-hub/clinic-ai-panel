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
}

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
  restricoes: [
    "Nunca emitir diagnóstico médico",
    "Nunca prometer disponibilidade sem verificar",
    "Nunca alterar agendamento sem confirmação",
  ],
};

// ── Parse API response → BehaviorConfig ───────────────────────────────────────
// Handles both the flat legacy shape and the nested shape the new backend returns.

function parseApiResponse(data: Record<string, unknown>): Partial<BehaviorConfig> {
  const parsed: Partial<BehaviorConfig> = {};

  // ── Identidade ──────────────────────────────────────────────────────────────
  const ident = (data.personalidade as Record<string, unknown> | undefined) ?? data;
  parsed.nomeIA           = String(ident.nomeIA ?? data.nomeIA ?? DEFAULT_CONFIG.nomeIA);
  parsed.personalidade    = String(ident.personalidade ?? data.personalidade ?? "");
  parsed.usarEmojis       = Boolean(ident.usarEmojis ?? data.usarEmojis ?? true);
  parsed.tratamentoInformal = Boolean(ident.tratamentoInformal ?? data.tratamentoInformal ?? true);
  parsed.tratamentoFormal   = Boolean(ident.tratamentoFormal ?? data.tratamentoFormal ?? false);

  // ── Clínica ─────────────────────────────────────────────────────────────────
  const info = (data.informacoesClinica as Record<string, unknown> | undefined) ?? data;
  parsed.nomeClinica       = String(info.nomeClinica ?? data.nomeClinica ?? "");
  parsed.medicoResponsavel = String(info.medicoResponsavel ?? data.medicoResponsavel ?? "");
  parsed.especialidade     = String(info.especialidade ?? data.especialidade ?? "");
  parsed.unidades          = (Array.isArray(info.unidades ?? data.unidades) ? (info.unidades ?? data.unidades) : []) as Unidade[];
  parsed.convenios         = (Array.isArray(info.convenios ?? data.convenios) ? (info.convenios ?? data.convenios) : []) as string[];

  // ── Regras ──────────────────────────────────────────────────────────────────
  // Backend may return nested `rules` or `regrasAtendimento`, or flat fields.
  const rules = (
    (data.regrasAtendimento as Record<string, unknown> | undefined) ??
    (data.rules as Record<string, unknown> | undefined) ??
    data
  );
  parsed.confirmarAgendamento  = Boolean(rules.confirmarAgendamento ?? data.confirmarAgendamento ?? true);
  parsed.mensagensCurtas       = Boolean(rules.mensagensCurtas ?? data.mensagensCurtas ?? true);
  parsed.nuncaInformarValores  = Boolean(rules.nuncaInformarValores ?? data.nuncaInformarValores ?? false);
  parsed.encaminharUrgencias   = Boolean(rules.encaminharUrgencias ?? data.encaminharUrgencias ?? true);
  // New canonical field name from backend; fallback to old flat name
  parsed.perguntarConvenio = Boolean(
    rules.askInsuranceBeforeAvailability ??
    rules.perguntarConvenio ??
    data.perguntarConvenio ??
    false,
  );

  // ── Conhecimento / Restrições ────────────────────────────────────────────────
  parsed.conhecimento = String(data.conhecimento ?? "");
  parsed.restricoes   = Array.isArray(data.restricoes) ? (data.restricoes as string[]) : DEFAULT_CONFIG.restricoes;

  // ── Conteúdo clínico ─────────────────────────────────────────────────────────
  const cc = (data.clinicalContent as Record<string, unknown> | undefined) ?? {};
  parsed.preConsultaInstructions = String(cc.preConsultaInstructions ?? data.preConsultaInstructions ?? "");
  parsed.newPatientMessage       = String(cc.newPatientMessage ?? data.newPatientMessage ?? "");
  parsed.waitlistInstructions    = String(cc.waitlistInstructions ?? data.waitlistInstructions ?? "");

  return parsed;
}

// ── Build structured payload for POST /api/config/clinic ─────────────────────
// Matches the new backend contract: nested objects per section.

function buildPayload(config: BehaviorConfig) {
  return {
    // Keep flat fields at top-level for backward compat with old backend
    ...config,
    // Also send the structured nested shape the new backend now reads
    personalidade: {
      nomeIA:             config.nomeIA,
      personalidade:      config.personalidade,
      usarEmojis:         config.usarEmojis,
      tratamentoInformal: config.tratamentoInformal,
      tratamentoFormal:   config.tratamentoFormal,
    },
    informacoesClinica: {
      nomeClinica:       config.nomeClinica,
      medicoResponsavel: config.medicoResponsavel,
      especialidade:     config.especialidade,
      unidades:          config.unidades,
      convenios:         config.convenios,
    },
    regrasAtendimento: {
      confirmarAgendamento:           config.confirmarAgendamento,
      mensagensCurtas:                config.mensagensCurtas,
      nuncaInformarValores:           config.nuncaInformarValores,
      encaminharUrgencias:            config.encaminharUrgencias,
      // Use the canonical backend field name
      askInsuranceBeforeAvailability: config.perguntarConvenio,
      // Keep old name as alias for backend compatibility
      perguntarConvenio:              config.perguntarConvenio,
    },
    conhecimento: config.conhecimento,
    restricoes:   config.restricoes,
    clinicalContent: {
      preConsultaInstructions: config.preConsultaInstructions,
      newPatientMessage:       config.newPatientMessage,
      waitlistInstructions:    config.waitlistInstructions,
    },
    // flat aliases for backward compat
    preConsultaInstructions: config.preConsultaInstructions,
    newPatientMessage:       config.newPatientMessage,
    waitlistInstructions:    config.waitlistInstructions,
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

// ── Main component ────────────────────────────────────────────────────────────

export function BehaviorEditor() {
  const [config, setConfig] = useState<BehaviorConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: "success" | "error" } | null>(null);

  // Convênios
  const [newConvenio, setNewConvenio] = useState("");
  // Restrições
  const [newRestricao, setNewRestricao] = useState("");
  // Prompt preview
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);

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

      {/* ── Bloco 6: Instruções pré-consulta ── */}
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

      {/* ── Preview do prompt (sempre via GET ao backend) ── */}
      <div className="rounded-xl border border-border bg-white shadow-sm">
        <button
          onClick={handleTogglePrompt}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-primary">Ver prompt gerado</p>
            <p className="text-xs text-muted-foreground">Texto final montado pelo servidor após salvar</p>
          </div>
          {showPrompt ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showPrompt && (
          <div className="border-t border-border px-5 py-4">
            {/* Informative note */}
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
              <p className="text-[11px] text-blue-700">
                Este texto inclui automaticamente as <strong>regras fixas de comportamento da IA</strong> (não editáveis por este painel) além dos campos configurados acima.
              </p>
            </div>
            {loadingPrompt ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : (
              <textarea
                readOnly
                value={promptText}
                rows={14}
                className="w-full resize-none rounded-lg bg-gray-50 px-4 py-3 font-mono text-xs text-muted-foreground outline-none"
              />
            )}
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
