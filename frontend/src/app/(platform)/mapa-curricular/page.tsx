"use client";

import "@xyflow/react/dist/style.css";

import {
  Background, BackgroundVariant, Controls, Handle, MarkerType,
  Position, ReactFlow, type Edge, type EdgeTypes, type Node, type NodeProps, type NodeTypes,
} from "@xyflow/react";
import {
  AlertCircle, BookOpenCheck, Check, CheckCircle2, Clock3, Filter,
  GraduationCap, Hand, Info, Layers3, LoaderCircle, RotateCcw, Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  CURRICULUM_COLUMN_STEP,
  RoundedPrerequisiteEdge,
  type PrerequisiteEdge,
} from "@/components/curriculum/RoundedPrerequisiteEdge";
import { academicProfileApi, getCurriculumMap, progressApi, studyApi } from "@/services/api";
import type { CurriculumComponent, CurriculumMap } from "@/types/curriculum";
import type { StudySubject } from "@/types/study";

type FilterType = "MANDATORY" | "ELECTIVE";
type FocusState = "normal" | "selected" | "related" | "dimmed";

type AreaTheme = {
  label: string;
  prefixes: string[];
  accent: string;
  fill: string;
};

const AREA_THEMES: AreaTheme[] = [
  { label: "Instituto de Computação", prefixes: ["IEC"], accent: "#956900", fill: "#f3ca4b" },
  { label: "Eletrônica e Computação", prefixes: ["FTL"], accent: "#076e4e", fill: "#52c69d" },
  { label: "Eletricidade", prefixes: ["FTE"], accent: "#205c97", fill: "#7bb2e0" },
  { label: "Física", prefixes: ["IEF"], accent: "#176d7b", fill: "#66c7d1" },
  { label: "Matemática", prefixes: ["IEM"], accent: "#99551a", fill: "#f0a45c" },
  { label: "Estatística", prefixes: ["IEE"], accent: "#61459c", fill: "#ad97dd" },
  { label: "Administração", prefixes: ["FAE", "FAA"], accent: "#885322", fill: "#e7b57f" },
  { label: "Humanas e Letras", prefixes: ["IHE", "IHP", "IHS"], accent: "#854474", fill: "#d694bf" },
];

const FALLBACK_THEME: AreaTheme = {
  label: "Outras áreas", prefixes: [], accent: "#496379", fill: "#9ab6c8",
};

const CURRICULUM_ROW_STEP = 144;

// Fixed columns reproduce the official FT05 diagram instead of packing every
// period to the left. This preserves visual chains such as Cálculo I → II → EDO.
const DIAGRAM_COLUMN: Record<string, number> = {
  IHE030: 0, IHP164: 0, IEC030: 0, FAE011: 0,
  IEM011: 1, IEM021: 1, IEM141: 1, FTL023: 1, FTL052: 1, FTL062: 1, FTL068: 1, FTL069: 1,
  IEE001: 2, FTE029: 2,
  IEM012: 3, IEM022: 3, IEC010: 3, IEE312: 3, IEC590: 3, FTE030: 3,
  IEC011: 4, IEC012: 4, IEC013: 4, IEC087: 4, IEC481: 4, FTL066: 4, IEC034: 4, FTL216: 4,
  IEC584: 5, FTL085: 5,
  IEF030: 6, FTL022: 6, FTL042: 6, FTL065: 6,
  IEF028: 7, IEF038: 7, FTE006: 7, FTL026: 7, FTL044: 7, FTL067: 7, FAA011: 7, FAA018: 7,
  FTE007: 8, FTL041: 8, FTE032: 8,
  IEF029: 9, IEF039: 9, IEF049: 9, FTE052: 9, IEC029: 9, IHS041: 9,
};

function themeFor(code: string) {
  return AREA_THEMES.find((theme) => theme.prefixes.some((prefix) => code.startsWith(prefix))) ?? FALLBACK_THEME;
}

