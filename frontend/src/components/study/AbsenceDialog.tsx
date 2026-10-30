"use client";

import { Check, LoaderCircle, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { StudyCalendar } from "@/components/ui/StudyCalendar";
import { absenceCapacity, latestAvailableClassDate } from "./attendance";
import { dateLabel } from "./calendarDates";
import type { StudySubject } from "@/types/study";

export function AbsenceDialog({ subject, today, busy, onClose, onRegister }: {
  subject: StudySubject; today: string; busy: boolean; onClose: () => void; onRegister: (date: string, hours: number) => Promise<void>;
}) {
  const [date, setDate] = useState<string | null>(() => latestAvailableClassDate(subject, today));
  const [hours, setHours] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const available = date ? absenceCapacity(subject, date) : 0;
  const latestDate = latestAvailableClassDate(subject, today);
  const selectedHours = available ? Math.min(hours, available) : 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !selectedHours || date > today || busy) return;
    setError(null);
    try { await onRegister(date, selectedHours); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível registrar a falta."); }
  }

  return <Dialog title="Registrar falta" subtitle={`${subject.code} · ${subject.name}`} onClose={busy ? () => {} : onClose}>
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <StudyCalendar value={date} maxDate={today} weekdays={subject.meetings.map((meeting) => meeting.weekday)} availableHours={(lessonDate) => absenceCapacity(subject, lessonDate)} latestDate={latestDate} disabled={busy} onChange={(nextDate) => { setDate(nextDate); setHours(2); setError(null); }} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Data selecionada</p><strong className="mt-1 block text-xs text-slate-800 first-letter:uppercase">{date ? dateLabel(date) : "Escolha uma data de aula acima"}</strong></div><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1"><button type="button" disabled={selectedHours <= 1 || busy} onClick={() => setHours(Math.max(1, selectedHours - 1))} aria-label="Diminuir horas da falta" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-25"><Minus size={15} /></button><span className="min-w-10 text-center text-sm font-extrabold text-emerald-900" aria-live="polite">{selectedHours} h</span><button type="button" disabled={selectedHours >= available || busy} onClick={() => setHours(Math.min(available, selectedHours + 1))} aria-label="Aumentar horas da falta" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-25"><Plus size={15} /></button></div></div>
      {available > 0 && <p className="text-xs leading-5 text-slate-500">Até {available} h disponíveis nessa data, considerando as faltas já registradas.</p>}
      {date && available === 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">As horas dessa aula já foram registradas. Escolha outra data disponível.</p>}
      {subject.meetings.length > 0 && <p className="text-[10px] leading-4 text-slate-400">Datas baseadas nos dias da turma. Confira feriados e reposições antes de registrar.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500">Cancelar</button><button disabled={busy || !date || !selectedHours || date > today} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}Confirmar {selectedHours || ""}{selectedHours ? " h" : " falta"}</button></div>
    </form>
  </Dialog>;
}
