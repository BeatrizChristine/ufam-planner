"use client";

import { ArrowRight, GraduationCap, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UserGreeting } from "@/components/dashboard/UserGreeting";
import { ImportStartCard } from "@/components/dashboard/ImportStartCard";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import { AcademicNotice } from "@/components/ui/AcademicNotice";
import { ApiError } from "@/services/api-client";
import { getDashboardSummary } from "@/services/api";
import type { DashboardSummary } from "@/types/dashboard";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getDashboardSummary(controller.signal)
      .then(setSummary)
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof ApiError ? reason.message : "Não foi possível carregar seu dashboard.");
        }
      });
    return () => controller.abort();
  }, []);

  if (!summary && !error) {
    return <div className="grid min-h-[55vh] place-items-center"><LoaderCircle className="animate-spin text-emerald-700" size={30} /></div>;
  }

  return (
    <div className="animate-enter space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-12 -top-16 size-52 rounded-full border-[32px] border-emerald-100/50" />
        <div className="relative">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Visão geral</p>
          <UserGreeting />
          <p className="mt-2 max-w-xl text-sm text-slate-500">{summary?.profileCompleted ? `${summary.courseName} · Matriz ${summary.curriculumCode}` : "Acompanhe seu curso, suas aulas e sua frequência em um só lugar."}</p>
        </div>
      </section>

      <ImportStartCard />
      {error && <section className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">{error}</section>}

      {summary && !summary.profileCompleted && (
        <section className="grid gap-7 overflow-hidden rounded-3xl border border-amber-100 bg-white p-7 shadow-sm md:grid-cols-[1fr_auto] md:items-center sm:p-9">
          <div>
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-700"><GraduationCap size={22} /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">{summary.courseId ? "Vínculo acadêmico iniciado" : "Primeiro acesso"}</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{summary.courseId ? summary.courseName : "Complete seu perfil acadêmico"}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{summary.courseId
              ? `Seu curso ${summary.courseCode ? `(${summary.courseCode}) ` : ""}já está salvo. A matriz curricular ainda precisa ser vinculada para liberar o mapa e o cálculo de progresso.`
              : "Escolha seu curso, sua matriz e informe quando ingressou. Assim preparamos os próximos passos sem inventar dados de progresso."}</p>
          </div>
          <Link href="/perfil" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">{summary.courseId ? "Ver vínculo" : "Configurar agora"} <ArrowRight size={16} /></Link>
        </section>
      )}

      <DashboardInsights curriculumId={summary?.curriculumId ?? null} />
      <AcademicNotice />
    </div>
  );
}
