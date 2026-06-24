"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { configApi, getApiErrorMessage } from "@/lib/api";

export function PromptEditor() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    configApi
      .getPrompt()
      .then((data) => setPrompt(data.prompt))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await configApi.savePrompt(prompt);
      setSuccess("Prompt salvo com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Prompt da Lorena</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        {success && <div className="rounded-md bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

        {loading ? (
          <div className="h-64 animate-pulse rounded-md bg-muted" />
        ) : (
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={16}
            className="font-mono text-sm"
            placeholder="Digite o system prompt da Lorena..."
          />
        )}

        <div>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar prompt"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
