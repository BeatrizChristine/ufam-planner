"use client";

import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { attendanceFor } from "@/components/study/attendance";
import { STUDY_DAYS } from "@/components/study/studyConstants";
import { studyPeriodView } from "@/components/study/studyPeriods";
import { getCurriculumMap, progressApi, studyApi } from "@/services/api";
import type { CurriculumMap } from "@/types/curriculum";
import type { StudySubject } from "@/types/study";

function percentage(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.round(value / total * 100)) : 0;
}

function ProgressLine({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return <div>
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="font-bold text-slate-900">{percentage(value, total)}% <span className="font-normal text-slate-500">· {value.toLocaleString("pt-BR")} / {total.toLocaleString("pt-BR")} h</span></span>
    </div>
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${label} concluídas`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage(value, total)}%` }} />
    </div>
  </div>;
}

export function DashboardInsights({ curriculumId }: { curriculumId: string | null }) {
  const [subjects, setSubjects] = useState<StudySubject[] | null>(null);
  const [completedCodes, setCompletedCodes] = useState<string[] | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      studyApi.subjects(controller.signal),
      progressApi.completed(controller.signal),
      curriculumId ? getCurriculumMap(curriculumId, controller.signal) : Promise.resolve(null),
    ]).then(([plan, progress, map]) => {
      if (controller.signal.aborted) return;
      if (plan.status === "fulfilled") setSubjects(plan.value);
      if (progress.status === "fulfilled") setCompletedCodes(progress.value.completedCodes);
      if (map.status === "fulfilled") setCurriculum(map.value);
      setLoading(false);
    });
    return () => controller.abort();
  }, [curriculumId]);

  if (loading) return <div className="grid min-h-44 place-items-center rounded-2xl border border-slate-200 bg-white"><LoaderCircle size={26} className="animate-spin text-emerald-700" /></div>;

  const completed = new Set(completedCodes?.map((code) => code.toUpperCase()) ?? []);
  const mandatory = curriculum?.components.filter((component) => component.type === "MANDATORY") ?? [];
  const mandatoryTotal = curriculum?.mandatoryWorkloadHours ?? mandatory.reduce((sum, component) => sum + component.workloadHours, 0);
  const electiveTotal = curriculum?.electiveWorkloadHours ?? 0;
  const mandatoryHours = Math.min(mandatoryTotal, mandatory.reduce((sum, component) => sum + (completed.has(component.code.toUpperCase()) ? component.workloadHours : 0), 0));
  const matrixElectiveHours = curriculum?.components.reduce((sum, component) => sum + (component.type === "ELECTIVE" && completed.has(component.code.toUpperCase()) ? component.workloadHours : 0), 0) ?? 0;
  const matrixCodes = new Set(curriculum?.components.map((component) => component.code.toUpperCase()) ?? []);
  const externalElectiveHours = subjects?.filter((subject) => subject.source === "ECAMPUS_HISTORY" && subject.status === "COMPLETED" && subject.category === "EXTERNAL_ELECTIVE" && subject.countAsElective && !matrixCodes.has(subject.code.toUpperCase())).reduce((sum, subject) => sum + subject.workloadHours, 0) ?? 0;
  const electiveHours = Math.min(electiveTotal, matrixElectiveHours + externalElectiveHours);
  const progressReady = Boolean(curriculum && completedCodes && subjects);
  const coursePercent = curriculum ? percentage(mandatoryHours + electiveHours, curriculum.totalWorkloadHours) : 0;
  const period = subjects ? studyPeriodView(subjects.filter((subject) => subject.source === "ECAMPUS_ENROLLMENT"), null, "SCHEDULE") : null;
  const semesterSubjects = period?.visible ?? [];
  const weeklyHours = semesterSubjects.reduce((sum, subject) => sum + subject.meetings.reduce((hours, meeting) => hours + meeting.endHour - meeting.startHour, 0), 0);
  const attendancePeriod = subjects ? studyPeriodView(subjects, null, "ATTENDANCE") : null;
  const activeSubjects = attendancePeriod?.visible ?? [];
  const attendanceAlerts = activeSubjects.map((subject) => ({ subject, attendance: attendanceFor(subject) }))
    .filter(({ attendance }) => attendance.state !== "SAFE")
    .sort((a, b) => a.attendance.remainingHours - b.attendance.remainingHours);

  return <>
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-700">Trajetória acadêmica</p><h2 className="mt-1 text-xl font-extrabold">Progresso no curso</h2></div><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BookOpenCheck size={20} /></span></div>
        {progressReady && curriculum ? <>
          <div className="mt-6 flex flex-wrap items-baseline gap-2"><strong className="text-4xl font-extrabold tracking-tight text-emerald-800">{coursePercent}%</strong><span className="text-sm text-slate-500">da carga horária total da matriz</span></div>
          <div className="mt-6 space-y-5"><ProgressLine label="Obrigatórias" value={mandatoryHours} total={mandatoryTotal} color="bg-emerald-500" /><ProgressLine label="Optativas" value={electiveHours} total={electiveTotal} color="bg-amber-400" /></div>
          <p className="mt-5 text-xs leading-5 text-slate-500">Estimativa baseada nas aprovações registradas; optativas externas contam até o limite da matriz.</p>
        </> : <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{!curriculumId ? "Vincule sua matriz para visualizar o progresso." : "Não foi possível mostrar o progresso agora. Confira sua matriz e seus documentos."}</p>}
        <Link href="/mapa-curricular" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950">Ver mapa curricular <ArrowRight size={16} /></Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-700">Sua rotina</p><h2 className="mt-1 text-xl font-extrabold">Quadro de horários</h2></div><span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><CalendarDays size={20} /></span></div>
        {subjects === null ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Não foi possível carregar as disciplinas do seu quadro agora.</p> : semesterSubjects.length ? <>
          <div className="mt-6 flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{period?.effectiveTerm}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{semesterSubjects.length} {semesterSubjects.length === 1 ? "disciplina" : "disciplinas"}</span><span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">{weeklyHours} h/semana</span></div>
          <div className="mt-5 divide-y divide-slate-100">{semesterSubjects.slice(0, 4).map((subject) => <div key={subject.id} className="flex items-start gap-3 py-2.5"><span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-500" /><div className="min-w-0"><strong className="block text-sm leading-5 text-slate-900">{subject.name}</strong><span className="text-xs text-slate-500">{subject.code}{subject.sectionLabel ? ` · Turma ${subject.sectionLabel}` : ""}</span>{subject.meetings.length > 0 && <span className="mt-1 block text-xs text-slate-500">{subject.meetings.map((meeting) => `${STUDY_DAYS[meeting.weekday - 1]?.slice(0, 3) ?? "Dia"} ${meeting.startHour}–${meeting.endHour}h`).join(" · ")}</span>}</div></div>)}</div>
          {semesterSubjects.length > 4 && <p className="mt-2 text-xs text-slate-500">E mais {semesterSubjects.length - 4} no quadro completo.</p>}
        </> : <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Ainda não há disciplinas com período letivo no seu quadro. Importe o comprovante de matrícula para montar sua semana.</p>}
        <Link href="/planejamento" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950">Ver horários <ArrowRight size={16} /></Link>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-700">Acompanhamento</p><h2 className="mt-1 text-xl font-extrabold">Faltas e frequência</h2></div><Link href="/frequencia" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950">Ver detalhes <ArrowRight size={16} /></Link></div>
      {subjects === null ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Não foi possível carregar a frequência agora.</p> : !activeSubjects.length ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Nenhuma disciplina em andamento no momento. As faltas aparecerão aqui depois que seu comprovante for importado.</p> : attendanceAlerts.length ? <><p className="mt-4 text-sm text-slate-600">{attendanceAlerts.length} {attendanceAlerts.length === 1 ? "disciplina precisa" : "disciplinas precisam"} da sua atenção.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{attendanceAlerts.slice(0, 4).map(({ subject, attendance }) => <Link key={subject.id} href="/frequencia" className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-4 hover:border-amber-300"><AlertTriangle size={18} className={attendance.state === "EXCEEDED" ? "shrink-0 text-rose-700" : "shrink-0 text-amber-700"} /><span className="min-w-0"><strong className="block text-sm leading-5 text-slate-900">{subject.name}</strong><span className="mt-1 block text-xs text-slate-600">{attendance.state === "EXCEEDED" ? "Limite ultrapassado" : attendance.state === "AT_LIMIT" ? "No limite" : "Perto do limite"} · {attendance.missedHours} h de {attendance.limitHours} h de limite</span></span></Link>)}</div></> : <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 size={19} className="shrink-0" /><p>Nenhuma disciplina em andamento está perto do limite de faltas registrado no Planner.</p></div>}
      <p className="mt-4 text-xs text-slate-500">Estimativa a partir das faltas que você registrou; confira sua frequência oficial no eCampus.</p>
    </section>
  </>;
}
