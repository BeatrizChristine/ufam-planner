"use client";

import { CheckCircle2, Clock3, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendanceCard } from "@/components/study/AttendanceCard";
import { AbsenceDialog } from "@/components/study/AbsenceDialog";
import { attendanceFor } from "@/components/study/attendance";
import { StudyTermSelector } from "@/components/study/StudyTermSelector";
import { studyPeriodView } from "@/components/study/studyPeriods";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { studyApi } from "@/services/api";
import type { StudySubject } from "@/types/study";

export default function AttendancePage() {
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{ subject: StudySubject; absenceId: string } | null>(null);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    studyApi.subjects(controller.signal).then(setSubjects).catch((caught) => {
      if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Não foi possível carregar suas disciplinas.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const { terms, effectiveTerm, unassigned, visible: active } = studyPeriodView(subjects, selectedTerm, "ATTENDANCE");
  const atRisk = active.filter((subject) => attendanceFor(subject).state !== "SAFE").length;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Manaus" });
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filtered = active.filter((subject) => normalize(subject.code + " " + subject.name).includes(normalize(query)));
  const registering = subjects.find((subject) => subject.id === registrationId);
  const absenceToRemove = pendingRemoval?.subject.absences.find((absence) => absence.id === pendingRemoval.absenceId);

  async function register(subject: StudySubject, date: string, hours: number) {
    setBusy(subject.id); setError(null); setSuccess(null);
    try {
      const saved = await studyApi.addAbsence(subject.id, date, hours);
      setSubjects((items) => items.map((item) => item.id === subject.id ? { ...item, absences: [saved, ...item.absences] } : item));
      setSuccess(hours + " h de falta registradas em " + subject.code + ".");
      setRegistrationId(null);
    } finally { setBusy(null); }
  }

  async function undo(subject: StudySubject, absenceId: string) {
    setBusy(subject.id); setRemovalError(null); setSuccess(null);
    try {
      await studyApi.deleteAbsence(subject.id, absenceId);
      setSubjects((items) => items.map((item) => item.id === subject.id ? { ...item, absences: item.absences.filter((absence) => absence.id !== absenceId) } : item));
      setSuccess("Registro de falta removido.");
      setPendingRemoval(null);
    } catch (caught) { setRemovalError(caught instanceof Error ? caught.message : "Não foi possível remover a falta."); }
    finally { setBusy(null); }
  }

  return <div className="animate-enter space-y-5 pb-8">
    <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Uma visão rápida da sua margem</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Faltas e frequência</h1><p className="mt-2 text-sm leading-6 text-slate-500">Consulte o resumo de cada disciplina. Registre uma falta apenas quando precisar.</p></div><div className="flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-white px-3 py-2 text-emerald-900">{active.length} disciplinas</span>{atRisk > 0 && <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-900">{atRisk} precisam de atenção</span>}</div></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><StudyTermSelector terms={terms} value={effectiveTerm} onChange={(term) => { setSelectedTerm(term); setQuery(""); }} loading={loading} /><span className="inline-flex items-center gap-2 text-xs text-slate-500"><Clock3 size={15} className="text-emerald-700" /> Frequência mínima: <strong className="text-emerald-900">75%</strong> · Faltas: até <strong className="text-emerald-900">25%</strong></span></div>
    </header>
    {unassigned.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Há registros sem semestre definido. Suas faltas estão preservadas. <Link href="/planejamento" className="font-bold underline">Consulte os registros no planejador.</Link></p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"><CheckCircle2 size={16} />{success}</p>}
    {active.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-slate-700">Disciplinas em andamento</p><label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:max-w-sm"><Search size={16} className="shrink-0 text-slate-400" /><input aria-label="Buscar disciplina na frequência" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar disciplina..." className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label></div>}
    {loading ? <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Carregando frequência…</p> : active.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><Clock3 className="mx-auto text-emerald-700" size={28} /><h2 className="mt-3 text-lg font-bold text-slate-900">Seu acompanhamento começa com o comprovante</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">A importação identifica suas turmas em andamento. Depois, você só precisa registrar as faltas que ocorrerem.</p><Link href="/dashboard" className="mt-4 inline-block text-sm font-bold text-emerald-800">Ir ao painel inicial →</Link></section> : filtered.length === 0 ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Nenhuma disciplina encontrada para essa busca.</p> : <div className="grid items-start gap-3 xl:grid-cols-2">{filtered.map((subject) => <AttendanceCard key={subject.id} subject={subject} busy={busy === subject.id} onRegister={() => { setSuccess(null); setRegistrationId(subject.id); }} onUndo={(absenceId) => { setSuccess(null); setRemovalError(null); setPendingRemoval({ subject, absenceId }); }} />)}</div>}
    <p className="px-1 text-[11px] leading-5 text-slate-400">Estimativa pessoal em horas: limite = carga horária × 25%, arredondado para baixo para registros em horas inteiras. O eCampus e a coordenação confirmam a frequência oficial.</p>
    {registering && <AbsenceDialog subject={registering} today={today} busy={busy === registering.id} onClose={() => setRegistrationId(null)} onRegister={(date, hours) => register(registering, date, hours)} />}
    {pendingRemoval && absenceToRemove && <ConfirmDialog
      title="Remover falta registrada?"
      subject={`${pendingRemoval.subject.code} · ${pendingRemoval.subject.name}`}
      description={`Registro de ${absenceToRemove.missedHours} h em ${new Date(`${absenceToRemove.missedOn}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}.`}
      warning="Apenas este registro será removido. A disciplina e sua matrícula continuam no Planner."
      confirmLabel="Remover falta"
      busy={busy === pendingRemoval.subject.id}
      error={removalError}
      onClose={() => { if (!busy) setPendingRemoval(null); }}
      onConfirm={() => void undo(pendingRemoval.subject, pendingRemoval.absenceId)}
    />}
  </div>;
}
