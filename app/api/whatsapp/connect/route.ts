import { NextResponse } from "next/server";

const EVOLUTION_BASE = "https://evolution-api-production-d727.up.railway.app";
const API_KEY = "Iomiamkt@2026";
const INSTANCE = "novoolhar";

export async function POST() {
  try {
    // Create instance (idempotent — ignore 4xx if already exists)
    await fetch(`${EVOLUTION_BASE}/instance/create`, {
      method: "POST",
      headers: { apikey: API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceName: INSTANCE,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
      cache: "no-store",
    });

    // Fetch QR Code
    const qrRes = await fetch(`${EVOLUTION_BASE}/instance/connect/${INSTANCE}`, {
      headers: { apikey: API_KEY },
      cache: "no-store",
    });

    if (!qrRes.ok) {
      return NextResponse.json({ error: "Falha ao gerar QR Code" }, { status: qrRes.status });
    }

    const qrData = await qrRes.json();
    const base64: string | undefined =
      qrData?.base64 ?? qrData?.qrcode?.base64 ?? qrData?.qrcode ?? undefined;
    const code: string | undefined = qrData?.code ?? undefined;

    return NextResponse.json({ base64, code });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
