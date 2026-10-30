"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { classDatesInMonth, dateLabel, shiftCalendarMonth } from "@/components/study/calendarDates";

const WEEKDAYS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

export function StudyCalendar({ value, onChange, maxDate, weekdays = [], availableHours, latestDate, disabled = false }: {
  value: string | null;
  onChange: (date: string | null) => void;
  maxDate: string;
  weekdays?: number[];
  availableHours?: (date: string) => number;
  latestDate?: string | null;
  disabled?: boolean;
}) {
  const [month, setMonth] = useState((value ?? maxDate).slice(0, 7));
  const heading = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });
  const dates = classDatesInMonth(month, weekdays, maxDate);
  const days = [...new Set(weekdays)].filter((weekday) => dates.some((date) => (new Date(`${date}T12:00:00Z`).getUTCDay() || 7) === weekday)).sort((a, b) => a - b);

  function changeMonth(amount: number) {
    setMonth(shiftCalendarMonth(month, amount));
    onChange(null);
  }

  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Escolha o dia da aula</p><strong className="mt-1 block text-sm text-slate-800 first-letter:uppercase" aria-live="polite">{heading}</strong></div><div className="flex gap-1"><button type="button" aria-label="Mês anterior" disabled={disabled || !weekdays.length} onClick={() => changeMonth(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 disabled:opacity-25"><ChevronLeft size={17} /></button><button type="button" aria-label="Próximo mês" disabled={disabled || !weekdays.length || month >= maxDate.slice(0, 7)} onClick={() => changeMonth(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 disabled:opacity-25"><ChevronRight size={17} /></button></div></div>
    {!weekdays.length ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Os horários desta disciplina não foram identificados. Atualize o comprovante para mostrar seus dias de aula.</p> : !dates.length ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Nenhuma data de aula disponível neste mês até hoje. Consulte o mês anterior.</p> : <div className={`mt-4 grid gap-4 ${days.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
      {days.map((weekday) => <section key={weekday}>
        <h3 className="mb-2 text-[11px] font-bold text-emerald-900">{WEEKDAYS[weekday - 1]}</h3>
        <div className={`grid gap-1.5 ${days.length === 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"}`}>
          {dates.filter((date) => (new Date(`${date}T12:00:00Z`).getUTCDay() || 7) === weekday).map((date) => {
            const hours = availableHours?.(date);
            const recorded = hours === 0;
            const selected = date === value;
            return <button key={date} data-class-date={date} type="button" disabled={disabled || recorded} aria-label={`${dateLabel(date)}, dia de aula${recorded ? ", horas já registradas" : ""}`} aria-pressed={selected} aria-current={date === maxDate ? "date" : undefined} onClick={() => onChange(date)} className={`flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-emerald-700 bg-emerald-700 text-white shadow-sm" : recorded ? "border-slate-100 bg-slate-50 text-slate-400" : "border-emerald-100 bg-emerald-50/50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50"}`}>
              <strong className="text-xs tabular-nums">{date.slice(8, 10)}/{date.slice(5, 7)}</strong>
              {hours !== undefined && <span className="text-[10px]">{recorded ? "Registrada" : `${hours} h`}</span>}
            </button>;
          })}
        </div>
      </section>)}
    </div>}
    {weekdays.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="text-[10px] text-slate-400">Somente dias com aula até hoje</span>{latestDate && <button type="button" disabled={disabled} onClick={() => { onChange(latestDate); setMonth(latestDate.slice(0, 7)); }} className="text-xs font-bold text-emerald-700 disabled:opacity-50">Aula mais recente</button>}</div>}
  </div>;
}
