"use client";

import { ChevronRight, Edit3, Trash2 } from "lucide-react";
import { SubjectCourseInfo } from "./SubjectCourseInfo";
import { STUDY_DAYS } from "./studyConstants";
import type { StudySubject } from "@/types/study";

type Props = {
  subjects: StudySubject[];
  draft: boolean;
  color: (subject: StudySubject) => string;
  onOpen: (subject: StudySubject) => void;
  onEdit: (subject: StudySubject) => void;
  onRemove: (subject: StudySubject) => void;
};

const rowGrid = "grid grid-cols-[6px_minmax(0,1fr)_2rem] items-center gap-3 px-4 sm:px-5 md:grid-cols-[6px_minmax(0,1fr)_4rem]";
const contentGrid = "grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-[minmax(0,1fr)_6rem_13rem] md:items-center md:gap-x-5";
const hourLabel = (hour: number) => String(hour).padStart(2, "0") + ":00";

export function SemesterSubjectList({ subjects, draft, color, onOpen, onEdit, onRemove }: Props) {
  if (!subjects.length) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-extrabold text-slate-900">Disciplinas deste semestre</h2>
        <p className="mt-1 text-xs text-slate-500">Toque em uma disciplina para {draft ? "ajustar seu rascunho" : "consultar os dados da turma"}.</p>
      </header>
      <div aria-hidden="true" className={`${rowGrid} hidden border-b border-slate-100 bg-slate-50/70 py-2.5 md:grid`}>
        <span />
        <div className={contentGrid}>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Disciplina e curso</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Turma</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Horários</span>
        </div>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {subjects.map((subject) => (
          <article key={subject.id} data-semester-subject={subject.id} className={`${rowGrid} py-4 transition hover:bg-slate-50/70`}>
            <span className={`h-12 w-1.5 shrink-0 rounded-full border ${color(subject)}`} aria-hidden="true" />
            <button type="button" onClick={() => onOpen(subject)} aria-label={`${draft ? "Ajustar rascunho" : "Consultar turma"} de ${subject.name}`} className={`${contentGrid} min-w-0 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4`}>
              <div className="col-span-2 min-w-0 md:col-span-1">
                <p className="text-[11px] font-bold text-emerald-800">{subject.code} · {subject.workloadHours} h</p>
                <h3 className="mt-1 text-sm font-bold leading-5 text-slate-800">{subject.name}</h3>
                <SubjectCourseInfo subject={subject} includeUnit />
              </div>
              <div data-subject-section className="min-w-0 self-start md:self-center">
                <span className="mb-1 block text-[10px] font-semibold text-slate-400 md:hidden">Turma</span>
                {subject.sectionLabel ? <span className="inline-flex max-w-full break-words rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900">{subject.sectionLabel}</span> : <span className="text-[11px] leading-5 text-slate-400">{draft ? "Simulação" : "Não consta no documento"}</span>}
              </div>
              <div data-subject-times className="min-w-0 text-[11px] text-slate-500">
                <span className="mb-1 block text-[10px] font-semibold text-slate-400 md:hidden">Horários</span>
                {subject.meetings.length ? <div className="space-y-1">{subject.meetings.map((meeting) => (
                  <div key={meeting.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-1 leading-5">
                    <span className="font-semibold text-slate-600">{STUDY_DAYS[meeting.weekday - 1].slice(0, 3)}</span>
                    <span className="break-words tabular-nums">{hourLabel(meeting.startHour)}–{hourLabel(meeting.endHour)}</span>
                  </div>
                ))}</div> : <span className="leading-5">{draft ? "Horário a simular" : "Sem horário no documento"}</span>}
              </div>
            </button>
            {draft ? <div className="flex flex-col justify-end md:flex-row">
              <button type="button" onClick={() => onEdit(subject)} aria-label={`Ajustar rascunho de ${subject.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><Edit3 size={15} /></button>
              <button type="button" onClick={() => onRemove(subject)} aria-label={`Remover rascunho de ${subject.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>
            </div> : <button type="button" onClick={() => onOpen(subject)} aria-label={`Ver detalhes da turma de ${subject.name}`} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><ChevronRight size={16} /></button>}
          </article>
        ))}
      </div>
    </section>
  );
}
