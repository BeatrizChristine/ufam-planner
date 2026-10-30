"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

const content = {
  login: {
    image: "/images/ufam-login.png",
    label: "Universidade Federal do Amazonas",
    title: <>Planeje hoje.<br />Conquiste o <span className="text-emerald-300">amanhã.</span></>,
    description: "Acompanhe sua trajetória e transforme cada período em um passo claro até a formatura.",
  },
  register: {
    image: "/images/ufam-cadastro.png",
    label: "Seu futuro começa aqui",
    title: <>Organize hoje<br />uma jornada maior<br />para <span className="text-emerald-300">amanhã.</span></>,
    description: "Crie sua conta e descubra uma forma mais simples de planejar sua vida acadêmica na UFAM.",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRegister = pathname === "/cadastro";
  const variant = isRegister ? content.register : content.login;

  return (
    <main className="auth-shell">
      <div className="auth-orb auth-orb-left" />
      <div className="auth-orb auth-orb-right" />
      <div className="auth-ring auth-ring-top" />
      <div className="auth-ring auth-ring-bottom" />

      <section className="auth-card">
        <div className="auth-photo-panel">
          <Image
            src={variant.image}
            alt="Campus da Universidade Federal do Amazonas"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 52vw, 0vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-emerald-950/95" />
          <div className="absolute -left-28 -top-28 size-72 rounded-full bg-emerald-950/45" />
          <div className="absolute -bottom-40 -right-24 size-96 rounded-full bg-emerald-700/25 ring-1 ring-white/45" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-8 xl:p-10">
            <p className="max-w-52 text-[10px] font-extrabold uppercase leading-5 tracking-[0.32em] text-white">{variant.label}</p>
            <p className="hidden text-right text-[9px] font-bold uppercase leading-4 tracking-[0.3em] text-white/75 xl:block">Ensino<br />Pesquisa<br />Extensão<br />Transformação</p>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 text-white xl:p-11">
            <div className="mb-5 h-0.5 w-10 bg-emerald-300" />
            <h1 className="font-serif text-[clamp(2rem,3.1vw,3.35rem)] font-medium leading-[1.02] tracking-[-0.035em]">{variant.title}</h1>
            <p className="mt-5 max-w-md text-xs leading-5 text-white/75">{variant.description}</p>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="flex shrink-0 items-center justify-between">
            <Logo />
            <p className="hidden text-right text-[8px] font-bold uppercase leading-4 tracking-[0.28em] text-slate-400 sm:block">Planeje · curse · conquiste</p>
          </div>
          <div className={`auth-form-content ${isRegister ? "auth-form-content-register" : ""}`}>{children}</div>
          <p className="shrink-0 text-center text-[9px] font-semibold uppercase tracking-[0.26em] text-slate-300">UFAM Planner · 2026</p>
        </div>
      </section>
    </main>
  );
}