type CurriculumNodeData = {
  component: CurriculumComponent;
  focus: FocusState;
  completed: boolean;
  external: boolean;
};
type CurriculumFlowNode = Node<CurriculumNodeData, "curriculum">;

function CurriculumNode({ data }: NodeProps<CurriculumFlowNode>) {
  const theme = themeFor(data.component.code);
  const focusClass = data.focus === "selected"
    ? "ring-4 ring-emerald-200 shadow-lg"
    : data.focus === "related"
      ? "ring-2 ring-emerald-100 shadow-md"
      : data.focus === "dimmed" ? "opacity-30" : "shadow-sm";

  return (
    <div
      className={`relative flex h-[110px] w-[180px] flex-col rounded-xl border border-l-4 px-3 py-3 transition-all ${focusClass}`}
      style={{ backgroundColor: theme.fill, borderColor: theme.accent }}
    >
      <Handle type="target" position={Position.Top} className="!size-2.5 !border-2 !border-white !bg-[#006b48]" />
      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="text-[10px] font-black tracking-[0.04em] text-[#003d29]">{data.component.code}</span>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-extrabold text-[#15231e]">{data.component.workloadHours} h</span>
          {data.completed && <span className="grid size-6 place-items-center rounded-full border-2 border-[#006b48] bg-[#006b48] text-white" title="Aprovação importada do histórico" aria-label="Aprovação importada do histórico"><Check size={13} strokeWidth={3} /></span>}
        </div>
      </div>
      <p className="mt-2 line-clamp-3 min-h-0 overflow-hidden text-[11px] font-bold leading-[1.4] text-[#15231e]" title={data.component.name}>{data.component.name}</p>
      {data.external && <span className="absolute -bottom-2 right-2 rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-emerald-800">Externa</span>}
      <Handle type="source" position={Position.Bottom} className="!size-2.5 !border-2 !border-white !bg-[#006b48]" />
    </div>
  );
}

const nodeTypes = { curriculum: CurriculumNode } satisfies NodeTypes;
const edgeTypes = { prerequisite: RoundedPrerequisiteEdge } satisfies EdgeTypes;

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Manaus" }).format(new Date(value));
}

