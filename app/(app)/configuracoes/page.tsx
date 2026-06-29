"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Save } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { configApi, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ClinicConfig, WeekSchedule } from "@/types";

const panelUsers = [
  { username: "admin", name: "IOMIA (Admin)" },
  { username: "secretaria", name: "Secretaria" },
  { username: "socio", name: "Socio" },
  { username: "dra.bruna", name: "Dra. Bruna" },
];

const WEEK_DAYS: { key: keyof WeekSchedule; label: string }[] = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terca" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sabado" },
  { key: "sunday", label: "Domingo" },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { enabled: true, start: "08:00", end: "18:00" },
  tuesday: { enabled: true, start: "08:00", end: "18:00" },
  wednesday: { enabled: true, start: "08:00", end: "18:00" },
  thursday: { enabled: true, start: "08:00", end: "18:00" },
  friday: { enabled: true, start: "08:00", end: "18:00" },
  saturday: { enabled: true, start: "08:00", end: "12:00" },
  sunday: { enabled: false, start: "08:00", end: "18:00" },
};

const DEFAULT_OUT_OF_HOURS_MESSAGE =
  "Ola! A Clinica Novo Olhar esta fechada no momento. Nosso horario de atendimento e de segunda a sexta, das 8h as 18h. Deixe sua mensagem que retornaremos assim que possivel!";

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      style={{
        position: "relative",
        display: "inline-flex",
        height: "24px",
        width: "44px",
        alignItems: "center",
        borderRadius: "9999px",
        border: "none",
        cursor: "pointer",
        backgroundColor: checked ? "#22c55e" : "#ef4444",
        transition: "background-color 0.2s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          display: "inline-block",
          height: "16px",
          width: "16px",
          borderRadius: "9999px",
          backgroundColor: "white",
          transform: checked ? "translateX(24px)" : "translateX(4px)",
          transition: "transform 0.2s",
        }}
      />
    </button>
  );
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [globalAiEnabled, setGlobalAiEnabled] = useState(true);
  const [globalAiSaving, setGlobalAiSaving] = useState(false);

  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [outOfHoursMessage, setOutOfHoursMessage] = useState(DEFAULT_OUT_OF_HOURS_MESSAGE);
  const [messageSaving, setMessageSaving] = useState(false);

  const [pauseAiOnCompleted, setPauseAiOnCompleted] = useState(false);
  const [pauseAiSaving, setPauseAiSaving] = useState(false);

  const [toast, setToast] = useState("");

  useEffect(() => {
    configApi
      .getConfig()
      .then((data) => {
        setConfig(data);
        setGlobalAiEnabled(data?.globalAiEnabled ?? true);
        setSchedule(data?.schedule ?? DEFAULT_SCHEDULE);
        setOutOfHoursMessage(data?.outOfHoursMessage ?? DEFAULT_OUT_OF_HOURS_MESSAGE);
        setPauseAiOnCompleted(data?.pauseAiOnCompleted ?? false);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function updateField<K extends keyof ClinicConfig>(field: K, value: ClinicConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleToggleGlobalAi(value: boolean) {
    const previous = globalAiEnabled;
    setGlobalAiEnabled(value);
    setGlobalAiSaving(true);
    try {
      await configApi.updateGlobalAi(value);
      showToast(value ? "Lorena ativada com sucesso." : "Lorena desativada globalmente.");
    } catch (err) {
      setGlobalAiEnabled(previous);
      showToast(getApiErrorMessage(err));
    } finally {
      setGlobalAiSaving(false);
    }
  }

  function updateDaySchedule(day: keyof WeekSchedule, patch: Partial<WeekSchedule[typeof day]>) {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function handleSaveSchedule() {
    setScheduleSaving(true);
    try {
      await configApi.updateSchedule(schedule);
      showToast("Horarios salvos com sucesso.");
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleSaveOutOfHoursMessage() {
    setMessageSaving(true);
    try {
      await configApi.updateOutOfHoursMessage(outOfHoursMessage);
      showToast("Mensagem salva com sucesso.");
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setMessageSaving(false);
    }
  }

  async function handleTogglePauseAiOnCompleted(value: boolean) {
    const previous = pauseAiOnCompleted;
    setPauseAiOnCompleted(value);
    setPauseAiSaving(true);
    try {
      await configApi.updateConfig({ pauseAiOnCompleted: value });
      showToast("Preferencia salva com sucesso.");
    } catch (err) {
      setPauseAiOnCompleted(previous);
      showToast(getApiErrorMessage(err));
    } finally {
      setPauseAiSaving(false);
    }
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await configApi.updateConfig(config);
      setSuccess("Configuracoes salvas com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Configuracoes" description="Dados da clinica e parametros do atendimento" />

      <div className="flex flex-col gap-6 p-8">
        {error && <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        {success && <div className="rounded-md bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        ) : config ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base text-primary">Controle da IA</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {globalAiEnabled ? "Lorena ativa" : "Lorena desativada globalmente"}
                  </p>
                </div>
                <ToggleSwitch checked={globalAiEnabled} onChange={handleToggleGlobalAi} disabled={globalAiSaving} />
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-primary">Horario de funcionamento</h4>
                  <div className="flex flex-col gap-2">
                    {WEEK_DAYS.map((day) => (
                      <div key={day.key} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={schedule[day.key]?.enabled ?? false}
                          onChange={(e) => updateDaySchedule(day.key, { enabled: e.target.checked })}
                          className="h-4 w-4 accent-secondary"
                        />
                        <span className="w-20 text-sm text-primary">{day.label}</span>
                        <Input
                          type="time"
                          value={schedule[day.key]?.start ?? "08:00"}
                          onChange={(e) => updateDaySchedule(day.key, { start: e.target.value })}
                          disabled={!schedule[day.key]?.enabled}
                          className="h-9 w-32"
                        />
                        <span className="text-xs text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={schedule[day.key]?.end ?? "18:00"}
                          onChange={(e) => updateDaySchedule(day.key, { end: e.target.value })}
                          disabled={!schedule[day.key]?.enabled}
                          className="h-9 w-32"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <Button size="sm" onClick={handleSaveSchedule} disabled={scheduleSaving}>
                      {scheduleSaving ? "Salvando..." : "Salvar horarios"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-primary">Mensagem fora do horario</h4>
                  <Textarea
                    value={outOfHoursMessage}
                    onChange={(e) => setOutOfHoursMessage(e.target.value)}
                    rows={3}
                  />
                  <div>
                    <Button size="sm" onClick={handleSaveOutOfHoursMessage} disabled={messageSaving}>
                      {messageSaving ? "Salvando..." : "Salvar mensagem"}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-sm font-semibold text-primary">
                      Pausar IA automaticamente em conversas concluidas
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Ao marcar uma conversa como Agendado ou Concluido, a IA e pausada automaticamente naquela
                      conversa.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={pauseAiOnCompleted}
                    onChange={handleTogglePauseAiOnCompleted}
                    disabled={pauseAiSaving}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados da clinica</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Field label="Nome da clinica" value={config.clinicName} onChange={(v) => updateField("clinicName", v)} />
                <Field label="E-mail" value={config.email} onChange={(v) => updateField("email", v)} />
                <Field label="Telefone Vicosa" value={config.phoneVicosa} onChange={(v) => updateField("phoneVicosa", v)} />
                <Field
                  label="Telefone Florianopolis"
                  value={config.phoneFlorianopolis}
                  onChange={(v) => updateField("phoneFlorianopolis", v)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delay humano</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <Field
                  label="Delay minimo (ms)"
                  type="number"
                  value={String(config.humanDelayMin)}
                  onChange={(v) => updateField("humanDelayMin", Number(v))}
                />
                <Field
                  label="Delay maximo (ms)"
                  type="number"
                  value={String(config.humanDelayMax)}
                  onChange={(v) => updateField("humanDelayMax", Number(v))}
                />
                <Field
                  label="Ms por caractere"
                  type="number"
                  value={String(config.msPerCharacter)}
                  onChange={(v) => updateField("msPerCharacter", Number(v))}
                />
              </CardContent>
            </Card>

            <div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar configuracoes"}
              </Button>
            </div>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Usuarios do painel</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {panelUsers.map((u) => (
              <div key={u.username} className="flex items-center justify-between rounded-md border border-border px-4 py-2.5">
                <span className="text-sm font-medium text-primary">{u.name}</span>
                <span className="text-xs text-muted-foreground">@{u.username}</span>
                {session?.user?.name === u.name && (
                  <span className="text-xs font-medium text-secondary">Voce</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-primary">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
