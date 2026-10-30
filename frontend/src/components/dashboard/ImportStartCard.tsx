"use client";

import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, FileUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { progressApi, studyApi } from "@/services/api";

export function ImportStartCard() {
  const [enrollmentCount, setEnrollmentCount] = useState<number | null>(null);
  const [approvalCount, setApprovalCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([studyApi.subjects(controller.signal), progressApi.completed(controller.signal)]).then(([plan, progress]) => {
      if (controller.signal.aborted) return;
      if (plan.status === "fulfilled") setEnrollmentCount(plan.value.filter((subject) => subject.source === "ECAMPUS_ENROLLMENT").length);
      if (plan.status === "fulfilled" && progress.status === "fulfilled") {
        setApprovalCount(new Set([...progress.value.completedCodes, ...plan.value.filter((subject) => subject.source === "ECAMPUS_HISTORY" && subject.status === "COMPLETED").map((subject) => subject.code)]).size);
      }
    });
    return () => controller.abort();
  }, []);

  const hasData = (enrollmentCount ?? 0) > 0 || (approvalCount ?? 0) > 0;
  return <section className={`relative overflow-hidden rounded-3xl bg-[#063e31] text-white shadow-lg shadow-emerald-950/10 ${hasData ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
    <div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full border-[36px] border-white/5" />
    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-200"><FileUp size={17} /> {hasData ? "Seus dados, sempre atualizados" : "Comece por aqui"}</p>
        <h2 className={`mt-3 font-extrabold tracking-tight ${hasData ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>{hasData ? "Mantenha seus dados atualizados." : "Seu Planner pronto, sem preencher matéria por matéria."}</h2>
        {!hasData && <p className="mt-3 text-sm leading-6 text-emerald-50/80">Importe os PDFs do eCampus. O histórico preenche seu progresso; o comprovante monta seu semestre, com disciplinas, turmas e horários.</p>}
      </div>
      <Link href="/importar" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800">{hasData ? "Atualizar meus documentos" : "Importar meus documentos"}<ArrowRight size={18} /></Link>
    </div>
    {!hasData && <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
      {[{ icon: BookOpenCheck, name: "Histórico escolar", text: "Aprovações, optativas e progresso no mapa", count: approvalCount, unit: "aprovações identificadas" }, { icon: CalendarDays, name: "Comprovante de matrícula", text: "Seu quadro de horários e turmas do semestre", count: enrollmentCount, unit: "disciplinas importadas" }].map(({ icon: Icon, name, text, count, unit }) => <div key={name} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-200"><Icon size={19} /></span>
        <div><strong className="text-sm">{name}</strong><p className="mt-1 text-xs leading-5 text-emerald-100/70">{text}</p>{count !== null && count > 0 && <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-200"><CheckCircle2 size={12} /> {count} {unit}</p>}</div>
      </div>)}
    </div>}
    {!hasData && <p className="relative mt-4 text-[11px] text-emerald-100/65">Você revisa antes de confirmar. Não pedimos sua senha do eCampus.</p>}
  </section>;
}
