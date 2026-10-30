"use client";

import { ArrowRight, BookOpenCheck, CheckCircle2, ChevronDown, Clock3, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CatalogCoverageSummary } from "@/components/study/CatalogCoverageSummary";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getCurriculumMap, getDashboardSummary, progressApi, studyApi } from "@/services/api";
import type { CurriculumComponent, CurriculumMap } from "@/types/curriculum";
import type { CatalogCoverage, CatalogDiscipline } from "@/types/study";

type Scope = "CATALOG" | "CURRICULUM";
type SearchStatus = "idle" | "loading" | "ready" | "error";
type SearchItem = {
  key: string;
  code: string;
  name: string;
  workloadHours: number;
  department: string | null;
  gradeCourses: string | null;
  gradeCourseCount: number;
  component: CurriculumComponent | null;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const typeLabel: Record<CurriculumComponent["type"], string> = {
  MANDATORY: "Obrigatória",
  ELECTIVE: "Optativa",
  OPTIONAL: "Opcional",
};
const ORIGINS = [
  { value: "3", label: "Manaus · todas as unidades", description: "Graduação regular · seleção inicial" },
  { value: "14", label: "Coari", description: "Graduação regular · interior" },
  { value: "15", label: "Humaitá", description: "Graduação regular · interior" },
  { value: "16", label: "Benjamin Constant", description: "Graduação regular · interior" },
  { value: "17", label: "Itacoatiara", description: "Graduação regular · interior" },
  { value: "18", label: "Parintins", description: "Graduação regular · interior" },
  { value: "13", label: "Educação a distância", description: "EAD" },
  { value: "20", label: "PARFOR", description: "Modalidade específica" },
  { value: "22", label: "Graduação indígena", description: "Modalidade específica" },
  { value: "0", label: "Todos os locais", description: "Busca em todas as origens integradas" },
];

export default function DisciplinesPage() {
  const [scope, setScope] = useState<Scope>("CATALOG");
  const [query, setQuery] = useState("");
  const [originLevelId, setOriginLevelId] = useState(3);
  const [catalogResults, setCatalogResults] = useState<CatalogDiscipline[]>([]);
  const [coverage, setCoverage] = useState<CatalogCoverage | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [retryKey, setRetryKey] = useState(0);
  const [curriculum, setCurriculum] = useState<CurriculumMap | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [completedCodes, setCompletedCodes] = useState<string[] | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    studyApi.catalogCoverage(controller.signal).then(setCoverage).catch(() => {});
    async function loadContext() {
      const [profile, progress] = await Promise.allSettled([
        getDashboardSummary(controller.signal),
        progressApi.completed(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (progress.status === "fulfilled") setCompletedCodes(progress.value.completedCodes);
      if (profile.status === "fulfilled" && profile.value.curriculumId) {
        try {
          const map = await getCurriculumMap(profile.value.curriculumId, controller.signal);
          if (!controller.signal.aborted) setCurriculum(map);
        } catch { /* A busca geral continua disponível sem a matriz. */ }
      }
      if (!controller.signal.aborted) setProfileReady(true);
    }
    void loadContext();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (scope !== "CATALOG" || term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      studyApi.searchDisciplines(term, controller.signal, originLevelId)
        .then((items) => { if (!controller.signal.aborted) { setCatalogResults(items); setSearchStatus("ready"); } })
        .catch(() => { if (!controller.signal.aborted) setSearchStatus("error"); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, scope, originLevelId, retryKey]);

  const byCode = useMemo(() => new Map(curriculum?.components.map((component) => [component.code.toUpperCase(), component]) ?? []), [curriculum]);
  const matches = normalize(query.trim());
  const items: SearchItem[] = scope === "CURRICULUM"
    ? (matches ? curriculum?.components.filter((component) => normalize(`${component.code} ${component.name}`).includes(matches)) : [])?.map((component) => ({ key: component.componentId, code: component.code, name: component.name, workloadHours: component.workloadHours, department: null, gradeCourses: curriculum ? `${curriculum.courseCode} · ${curriculum.courseName}` : null, gradeCourseCount: 1, component })) ?? []
    : catalogResults.map((discipline) => ({ key: discipline.id, code: discipline.code, name: discipline.name, workloadHours: discipline.workloadHours, department: discipline.department, gradeCourses: discipline.gradeCourses, gradeCourseCount: discipline.gradeCourseCount, component: byCode.get(discipline.code.toUpperCase()) ?? null }));
  const completed = new Set(completedCodes?.map((code) => code.toUpperCase()) ?? []);

  function changeQuery(value: string) {
    setQuery(value);
    setCatalogResults([]);
    setSearchStatus(value.trim().length >= 2 ? "loading" : "idle");
    setSelectedCode(null);
  }

  function retrySearch() {
    setSearchStatus("loading");
    setRetryKey((current) => current + 1);
  }

  function changeOrigin(value: string) {
    setOriginLevelId(Number(value));
    setCatalogResults([]);
    setSearchStatus(query.trim().length >= 2 ? "loading" : "idle");
    setSelectedCode(null);
  }

  const selectedCoverage = coverage && (originLevelId === 0
    ? { courses: coverage.courses, indexedCourses: coverage.indexedCourses }
    : coverage.levels.find((level) => level.levelId === originLevelId));
  const originLabel = ORIGINS.find((origin) => origin.value === String(originLevelId))?.label ?? "origem escolhida";

  return <div className="animate-enter space-y-6 pb-8">
    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm sm:p-8">
      <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Search size={22} /></span>
      <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.17em] text-emerald-700">Explore com clareza</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Buscar disciplinas</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Encontre matérias pelo código ou nome. Veja carga horária e, quando fizerem parte da sua matriz, período e pré-requisitos.</p>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Onde buscar">
        <button type="button" aria-pressed={scope === "CATALOG"} onClick={() => { if (scope === "CATALOG") return; setScope("CATALOG"); setSelectedCode(null); setSearchStatus(query.trim().length >= 2 ? "loading" : "idle"); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${scope === "CATALOG" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50"}`}>Catálogo integrado</button>
        <button type="button" aria-pressed={scope === "CURRICULUM"} onClick={() => { setScope("CURRICULUM"); setSelectedCode(null); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${scope === "CURRICULUM" ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50"}`}>Minha matriz</button>
      </div>
      {scope === "CATALOG" && <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
        <p className="block text-sm font-extrabold text-emerald-950">De onde você quer buscar disciplinas?</p>
        <p className="mt-1 text-xs leading-5 text-emerald-900">Começamos por todos os cursos de Manaus. Você pode escolher outro campus ou consultar todas as origens já integradas.</p>
        <div className="mt-3 max-w-md"><SearchableSelect ariaLabel="Origem acadêmica das disciplinas" value={String(originLevelId)} options={ORIGINS} onChange={changeOrigin} placeholder="Escolha a origem da grade" searchable={false} /></div>
        {selectedCoverage && <p className="mt-3 text-xs text-emerald-900">{selectedCoverage.indexedCourses} de {selectedCoverage.courses} cursos {originLevelId === 0 ? "do catálogo" : "dessa origem"} já tiveram a grade processada. Algumas grades públicas não têm versão corrente; a busca ainda está sendo ampliada.</p>}
        <p className="mt-1 text-[11px] text-emerald-800">Este filtro indica a origem acadêmica da grade; não confirma turma ou horário.</p>
      </div>}
      <label htmlFor="discipline-search" className="mt-6 block text-sm font-bold text-slate-800">Código ou nome da disciplina</label>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
        <Search size={19} className="shrink-0 text-slate-400" />
        <input id="discipline-search" autoComplete="off" value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Ex.: IEM011, Cálculo ou Mandarim" className="min-w-0 flex-1 py-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
        {query && <button type="button" onClick={() => changeQuery("")} aria-label="Limpar busca" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={17} /></button>}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{scope === "CATALOG" ? "O catálogo reúne disciplinas já integradas ao Planner; não é a lista de turmas ofertadas neste semestre." : "Esta busca usa a versão da matriz vinculada ao seu perfil."}</p>
      {scope === "CATALOG" && coverage && <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><summary className="cursor-pointer font-bold text-slate-700">Ver cobertura de Manaus, interior e outras modalidades</summary><div className="mt-3"><CatalogCoverageSummary coverage={coverage} /></div></details>}
    </section>

    {scope === "CURRICULUM" && profileReady && !curriculum ? <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-900"><strong>Não foi possível carregar sua matriz.</strong><p className="mt-1">Confira se o curso e a versão da matriz estão vinculados ao seu perfil.</p><Link href="/perfil" className="mt-3 inline-flex items-center gap-1 font-bold underline">Abrir perfil <ArrowRight size={15} /></Link></section>
      : scope === "CURRICULUM" && !profileReady ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">Carregando sua matriz…</p>
      : !query.trim() ? <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-9 text-center"><BookOpenCheck className="mx-auto text-emerald-700" size={28} /><h2 className="mt-3 text-lg font-bold text-slate-900">O que você quer encontrar?</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Digite um código ou parte do nome para explorar {scope === "CURRICULUM" ? "sua matriz" : "as disciplinas integradas"}.</p></section>
      : scope === "CATALOG" && query.trim().length < 2 ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">Digite pelo menos 2 caracteres para buscar no catálogo.</p>
      : scope === "CATALOG" && searchStatus === "loading" ? <div className="flex items-center gap-2 rounded-2xl bg-white p-5 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin" /> Buscando disciplinas…</div>
      : scope === "CATALOG" && searchStatus === "error" ? <section role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-800"><strong>Não foi possível consultar o catálogo agora.</strong><p className="mt-1">Confira a conexão com a API e tente novamente.</p><button type="button" onClick={retrySearch} className="mt-3 font-bold underline">Tentar novamente</button></section>
      : items.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white p-7 text-center"><Search className="mx-auto text-slate-400" size={24} /><h2 className="mt-3 text-base font-bold">Nenhuma disciplina encontrada</h2><p className="mt-2 text-sm leading-6 text-slate-500">Tente outro nome ou código. A grade de alguns cursos ainda não foi integrada.</p>{scope === "CATALOG" && originLevelId !== 0 && <button type="button" onClick={() => changeOrigin("0")} className="mt-3 text-sm font-bold text-emerald-800 hover:underline">Buscar em todos os locais</button>}</section>
      : <section aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold text-slate-900">Resultados {scope === "CURRICULUM" ? "na minha matriz" : originLevelId === 0 ? "em todos os locais" : `em ${originLabel}`}</h2><span className="text-xs font-semibold text-slate-500">{items.length} {items.length === 1 ? "disciplina" : "disciplinas"}{scope === "CATALOG" && items.length === 30 ? " · até 30 por busca" : ""}</span></div>
        <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => {
          const open = selectedCode === item.key;
          const approved = completedCodes !== null && completed.has(item.code.toUpperCase());
          return <article key={item.key} className={`rounded-2xl border bg-white shadow-sm transition ${open ? "border-emerald-300" : "border-slate-200 hover:border-emerald-200"}`}>
            <button type="button" aria-expanded={open} onClick={() => setSelectedCode(open ? null : item.key)} className="flex w-full items-start gap-3 p-4 text-left sm:p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BookOpenCheck size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold uppercase tracking-wide text-emerald-800">{item.code}</span><strong className="mt-1 block text-sm leading-5 text-slate-900">{item.name}</strong><span className="mt-2 block text-xs leading-5 text-slate-600"><span className="font-bold text-slate-700">{item.gradeCourseCount > 1 ? "Cursos" : "Curso"}:</span> {item.gradeCourses ?? "Ainda não identificado no catálogo"}{item.gradeCourseCount > 3 ? ` e mais ${item.gradeCourseCount - 3}` : ""}</span><span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={13} /> {item.workloadHours} h</span>{item.department && <span>{item.department}</span>}{item.component && <span>{typeLabel[item.component.type]} na sua matriz</span>}</span></span>
              <ChevronDown size={17} className={`mt-2 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div className="border-t border-slate-100 px-4 py-4 text-xs leading-5 text-slate-600 sm:px-5">
              {item.component ? <>
                <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800">{item.component.suggestedPeriod ? `${item.component.suggestedPeriod}º período sugerido` : "Período não indicado"}</span>{approved && <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 font-bold text-sky-800"><CheckCircle2 size={13} /> Aprovada no histórico</span>}</div>
                <p className="mt-3"><strong className="text-slate-800">Pré-requisitos:</strong> {item.component.prerequisiteCodes.length ? item.component.prerequisiteCodes.join(", ") : "Nenhum identificado nesta matriz."}</p>
                <p className="mt-1"><strong className="text-slate-800">Desbloqueia:</strong> {item.component.unlocksCodes.length ? item.component.unlocksCodes.join(", ") : "Nenhuma disciplina indicada."}</p>
                <Link href="/mapa-curricular" className="mt-3 inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline">Ver mapa curricular <ArrowRight size={14} /></Link>
              </> : <><p>Esta disciplina não está identificada na sua matriz vinculada. Ela pode ser explorada em um rascunho, mas o aproveitamento como optativa depende das regras e da aprovação da UFAM.</p><Link href="/planejamento" className="mt-3 inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline">Ir ao planejador <ArrowRight size={14} /></Link></>}
            </div>}
          </article>;
        })}</div>
      </section>}
  </div>;
}
