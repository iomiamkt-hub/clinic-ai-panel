import { NextRequest, NextResponse } from "next/server";

const EVOLUTION_BASE = "https://evolution-api-production-d727.up.railway.app";
const API_KEY = "Iomiamkt@2026";
const INSTANCE = "novoolhar";

export async function PUT(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    const res = await fetch(`${EVOLUTION_BASE}/webhook/set/${INSTANCE}`, {
      method: "PUT",
      headers: { apikey: API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        webhook_by_events: false,
        events: ["MESSAGES_UPSERT"],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (body as Record<string, unknown>).message ?? "Falha ao salvar webhook" },
        { status: res.status },
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const res = await fetch(`${EVOLUTION_BASE}/webhook/find/${INSTANCE}`, {
      headers: { apikey: API_KEY },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ url: "" });
    const data = await res.json().catch(() => ({}));
    const url = (data as Record<string, unknown>).url ?? "";
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: "" });
  }
}
