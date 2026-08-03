"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart2, MessageCircle, Calendar, Brain,
  Settings, Smartphone, LogOut, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { configApi } from "@/lib/api";

const navItems = [
  { href: "/",              label: "Dashboard",     icon: BarChart2 },
  { href: "/conversas",     label: "Conversas",     icon: MessageCircle },
  { href: "/agendamentos",  label: "Agendamentos",  icon: Calendar },
  { href: "/treinamento",   label: "Treinamento",   icon: Brain },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/whatsapp",      label: "WhatsApp",      icon: Smartphone },
];

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [aiOffline, setAiOffline] = useState(false);

  useEffect(() => {
    function fetchAiStatus() {
      configApi
        .getConfig()
        .then((config) => setAiOffline(config?.globalAiEnabled === false))
        .catch(() => {});
    }
    fetchAiStatus();
    const interval = setInterval(fetchAiStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="flex h-screen w-60 flex-col bg-primary text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/20">
          <Eye className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-bold text-white">Clínica</span>
          <span className="text-[11px] font-medium text-white/50">Novo Olhar</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {navItems.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.href === "/conversas" && aiOffline && (
                <span className="ml-auto animate-pulse rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-bold text-white">
                  OFFLINE
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/30 text-xs font-bold text-white">
          {initials(session?.user?.name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-semibold text-white">{session?.user?.name ?? "Usuário"}</span>
          <span className="text-[10px] capitalize text-white/40">{session?.user?.role ?? "admin"}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sair"
          className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
