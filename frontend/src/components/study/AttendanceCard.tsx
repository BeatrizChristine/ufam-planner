"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Plus, Trash2 } from "lucide-react";
import { attendanceFor } from "./attendance";
import { STUDY_DAYS } from "./studyConstants";
import type { StudySubject } from "@/types/study";

const STATE_STYLE = {
  SAFE: "bg-emerald-50 text-emerald-800",
  WARNING: "bg-amber-50 text-amber-900",
  AT_LIMIT: "bg-orange-50 text-orange-900",
  EXCEEDED: "bg-red-50 text-red-900",
};
const STATE_LABEL = { SAFE: "Dentro do limite", WARNING: "Perto do limite", AT_LIMIT: "No limite", EXCEEDED: "Limite ultrapassado" };

export function AttendanceCard({ subject, busy, onRegister, onUndo }: {
  subject: StudySubject; busy: boolean; onRegister: () => void; onUndo: (id: string) => void;
}) {
  const a = attendanceFor(subject);
  const budgetUsed = a.limitHours > 0 ? Math.min(100, a.missedHours / a.limitHours * 100) : 0;
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <header className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{subject.code} · {subject.workloadHours} h{subject.source === "MANUAL" ? " · registro manual anterior" : ""}</p><h2 className="mt-1.5 text-sm font-extrabold leading-5 text-slate-900">{subject.name}</h2>{subject.sectionLabel && <p className="mt-1 text-[11px] text-slate-400">Turma {subject.sectionLabel}</p>}</div><span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${STATE_STYLE[a.state]}`}>{a.state === "SAFE" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}<span>{STATE_LABEL[a.state]}</span></span></header>
    <div className="mt-4 flex items-end justify-between gap-3"><div><strong className={`text-2xl font-extrabold tracking-tight ${a.state === "EXCEEDED" ? "text-red-800" : "text-emerald-900"}`}>{a.remainingHours} h</strong><span className="ml-2 text-xs text-slate-500">de margem</span></div><div className="text-right"><strong className="text-sm font-bold text-slate-700">{a.missedPercent.toFixed(1).replace(".", ",")}%</strong><p className="text-[10px] text-slate-400">de faltas · máximo 25%</p></div></div>
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Margem de faltas utilizada" aria-valuenow={Math.min(a.missedHours, a.limitHours)} aria-valuemin={0} aria-valuemax={a.limitHours}><div className={`h-full rounded-full ${a.state === "EXCEEDED" ? "bg-red-500" : a.state === "SAFE" ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${budgetUsed}%` }} /></div>
    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{a.missedHours} h registradas</span><span>Limite: <strong className="font-semibold text-slate-600">{a.limitHours} h</strong></span></div>
    {a.state === "EXCEEDED" && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">Sua estimativa ultrapassou o limite. Se essas faltas forem confirmadas pela UFAM, há reprovação por frequência.</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><details className="min-w-0 flex-1 text-xs text-slate-500"><summary className="flex cursor-pointer list-none items-center gap-1 font-semibold">Margem em dias <ChevronDown size={13} /></summary><div className="mt-2 space-y-2"><p>Cabem <strong className="text-slate-700">{a.remainingTwoHourBlocks} blocos completos de 2 h</strong>.</p>{a.days.length > 0 && <div className="flex flex-wrap gap-1.5">{a.days.map((day) => <span key={day.weekday} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px]">{STUDY_DAYS[day.weekday - 1]}: <strong>{day.fullDaysLeft} dias</strong> ({day.hoursPerDay} h/dia)</span>)}</div>}<p className="text-[10px] leading-4 text-slate-400">São alternativas, não somas. Não considera quantas aulas ainda ocorrerão no semestre.</p></div></details><button onClick={onRegister} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><Plus size={14} /> Registrar falta</button></div>
    {subject.absences.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-slate-500">Faltas registradas ({subject.absences.length})</summary><div className="mt-2 max-h-36 space-y-1 overflow-y-auto">{subject.absences.map((absence) => <div key={absence.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-600">{new Date(`${absence.missedOn}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · <strong>{absence.missedHours} h</strong></span><button disabled={busy} onClick={() => onUndo(absence.id)} aria-label={`Remover falta de ${absence.missedHours} horas em ${subject.name}, ${absence.missedOn}`} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"><Trash2 size={13} /></button></div>)}</div></details>}
  </article>;
}
