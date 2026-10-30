"use client";

import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, FileText, GraduationCap, LoaderCircle, MapPin, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Logo } from "@/components/ui/Logo";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { namesCompatible } from "@/lib/nameMatching";
import { academicProfileApi, ecampusImportApi, getCurriculumMap } from "@/services/api";
import { ApiError } from "@/services/api-client";
import type { CurriculumMap } from "@/types/curriculum";
import type { HistoryImportPreview } from "@/types/ecampus-import";
import type { AcademicProfile, CourseOption, CurriculumOption } from "@/types/profile";

type OnboardingForm = {
  courseId: string;
  curriculumId: string;
  admissionYear: string;
  admissionTerm: string;
  registrationNumber: string;
  currentPeriod: string;
};

const initialForm: OnboardingForm = {
  courseId: "",
  curriculumId: "",
  admissionYear: "",
  admissionTerm: "",
  registrationNumber: "",
  currentPeriod: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const requestNumber = useRef(0);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [form, setForm] = useState<OnboardingForm>(initialForm);
  const [loadedProfile, setLoadedProfile] = useState<AcademicProfile | null>(null);
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [history, setHistory] = useState<HistoryImportPreview | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<CurriculumMap | null>(null);
  const [historyMapFailure, setHistoryMapFailure] = useState<{ curriculumId: string; message: string } | null>(null);
  const [selectedHistoryCodes, setSelectedHistoryCodes] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadingCurricula, setLoadingCurricula] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      router.replace("/dashboard");
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const [courseOptions, profile] = await Promise.all([
          academicProfileApi.courses(controller.signal),
          academicProfileApi.get(controller.signal),
        ]);

        if (profile.completed) {
          router.replace("/dashboard");
          return;
        }

        let curriculumOptions: CurriculumOption[] = [];
        if (profile.courseId) {
          curriculumOptions = await academicProfileApi.curricula(profile.courseId, controller.signal);
        }

        setCourses(courseOptions);
        setLoadedProfile(profile);
        setCurricula(curriculumOptions);
        setForm({
          courseId: profile.courseId ?? "",
          curriculumId: profile.curriculumId ?? curriculumOptions[0]?.id ?? "",
          admissionYear: profile.admissionYear?.toString() ?? initialForm.admissionYear,
          admissionTerm: profile.admissionTerm?.toString() ?? initialForm.admissionTerm,
          registrationNumber: profile.registrationNumber ?? "",
          currentPeriod: profile.currentPeriod?.toString() ?? "",
        });
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof ApiError ? reason.message : "Não foi possível preparar seu primeiro acesso.");
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [router, user]);

  useEffect(() => {
    if (!history || !form.curriculumId) return;
    const controller = new AbortController();
    const curriculumId = form.curriculumId;
    getCurriculumMap(form.curriculumId, controller.signal)
      .then((map) => { setHistoryMap(map); setHistoryMapFailure(null); })
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError"))
          setHistoryMapFailure({ curriculumId, message: reason instanceof ApiError ? reason.message : "Não foi possível comparar as disciplinas com a matriz escolhida." });
      });
    return () => controller.abort();
  }, [form.curriculumId, history]);

  async function previewHistory(file: File) {
    setHistoryBusy(true);
    setHistoryError(null);
    setHistory(null);
    setHistoryFile(null);
    try {
      const preview = await ecampusImportApi.history(file);
      setHistoryFile(file);
      setHistory(preview);
      setSelectedHistoryCodes(new Set(preview.completed.map((row) => row.code.toUpperCase())));
      setForm((current) => ({
        ...current,
        registrationNumber: loadedProfile?.registrationNumber || current.registrationNumber || preview.registrationNumber || "",
        admissionYear: loadedProfile?.admissionYear ? current.admissionYear : current.admissionYear || preview.admissionYear?.toString() || "",
        admissionTerm: loadedProfile?.admissionTerm ? current.admissionTerm : current.admissionTerm || preview.admissionTerm?.toString() || "",
      }));
      const matchingCourse = courses.find((course) => course.code.toUpperCase() === preview.courseCode?.toUpperCase());
      if (matchingCourse && !loadedProfile?.courseId && !form.courseId) await handleCourseChange(matchingCourse.id);
    } catch (reason) {
      setHistoryError(reason instanceof ApiError ? reason.message : "Não foi possível ler o histórico. Verifique o PDF e tente novamente.");
    } finally {
      setHistoryBusy(false);
    }
  }

  async function handleCourseChange(courseId: string) {
    const currentRequest = ++requestNumber.current;
    setForm((current) => ({ ...current, courseId, curriculumId: "" }));
    setCurricula([]);
    setLoadingCurricula(true);
    setError(null);

    try {
      const options = await academicProfileApi.curricula(courseId);
      if (currentRequest !== requestNumber.current) return;
      setCurricula(options);
      setForm((current) => ({ ...current, curriculumId: options[0]?.id ?? "" }));
    } catch (reason) {
      if (currentRequest === requestNumber.current) {
        setError(reason instanceof ApiError ? reason.message : "Não foi possível consultar as matrizes deste curso.");
      }
    } finally {
      if (currentRequest === requestNumber.current) setLoadingCurricula(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.courseId) return;

    if (!form.admissionTerm || historyMismatch || registrationMismatch || (history && !history.courseCode)) {
      setError(historyMismatch ? "O curso do histórico é diferente do curso selecionado. Confira antes de salvar." :
        registrationMismatch ? "A matrícula digitada é diferente da matrícula do histórico." :
        history && !history.courseCode ? "Não foi possível identificar o curso no histórico. Confira o documento." : "Selecione o semestre de ingresso.");
      return;
    }
    if (history && curricula.length > 0 && (!historyMap || historyMap.id !== form.curriculumId || historyMapBusy || historyMapError)) {
      setError("Aguarde a comparação com sua matriz antes de importar o histórico.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const common = {
        courseId: form.courseId,
        admissionYear: Number(form.admissionYear),
        admissionTerm: Number(form.admissionTerm),
      };

      if (curricula.length > 0) {
        if (!form.curriculumId) {
          setError("Selecione a matriz curricular correspondente ao seu ingresso.");
          return;
        }
        const profilePayload = {
          ...common,
          curriculumId: form.curriculumId,
          registrationNumber: form.registrationNumber.trim() || null,
          currentPeriod: form.currentPeriod ? Number(form.currentPeriod) : null,
        };
        if (history && historyFile) {
          const selection = historyRows.filter((row) => row.eligible && selectedHistoryCodes.has(row.code.toUpperCase()))
            .map((row) => ({ code: row.code, name: row.name }));
          await ecampusImportApi.onboardWithHistory(historyFile, profilePayload, selection);
        } else {
          await academicProfileApi.save(profilePayload);
        }
      } else {
        await academicProfileApi.start({
          ...common,
          registrationNumber: form.registrationNumber.trim() || null,
          currentPeriod: form.currentPeriod ? Number(form.currentPeriod) : null,
        });
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof ApiError
        ? reason.message
        : reason instanceof TypeError
          ? "A API está temporariamente indisponível. Aguarde alguns segundos e tente novamente."
          : "Não foi possível salvar seu vínculo acadêmico. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCourse = courses.find((course) => course.id === form.courseId);
  const activeHistoryMap = historyMap?.id === form.curriculumId ? historyMap : null;
  const historyMapError = historyMapFailure?.curriculumId === form.curriculumId ? historyMapFailure.message : null;
  const historyMapBusy = Boolean(history && form.curriculumId && !activeHistoryMap && !historyMapError);
  const historyMismatch = Boolean(history?.courseCode && selectedCourse?.code
    && history.courseCode.toUpperCase() !== selectedCourse.code.toUpperCase());
  const registrationMismatch = Boolean(history?.registrationNumber && form.registrationNumber.trim()
    && history.registrationNumber !== form.registrationNumber.trim());
  const nameMismatch = Boolean(history?.studentName && user?.name
    && !namesCompatible(user.name, history.studentName));
  const historyRows = history?.completed.map((row) => {
    const component = activeHistoryMap?.components.find((item) => item.code.toUpperCase() === row.code.toUpperCase());
    if (!activeHistoryMap) return { ...row, eligible: false, explanation: "Aguardando comparação com a matriz." };
    if (component && component.workloadHours !== row.workloadHours)
      return { ...row, eligible: false, explanation: "Carga horária diferente da matriz; confirme a versão do curso." };
    if (component) return { ...row, eligible: true, explanation: "Será marcada como concluída no mapa." };
    if (row.category === "ELECTIVE")
      return { ...row, eligible: true, explanation: "Optativa de outro curso; entrará na estimativa de optativas." };
    return { ...row, eligible: false, explanation: "Não consta da matriz escolhida; confira a versão do curso." };
  }) ?? [];
  const selectedHistoryCount = historyRows.filter((row) => row.eligible && selectedHistoryCodes.has(row.code.toUpperCase())).length;

  return (
    <main className="onboarding-shell min-h-svh bg-[#eef7f2] p-3 sm:p-5 lg:grid lg:place-items-center">
      <div className="onboarding-card mx-auto grid min-h-[calc(100svh-1.5rem)] w-full max-w-[1480px] overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_32px_90px_-38px_rgba(0,61,41,0.35)] sm:min-h-[calc(100svh-2.5rem)] lg:grid-cols-[0.88fr_1.12fr]">
        <section className="onboarding-visual relative hidden overflow-hidden lg:block">
          <Image src="/images/ufam-cadastro.png" alt="Vista aérea do campus da UFAM" fill priority className="object-cover" sizes="42vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/25 via-emerald-950/5 to-emerald-950/95" />
          <div className="absolute -left-32 -top-32 size-80 rounded-full bg-emerald-950/45" />
          <div className="absolute inset-x-0 top-0 p-10">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.32em] text-white">Seu curso. Sua trajetória.</p>
          </div>
          <div className="onboarding-visual-copy absolute inset-x-0 bottom-0 p-10 text-white xl:p-12">
            <div className="mb-5 h-0.5 w-12 bg-emerald-300" />
            <h1 className="onboarding-visual-title max-w-xl font-serif text-5xl leading-[1.04] tracking-[-0.035em]">Um Planner que entende de onde você está partindo.</h1>
            <p className="onboarding-visual-description mt-5 max-w-lg text-sm leading-6 text-white/75">Seu curso e sua matriz definem disciplinas, pré-requisitos, progresso e os melhores caminhos até a formatura.</p>
          </div>
        </section>

        <section className="onboarding-panel flex min-w-0 flex-col overflow-y-auto overscroll-contain px-5 py-6 sm:px-10 lg:px-14 lg:py-9 xl:px-20">
          <div className="onboarding-top mx-auto w-full max-w-2xl shrink-0">
            <header className="onboarding-header flex items-center justify-between">
              <Logo />
              <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-700 ring-1 ring-inset ring-emerald-100 sm:block">Configuração inicial</span>
            </header>

            <div className="onboarding-steps mt-8 flex items-center gap-3 text-xs font-bold text-emerald-700">
              <span className="grid size-8 place-items-center rounded-full bg-emerald-700 text-white">1</span>
              <span>Conta criada</span><span className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-emerald-100" />
              <span className="grid size-8 place-items-center rounded-full border-2 border-emerald-600 bg-white">2</span>
              <span>Vínculo acadêmico</span>
            </div>
          </div>

          <div className="onboarding-content mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-8">
            {loading ? (
              <div className="grid min-h-96 place-items-center">
                <div className="text-center"><LoaderCircle className="mx-auto animate-spin text-emerald-700" size={28} /><p className="mt-4 text-sm text-slate-400">Carregando cursos da UFAM...</p></div>
              </div>
            ) : (
              <div className="animate-enter">
                <div className="onboarding-heading">
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Bem-vindo, {user?.name?.split(" ")[0]}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">Qual é o seu curso?</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Essa escolha personaliza todo o UFAM Planner. Você poderá alterar os dados depois no seu perfil.</p>
                </div>

                <form onSubmit={handleSubmit} className="onboarding-form mt-7 flex flex-col gap-5">
                  {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><FileText size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <strong className="text-sm text-slate-900">Comece pelo histórico do eCampus</strong>
                        <p className="mt-1 text-xs leading-5 text-slate-600">O PDF sugere curso, matrícula e ingresso e identifica as disciplinas concluídas. Você confere tudo antes de salvar.</p>
                      </div>
                    </div>
                    <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-emerald-400 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50">
                      {historyBusy ? <><LoaderCircle size={15} className="mr-2 animate-spin" /> Lendo histórico...</> : historyFile ? "Trocar histórico em PDF" : "Escolher histórico escolar em PDF"}
                      <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={historyBusy || saving} onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void previewHistory(file);
                        event.target.value = "";
                      }} />
                    </label>
                    {historyError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{historyError}</p>}
                    {history && <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3 text-xs text-slate-700">
                      <div className="flex items-start justify-between gap-2"><strong className="min-w-0 break-all text-emerald-800">{historyFile?.name}</strong><button type="button" aria-label="Remover histórico" onClick={() => { setHistory(null); setHistoryFile(null); setHistoryError(null); }} className="shrink-0 text-slate-400 hover:text-slate-700"><X size={16} /></button></div>
                      <p className="mt-2"><strong>Aluno no documento:</strong> {history.studentName || "não identificado"}</p>
                      <p className="mt-1"><strong>Curso:</strong> {history.courseCode || "não identificado"} · <strong>Matrícula:</strong> {history.registrationNumber || "não identificada"}</p>
                      <p className="mt-1"><strong>Ingresso:</strong> {history.admissionYear && history.admissionTerm ? `${history.admissionYear}/${history.admissionTerm}` : "não identificado"} · <strong>Aprovações:</strong> {history.completed.length}</p>
                      {nameMismatch && <p className="mt-2 flex items-start gap-1.5 text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> Os nomes não parecem corresponder. Confira se o histórico é seu; o nome do perfil não será alterado automaticamente.</p>}
                      {historyMismatch && <p className="mt-2 font-semibold text-rose-700">O curso do PDF não corresponde ao curso escolhido.</p>}
                      {history.warnings.map((warning, index) => <p key={index} className="mt-2 text-amber-800">{warning}</p>)}
                    </div>}
                  </div>

                  <div>
                    <span className="mb-2 block text-xs font-bold text-slate-700">Curso na UFAM</span>
                    <SearchableSelect
                      value={form.courseId}
                      onChange={(courseId) => void handleCourseChange(courseId)}
                      placeholder="Busque e selecione seu curso"
                      searchPlaceholder="Digite o curso, código ou campus..."
                      emptyMessage="Nenhum curso encontrado."
                      options={courses.map((course) => ({
                        value: course.id,
                        label: course.name,
                        description: [course.code, course.campus, course.unitAbbreviation, course.studyShift, course.degreeType].filter(Boolean).join(" · "),
                        keywords: `${course.code} ${course.name} ${course.campus} ${course.degreeType ?? ""}`,
                        searchText: `${course.code} ${course.name} ${course.campus} ${course.unitName ?? ""} ${course.unitAbbreviation ?? ""} ${course.studyShift ?? ""}`,
                      }))}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-xs font-bold text-slate-700">Ano de ingresso</span>
                      <span className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-50">
                        <CalendarDays size={17} className="text-slate-400" />
                        <input required type="number" min="1909" max="2100" value={form.admissionYear} onChange={(event) => setForm((current) => ({ ...current, admissionYear: event.target.value }))} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none" />
                      </span>
                    </label>
                    <div>
                      <span className="mb-2 block text-xs font-bold text-slate-700">Semestre de ingresso</span>
                      <SearchableSelect value={form.admissionTerm} onChange={(admissionTerm) => setForm((current) => ({ ...current, admissionTerm }))} placeholder="Selecione" searchable={false} options={[{ value: "1", label: "1º semestre" }, { value: "2", label: "2º semestre" }]} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label><span className="mb-2 block text-xs font-bold text-slate-700">Número de matrícula <span className="font-normal text-slate-400">(opcional)</span></span><input inputMode="numeric" maxLength={20} value={form.registrationNumber} onChange={(event) => setForm((current) => ({ ...current, registrationNumber: event.target.value }))} placeholder="Confira no histórico" className="min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-emerald-600" /></label>
                    <label><span className="mb-2 block text-xs font-bold text-slate-700">Período atual no curso <span className="font-normal text-slate-400">(opcional)</span></span><input type="number" min="1" max="20" value={form.currentPeriod} onChange={(event) => setForm((current) => ({ ...current, currentPeriod: event.target.value }))} placeholder="Ex.: 4" className="min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 outline-none focus:border-emerald-600" /></label>
                  </div>
                  {registrationMismatch && <p role="alert" className="-mt-3 text-xs font-semibold text-rose-700">A matrícula informada não corresponde à do histórico selecionado.</p>}
                  {history && <p className="-mt-3 text-[11px] text-slate-500">A matrícula e o ingresso foram sugeridos pelo PDF quando identificados. O período atual não é deduzido do semestre letivo; informe-o apenas se souber.</p>}

                  {form.courseId && (
                    <div className="onboarding-matrix-card rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      {loadingCurricula ? (
                        <div className="flex items-center gap-3 text-sm text-slate-500"><LoaderCircle className="animate-spin text-emerald-700" size={18} /> Consultando matrizes curriculares...</div>
                      ) : curricula.length > 0 ? (
                        <div className="onboarding-matrix-content flex flex-col gap-3">
                          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><BookOpenCheck size={18} /></span><div><strong className="text-sm text-slate-800">{curricula.length === 1 ? "Matriz identificada" : `${curricula.length} matrizes encontradas`}</strong><p className="onboarding-matrix-description mt-1 text-xs leading-5 text-slate-500">{curricula.length === 1 ? "Esta é a única matriz disponível para o curso." : "Escolha a matriz correspondente ao seu ingresso."}</p></div></div>
                          {curricula.length === 1 ? (
                            <div className="flex min-h-16 items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5">
                              <div className="min-w-0 flex-1">
                                <strong className="block truncate text-sm text-slate-800">Matriz {curricula[0].code}</strong>
                                <span className="mt-1 block text-[11px] text-slate-400">{curricula[0].totalWorkloadHours.toLocaleString("pt-BR")} horas · {curricula[0].expectedPeriods} períodos</span>
                              </div>
                              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={17} /></span>
                            </div>
                          ) : (
                            <SearchableSelect value={form.curriculumId} onChange={(curriculumId) => setForm((current) => ({ ...current, curriculumId }))} placeholder="Selecione sua matriz" searchable={false} options={curricula.map((curriculum) => ({ value: curriculum.id, label: `Matriz ${curriculum.code}`, description: `${curriculum.totalWorkloadHours.toLocaleString("pt-BR")} horas · ${curriculum.expectedPeriods} períodos` }))} />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><GraduationCap size={18} /></span><div><strong className="text-sm text-slate-800">Curso identificado</strong><p className="mt-1 text-xs leading-5 text-slate-500">A matriz de {selectedCourse?.name} ainda será estruturada. Você já pode entrar; o vínculo será completado assim que ela estiver disponível.</p></div></div>
                      )}
                    </div>
                  )}

                  {history && curricula.length > 0 && <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-sm text-slate-900">Aprovações para o mapa</strong><p className="mt-1 text-xs text-slate-500">{selectedHistoryCount} de {history.completed.length} selecionadas. Desmarque o que não quiser importar.</p></div><button type="button" onClick={() => setSelectedHistoryCodes(new Set(historyRows.filter((row) => row.eligible).map((row) => row.code.toUpperCase())))} className="text-xs font-semibold text-emerald-700 hover:underline">Selecionar válidas</button></div>
                    {historyMapBusy && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={14} className="animate-spin" /> Comparando com a matriz...</p>}
                    {historyMapError && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{historyMapError}</p>}
                    <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2">{historyRows.map((row) => <label key={row.code} className={`flex items-start gap-2 rounded-xl border p-2.5 ${row.eligible && selectedHistoryCodes.has(row.code.toUpperCase()) ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-slate-50"}`}><input type="checkbox" disabled={!row.eligible} checked={row.eligible && selectedHistoryCodes.has(row.code.toUpperCase())} onChange={(event) => setSelectedHistoryCodes((current) => { const next = new Set(current); if (event.target.checked) next.add(row.code.toUpperCase()); else next.delete(row.code.toUpperCase()); return next; })} className="mt-0.5 accent-emerald-700" /><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{row.code} · {row.name}</span><span className="mt-1 block text-[11px] text-slate-500">{row.explanation}</span></span></label>)}</div>
                  </div>}
                  {history && curricula.length === 0 && !loadingCurricula && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Sem matriz estruturada, o histórico não pode ser aplicado ao progresso agora. Seu vínculo e os campos revisados serão salvos; depois você poderá importar as aprovações na área “Importar do eCampus”.</p>}

                  <button disabled={saving || historyBusy || historyMapBusy || Boolean(historyMapError) || loadingCurricula || !form.courseId || !form.admissionYear || !form.admissionTerm || historyMismatch || registrationMismatch} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? <><LoaderCircle className="animate-spin" size={17} /> Salvando...</> : <>{history && curricula.length > 0 ? `Confirmar perfil e ${selectedHistoryCount} aprovação(ões)` : "Entrar no UFAM Planner"} <ArrowRight size={17} /></>}
                  </button>
                </form>

                <div className="onboarding-footer mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> Dados salvos no seu perfil</span>
                  <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-emerald-600" /> Catálogo público da UFAM</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
