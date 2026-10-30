"use client";

import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, FileText, LoaderCircle, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { STUDY_DAYS } from "@/components/study/SubjectEditor";
import { importedEnrollmentTerms, importedHistoryCount } from "@/lib/importedDocumentStatus";
import { academicProfileApi, ecampusImportApi, getCurriculumMap, progressApi, studyApi } from "@/services/api";
import type { CurriculumMap } from "@/types/curriculum";
import type { EnrollmentImportPreview, EnrollmentImportSubject, HistoryImportPreview, HistoryImportSubject } from "@/types/ecampus-import";
import type { AcademicProfile } from "@/types/profile";
import type { StudySubject } from "@/types/study";

type EnrollmentChoice = EnrollmentImportSubject & { selected: boolean };
type HistoryChoice = HistoryImportSubject & {
  selected: boolean;
  action: "NEW" | "UNCHANGED" | "REVIEW" | "BLOCKED";
  explanation: string;
};

const IMPORT_ACTION = {
  NEW: { label: "Nova", style: "bg-emerald-100 text-emerald-800" },
  UPDATE: { label: "Atualizar", style: "bg-sky-100 text-sky-800" },
  UNCHANGED: { label: "Sem alteração", style: "bg-slate-100 text-slate-600" },
  REVIEW: { label: "Confirmar vínculo", style: "bg-amber-100 text-amber-900" },
  BLOCKED: { label: "Revisão manual", style: "bg-red-100 text-red-800" },
} as const;

