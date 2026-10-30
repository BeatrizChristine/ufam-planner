"use client";

import { GraduationCap, LogOut, Menu, Search, Settings, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Logo } from "@/components/ui/Logo";
import { navigation } from "./Sidebar";

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "UP";

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-slate-200/70 bg-white px-5 lg:px-8">
      <div className="lg:hidden"><Logo compact /></div>
      <Link href="/disciplinas" className="hidden max-w-xl flex-1 items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-800 sm:flex" aria-label="Buscar disciplinas no catálogo">
        <Search size={17} /> Buscar disciplinas no catálogo
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <Link href="/perfil" aria-label="Abrir meu perfil acadêmico" aria-current={pathname === "/perfil" ? "page" : undefined} className={`hidden items-center gap-3 rounded-xl px-3 py-2 transition-colors sm:flex ${pathname === "/perfil" ? "bg-emerald-50" : "hover:bg-slate-100"}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-800 text-xs font-bold text-white">{initials}</span>
          <span className="max-w-36 text-left"><span className="block truncate text-xs font-bold text-slate-900">{user?.name}</span><span className="block truncate text-[10px] text-slate-500">Ver perfil acadêmico</span></span>
        </Link>
        <button type="button" className="grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {menuOpen && <>
        <button type="button" className="fixed inset-0 z-20 bg-slate-950/20 lg:hidden" aria-label="Fechar menu de navegação" onClick={() => setMenuOpen(false)} />
        <nav id="mobile-navigation" aria-label="Navegação móvel" className="absolute right-4 top-[calc(100%-1px)] z-30 max-h-[calc(100vh-5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl lg:hidden">
          {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${pathname === href ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={18} />{label}</Link>)}
          <div className="mt-2 border-t border-slate-100 pt-2">
            <Link href="/perfil" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><GraduationCap size={18} /> Meu perfil</Link>
            {user?.role === "ADMIN" && <Link href="/configuracoes" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Settings size={18} /> Administração</Link>}
            <Link href="/sobre" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ShieldCheck size={18} /> Fontes e termo de uso</Link>
            <button type="button" onClick={() => void handleLogout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><LogOut size={18} /> Sair da conta</button>
          </div>
        </nav>
      </>}
    </header>
  );
}
