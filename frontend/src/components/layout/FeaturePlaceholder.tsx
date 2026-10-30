import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

export function FeaturePlaceholder({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <section className="animate-enter grid min-h-[calc(100vh-9rem)] place-items-center">
      <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={30} /></span>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700"><Construction size={12} /> Próximo módulo</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
        <Link href="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800"><ArrowLeft size={15} /> Voltar ao dashboard</Link>
      </div>
    </section>
  );
}

