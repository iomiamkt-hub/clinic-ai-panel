"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ClipboardCopy, Save, AlertTriangle, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { configApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUpdatedAt(raw: string | null | undefined): string {
  if (!raw) return "Nunca atualizado";
  try {
    return format(parseISO(raw), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
  } catch {
    return raw;
  }
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary">Confirmar alteração</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Isso vai alterar o <strong>comportamento da Lorena em produção imediatamente</strong>, sem necessidade de reiniciar o servidor.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Certifique-se de que o novo prompt está correto antes de confirmar.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} className="gap-1.5">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="gap-1.5 bg-warning text-white hover:bg-warning/90">
            <Check className="h-4 w-4" />
            Confirmar e salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LorenaPromptPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [prompt, setPrompt] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: "success" | "error" } | null>(null);
  const [copied, setCopied] = useState(false);

  // Admin guard — only admin can access this page
  const isAdmin =
    session?.user?.name === "IOMIA (Admin)" ||
    (session?.user as Record<string, unknown> | undefined)?.role === "admin" ||
    (session?.user as Record<string, unknown> | undefined)?.username === "admin";

  function showToast(msg: string, variant: "success" | "error" = "success") {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Try the generic key endpoint first; fall back to the legacy prompt endpoint
        let value = "";
        let at: string | null = null;
        try {
          const res = await configApi.getConfigKey("lorena_prompt");
          value = res.value ?? "";
          at = res.updatedAt ?? null;
        } catch {
          // Fallback: legacy GET /api/config/prompt
          const res = await configApi.getPrompt();
          value = res.prompt ?? "";
        }
        setPrompt(value);
        setUpdatedAt(at);
      } catch {
        showToast("Erro ao carregar o system prompt.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!prompt.trim() || prompt.trim().length < 50) {
      showToast("O prompt parece muito curto. Verifique antes de salvar.", "error");
      return;
    }
    setShowConfirm(true);
  }

  async function confirmSave() {
    setShowConfirm(false);
    setSaving(true);
    try {
      // Try generic key PATCH; fall back to legacy POST
      try {
        const res = await configApi.patchConfigKey("lorena_prompt", prompt);
        setUpdatedAt(res.updatedAt ?? null);
      } catch {
        await configApi.savePrompt(prompt);
        setUpdatedAt(new Date().toISOString());
      }
      showToast("System prompt salvo com sucesso! A Lorena já está usando o novo comportamento.", "success");
    } catch {
      showToast("Erro ao salvar. Tente novamente.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!loading && !isAdmin) {
    return (
      <div className="flex flex-col">
        <div className="border-b border-border bg-white px-8 py-5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/configuracoes")} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-bold text-primary">Acesso restrito</h1>
          </div>
        </div>
        <div className="p-8">
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-6 py-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-danger" />
            <p className="font-semibold text-danger">Esta página é restrita a administradores.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/configuracoes")}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-primary">System Prompt da Lorena</h1>
              <p className="text-xs text-muted-foreground">
                Controla o comportamento da IA em produção — alterações têm efeito imediato
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={loading || !prompt}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors",
                copied ? "border-success text-success" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar texto atual"}
            </button>

            <Button
              onClick={handleSave}
              disabled={loading || saving}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar prompt"}
            </Button>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 border-b border-warning/20 bg-warning/5 px-8 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-xs text-warning">
          <strong>Atenção:</strong> Este prompt controla o comportamento da Lorena em produção. Qualquer alteração salva entra em vigor imediatamente, sem necessidade de reiniciar o servidor. Faça uma cópia do texto antes de editar.
        </p>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 p-8">
        {/* Last updated */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Última atualização:{" "}
            <span className="font-medium text-foreground">{formatUpdatedAt(updatedAt)}</span>
          </p>
          <span className="text-xs text-muted-foreground">
            {prompt.length.toLocaleString("pt-BR")} caracteres
          </span>
        </div>

        {/* Textarea */}
        {loading ? (
          <div className="h-[500px] animate-pulse rounded-xl bg-muted" />
        ) : (
          <div className="relative rounded-xl border border-border shadow-sm">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={cn(
                "w-full resize-none rounded-xl bg-white px-5 py-4 font-mono text-sm leading-relaxed text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
                "scrollbar-thin",
              )}
              style={{ minHeight: 500 }}
              placeholder="Cole o system prompt da Lorena aqui..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Bottom action bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Minimum 50 caracteres obrigatório antes de salvar.
          </p>
          <Button onClick={handleSave} disabled={loading || saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar prompt"}
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <ConfirmDialog onConfirm={confirmSave} onCancel={() => setShowConfirm(false)} />
      )}

      {/* Toast */}
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
