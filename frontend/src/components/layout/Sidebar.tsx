"use client";

import {
  BookOpen,
  Bot,
  CalendarDays,
  Clock3,
  GraduationCap,
  MapPin,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Logo } from "@/components/ui/Logo";

export const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mapa-curricular", label: "Mapa curricular", icon: BookOpen },
  { href: "/planejamento", label: "Planejar horários", icon: CalendarDays },
  { href: "/importar", label: "Importar do eCampus", icon: Upload },
  { href: "/disciplinas", label: "Buscar disciplinas", icon: Search },
  { href: "/frequencia", label: "Faltas e frequência", icon: Clock3 },
  { href: "/assistente", label: "Assistente acadêmico", icon: Bot },
  { href: "/vida-no-campus", label: "Vida no campus", icon: MapPin },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white px-4 py-6 lg:flex">
      <div className="px-2"><Logo /></div>
      <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Navegação principal">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition-colors ${
                active ? "bg-emerald-700 text-white shadow-sm" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-slate-100 pt-3">
        {user?.role === "ADMIN" && <Link href="/configuracoes" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-emerald-800"><Settings size={16} /> Administração</Link>}
        <Link href="/sobre" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-emerald-800"><ShieldCheck size={16} /> Fontes e termo de uso</Link>
      </div>
      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3">
        <Link href="/perfil" aria-label="Abrir meu perfil acadêmico" aria-current={pathname === "/perfil" ? "page" : undefined} className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-2 transition-colors ${pathname === "/perfil" ? "bg-emerald-50" : "hover:bg-emerald-50"}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800"><GraduationCap size={18} /></span>
          <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{user?.name}</span><span className="block truncate text-[10px] text-slate-500">Ver perfil acadêmico</span></span>
        </Link>
        <button type="button" onClick={handleLogout} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Sair da conta" title="Sair da conta"><LogOut size={17} /></button>
      </div>
    </aside>
  );
}
