"use client";

import { BookOpen, Check, LoaderCircle, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { academicProfileApi, studyApi } from "@/services/api";
import { Dialog } from "@/components/ui/Dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { SubjectDetails } from "./SubjectDetails";
import { STUDY_DAYS, STUDY_HOURS } from "./studyConstants";
import type { CourseOption } from "@/types/profile";
import type { CatalogDiscipline, StudySubject, StudySubjectInput } from "@/types/study";

export { STUDY_DAYS, STUDY_HOURS } from "./studyConstants";

type Props = {
  initial?: StudySubject | null;
  initialMeeting?: { weekday: number; startHour: number } | null;
  defaultCategory?: StudySubjectInput["category"];
  defaultTerm?: string | null;
  onClose: () => void;
  onSaved: (subject: StudySubject) => void;
};

export function SubjectEditor(props: Props) {
  if (props.initial && props.initial.source !== "MANUAL") return <SubjectDetails subject={props.initial} onClose={props.onClose} />;
  return <DraftSubjectEditor {...props} />;
}

function DraftSubjectEditor({ initial, initialMeeting, defaultCategory = "MANDATORY", defaultTerm, onClose, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CatalogDiscipline[]>([]);
  const [chosen, setChosen] = useState<CatalogDiscipline | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [gradeBusy, setGradeBusy] = useState(false);
  const [academicTerm, setAcademicTerm] = useState(initial?.academicTerm ?? defaultTerm ?? "");
  const [meetings, setMeetings] = useState<{ weekday: number; startHour: number }[]>(
    initial?.meetings.map(({ weekday, startHour }) => ({ weekday, startHour })) ?? (initialMeeting ? [initialMeeting] : []),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    academicProfileApi.courses(controller.signal).then(setCourses).catch(() => { /* Não libera digitação livre de cursos. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (initial || chosen || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => studyApi.searchDisciplines(query.trim(), controller.signal).then(setOptions).catch(() => setOptions([])), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, chosen, initial]);

  async function loadCourse() {
    if (!courseId) return;
    setGradeBusy(true); setError(null);
    setQuery("");
    try {
      const grade = await studyApi.importCourseDisciplines(courseId);
      setOptions(grade);
      if (!grade.length) setError("A grade deste curso não pôde ser consultada agora. Use a importação de documentos para sua matrícula real.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível consultar a grade."); }
    finally { setGradeBusy(false); }
  }

  function toggleMeeting(weekday: number, startHour: number) {
    setMeetings((items) => items.some((meeting) => meeting.weekday === weekday && meeting.startHour === startHour)
      ? items.filter((meeting) => !(meeting.weekday === weekday && meeting.startHour === startHour))
      : [...items, { weekday, startHour }]);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initial && !chosen) return;
    setSaving(true); setError(null);
    try {
      const saved = await studyApi.saveSubject({
        disciplineId: initial?.disciplineId ?? chosen?.id ?? null,
        code: initial?.code ?? chosen!.code,
        name: initial?.name ?? chosen!.name,
        workloadHours: initial?.workloadHours ?? chosen!.workloadHours,
        // A course catalog does not prove who offers a class; preserve only existing confirmed text.
        offeringCourse: initial?.offeringCourse ?? null,
        sectionLabel: initial?.sectionLabel ?? null,
        academicTerm, category: initial?.category ?? defaultCategory,
        status: initial?.status ?? "PLANNED", countAsElective: initial?.countAsElective ?? false, meetings,
      }, initial?.id);
      onSaved(saved);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível salvar o rascunho."); }
    finally { setSaving(false); }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  return <Dialog title={initial ? "Ajustar rascunho" : "Planejar uma disciplina"} subtitle="Simule possibilidades sem alterar sua matrícula importada." onClose={onClose} wide>
    <form onSubmit={(event) => void save(event)} className="space-y-5">
      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Este é um rascunho pessoal, não uma oferta confirmada. Ele não entra automaticamente no progresso ou nas faltas das suas turmas importadas.</p>
      {initial ? <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4"><BookOpen size={20} className="shrink-0 text-emerald-700" /><div><strong className="text-sm">{initial.code} · {initial.name}</strong><p className="mt-1 text-xs text-slate-500">{initial.workloadHours} h · dados preservados do seu rascunho</p></div></div> : <>
        <div><label htmlFor="draft-search" className="text-xs font-bold text-slate-600">Buscar uma disciplina do catálogo</label><div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={16} className="text-slate-400" /><input id="draft-search" value={chosen ? chosen.code + " · " + chosen.name : query} onChange={(event) => { setQuery(event.target.value); setChosen(null); setOptions([]); }} placeholder="Código ou nome da disciplina" className="min-w-0 flex-1 py-3 text-sm outline-none" /></div></div>
        {!chosen && options.length > 0 && <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1">{options.map((option) => <button key={option.id} type="button" onClick={() => { setChosen(option); setOptions([]); }} className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-emerald-50"><span className="text-sm"><strong className="text-emerald-800">{option.code}</strong> · {option.name}</span><small className="shrink-0 text-slate-500">{option.workloadHours} h</small></button>)}</div>}
        {chosen && <p className="flex items-center gap-2 text-xs font-bold text-emerald-800"><Check size={15} /> {chosen.workloadHours} h · disciplina identificada no catálogo</p>}
        <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-500">Consultar a grade de outro curso</summary><div className="mt-3 space-y-3"><SearchableSelect value={courseId} onChange={(id) => { setCourseId(id); setOptions([]); }} placeholder="Selecione um curso da UFAM" searchPlaceholder="Curso, código ou unidade..." options={courses.map((course) => ({ value: course.id, label: course.code + " · " + course.name, description: [course.campus, course.unitAbbreviation].filter(Boolean).join(" · "), keywords: course.unitName ?? "" }))} /><button type="button" disabled={!courseId || gradeBusy} onClick={() => void loadCourse()} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50">{gradeBusy ? "Consultando…" : "Carregar disciplinas do curso"}</button><p className="text-[11px] leading-5 text-slate-500">Consultar a grade não identifica o curso ofertante de uma turma.</p></div></details>
      </>}
      <label className="block space-y-2 text-xs font-bold text-slate-600"><span>Período do rascunho</span><input required value={academicTerm} onChange={(event) => setAcademicTerm(event.target.value)} pattern="20[0-9]{2}/[12]" placeholder="Ex.: 2026/2" className={inputClass} /></label>
      <fieldset><legend className="text-xs font-bold text-slate-600">Horários que você quer simular</legend><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{STUDY_DAYS.map((day, dayIndex) => <div key={day} className="space-y-1.5"><p className="text-center text-[11px] font-bold text-slate-500">{day}</p>{STUDY_HOURS.map((hour) => { const selected = meetings.some((meeting) => meeting.weekday === dayIndex + 1 && meeting.startHour === hour); return <button key={hour} type="button" aria-label={day + ", " + hour + " às " + (hour + 2) + " horas"} aria-pressed={selected} onClick={() => toggleMeeting(dayIndex + 1, hour)} className={"w-full rounded-lg border px-1 py-2 text-xs " + (selected ? "border-emerald-700 bg-emerald-700 font-bold text-white" : "border-slate-200 text-slate-500 hover:bg-emerald-50")}>{String(hour).padStart(2, "0")}–{String(hour + 2).padStart(2, "0")}</button>; })}</div>)}</div></fieldset>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button><button type="submit" disabled={saving || (!initial && !chosen)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}Salvar rascunho</button></div>
    </form>
  </Dialog>;
}
