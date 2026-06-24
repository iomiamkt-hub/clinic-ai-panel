"use client";

import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainingExample } from "@/types";

function newExample(): TrainingExample {
  return { id: crypto.randomUUID(), question: "", answer: "" };
}

export function ExamplesList() {
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [success, setSuccess] = useState("");

  function updateExample(id: string, field: "question" | "answer", value: string) {
    setExamples((prev) => prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)));
  }

  function removeExample(id: string) {
    setExamples((prev) => prev.filter((ex) => ex.id !== id));
  }

  function handleSave() {
    setSuccess("Exemplos salvos localmente. Persistencia no backend ainda nao disponivel.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplos de treinamento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {success && <div className="rounded-md bg-success/10 px-4 py-3 text-sm text-success">{success}</div>}

        <div className="flex flex-col gap-3">
            {examples.map((ex) => (
              <div key={ex.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Exemplo</span>
                  <button onClick={() => removeExample(ex.id)} className="text-muted-foreground hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  placeholder="Pergunta do paciente"
                  value={ex.question}
                  onChange={(e) => updateExample(ex.id, "question", e.target.value)}
                  rows={2}
                />
                <Textarea
                  placeholder="Resposta ideal da Lorena"
                  value={ex.answer}
                  onChange={(e) => updateExample(ex.id, "answer", e.target.value)}
                  rows={2}
                />
              </div>
            ))}
            {examples.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum exemplo cadastrado.</p>
            )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExamples((prev) => [...prev, newExample()])}>
            <Plus className="h-4 w-4" />
            Adicionar exemplo
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            Salvar exemplos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
