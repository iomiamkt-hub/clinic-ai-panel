"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function AmigoTestBanner() {
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/config/amigo-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.isTestMode === "boolean") {
          setIsTestMode(data.isTestMode);
        }
      })
      .catch(() => {/* silently ignore — don't show banner on error */});
  }, []);

  if (!isTestMode) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-xs font-semibold text-white">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        Ambiente de teste da Amigo ativo — agendamentos feitos agora{" "}
        <strong>NÃO aparecem na agenda real da clínica</strong>
      </span>
    </div>
  );
}
