"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chatApi, getApiErrorMessage } from "@/lib/api";

export function ChatPreview() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    setResponse("");
    try {
      const data = await chatApi.test(message);
      setResponse(data.response);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Testar resposta da Lorena</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Digite uma mensagem de teste..."
          />
          <Button onClick={handleSend} disabled={loading}>
            <Send className="h-4 w-4" />
            {loading ? "Enviando..." : "Enviar"}
          </Button>
        </div>

        {error && <div className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        {response && (
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-primary">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Resposta da Lorena</p>
            {response}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