export default function ImportDocumentsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumMap | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentImportPreview | null>(null);
  const [enrollmentFile, setEnrollmentFile] = useState<File | null>(null);
  const [enrollmentRows, setEnrollmentRows] = useState<EnrollmentChoice[]>([]);
  const [history, setHistory] = useState<HistoryImportPreview | null>(null);
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryChoice[]>([]);
  const [enrollmentBusy, setEnrollmentBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [enrollmentResult, setEnrollmentResult] = useState<string | null>(null);
  const [historyResult, setHistoryResult] = useState<string | null>(null);
  const [savedSubjects, setSavedSubjects] = useState<StudySubject[] | null>(null);
  const [savedHistoryCodes, setSavedHistoryCodes] = useState<string[] | null>(null);

  const refreshSavedStatus = useCallback(async (signal?: AbortSignal) => {
    const [plan, progress] = await Promise.allSettled([
      studyApi.subjects(signal), progressApi.completed(signal),
    ]);
    if (signal?.aborted) return;
    setSavedSubjects(plan.status === "fulfilled" ? plan.value : null);
    setSavedHistoryCodes(progress.status === "fulfilled" ? progress.value.completedCodes : null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.allSettled([
      studyApi.subjects(controller.signal), progressApi.completed(controller.signal),
    ]).then(([plan, progress]) => {
      if (controller.signal.aborted) return;
      setSavedSubjects(plan.status === "fulfilled" ? plan.value : null);
      setSavedHistoryCodes(progress.status === "fulfilled" ? progress.value.completedCodes : null);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    academicProfileApi.get(controller.signal).then(async (loaded) => {
      if (controller.signal.aborted) return;
      setProfile(loaded);
      if (loaded.curriculumId) {
        const map = await getCurriculumMap(loaded.curriculumId, controller.signal);
        if (!controller.signal.aborted) setCurriculum(map);
      }
    }).catch(() => { /* A prévia ainda pode ser lida sem perfil. */ });
    return () => controller.abort();
  }, []);

  const enrollmentMismatch = Boolean(enrollment?.courseCode && profile?.courseCode
    && enrollment.courseCode.toUpperCase() !== profile.courseCode.toUpperCase());
  const historyMismatch = Boolean(history?.courseCode && profile?.courseCode
    && history.courseCode.toUpperCase() !== profile.courseCode.toUpperCase());

  async function previewEnrollment(file?: File) {
    if (!file) return;
    setEnrollmentBusy(true); setEnrollmentError(null); setEnrollmentResult(null);
    try {
      const result = await ecampusImportApi.enrollment(file);
      setEnrollmentFile(file);
      setEnrollment(result);
      setEnrollmentRows(result.subjects.map((row) => ({ ...row, selected: row.action !== "BLOCKED" })));
    } catch (caught) {
      setEnrollment(null); setEnrollmentRows([]); setEnrollmentFile(null);
      setEnrollmentError(caught instanceof Error ? caught.message : "Não foi possível ler o comprovante.");
    } finally { setEnrollmentBusy(false); }
  }

  async function previewHistory(file?: File) {
    if (!file) return;
    setHistoryBusy(true); setHistoryError(null); setHistoryResult(null);
    let parsed: HistoryImportPreview | null = null;
    try {
      const result = await ecampusImportApi.history(file);
      parsed = result;
      setHistoryFile(file);
      setHistory(result);
      const currentProfile = profile ?? await academicProfileApi.get();
      setProfile(currentProfile);
      if (!currentProfile.curriculumId) {
        setHistoryRows(result.completed.map((row) => ({ ...row, selected: false, action: "REVIEW", explanation: "Vincule sua matriz ao perfil antes de importar." })));
        return;
      }
      const [map, progress, subjects] = await Promise.all([
        getCurriculumMap(currentProfile.curriculumId), progressApi.completed(), studyApi.subjects(),
      ]);
      setCurriculum(map);
      const byCode = new Map(map.components.map((component) => [component.code.toUpperCase(), component]));
      const completed = new Set(progress.completedCodes.map((code) => code.toUpperCase()));
      setHistoryRows(result.completed.map((row) => {
        const component = byCode.get(row.code.toUpperCase());
        if (component && component.workloadHours !== row.workloadHours)
          return { ...row, selected: false, action: "BLOCKED" as const, explanation: "Carga horária diferente da matriz vinculada; confira a versão." };
        if (component) {
          const already = completed.has(row.code.toUpperCase());
          return { ...row, selected: !already, action: already ? "UNCHANGED" as const : "NEW" as const,
            explanation: already ? "Já consta como concluída no mapa." : "Será marcada como concluída no mapa." };
        }
        if (row.category === "ELECTIVE") {
          const activeCredit = subjects.some((item) => item.code.toUpperCase() === row.code.toUpperCase()
            && item.category === "EXTERNAL_ELECTIVE" && item.status !== "COMPLETED"
            && item.countAsElective);
          if (activeCredit) return { ...row, selected: false, action: "BLOCKED" as const,
            explanation: "Esta optativa já está em curso neste semestre com crédito externo. Revise no planejador." };
          const already = subjects.some((item) => item.code.toUpperCase() === row.code.toUpperCase()
            && item.category === "EXTERNAL_ELECTIVE" && item.status === "COMPLETED" && item.countAsElective
            && item.source === "ECAMPUS_HISTORY");
          return { ...row, selected: !already, action: already ? "UNCHANGED" as const : "NEW" as const,
            explanation: already ? "Optativa externa já contabilizada." : "Será adicionada como optativa externa concluída." };
        }
        return { ...row, selected: false, action: "BLOCKED" as const,
          explanation: "Não consta da matriz vinculada; confira a versão do curso." };
      }));
    } catch (caught) {
      if (!parsed) { setHistory(null); setHistoryRows([]); setHistoryFile(null); }
      else setHistoryRows(parsed.completed.map((row) => ({ ...row, selected: false, action: "REVIEW", explanation: "Não foi possível comparar com o progresso salvo. Tente atualizar a página." })));
      setHistoryError(caught instanceof Error ? caught.message : "Não foi possível comparar o histórico com seu perfil.");
    } finally { setHistoryBusy(false); }
  }

  async function applyEnrollment() {
    if (!enrollmentFile || enrollmentMismatch) return;
    setEnrollmentBusy(true); setEnrollmentError(null); setEnrollmentResult(null);
    try {
      const selection = enrollmentRows.filter((item) => item.selected).map((item) => ({
        code: item.code, sectionLabel: item.sectionLabel, name: item.name.trim(),
        associateId: item.action === "REVIEW" ? item.existingId : null,
      }));
      const result = await ecampusImportApi.confirmEnrollment(enrollmentFile, selection);
      setEnrollmentResult(`Semestre ${result.term}: ${result.created} nova(s), ${result.updated} atualizada(s), ${result.unchanged} sem alteração. Horários e frequência já usam esses dados; faltas registradas foram preservadas.`);
      setEnrollment(null);
      setEnrollmentRows([]);
      setEnrollmentFile(null);
      await refreshSavedStatus();
    } catch (caught) {
      setEnrollmentError(caught instanceof Error ? caught.message : "Não foi possível confirmar a importação.");
    } finally { setEnrollmentBusy(false); }
  }

  async function applyHistory() {
    if (!historyFile || !profile?.curriculumId || !curriculum || historyMismatch) return;
    setHistoryBusy(true); setHistoryError(null); setHistoryResult(null);
    try {
      const selected = historyRows.filter((item) => item.selected).map((item) => ({
        code: item.code, name: item.name.trim(),
      }));
      const result = await ecampusImportApi.confirmHistory(historyFile, selected);
      if (user?.id && result.completedCodes.length) {
        const key = `ufam-planner:pending-progress:${user.id}:${profile.curriculumId}`;
        try {
          const pending = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, boolean>;
          const selectedCodes = new Set(selected.map((item) => item.code.toUpperCase()));
          for (const code of result.completedCodes) {
            if (selectedCodes.has(code.toUpperCase())) delete pending[code];
          }
          localStorage.setItem(key, JSON.stringify(pending));
        } catch { /* Sincronização principal já foi salva no servidor. */ }
      }
      setHistoryResult(`${result.added} nova(s) aprovação(ões) adicionada(s), ${result.unchanged} já contabilizada(s). Nenhum dado anterior foi removido.`);
      setHistory(null);
      setHistoryRows([]);
      setHistoryFile(null);
      await refreshSavedStatus();
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : "Não foi possível confirmar o histórico.");
    } finally { setHistoryBusy(false); }
  }

  const savedEnrollmentTerms = savedSubjects ? importedEnrollmentTerms(savedSubjects) : [];
  const savedHistoryCount = savedSubjects && savedHistoryCodes
    ? importedHistoryCount(savedSubjects, savedHistoryCodes) : null;

  return <div className="animate-enter space-y-6 pb-12">
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#064a39] to-[#00805d] p-6 text-white shadow-sm sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-200">Menos trabalho manual</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Importar dados do eCampus</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">Transforme seu comprovante em quadro de horários e seu histórico em progresso no curso. Confira a prévia antes de salvar. A senha do eCampus nunca é solicitada e o PDF não é armazenado.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/15 px-3 py-1.5">1 · Envie o PDF</span><span className="rounded-full bg-white/15 px-3 py-1.5">2 · Revise os dados</span><span className="rounded-full bg-white/15 px-3 py-1.5">3 · Confirme</span></div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><CalendarDays size={21} /></span><div><h2 className="text-xl font-extrabold text-slate-900">Comprovante de matrícula</h2><p className="mt-1 text-sm text-slate-500">Importa somente as disciplinas efetivamente matriculadas, com turma, carga horária e horários. Use o comprovante, não o espelho de solicitações: este também mostra pedidos rejeitados ou cancelados.</p></div></div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"><Upload size={20} /> Escolher comprovante em PDF <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={enrollmentBusy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void previewEnrollment(file); }} /></label>
      {savedEnrollmentTerms.length > 0 && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
        <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} aria-hidden="true" /> Já consta no seu quadro de horários</p>
        <div className="mt-2 flex flex-wrap gap-2">{savedEnrollmentTerms.map(({ term, count }) => <span key={term} className="rounded-lg bg-white px-2.5 py-1.5 font-semibold ring-1 ring-emerald-100">{term} · {count} {count === 1 ? "disciplina" : "disciplinas"}</span>)}</div>
        <p className="mt-2 text-emerald-800/80">Você pode enviar um comprovante atualizado; as disciplinas já registradas serão comparadas antes de salvar.</p>
      </div>}
      {enrollmentBusy && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin" /> Processando comprovante…</p>}
      {enrollmentMismatch && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">O curso deste PDF é diferente do curso do seu perfil. Confira a conta antes de importar.</p>}
      {enrollment?.warnings.map((warning) => <p key={warning} className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={15} />{warning}</p>)}
      {enrollment && <div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold text-slate-900">Prévia do seu semestre</h3><p className="text-xs text-slate-500">{enrollment.term ?? "Período não identificado"} · {enrollment.subjects.length} disciplinas · {enrollment.totalWorkloadHours} h</p></div><div className="flex flex-wrap items-center gap-4"><button type="button" disabled={enrollmentBusy} onClick={() => setEnrollmentRows((items) => items.map((item) => ({ ...item, selected: item.action !== "BLOCKED" })))} className="text-xs font-bold text-emerald-700 hover:underline disabled:opacity-50">Selecionar todas</button><button type="button" disabled={enrollmentBusy} onClick={() => setEnrollmentRows((items) => items.map((item) => ({ ...item, selected: false })))} className="text-xs font-bold text-slate-500 hover:underline disabled:opacity-50">Desmarcar todas</button></div></div>
        {enrollmentRows.some((row) => row.category === "EXTERNAL_ELECTIVE") && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Algumas disciplinas do comprovante não constam da matriz vinculada. Elas entrarão no quadro, mas não serão contabilizadas automaticamente como optativas ou obrigatórias; confira a versão da matriz e o aproveitamento no eCampus.</p>}
        <div className="mt-3 grid gap-3 md:grid-cols-2">{enrollmentRows.map((row, index) => <div key={`${row.code}-${row.sectionLabel}`} className={`rounded-2xl border p-4 ${row.selected ? "border-emerald-200 bg-emerald-50/35" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start gap-3"><input type="checkbox" aria-label={`Importar ${row.code}, turma ${row.sectionLabel}`} disabled={row.action === "BLOCKED"} checked={row.selected} onChange={(event) => setEnrollmentRows((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} className="mt-1 accent-emerald-700" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-extrabold text-emerald-800">{row.code} · Turma {row.sectionLabel} · {row.workloadHours} h</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${IMPORT_ACTION[row.action].style}`}>{IMPORT_ACTION[row.action].label}</span></div><input aria-label={`Nome de ${row.code}`} maxLength={180} value={row.name} onChange={(event) => setEnrollmentRows((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className="mt-1 w-full border-b border-transparent bg-transparent text-sm font-bold text-slate-900 outline-none focus:border-emerald-500" /><p className="mt-2 text-xs text-slate-600">{row.meetings.length ? row.meetings.map((meeting) => `${STUDY_DAYS[meeting.weekday - 1]} ${String(meeting.startHour).padStart(2, "0")}:00–${String(meeting.startHour + 2).padStart(2, "0")}:00`).join(" · ") : "Horário não identificado"}</p><p className={`mt-2 text-[11px] leading-4 ${row.action === "REVIEW" || row.action === "BLOCKED" ? "font-semibold text-amber-800" : "text-slate-500"}`}>{row.explanation}{row.recordedAbsences > 0 ? ` ${row.recordedAbsences} registro(s) de falta serão preservados.` : ""}</p>{row.nameNeedsReview && <p className="mt-1 text-[11px] font-semibold text-amber-800">Revise a grafia do nome antes de salvar.</p>}</div></div></div>)}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs text-slate-500">As disciplinas importáveis vêm selecionadas. Desmarque as que não deseja importar. Nos itens com “Confirmar vínculo”, confira se o registro existente é da mesma matrícula antes de confirmar; as faltas serão preservadas.</p><button type="button" disabled={enrollmentBusy || enrollmentMismatch || !enrollmentFile || !enrollmentRows.some((row) => row.selected)} onClick={() => void applyEnrollment()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Confirmar {enrollmentRows.filter((row) => row.selected).length} disciplina(s) <ArrowRight size={16} /></button></div>
      </div>}
      {enrollmentError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{enrollmentError}</p>}
      {enrollmentResult && <p role="status" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={17} />{enrollmentResult}<Link href="/planejamento" className="ml-auto underline">Ver meu quadro</Link></p>}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><BookOpenCheck size={21} /></span><div><h2 className="text-xl font-extrabold text-slate-900">Histórico escolar analítico</h2><p className="mt-1 text-sm text-slate-500">Identifica aprovações e dispensas, inclusive optativas de outros cursos. Reprovações antigas e matrículas em andamento não são marcadas como concluídas.</p></div></div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 px-5 py-5 text-sm font-bold text-amber-900 hover:bg-amber-50"><FileText size={20} /> Escolher histórico em PDF <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={historyBusy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void previewHistory(file); }} /></label>
      {savedHistoryCount !== null && savedHistoryCount > 0 && <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-950">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p><strong>{savedHistoryCount} {savedHistoryCount === 1 ? "aprovação do histórico já consta" : "aprovações do histórico já constam"} no seu progresso.</strong> Envie uma versão atualizada para adicionar novas aprovações; o arquivo anterior não fica armazenado.</p>
      </div>}
      {historyBusy && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin" /> Processando histórico…</p>}
      {historyMismatch && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">O curso deste histórico é diferente do curso do seu perfil. Confira a conta antes de importar.</p>}
      {history?.warnings.map((warning) => <p key={warning} className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={15} />{warning}</p>)}
      {history && <div className="mt-5"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-800">Obrigatórias no histórico</p><strong className="mt-1 block text-xl text-emerald-950">{history.mandatoryCompletedHours.toLocaleString("pt-BR")} / {history.mandatoryRequiredHours.toLocaleString("pt-BR")} h</strong></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold text-amber-800">Optativas no histórico</p><strong className="mt-1 block text-xl text-amber-950">{history.electiveCompletedHours.toLocaleString("pt-BR")} / {history.electiveRequiredHours.toLocaleString("pt-BR")} h</strong></div></div>
        <div className="mt-5 flex items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">{history.completed.length} disciplinas concluídas identificadas</h3><p className="text-xs text-slate-500">A comparação destaca o que é novo e o que já está no seu mapa.</p></div><button type="button" onClick={() => setHistoryRows((items) => items.map((item) => ({ ...item, selected: item.action === "NEW" })))} className="shrink-0 text-xs font-bold text-emerald-700 hover:underline">Selecionar novas</button></div>
        <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">{historyRows.map((row, index) => <div key={row.code} className={`flex items-start gap-3 rounded-xl border p-3 ${row.selected ? "border-emerald-200 bg-emerald-50/35" : "border-slate-100 bg-slate-50"}`}><input type="checkbox" aria-label={`Adicionar ${row.code} ao progresso`} disabled={row.action === "BLOCKED" || row.action === "REVIEW"} checked={row.selected} onChange={(event) => setHistoryRows((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, selected: event.target.checked } : item))} className="mt-1 accent-emerald-700" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-emerald-800">{row.code} · {row.workloadHours} h · {row.category === "ELECTIVE" ? "Optativa" : "Obrigatória"}<span className={`rounded-full px-2 py-0.5 text-[10px] ${IMPORT_ACTION[row.action].style}`}>{IMPORT_ACTION[row.action].label}</span></span><input aria-label={`Nome de ${row.code}`} maxLength={180} value={row.name} onChange={(event) => setHistoryRows((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className="mt-1 w-full border-b border-transparent bg-transparent text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500" /><span className="mt-1 block text-[11px] text-slate-500">{row.explanation}</span>{row.nameNeedsReview && <span className="block text-[10px] font-semibold text-amber-800">Revise a grafia do nome.</span>}</span></div>)}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs text-slate-500">Só adicionamos aprovações; marcações anteriores não são removidas. A confirmação é feita em lote, sem gravação parcial.</p><button type="button" disabled={historyBusy || historyMismatch || !historyFile || !profile?.curriculumId || !curriculum || !historyRows.some((row) => row.selected)} onClick={() => void applyHistory()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Adicionar ao meu progresso <ArrowRight size={16} /></button></div>
        {!profile?.curriculumId && <p className="mt-3 text-xs font-semibold text-amber-800">Vincule uma matriz ao perfil para importar aprovações.</p>}
      </div>}
      {historyError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{historyError}</p>}
      {historyResult && <p role="status" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={17} />{historyResult}<Link href="/mapa-curricular" className="ml-auto underline">Ver meu mapa</Link></p>}
    </section>
    <p className="text-center text-xs text-slate-500">Os arquivos são analisados para gerar a prévia e não são guardados pelo UFAM Planner. Dados acadêmicos confirmados por você ficam no seu perfil.</p>
  </div>;
}
