"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Smartphone, QrCode, Webhook } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_WEBHOOK = "https://hearty-inspiration-production-1d10.up.railway.app/webhook/whatsapp";

interface StatusData {
  connected: boolean;
  status: string;
  phone?: string | null;
  error?: string;
}

export default function WhatsAppPage() {
  // ─── Status ──────────────────────────────────────────────────────────
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setStatusData(data);
    } catch {
      setStatusData({ connected: false, status: "error", error: "Falha ao verificar conexão" });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // ─── QR Code ─────────────────────────────────────────────────────────
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCountdown() {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  async function handleGenerateQr() {
    setQrLoading(true);
    setQrError("");
    setQrBase64(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setQrError(data.error ?? "Falha ao gerar QR Code");
        return;
      }
      const raw: string = data.base64 ?? "";
      // Strip data URI prefix if present, then re-add consistently
      const cleaned = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
      setQrBase64(cleaned || null);
      if (cleaned) startCountdown();
    } catch {
      setQrError("Erro ao conectar com o servidor");
    } finally {
      setQrLoading(false);
    }
  }

  // Poll status every 5s while QR is visible
  useEffect(() => {
    if (!qrBase64 || countdown === 0) return;
    const poll = setInterval(async () => {
      const res = await fetch("/api/whatsapp/status").catch(() => null);
      if (!res) return;
      const data: StatusData = await res.json();
      setStatusData(data);
      if (data.connected) {
        setQrBase64(null);
        setCountdown(0);
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [qrBase64, countdown]);

  // ─── Webhook ─────────────────────────────────────────────────────────
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/whatsapp/webhook")
      .then((r) => r.json())
      .then((d) => { if (d.url) setWebhookUrl(d.url); })
      .catch(() => {});
  }, []);

  async function handleSaveWebhook() {
    setWebhookSaving(true);
    setWebhookMsg(null);
    try {
      const res = await fetch("/api/whatsapp/webhook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setWebhookMsg({ text: data.error ?? "Falha ao salvar webhook", ok: false });
      } else {
        setWebhookMsg({ text: "Webhook salvo com sucesso!", ok: true });
      }
    } catch {
      setWebhookMsg({ text: "Erro ao salvar webhook", ok: false });
    } finally {
      setWebhookSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────
  const connected = statusData?.connected === true;

  return (
    <div className="flex flex-col">
      <Header
        title="Conexao WhatsApp"
        description="Conecte o numero da clinica ao sistema"
      />

      <div className="flex flex-col gap-6 p-8 max-w-2xl">

        {/* STATUS */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base text-primary">Status da conexao</CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setStatusLoading(true); fetchStatus(); }}
              disabled={statusLoading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", statusLoading && "animate-spin")} />
              Verificar conexao
            </Button>
          </CardHeader>
          <CardContent>
            {statusLoading && !statusData ? (
              <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
                      connected
                        ? "bg-success/15 text-success"
                        : "bg-danger/15 text-danger",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success animate-pulse" : "bg-danger")} />
                    {connected ? "Conectado" : "Desconectado"}
                  </span>
                  {connected && statusData?.phone && (
                    <span className="text-sm text-muted-foreground">{statusData.phone}</span>
                  )}
                </div>
                {statusData?.error && (
                  <p className="text-xs text-danger">{statusData.error}</p>
                )}
                {!connected && !statusData?.error && (
                  <p className="text-xs text-muted-foreground">
                    Status: {statusData?.status ?? "desconhecido"} — escaneie o QR Code abaixo para conectar.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR CODE */}
        {!connected && (
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <QrCode className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base text-primary">Conectar WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
              {!qrBase64 ? (
                <>
                  <Button onClick={handleGenerateQr} disabled={qrLoading}>
                    {qrLoading ? "Gerando..." : "Gerar QR Code"}
                  </Button>
                  {qrError && <p className="text-sm text-danger">{qrError}</p>}
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="relative rounded-lg border border-border p-3 shadow-sm bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrBase64} alt="QR Code WhatsApp" className="h-56 w-56 object-contain" />
                    {countdown === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/90">
                        <p className="text-sm font-medium text-muted-foreground">QR Code expirado</p>
                      </div>
                    )}
                  </div>

                  {countdown > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                      Expira em <span className="font-semibold tabular-nums text-primary">{countdown}s</span>
                    </div>
                  ) : null}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateQr}
                    disabled={qrLoading}
                  >
                    {qrLoading ? "Gerando..." : "Gerar novo QR Code"}
                  </Button>

                  <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground max-w-sm text-center leading-relaxed">
                    Abra o WhatsApp →{" "}
                    <span className="font-medium text-primary">Aparelhos conectados</span> →{" "}
                    <span className="font-medium text-primary">Conectar aparelho</span> → Escaneie o QR Code
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CONNECTED SUCCESS */}
        {connected && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-success">WhatsApp conectado!</p>
                {statusData?.phone && (
                  <p className="text-xs text-muted-foreground">Número: {statusData.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* WEBHOOK */}
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Webhook className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base text-primary">Configuracao do Webhook</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              URL que recebe as mensagens do WhatsApp. Deve apontar para o backend da Lorena.
            </p>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://..."
                className="font-mono text-xs"
              />
              <Button onClick={handleSaveWebhook} disabled={webhookSaving || !webhookUrl.trim()}>
                {webhookSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
            {webhookMsg && (
              <p className={cn("text-xs", webhookMsg.ok ? "text-success" : "text-danger")}>
                {webhookMsg.text}
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
