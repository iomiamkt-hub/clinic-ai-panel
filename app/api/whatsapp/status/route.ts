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
      return NextResponse.json({ error: "Falha ao buscar instâncias" }, { status: res.status });
    }
    const data = await res.json();
    const instances: unknown[] = Array.isArray(data) ? data : [];
    const instance = instances.find(
      (i): i is Record<string, unknown> =>
        typeof i === "object" && i !== null && (i as Record<string, unknown>).instance !== undefined
          ? (((i as Record<string, unknown>).instance as Record<string, unknown>)?.instanceName ?? (i as Record<string, unknown>).instanceName) === INSTANCE
          : false,
    );

    if (!instance) {
      return NextResponse.json({ connected: false, status: "not_found" });
    }

    const inner =
      typeof instance.instance === "object" && instance.instance !== null
        ? (instance.instance as Record<string, unknown>)
        : instance;

    const status = String(inner.connectionStatus ?? inner.state ?? inner.status ?? "unknown");
    const connected = status === "open";
    const phone =
      (inner.ownerJid as string | undefined) ??
      (inner.number as string | undefined) ??
      null;

    return NextResponse.json({ connected, status, phone });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
