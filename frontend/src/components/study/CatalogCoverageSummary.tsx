import type { CatalogCoverage } from "@/types/study";

const GROUPS = [
  { label: "Manaus", levels: [3], detail: "Graduação regular" },
  { label: "Interior", levels: [14, 15, 16, 17, 18], detail: "Coari, Humaitá, Benjamin Constant, Itacoatiara e Parintins" },
  { label: "Educação a distância", levels: [13], detail: "EAD" },
  { label: "PARFOR", levels: [20], detail: "Modalidade específica" },
  { label: "Graduação indígena", levels: [22], detail: "Modalidade específica" },
];

export function CatalogCoverageSummary({ coverage }: { coverage: CatalogCoverage }) {
  const levels = coverage.levels ?? [];
  const groups = GROUPS.map((group) => ({
    ...group,
    courses: levels.filter((level) => group.levels.includes(level.levelId))
      .reduce((total, level) => total + level.courses, 0),
    indexedCourses: levels.filter((level) => group.levels.includes(level.levelId))
      .reduce((total, level) => total + level.indexedCourses, 0),
  })).filter((group) => group.courses > 0);
  const classifiedLevels = new Set(GROUPS.flatMap((group) => group.levels));
  const otherLevels = levels.filter((level) => !classifiedLevels.has(level.levelId));
  if (otherLevels.length > 0) groups.push({
    label: "Outros níveis", levels: [], detail: "Classificação pendente",
    courses: otherLevels.reduce((total, level) => total + level.courses, 0),
    indexedCourses: otherLevels.reduce((total, level) => total + level.indexedCourses, 0),
  });
  const regular = groups.filter((group) => group.label === "Manaus" || group.label === "Interior");
  const regularCourses = regular.reduce((total, group) => total + group.courses, 0);
  const regularIndexed = regular.reduce((total, group) => total + group.indexedCourses, 0);

  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-emerald-950">
    <p className="text-sm font-extrabold">Cobertura das grades públicas</p>
    <p className="mt-1 text-xs leading-5">Graduação regular (Manaus e interior): <strong>{regularIndexed} de {regularCourses}</strong> registros processados. {coverage.disciplines} disciplinas identificadas no total.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {groups.map((group) => <div key={group.label} className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
        <p className="text-xs font-bold">{group.label}</p>
        <p className="mt-1 text-sm font-extrabold">{group.indexedCourses} / {group.courses}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-emerald-800">{group.detail}</p>
      </div>)}
    </div>
    <p className="mt-3 text-[11px] leading-5 text-emerald-800">São registros de cursos do eCampus, não turmas ou horários ofertados neste semestre. A sincronização é gradual.</p>
  </div>;
}
