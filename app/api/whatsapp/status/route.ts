import { NextResponse } from "next/server";

const EVOLUTION_BASE = "https://evolution-api-production-d727.up.railway.app";
const API_KEY = "Iomiamkt@2026";
const INSTANCE = "novoolhar";

export async function GET() {
  try {
    const res = await fetch(`${EVOLUTION_BASE}/instance/fetchInstances`, {
      headers: { apikey: API_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Falha ao buscar instancias" }, { status: res.status });
    }

    const data = await res.json();
    const instances = Array.isArray(data) ? data : [];

    const instance = instances.find(
      (i: Record<string, unknown>) => i.name === INSTANCE
    );

    if (!instance) {
      return NextResponse.json({ connected: false, status: "not_found" });
    }

    const status = String(instance.connectionStatus ?? "unknown");
    const connected = status === "open";
    const phone = (instance.ownerJid as string | undefined)?.replace("@s.whatsapp.net", "") ?? null;

    return NextResponse.json({ connected, status, phone });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