export default function CurriculumMapPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [curriculum, setCurriculum] = useState<CurriculumMap | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("MANDATORY");
  const [query, setQuery] = useState("");
  const [mapNavigationEnabled, setMapNavigationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingCurriculum, setMissingCurriculum] = useState(false);
  const [adminPreview, setAdminPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedCodes, setCompletedCodes] = useState<Set<string>>(() => new Set());
  const [linkedCurriculumId, setLinkedCurriculumId] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [externalElectives, setExternalElectives] = useState<StudySubject[]>([]);
  const [externalLoadError, setExternalLoadError] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    studyApi.subjects(controller.signal).then((subjects) => {
      setExternalElectives(subjects.filter((subject) => subject.category === "EXTERNAL_ELECTIVE" && subject.source === "ECAMPUS_HISTORY"));
      setExternalLoadError(false);
    }).catch((caught) => { if ((caught as Error).name !== "AbortError") setExternalLoadError(true); });
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setProgressError(null);
        setLinkedCurriculumId(null);
        setCompletedCodes(new Set());
        setMissingCurriculum(false);
        setAdminPreview(false);
        const profile = await academicProfileApi.get(controller.signal);
        let curriculumId = profile.curriculumId;

        if (!curriculumId && userRole === "ADMIN") {
          const courses = await academicProfileApi.courses(controller.signal);
          const pilotCourse = courses.find((course) => course.code === "FT05");
          if (pilotCourse) {
            const curricula = await academicProfileApi.curricula(pilotCourse.id, controller.signal);
            curriculumId = curricula.find((item) => item.code.includes("2009-1"))?.id ?? curricula[0]?.id ?? null;
            setAdminPreview(Boolean(curriculumId));
          }
        }

        if (!curriculumId) {
          setMissingCurriculum(true);
          return;
        }

        const result = await getCurriculumMap(curriculumId, controller.signal);
        setCurriculum(result);
        setSelectedCode(null);
        if (profile.curriculumId === curriculumId) {
          setLinkedCurriculumId(curriculumId);
          try {
            const saved = await progressApi.completed(controller.signal);
            if (!controller.signal.aborted) setCompletedCodes(new Set(saved.completedCodes));
          } catch (caught) {
            if ((caught as Error).name !== "AbortError") {
              setProgressError("Não foi possível carregar as aprovações do histórico. Atualize a página para tentar novamente.");
            }
          }
        }
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(caught instanceof Error ? caught.message : "Não foi possível carregar a matriz curricular.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [userId, userRole]);

  const externalComponents = useMemo(() => {
    const matrixCodes = new Set(curriculum?.components.map((component) => component.code.toUpperCase()) ?? []);
    const seen = new Set<string>();
    return externalElectives.filter((subject) => {
      const code = subject.code.toUpperCase();
      if (subject.status !== "COMPLETED" || !subject.countAsElective || matrixCodes.has(code) || seen.has(code)) return false;
      seen.add(code);
      return true;
    })
      .map((subject): CurriculumComponent => ({
        componentId: `external-${subject.id}`, disciplineId: subject.disciplineId ?? `external-${subject.id}`,
        code: subject.code, name: subject.name, workloadHours: subject.workloadHours,
        suggestedPeriod: null, type: "ELECTIVE", prerequisiteCodes: [], unlocksCodes: [],
      }));
  }, [curriculum, externalElectives]);

  const visibleComponents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return [...(curriculum?.components ?? []), ...(filter === "ELECTIVE" ? externalComponents : [])].filter((component) => {
      const matchesType = component.type === filter;
      const matchesQuery = !normalized || `${component.code} ${component.name}`.toLocaleLowerCase("pt-BR").includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [curriculum, externalComponents, filter, query]);

  const selected = visibleComponents.find((component) => component.code === selectedCode) ?? null;
  const mandatoryComponents = curriculum?.components.filter((component) => component.type === "MANDATORY") ?? [];
  const completedMandatoryHours = mandatoryComponents.reduce((hours, component) =>
    hours + (completedCodes.has(component.code) ? component.workloadHours : 0), 0);
  const completedMatrixElectiveHours = curriculum?.components.reduce((hours, component) =>
    hours + (component.type === "ELECTIVE" && completedCodes.has(component.code) ? component.workloadHours : 0), 0) ?? 0;
  const matrixCodes = new Set(curriculum?.components.map((component) => component.code.toUpperCase()) ?? []);
  const countedExternalSubjects = externalElectives.filter((subject) => subject.status === "COMPLETED" && subject.countAsElective && !matrixCodes.has(subject.code.toUpperCase()));
  const completedExternalHours = countedExternalSubjects.reduce((hours, subject) => hours + subject.workloadHours, 0);
  const completedElectiveHours = completedMatrixElectiveHours + completedExternalHours;
  const requiredMandatoryHours = curriculum?.mandatoryWorkloadHours ?? mandatoryComponents.reduce((hours, component) => hours + component.workloadHours, 0);
  const requiredElectiveHours = curriculum?.electiveWorkloadHours ?? 0;
  const countedMandatoryHours = Math.min(completedMandatoryHours, requiredMandatoryHours);
  const countedElectiveHours = Math.min(completedElectiveHours, requiredElectiveHours);
  const completedCourseHours = countedMandatoryHours + countedElectiveHours;
  const courseProgress = curriculum?.totalWorkloadHours
    ? Math.min(100, Math.round((completedCourseHours / curriculum.totalWorkloadHours) * 100)) : 0;
  const requiredDisciplineHours = requiredMandatoryHours + requiredElectiveHours;
  const disciplineProgress = requiredDisciplineHours
    ? Math.min(100, Math.round((completedCourseHours / requiredDisciplineHours) * 100)) : 0;
  const mandatoryProgress = requiredMandatoryHours ? Math.min(100, (countedMandatoryHours / requiredMandatoryHours) * 100) : 0;
  const electiveProgress = requiredElectiveHours ? Math.min(100, (countedElectiveHours / requiredElectiveHours) * 100) : 0;
  const completedCount = curriculum?.components.filter((component) => completedCodes.has(component.code)).length ?? 0;
  const progressAvailable = Boolean(linkedCurriculumId && !progressError);
  const connectedCodes = useMemo(() => {
    if (!selected || !curriculum) return new Set<string>();
    const connected = new Set<string>();
    const pending = [selected.code];
    const byCode = new Map(curriculum.components.map((component) => [component.code, component]));

    while (pending.length) {
      const code = pending.pop()!;
      if (connected.has(code)) continue;
      connected.add(code);
      const component = byCode.get(code);
      if (component) pending.push(...component.prerequisiteCodes, ...component.unlocksCodes);
    }

    return connected;
  }, [curriculum, selected]);

  const graph = useMemo(() => {
    if (!curriculum) return { nodes: [] as Node[], edges: [] as Edge[] };
    const visibleCodes = new Set(visibleComponents.map((component) => component.code));
    const nodes: Node[] = [];

    if (filter !== "ELECTIVE") for (let period = 1; period <= curriculum.expectedPeriods; period += 1) {
      const periodComponents = visibleComponents
        .filter((component) => component.suggestedPeriod === period)
        .sort((left, right) => (DIAGRAM_COLUMN[left.code] ?? 999) - (DIAGRAM_COLUMN[right.code] ?? 999));
      const rowY = (period - 1) * CURRICULUM_ROW_STEP;

      nodes.push({
        id: `period-${period}`,
        position: { x: 0, y: rowY + 33 },
        data: { label: `${period}º período` },
        draggable: false,
        selectable: false,
        connectable: false,
        style: {
          width: 90, border: "1px solid #d3e8db", borderRadius: 12,
          background: "#ffffff", color: "#006b48",
          fontSize: 11, fontWeight: 900, padding: "12px 10px",
          boxShadow: "0 4px 12px rgb(15 23 42 / 5%)",
        },
      });

      periodComponents.forEach((component, index) => {
        const focus: FocusState = !selectedCode ? "normal"
          : component.code === selectedCode ? "selected"
            : connectedCodes.has(component.code) ? "related" : "dimmed";
        const column = DIAGRAM_COLUMN[component.code] ?? index;
        nodes.push({
          id: component.code,
          type: "curriculum",
          position: { x: 116 + column * CURRICULUM_COLUMN_STEP, y: rowY },
          data: { component, focus, completed: completedCodes.has(component.code), external: false },
        } satisfies CurriculumFlowNode);
      });
    }

    const unscheduledComponents = visibleComponents
      .filter((component) => component.suggestedPeriod === null)
      .sort((left, right) => left.code.localeCompare(right.code, "pt-BR"));
    const electiveStartRow = filter === "ELECTIVE" ? 0 : curriculum.expectedPeriods;

    unscheduledComponents.forEach((component, index) => {
      const row = Math.floor(index / 7);
      const column = index % 7;
      const rowY = (electiveStartRow + row) * CURRICULUM_ROW_STEP;
      if (column === 0) {
        nodes.push({
          id: `elective-row-${row}`,
          position: { x: 0, y: rowY + 33 },
          data: { label: row === 0 ? "Optativas" : `Optativas ${row + 1}` },
          draggable: false,
          selectable: false,
          connectable: false,
          style: {
            width: 90, border: "1px solid #d3e8db", borderRadius: 12,
            background: "#ffffff", color: "#006b48", fontSize: 11,
            fontWeight: 900, padding: "12px 8px",
          },
        });
      }

      const focus: FocusState = !selectedCode ? "normal"
        : component.code === selectedCode ? "selected"
          : connectedCodes.has(component.code) ? "related" : "dimmed";
      nodes.push({
        id: component.code,
        type: "curriculum",
          position: { x: 116 + column * CURRICULUM_COLUMN_STEP, y: rowY },
        data: { component, focus, completed: completedCodes.has(component.code) || component.componentId.startsWith("external-"), external: component.componentId.startsWith("external-") },
      } satisfies CurriculumFlowNode);
    });

    const edges: PrerequisiteEdge[] = visibleComponents.flatMap((component) =>
      component.prerequisiteCodes.filter((code) => visibleCodes.has(code)).map((code, index, prerequisites) => {
        const highlighted = Boolean(selectedCode && connectedCodes.has(code) && connectedCodes.has(component.code));
        return {
          id: `${code}-${component.code}`,
          source: code,
          target: component.code,
          type: "prerequisite" as const,
          data: {
            laneOffset: (index - (prerequisites.length - 1) / 2) * 5,
            laneSide: (DIAGRAM_COLUMN[component.code] ?? 0) >= 8 ? -1 as const : 1 as const,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: highlighted ? "#006b48" : "#71897d", width: 13, height: 13 },
          style: { stroke: highlighted ? "#006b48" : "#71897d", strokeWidth: highlighted ? 2.3 : 1.5, opacity: selectedCode && !highlighted ? 0.12 : 0.84 },
        } satisfies PrerequisiteEdge;
      }),
    );

    return { nodes, edges };
  }, [completedCodes, connectedCodes, curriculum, filter, selectedCode, visibleComponents]);

  const mandatoryCount = curriculum?.components.filter((component) => component.type === "MANDATORY").length ?? 0;
  const electiveCount = curriculum?.components.filter((component) => component.type === "ELECTIVE").length ?? 0;

  if (loading) return <div className="grid min-h-[65vh] place-items-center"><LoaderCircle className="animate-spin text-emerald-700" size={32} /></div>;

  if (missingCurriculum) {
    return (
      <section className="grid min-h-[65vh] place-items-center">
        <div className="max-w-lg rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><GraduationCap size={24} /></span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Escolha sua matriz curricular</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">O mapa é montado a partir do curso e da matriz vinculados ao seu perfil acadêmico.</p>
          <Link href="/perfil" className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Configurar perfil</Link>
        </div>
      </section>
    );
  }

  if (error || !curriculum) {
    return (
      <section className="rounded-3xl border border-rose-100 bg-rose-50 p-7 text-rose-700">
        <div className="flex items-center gap-3"><AlertCircle size={21} /><strong>Não foi possível abrir o mapa curricular.</strong></div>
        <p className="mt-2 text-sm">{error}</p>
      </section>
    );
  }

  const stats = [
    { label: "Carga horária total", value: `${curriculum.totalWorkloadHours.toLocaleString("pt-BR")} h`, icon: Clock3, classes: "bg-emerald-50 text-emerald-700" },
    { label: `${mandatoryCount} obrigatórias`, value: `${(curriculum.mandatoryWorkloadHours ?? 0).toLocaleString("pt-BR")} h`, icon: BookOpenCheck, classes: "bg-[#edf5f0] text-[#006b48]" },
    { label: `${electiveCount} opções publicadas`, value: `${(curriculum.electiveWorkloadHours ?? 0).toLocaleString("pt-BR")} h exigidas`, icon: GraduationCap, classes: "bg-[#f1f6f3] text-[#2f6f68]" },
    { label: "Duração sugerida", value: `${curriculum.expectedPeriods} períodos`, icon: Layers3, classes: "bg-[#f2f6f5] text-[#526e65]" },
  ];

  return (
    <div className="animate-enter space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-12 -top-16 size-52 rounded-full border-[32px] border-emerald-100/50" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Trajetória acadêmica</p>
              {curriculum.source?.trustStatus === "OFFICIAL" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800"><CheckCircle2 size={12} /> Fonte oficial</span>}
              {adminPreview && <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">Prévia administrativa</span>}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Mapa curricular</h1>
            <p className="mt-2 text-sm text-slate-500">{curriculum.courseName} · Matriz {curriculum.code}</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-[#063e31] p-6 text-white shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[42px] border-white/5" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_180px_minmax(260px,0.85fr)]">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-200">Sua jornada, matéria por matéria</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Meu progresso no curso</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85">
              {progressAvailable
                ? "Seu histórico preenche automaticamente as aprovações e optativas. Atualize seus documentos pelo painel inicial quando houver novidades."
                : adminPreview
                  ? "Esta é uma prévia da matriz. Vincule seu curso e importe o histórico para acompanhar as aprovações."
                  : "Vincule sua matriz e importe o histórico escolar para acompanhar sua trajetória."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-white/12 px-3 py-1.5">{progressAvailable ? `${completedCount} aprovações na matriz` : "Progresso indisponível"}</span>
              {progressAvailable && <span className="rounded-full bg-white/12 px-3 py-1.5">{completedCourseHours.toLocaleString("pt-BR")} h contabilizadas</span>}
              {progressAvailable && <span className="rounded-full bg-white/12 px-3 py-1.5">{disciplineProgress}% das horas em disciplinas</span>}
              {adminPreview && <span className="rounded-full border border-amber-200/40 bg-amber-300/15 px-3 py-1.5 text-amber-100">Prévia não salva</span>}
            </div>
            {!linkedCurriculumId && <Link href="/perfil" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#006b48] hover:bg-emerald-50">Vincular minha matriz</Link>}
          </div>
          <div className="mx-auto grid size-40 place-items-center rounded-full p-3" style={{ background: `conic-gradient(#79e5b7 ${progressAvailable ? courseProgress : 0}%, rgb(255 255 255 / 15%) 0)` }} role="img" aria-label={progressAvailable ? `${courseProgress}% da carga horária total do curso identificada pelo histórico` : "Progresso indisponível"}>
            <div className="grid size-full place-content-center rounded-full bg-[#063e31] text-center">
              <strong className="text-4xl font-black tracking-tight">{progressAvailable ? `${courseProgress}%` : "—"}</strong>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">do curso</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <p className="text-xs font-extrabold">Carga horária contabilizada</p>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]"><span>Obrigatórias</span><div className="flex items-center gap-2"><span className="font-extrabold text-[#91edbf]">{Math.round(mandatoryProgress)}%</span><strong>{countedMandatoryHours.toLocaleString("pt-BR")} / {requiredMandatoryHours.toLocaleString("pt-BR")} h</strong></div></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Progresso das disciplinas obrigatórias" aria-valuenow={Math.round(mandatoryProgress)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[#78dfb0] transition-all" style={{ width: `${mandatoryProgress}%` }} /></div>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]"><span>Optativas</span><div className="flex items-center gap-2"><span className="font-extrabold text-[#f2c96f]">{Math.round(electiveProgress)}%</span><strong>{countedElectiveHours.toLocaleString("pt-BR")} / {requiredElectiveHours.toLocaleString("pt-BR")} h</strong></div></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Progresso das disciplinas optativas" aria-valuenow={Math.round(electiveProgress)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[#f2c96f] transition-all" style={{ width: `${electiveProgress}%` }} /></div>
              </div>
              {(curriculum.extensionWorkloadHours ?? 0) > 0 && <p className="border-t border-white/10 pt-3 text-[11px] leading-4 text-emerald-100/80">Extensão: {curriculum.extensionWorkloadHours?.toLocaleString("pt-BR")} h exigidas, ainda sem registro no Planner.</p>}
            </div>
          </div>
        </div>
        <p className="relative mt-5 border-t border-white/10 pt-3 text-[11px] leading-5 text-emerald-100/70">Estimativa com aprovações importadas do histórico: horas obrigatórias + optativas até o limite exigido, divididas pela carga total da matriz. Não substitui a análise oficial de integralização da UFAM.</p>
      </section>

      {(externalElectives.length > 0 || externalLoadError) && <section className="rounded-3xl border border-amber-200 bg-gradient-to-r from-white to-amber-50 p-5 shadow-sm sm:p-6">
        <div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-800">Além da sua matriz</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">Optativas de outros cursos</h2><p className="mt-1 max-w-2xl text-sm text-slate-600">Aprovações identificadas no histórico, também disponíveis na aba Optativas do fluxo.</p></div>
        {externalLoadError && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800"><span>Não foi possível carregar suas optativas externas. O percentual pode estar incompleto.</span><button type="button" className="font-extrabold underline" onClick={() => { studyApi.subjects().then((subjects) => { setExternalElectives(subjects.filter((subject) => subject.category === "EXTERNAL_ELECTIVE" && subject.source === "ECAMPUS_HISTORY")); setExternalLoadError(false); }).catch(() => setExternalLoadError(true)); }}>Tentar novamente</button></div>}
        {externalElectives.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{externalElectives.map((subject) => <span key={subject.id} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">{subject.code} · {subject.name} · {subject.workloadHours} h <span className="text-amber-800">{subject.status === "COMPLETED" && subject.countAsElective ? "· na estimativa" : "· ainda não contabilizada"}</span><span className="ml-1 font-normal text-slate-500">· histórico importado</span></span>)}</div>}
        <p className="mt-3 text-xs leading-5 text-amber-900">{completedExternalHours > 0 ? `${completedExternalHours} h externas aprovadas identificadas no histórico, respeitando o limite de optativas da matriz. ` : ""}A contabilização oficial depende das regras e da validação da UFAM.</p>
      </section>}

      {progressError && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 sm:flex-row sm:items-center sm:justify-between"><p>{progressError}</p><button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-amber-900 shadow-sm hover:bg-amber-100">Tentar novamente</button></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, classes }) => (
          <article key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`grid size-10 place-items-center rounded-xl ${classes}`}><Icon size={19} /></span>
            <div><p className="text-[11px] font-semibold text-slate-400">{label}</p><strong className="mt-0.5 block text-lg text-slate-800">{value}</strong></div>
          </article>
        ))}
      </section>

      {!curriculum.source?.prerequisiteDataAvailable && (
        <section className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-blue-900">
          <Info className="mt-0.5 shrink-0 text-blue-600" size={18} />
          <div><p className="text-sm font-extrabold">Pré-requisitos ainda não publicados nesta fonte</p><p className="mt-1 text-xs leading-5 text-blue-700">Os componentes e períodos já estão disponíveis. As setas surgirão assim que uma publicação institucional validar as relações.</p></div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-100 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-extrabold text-slate-900">Fluxo por período</h2><p className="mt-1 text-xs text-slate-500">As setas mostram os pré-requisitos. O selo verde identifica aprovação importada do histórico.</p></div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 sm:w-[340px] sm:shrink-0"><Search className="shrink-0" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedCode(null); }} className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none" placeholder="Código ou nome da disciplina" aria-label="Buscar disciplina por código ou nome" /></label>
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" aria-label="Filtrar componentes">
                <Filter className="mx-2 text-slate-400" size={14} />
                {([["MANDATORY", "Obrigatórias"], ["ELECTIVE", "Optativas"]] as const).map(([value, label]) => <button key={value} onClick={() => { setFilter(value); setSelectedCode(null); }} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${filter === value ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
              </div>
              {selectedCode && <button type="button" onClick={() => setSelectedCode(null)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"><RotateCcw size={14} />Limpar destaque</button>}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {AREA_THEMES.map((theme) => <span key={theme.label} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="size-2.5 rounded-full border" style={{ backgroundColor: theme.fill, borderColor: theme.accent }} />{theme.label}</span>)}
          </div>
          <p className="text-xs text-slate-500">A roda do mouse rola a página. Para explorar o fluxo, use os controles de zoom e ative “Mover mapa” para arrastar.</p>
        </div>

        <div>
          <div className="relative h-[820px] min-h-[620px] bg-[#f8fbf9]">
            <button
              type="button"
              aria-pressed={mapNavigationEnabled}
              onClick={() => setMapNavigationEnabled((enabled) => !enabled)}
              className={`absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition-colors ${mapNavigationEnabled ? "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <Hand size={15} />{mapNavigationEnabled ? "Parar de mover" : "Mover mapa"}
            </button>
            <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
              className={mapNavigationEnabled ? "curriculum-flow-navigating" : "curriculum-flow-scroll"}
              onNodeClick={(_, node) => setSelectedCode((current) => node.type === "curriculum" && current !== node.id ? node.id : null)}
              onPaneClick={() => setSelectedCode(null)}
              onEdgeClick={() => setSelectedCode(null)}
              fitView fitViewOptions={{ padding: 0.06, maxZoom: 0.9 }} minZoom={0.25} maxZoom={1.8}
              zoomOnScroll={false} panOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}
              preventScrolling={false} panOnDrag={mapNavigationEnabled}
              nodesDraggable={false} proOptions={{ hideAttribution: true }}>
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#dbe8e0" />
              <Controls showInteractive={false} className="!overflow-hidden !rounded-xl !border-slate-200 !shadow-sm" />
            </ReactFlow>
          </div>

          <aside className="border-t border-slate-100 bg-[#f8fbfa] p-4 sm:p-6">
            {selected ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${selected.type === "ELECTIVE" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{selected.componentId.startsWith("external-") ? "Optativa externa" : selected.type === "ELECTIVE" ? "Optativa" : "Obrigatória"}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-slate-600">{selected.code}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">{selected.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">Veja as relações da disciplina e sua situação no histórico importado.</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    {(completedCodes.has(selected.code) || selected.componentId.startsWith("external-")) && <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800"><CheckCircle2 size={17} />Aprovada no histórico</span>}
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[130px_130px_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-xl bg-slate-50 p-4"><span className="text-xs font-semibold text-slate-500">Período</span><strong className="mt-2 block text-lg text-slate-900">{selected.suggestedPeriod ? `${selected.suggestedPeriod}º` : "Livre"}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-4"><span className="text-xs font-semibold text-slate-500">Carga horária</span><strong className="mt-2 block text-lg text-slate-900">{selected.workloadHours} h</strong></div>
                  <div className="min-w-0 rounded-xl border border-slate-200 p-4"><p className="text-xs font-extrabold text-slate-800">Pré-requisitos</p><div className="mt-3 flex flex-wrap gap-1.5">{selected.prerequisiteCodes.length ? selected.prerequisiteCodes.map((code) => <span key={code} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">{code}</span>) : <span className="text-xs leading-5 text-slate-500">{curriculum.source?.prerequisiteDataAvailable ? "Nenhum pré-requisito." : "Aguardando validação."}</span>}</div></div>
                  <div className="min-w-0 rounded-xl border border-slate-200 p-4"><p className="text-xs font-extrabold text-slate-800">Desbloqueia</p><div className="mt-3 flex flex-wrap gap-1.5">{selected.unlocksCodes.length ? selected.unlocksCodes.map((code) => <span key={code} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800">{code}</span>) : <span className="text-xs leading-5 text-slate-500">{curriculum.source?.prerequisiteDataAvailable ? "Nenhuma registrada." : "Aguardando validação."}</span>}</div></div>
                </div>
              </div>
            ) : <p className="py-3 text-center text-sm text-slate-500">Selecione uma disciplina no mapa para ver seus detalhes.</p>}
          </aside>
        </div>
      </section>

      {curriculum.source && <footer className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span><strong className="text-slate-700">Versão da fonte:</strong> {curriculum.source.version ?? curriculum.code} · capturada em {formatDate(curriculum.source.capturedAt)}</span><span>Dados acadêmicos devem ser confirmados com a coordenação do curso.</span></footer>}
    </div>
  );
}
