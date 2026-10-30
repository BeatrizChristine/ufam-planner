import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function AcademicNotice() {
  return <section className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4 sm:p-5">
    <ShieldCheck size={21} className="mt-0.5 shrink-0 text-emerald-700" />
    <div><h2 className="text-sm font-bold text-slate-800">Referências oficiais, planejamento pessoal</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">Usamos publicações da UFAM e os documentos do eCampus que você importa. O Planner é independente: estimativas de progresso e faltas não substituem o registro oficial.</p>
      <Link href="/sobre" className="mt-2 inline-block text-xs font-bold text-emerald-800 hover:underline">Entenda as fontes e o termo de uso →</Link>
    </div>
  </section>;
}
