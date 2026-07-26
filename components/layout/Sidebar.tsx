"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  MessageSquare,
  CalendarClock,
  GraduationCap,
  Settings,
  LogOut,
  Eye,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { configApi } from "@/lib/api";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conversas", label: "Conversas", icon: MessageSquare },
  { href: "/agendamentos", label: "Agendamentos", icon: CalendarClock },
  { href: "/treinamento", label: "Treinamento", icon: GraduationCap },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings },
  { href: "/whatsapp", label: "WhatsApp", icon: Smartphone },
];

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
    <aside className="flex h-screen w-64 flex-col bg-primary text-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <Eye className="h-6 w-6 text-secondary" />
        <span className="text-lg font-semibold leading-tight">Clinica Novo Olhar</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-secondary text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
              {item.href === "/conversas" && aiOffline && (
                <span className="ml-auto animate-pulse rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-bold text-white">
                  IA OFFLINE
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{session?.user?.name ?? "Usuario"}</span>
          <span className="text-xs capitalize text-white/50">{session?.user?.role}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
          title="Sair"
        >
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </div>
    </aside>
  );
}
