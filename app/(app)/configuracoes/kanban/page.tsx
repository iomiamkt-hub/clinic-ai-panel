"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  type: "in_progress" | "closed_won" | "closed_lost";
  visible: boolean;
  order: number;
  isDefault?: boolean;
}

const TYPE_LABELS: Record<KanbanColumn["type"], string> = {
  in_progress: "Em andamento",
  closed_won: "Fechado (ganho)",
  closed_lost: "Perdido",
};

const TYPE_COLORS: Record<KanbanColumn["type"], string> = {
  in_progress: "bg-blue-100 text-blue-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
};

const PRESET_COLORS = [
  "#6366F1", "#3B82F6", "#22C55E", "#EF4444", "#F59E0B",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#1A2332",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Color picker popover ──────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-6 w-6 rounded-full border-2 border-white shadow-sm ring-1 ring-border transition-transform hover:scale-110"
        style={{ backgroundColor: value }}
        title="Trocar cor"
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 flex flex-col gap-2 rounded-xl border border-border bg-white p-3 shadow-xl">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={cn("h-6 w-6 rounded-full border-2 transition-transform hover:scale-110", value === c ? "border-primary" : "border-white")}
                  style={{ backgroundColor: c }}
                  onClick={() => { onChange(c); setOpen(false); }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border border-border p-0.5"
              />
              <button
                onClick={() => { onChange(custom); setOpen(false); }}
                className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-white"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Add column modal ──────────────────────────────────────────────────────────

function AddColumnModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (col: Omit<KanbanColumn, "id" | "order" | "isDefault">) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [type, setType] = useState<KanbanColumn["type"]>("in_progress");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim()) { setError("Digite um nome para a etapa."); return; }
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), color, type, visible: true });
      onClose();
    } catch {
      setError("Erro ao adicionar etapa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Adicionar etapa</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Nome da etapa</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aguardando medição" autoFocus />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={cn("h-7 w-7 rounded-full border-2 transition-transform hover:scale-110", color === c ? "border-primary" : "border-white shadow-sm ring-1 ring-border")}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo</label>
            <div className="flex gap-2">
              {(Object.entries(TYPE_LABELS) as [KanbanColumn["type"], string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setType(k)}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    type === k ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KanbanConfigPage() {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; variant: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function showToast(msg: string, variant: "success" | "error" = "success") {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    apiFetch<KanbanColumn[]>("/api/kanban/columns")
      .then((data) => setColumns(Array.isArray(data) ? data.sort((a, b) => a.order - b.order) : []))
      .catch(() => setColumns([]))
      .finally(() => setLoading(false));
  }, []);

  async function patchColumn(id: string, patch: Partial<KanbanColumn>) {
    setSaving(id);
    try {
      const updated = await apiFetch<KanbanColumn>(`/api/kanban/columns/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      showToast("Salvo");
    } catch {
      showToast("Erro ao salvar.", "error");
    } finally {
      setSaving(null);
    }
  }

  async function handleAdd(col: Omit<KanbanColumn, "id" | "order" | "isDefault">) {
    const created = await apiFetch<KanbanColumn>("/api/kanban/columns", {
      method: "POST",
      body: JSON.stringify({ ...col, order: columns.length }),
    });
    setColumns((prev) => [...prev, created].sort((a, b) => a.order - b.order));
    showToast("Etapa adicionada!");
  }

  async function handleDelete(id: string) {
    if (!confirm("Deletar esta etapa?")) return;
    setSaving(id);
    try {
      await apiFetch(`/api/kanban/columns/${id}`, { method: "DELETE" });
      setColumns((prev) => prev.filter((c) => c.id !== id));
      showToast("Etapa removida.");
    } catch {
      showToast("Erro ao remover.", "error");
    } finally {
      setSaving(null);
    }
  }

  function move(id: string, dir: "up" | "down") {
    const idx = columns.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= columns.length) return;
    const next = [...columns];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const reordered = next.map((c, i) => ({ ...c, order: i }));
    setColumns(reordered);
    patchColumn(id, { order: swapIdx });
    patchColumn(next[swapIdx].id, { order: idx });
  }

  function startEdit(col: KanbanColumn) {
    setEditingId(col.id);
    setEditingName(col.name);
  }

  function commitEdit(id: string) {
    if (editingName.trim()) patchColumn(id, { name: editingName.trim() });
    setEditingId(null);
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/configuracoes")} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-primary">Configurar Kanban</h1>
              <p className="text-xs text-muted-foreground">Gerencie as colunas do fluxo comercial</p>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Adicionar etapa
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-8">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : columns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma coluna configurada.</p>
            <Button variant="outline" className="mt-4 gap-1.5" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Adicionar primeira etapa
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {columns.map((col, idx) => (
              <div
                key={col.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-white px-5 py-4 shadow-sm"
              >
                {/* Color dot */}
                <ColorPicker value={col.color} onChange={(c) => patchColumn(col.id, { color: c })} />

                {/* Name (editable inline) */}
                <div className="flex flex-1 items-center gap-2">
                  {editingId === col.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(col.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-7 w-48 text-sm"
                        autoFocus
                      />
                      <button onClick={() => commitEdit(col.id)} className="text-success hover:opacity-80">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:opacity-80">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(col)}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {col.name}
                    </button>
                  )}
                </div>

                {/* Type badge */}
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", TYPE_COLORS[col.type])}>
                  {TYPE_LABELS[col.type]}
                </span>

                {/* Visibility toggle */}
                <button
                  onClick={() => patchColumn(col.id, { visible: !col.visible })}
                  title={col.visible ? "Ocultar" : "Mostrar"}
                  className={cn("shrink-0 rounded-md p-1.5 transition-colors", col.visible ? "text-primary hover:bg-muted" : "text-muted-foreground/40 hover:bg-muted")}
                >
                  {col.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                {/* Reorder */}
                <div className="flex flex-col">
                  <button disabled={idx === 0} onClick={() => move(col.id, "up")} className="rounded p-0.5 text-muted-foreground disabled:opacity-20 hover:bg-muted">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button disabled={idx === columns.length - 1} onClick={() => move(col.id, "down")} className="rounded p-0.5 text-muted-foreground disabled:opacity-20 hover:bg-muted">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(col.id)}
                  disabled={!!col.isDefault || saving === col.id}
                  title={col.isDefault ? "Colunas padrão não podem ser removidas" : "Remover"}
                  className="shrink-0 rounded-md p-1.5 text-danger/60 transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <AddColumnModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}

      {toast && (
        <div className={cn(
          "fixed bottom-5 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-xs font-medium text-white shadow-lg",
          toast.variant === "success" ? "bg-primary" : "bg-danger",
        )}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
