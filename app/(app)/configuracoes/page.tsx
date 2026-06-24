"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Save } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { configApi, getApiErrorMessage } from "@/lib/api";
import type { ClinicConfig } from "@/types";

const panelUsers = [
  { username: "admin", name: "IOMIA (Admin)" },
  { username: "secretaria", name: "Secretaria" },
  { username: "socio", name: "Socio" },
  { username: "dra.bruna", name: "Dra. Bruna" },
];

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    configApi
      .getConfig()
      .then(setConfig)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function updateField<K extends keyof ClinicConfig>(field: K, value: ClinicConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
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
