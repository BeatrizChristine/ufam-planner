"use client";

import { BookOpenCheck, CalendarDays, LockKeyhole } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { SubjectCourseInfo } from "./SubjectCourseInfo";
import { STUDY_DAYS } from "./studyConstants";
import type { StudySubject } from "@/types/study";

export function SubjectDetails({ subject, onClose }: { subject: StudySubject; onClose: () => void }) {
  return <Dialog title={subject.name} subtitle={`${subject.code} · ${subject.workloadHours} h`} onClose={onClose}>
    <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Período letivo</p><strong className="mt-1 block text-sm">{subject.academicTerm ?? "Aguardando documento"}</strong></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Turma</p><strong className="mt-1 block text-sm">{subject.sectionLabel ?? "Não identificada no documento"}</strong></div></div>
    <div className="mt-4"><SubjectCourseInfo subject={subject} includeUnit /></div>
    <h3 className="mt-5 flex items-center gap-2 text-sm font-bold"><CalendarDays size={16} className="text-emerald-700" /> Horários da turma</h3>
    <div className="mt-3 space-y-2">{subject.meetings.length ? subject.meetings.map((meeting) => <div key={meeting.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-sm"><span className="text-slate-600">{STUDY_DAYS[meeting.weekday - 1]}</span><strong>{String(meeting.startHour).padStart(2, "0")}:00 – {String(meeting.endHour).padStart(2, "0")}:00</strong></div>) : <p className="text-xs text-slate-500">Nenhum horário identificado. Use um comprovante atualizado para completar os dados.</p>}</div>
    <p className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><LockKeyhole size={16} className="mt-0.5 shrink-0" /> Esses dados vêm do documento importado. Para atualizar turma ou horários, importe um novo comprovante pelo painel inicial.</p>
    <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><BookOpenCheck size={14} /> As faltas já registradas são preservadas na atualização da mesma matrícula.</p>
  </Dialog>;
}
