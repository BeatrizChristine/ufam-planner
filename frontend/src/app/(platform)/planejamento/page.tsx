"use client";

import { AlertTriangle, CalendarDays, ChevronRight, FileCheck2, NotebookPen, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SubjectEditor } from "@/components/study/SubjectEditor";
import { SubjectDetails } from "@/components/study/SubjectDetails";
import { SemesterSubjectList } from "@/components/study/SemesterSubjectList";
import { STUDY_DAYS, STUDY_HOURS } from "@/components/study/studyConstants";
import { StudyTermSelector } from "@/components/study/StudyTermSelector";
import { studyPeriodView } from "@/components/study/studyPeriods";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { studyApi } from "@/services/api";
import type { StudySubject } from "@/types/study";

const COLORS = [
  "border-emerald-300 bg-emerald-100 text-emerald-950", "border-amber-300 bg-amber-100 text-amber-950",
  "border-sky-300 bg-sky-100 text-sky-950", "border-violet-300 bg-violet-100 text-violet-950",
  "border-rose-300 bg-rose-100 text-rose-950", "border-teal-300 bg-teal-100 text-teal-950",
];

export default function PlanningPage() {
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [mode, setMode] = useState<"ENROLLED" | "DRAFT">("ENROLLED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StudySubject | null>(null);
  const [details, setDetails] = useState<StudySubject | null>(null);
  const [newMeeting, setNewMeeting] = useState<{ weekday: number; startHour: number } | null>(null);
  const [editorOpen, setEditor] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<StudySubject | null>(null);
  const [removalBusy, setRemovalBusy] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [removalNotice, setRemovalNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    studyApi.subjects(controller.signal).then(setSubjects).catch((caught) => {
      if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Não foi possível carregar seu quadro.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const scoped = subjects.filter((subject) => mode === "ENROLLED" ? subject.source === "ECAMPUS_ENROLLMENT" : subject.source === "MANUAL");
  const { terms, effectiveTerm, unassigned, visible } = studyPeriodView(scoped, selectedTerm, "SCHEDULE");
  const meetings = visible.flatMap((subject) => subject.meetings.map((meeting) => ({ subject, meeting })));
  const conflictCount = STUDY_DAYS.flatMap((_, day) => STUDY_HOURS.filter((hour) => meetings.filter(({ meeting }) => meeting.weekday === day + 1 && meeting.startHour === hour).length > 1)).length;
  const weeklyHours = meetings.length * 2;

  function openDraft(subject: StudySubject | null, meeting: { weekday: number; startHour: number } | null = null) {
    if (subject && subject.source !== "MANUAL") { setDetails(subject); return; }
    setEditing(subject); setNewMeeting(meeting); setEditor(true);
  }

  function openSubject(subject: StudySubject) {
    if (subject.source === "MANUAL") openDraft(subject);
    else setDetails(subject);
  }

  async function removeDraft(subject: StudySubject) {
    if (subject.source !== "MANUAL") return;
    setRemovalBusy(true); setRemovalError(null);
    try {
      await studyApi.deleteSubject(subject.id);
      setSubjects((items) => items.filter((item) => item.id !== subject.id));
      setRemovalNotice(`Rascunho de ${subject.code} removido.`);
      setPendingRemoval(null);
    } catch (caught) { setRemovalError(caught instanceof Error ? caught.message : "Não foi possível remover o rascunho."); }
    finally { setRemovalBusy(false); }
  }

  const color = (subject: StudySubject) => COLORS[Math.max(0, subjects.findIndex((item) => item.id === subject.id)) % COLORS.length];
  return <div className="animate-enter space-y-5 pb-8">
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Sua semana, com clareza</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Meu quadro de horários</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Seu comprovante do eCampus preenche as turmas e os horários. Consulte sua matrícula ou explore possibilidades em um rascunho separado.</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-emerald-100 bg-white p-1" aria-label="Tipo de quadro">
          {[{ id: "ENROLLED", label: "Minha matrícula", icon: FileCheck2 }, { id: "DRAFT", label: "Rascunho", icon: NotebookPen }].map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id as typeof mode); setSelectedTerm(null); }} className={"inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition " + (mode === id ? "bg-emerald-700 text-white shadow-sm" : "text-slate-500 hover:bg-emerald-50")}><Icon size={15} />{label}</button>)}
        </div>
        <StudyTermSelector terms={terms} value={effectiveTerm} onChange={setSelectedTerm} loading={loading} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-white px-3 py-1.5 text-emerald-900">{visible.length} disciplinas</span><span className="rounded-full bg-white px-3 py-1.5 text-emerald-900">{weeklyHours} h por semana</span>{conflictCount > 0 && <span className="rounded-full bg-rose-100 px-3 py-1.5 text-rose-800">{conflictCount} horário(s) em conflito</span>}</div>
    </section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {removalNotice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{removalNotice}</p>}
    {unassigned.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-bold text-amber-950">{unassigned.length} disciplina(s) sem período definido</h2><p className="mt-1 text-xs leading-5 text-amber-900">Os registros e suas faltas continuam salvos, sem misturar semestres.</p>
      <div className="mt-3 flex flex-wrap gap-2">{unassigned.map((subject) => <button key={subject.id} onClick={() => openSubject(subject)} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-950">{subject.code} · {subject.source === "MANUAL" ? "Definir período" : "Consultar documento"}</button>)}</div>
    </section>}
    {!loading && !visible.length && <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center"><CalendarDays className="mx-auto text-emerald-600" size={27} /><h2 className="mt-3 text-lg font-bold text-slate-900">{mode === "ENROLLED" ? "Seu semestre aparece aqui após a importação" : "Teste possibilidades sem mexer na matrícula"}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{mode === "ENROLLED" ? "Comece pelo destaque de documentos no painel inicial. O comprovante preenche o quadro automaticamente." : "Escolha uma matéria do catálogo e simule um horário. Isso não confirma oferta, vaga ou matrícula."}</p>{mode === "ENROLLED" ? <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-800">Ir ao painel inicial <ChevronRight size={16} /></Link> : <button onClick={() => openDraft(null)} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white">Planejar pelo catálogo</button>}</section>}
    {(loading || visible.length > 0 || mode === "DRAFT") && <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><CalendarDays size={18} className="text-emerald-700" /> {mode === "ENROLLED" ? "Minha semana" : "Semana simulada"}</h2><p className="mt-1 text-xs text-slate-500">{mode === "ENROLLED" ? "Toque em uma aula para consultar os dados importados." : "Toque em um espaço livre para simular uma aula."}</p></div><Link href="/frequencia" className="text-xs font-bold text-emerald-800">Faltas e frequência →</Link></header>
      <div className="overflow-x-auto p-4 sm:p-5"><div className="min-w-[760px]">
        <div className="grid grid-cols-[65px_repeat(6,minmax(0,1fr))] gap-2"><span className="self-center text-center text-[10px] font-bold text-slate-400">HORÁRIO</span>{STUDY_DAYS.map((day) => <div key={day} className="rounded-xl bg-[#0b4c3c] py-2.5 text-center text-xs font-bold text-white">{day}</div>)}</div>
        <div className="mt-2 space-y-2">{STUDY_HOURS.map((hour) => <div key={hour} className={"grid grid-cols-[65px_repeat(6,minmax(0,1fr))] gap-2 " + (hour === 14 || hour === 18 ? "border-t border-slate-100 pt-3" : "")}>
          <div className="flex flex-col justify-center rounded-lg bg-slate-50 text-center text-[11px] font-bold text-slate-500"><span>{String(hour).padStart(2, "0")}:00</span><span className="mt-1 font-normal text-slate-400">{String(hour + 2).padStart(2, "0")}:00</span></div>
          {STUDY_DAYS.map((day, index) => { const inCell = meetings.filter(({ meeting }) => meeting.weekday === index + 1 && meeting.startHour === hour); return <div key={day} className={"min-h-[88px] rounded-xl border p-1.5 " + (inCell.length > 1 ? "border-rose-300 bg-rose-50" : "border-slate-100 bg-slate-50/60")}>
            {inCell.length ? <div className="space-y-1">{inCell.map(({ subject }) => <button key={subject.id} onClick={() => openSubject(subject)} className={"w-full rounded-lg border p-2 text-left shadow-sm transition hover:brightness-95 " + color(subject)}><strong className="block text-[10px]">{subject.code}</strong><span className="mt-1 line-clamp-3 block text-[11px] font-semibold leading-4">{subject.name}</span>{subject.sectionLabel && <small className="mt-1 block text-[10px] opacity-65">Turma {subject.sectionLabel}</small>}</button>)}{inCell.length > 1 && <span className="flex items-center gap-1 p-1 text-[10px] font-bold text-rose-700"><AlertTriangle size={11} /> Conflito</span>}</div> : mode === "DRAFT" ? <button aria-label={"Simular aula " + day + ", " + hour + " às " + (hour + 2) + " horas"} onClick={() => openDraft(null, { weekday: index + 1, startHour: hour })} className="flex h-full min-h-[74px] w-full items-center justify-center rounded-lg text-slate-300 hover:bg-emerald-50 hover:text-emerald-700"><Plus size={17} /></button> : <span className="flex min-h-[74px] items-center justify-center text-slate-200">—</span>}
          </div>; })}
        </div>)}</div>
      </div></div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{mode === "ENROLLED" ? "Alterou a matrícula? Atualize seu comprovante no painel inicial." : "Rascunhos são pessoais. Os horários simulados não são ofertas confirmadas."}</span>{mode === "DRAFT" && <button onClick={() => openDraft(null)} className="inline-flex items-center gap-1.5 font-bold text-emerald-800"><Plus size={14} /> Planejar outra disciplina</button>}</footer>
    </section>}
    <SemesterSubjectList subjects={visible} draft={mode === "DRAFT"} color={color} onOpen={openSubject} onEdit={(subject) => openDraft(subject)} onRemove={(subject) => { setRemovalNotice(null); setRemovalError(null); setPendingRemoval(subject); }} />
    {details && <SubjectDetails subject={details} onClose={() => setDetails(null)} />}
    {editorOpen && <SubjectEditor initial={editing} initialMeeting={newMeeting} defaultTerm={effectiveTerm} onClose={() => setEditor(false)} onSaved={(saved) => { setSubjects((items) => [...items.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))); setMode("DRAFT"); if (saved.academicTerm) setSelectedTerm(saved.academicTerm); setEditor(false); }} />}
    {pendingRemoval && <ConfirmDialog
      title="Remover este rascunho?"
      subject={`${pendingRemoval.code} · ${pendingRemoval.name}`}
      description="A disciplina sairá apenas do seu planejamento pessoal. Sua matrícula importada não será alterada."
      warning={pendingRemoval.absences.length > 0 ? `${pendingRemoval.absences.length} ${pendingRemoval.absences.length === 1 ? "registro de falta deste rascunho também será apagado" : "registros de falta deste rascunho também serão apagados"}.` : undefined}
      confirmLabel="Remover rascunho"
      busy={removalBusy}
      error={removalError}
      onClose={() => { if (!removalBusy) setPendingRemoval(null); }}
      onConfirm={() => void removeDraft(pendingRemoval)}
    />}
  </div>;
}
