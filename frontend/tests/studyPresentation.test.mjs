import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

function loadComponent(relativePath) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const component = new Module(path);
  component.paths = Module._nodeModulePaths(dirname(path));
  const originalRequire = component.require.bind(component);
  component.require = (specifier) => {
    const target = specifier.startsWith("@/") ? new URL("../src/" + specifier.slice(2), import.meta.url)
      : specifier.startsWith(".") ? new URL(specifier, new URL(relativePath, import.meta.url)) : null;
    if (target) {
      for (const extension of [".tsx", ".ts"]) {
        const candidate = new URL(target.href + extension);
        if (existsSync(candidate)) return loadComponent(candidate.href);
      }
    }
    return originalRequire(specifier);
  };
  component._compile(compiled, path);
  return component.exports;
}

const { StudyTermSelector } = loadComponent("../src/components/study/StudyTermSelector.tsx");
const { SubjectCourseInfo } = loadComponent("../src/components/study/SubjectCourseInfo.tsx");
const { StudyCalendar } = loadComponent("../src/components/ui/StudyCalendar.tsx");
const { AttendanceCard } = loadComponent("../src/components/study/AttendanceCard.tsx");
const { AbsenceDialog } = loadComponent("../src/components/study/AbsenceDialog.tsx");
const { SubjectEditor } = loadComponent("../src/components/study/SubjectEditor.tsx");
const { ConfirmDialog } = loadComponent("../src/components/ui/ConfirmDialog.tsx");
const { SemesterSubjectList } = loadComponent("../src/components/study/SemesterSubjectList.tsx");
const { CatalogCoverageSummary } = loadComponent("../src/components/study/CatalogCoverageSummary.tsx");
const { calendarDays, shiftCalendarMonth, classDatesInMonth } = loadComponent("../src/components/study/calendarDates.ts");
const { absenceCapacity, latestAvailableClassDate } = loadComponent("../src/components/study/attendance.ts");
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("catalog coverage separates Manaus, interior and other modalities", () => {
  const html = render(CatalogCoverageSummary, { coverage: {
    courses: 656, indexedCourses: 1, disciplines: 35,
    levels: [
      { levelId: 3, label: "Manaus", courses: 198, indexedCourses: 1 },
      { levelId: 13, label: "Educação a Distância", courses: 173, indexedCourses: 0 },
      { levelId: 14, label: "Coari", courses: 8, indexedCourses: 0 },
      { levelId: 15, label: "Humaitá", courses: 8, indexedCourses: 0 },
      { levelId: 16, label: "Benjamin Constant", courses: 7, indexedCourses: 0 },
      { levelId: 17, label: "Itacoatiara", courses: 11, indexedCourses: 0 },
      { levelId: 18, label: "Parintins", courses: 8, indexedCourses: 0 },
      { levelId: 20, label: "PARFOR", courses: 209, indexedCourses: 0 },
      { levelId: 22, label: "Graduação Indígena", courses: 34, indexedCourses: 0 },
    ],
  } });
  assert.match(html, /Graduação regular \(Manaus e interior\): <strong>1 de 240<\/strong>/);
  assert.match(html, /Manaus<\/p><p[^>]*>1 \/ 198/);
  assert.match(html, /Interior<\/p><p[^>]*>0 \/ 42/);
  assert.match(html, /Educação a distância/);
  assert.match(html, /PARFOR/);
  assert.match(html, /Graduação indígena/);
});

test("destructive actions explain the target and consequences in an in-app dialog", () => {
  const html = render(ConfirmDialog, {
    title: "Remover falta registrada?",
    subject: "FTL042 · Eletrônica Digital II",
    description: "Registro de 2 h em 28/09/2026.",
    warning: "A matrícula continua no Planner.",
    confirmLabel: "Remover falta",
    onClose() {}, onConfirm() {},
  });
  assert.match(html, /role="dialog"/);
  assert.match(html, /FTL042 · Eletrônica Digital II/);
  assert.match(html, /Registro de 2 h em 28\/09\/2026/);
  assert.match(html, /A matrícula continua no Planner/);
  assert.match(html, />Cancelar</);
  assert.match(html, />Remover falta</);
});

test("a single semester is displayed without an unnecessary dropdown", () => {
  const html = render(StudyTermSelector, { terms: ["2026/2"], value: "2026/2", onChange() {} });
  assert.match(html, /2º semestre de 2026/);
  assert.doesNotMatch(html, /aria-haspopup="listbox"|Todos os períodos/);
});

test("calendar has six Monday-first weeks and handles leap years and year transitions", () => {
  const days = calendarDays("2024-02");
  assert.equal(days.length, 42);
  assert.equal(days[0], "2024-01-29");
  assert.ok(days.includes("2024-02-29"));
  assert.equal(shiftCalendarMonth("2026-12", 1), "2027-01");
  assert.equal(shiftCalendarMonth("2026-01", -1), "2025-12");
});

test("date picker shows only scheduled dates through today, grouped by weekday", () => {
  const html = render(StudyCalendar, { value: "2026-09-28", maxDate: "2026-09-28", weekdays: [1, 3], onChange() {} });
  assert.match(html, /setembro de 2026/);
  assert.match(html, /Segunda-feira/);
  assert.match(html, /Quarta-feira/);
  assert.equal((html.match(/data-class-date=/g) ?? []).length, 8);
  assert.match(html, /Próximo mês" disabled/);
  assert.doesNotMatch(html, /type="date"|Terça-feira|2026-09-29|2026-09-30|2026-08-31/);
});

test("class dates handle leap years, month boundaries and no scheduled days", () => {
  assert.deepEqual(classDatesInMonth("2024-02", [4], "2024-02-29"), ["2024-02-01", "2024-02-08", "2024-02-15", "2024-02-22", "2024-02-29"]);
  assert.deepEqual(classDatesInMonth("2026-09", [1, 3], "2026-09-01"), []);
  assert.deepEqual(classDatesInMonth("2026-09", [], "2026-09-29"), []);
});

const importedSubject = {
  id: "test", code: "FTL042", name: "Eletrônica Digital II", workloadHours: 60,
  source: "ECAMPUS_ENROLLMENT", status: "IN_PROGRESS", academicTerm: "2026/2", sectionLabel: "EE-01",
  offeringCourse: null, courseContext: null, absences: [],
  meetings: [{ id: "m1", weekday: 1, startHour: 8, endHour: 10 }],
};

test("absence picker defaults to the latest available class rather than a non-class day", () => {
  assert.equal(latestAvailableClassDate(importedSubject, "2026-09-29"), "2026-09-28");
  const twoDays = { ...importedSubject, meetings: [...importedSubject.meetings, { id: "m2", weekday: 3, startHour: 8, endHour: 10 }] };
  const full = { ...twoDays, absences: [{ id: "a", missedOn: "2026-09-28", missedHours: 2 }] };
  assert.equal(latestAvailableClassDate(full, "2026-09-29"), "2026-09-23");
  assert.equal(latestAvailableClassDate({ ...full, absences: [{ id: "a", missedOn: "2026-09-28", missedHours: 1 }] }, "2026-09-29"), "2026-09-28");
  assert.equal(latestAvailableClassDate(twoDays, "2027-01-01"), "2026-12-30");
  const html = render(AbsenceDialog, { subject: importedSubject, today: "2026-09-29", busy: false, onClose() {}, onRegister() {} });
  assert.match(html, /28\/09/);
  assert.match(html, /Confirmar 2 h/);
  assert.doesNotMatch(html, /data-class-date="2026-09-29"|não há aula cadastrada/);
});

test("already recorded class hours cannot be selected again", () => {
  const subject = { ...importedSubject, absences: [{ id: "a", missedOn: "2026-09-28", missedHours: 2 }] };
  assert.equal(absenceCapacity(subject, "2026-09-28"), 0);
  const html = render(StudyCalendar, { value: "2026-09-21", maxDate: "2026-09-29", weekdays: [1], availableHours: (date) => absenceCapacity(subject, date), onChange() {} });
  assert.match(html, /data-class-date="2026-09-28" type="button" disabled/);
  assert.match(html, /horas já registradas/);
});

test("missing schedules do not invent days or hours for an absence", () => {
  const subject = { ...importedSubject, meetings: [] };
  assert.equal(latestAvailableClassDate(subject, "2026-09-29"), null);
  assert.equal(absenceCapacity(subject, "2026-09-29"), 0);
  const html = render(AbsenceDialog, { subject, today: "2026-09-29", busy: false, onClose() {}, onRegister() {} });
  assert.match(html, /Atualize o comprovante/);
  assert.match(html, /disabled="" type="submit"/);
  assert.doesNotMatch(html, /data-class-date=/);
});

test("attendance starts compact with no repeated sources or inline form", () => {
  const html = render(AttendanceCard, { subject: importedSubject, busy: false, onRegister() {}, onUndo() {} });
  assert.match(html, /15 h/);
  assert.match(html, /Registrar falta/);
  assert.match(html, /Margem em dias/);
  assert.doesNotMatch(html, /<input|<select|Página oficial da UFAM|href=/);
});

test("imported subjects cannot accidentally open the draft editor", () => {
  const html = render(SubjectEditor, { initial: importedSubject, onClose() {}, onSaved() {} });
  assert.match(html, /dados vêm do documento importado/);
  assert.doesNotMatch(html, /<form|Salvar rascunho|<input|<select/);
});
test("multiple semesters offer a selector without an all-semesters choice", () => {
  const html = render(StudyTermSelector, { terms: ["2026/2", "2026/1"], value: "2026/2", onChange() {} });
  assert.match(html, /aria-haspopup="listbox"/);
  assert.doesNotMatch(html, /Todos os períodos/);
});
test("missing course information does not display a placeholder or fabricated offering", () => {
  assert.equal(render(SubjectCourseInfo, { subject: { offeringCourse: null, courseContext: null } }), "");
});
test("curriculum membership is clearly separated from offering course", () => {
  const context = { name: "Engenharia da Computação", unitName: "Faculdade de Tecnologia", unitAbbreviation: "FT", officialUrl: "https://ft.ufam.edu.br/", relation: "CURRICULUM" };
  const html = render(SubjectCourseInfo, { subject: { offeringCourse: null, courseContext: context } });
  assert.match(html, /Na sua matriz:/);
  assert.doesNotMatch(html, /Página oficial|href=|Faculdade de Tecnologia/);
  assert.doesNotMatch(html, /Oferta:|Curso não informado/);
  const offering = render(SubjectCourseInfo, { subject: { courseContext: { ...context, relation: "OFFERING" } } });
  assert.match(offering, /Oferta:/);
  assert.doesNotMatch(offering, /Na sua matriz:/);
});

const courseContext = { name: "Engenharia da Computação", unitName: "Faculdade de Tecnologia", unitAbbreviation: "FT", officialUrl: "https://ft.ufam.edu.br/", relation: "CURRICULUM" };
const listProps = { draft: false, color: () => "bg-emerald-100", onOpen() {}, onEdit() {}, onRemove() {} };

test("semester list restores course and unit without repeated official links", () => {
  const html = render(SemesterSubjectList, { ...listProps, subjects: [{ ...importedSubject, courseContext }] });
  assert.match(html, /Na sua matriz:/);
  assert.match(html, /Engenharia da Computação/);
  assert.match(html, /Faculdade de Tecnologia · FT/);
  assert.match(html, /EE-01/);
  assert.match(html, /08:00–10:00/);
  assert.match(html, /data-subject-section/);
  assert.match(html, /data-subject-times/);
  assert.doesNotMatch(html, /href=|Página oficial|Oferta:|Remover rascunho/);
});

test("missing course data is not guessed from section codes", () => {
  const html = render(SemesterSubjectList, { ...listProps, subjects: [{ ...importedSubject, sectionLabel: "MA1", name: "Nome muito longo de uma disciplina que deve quebrar sem esconder o texto" }] });
  assert.match(html, /MA1/);
  assert.match(html, /Nome muito longo de uma disciplina que deve quebrar sem esconder o texto/);
  assert.doesNotMatch(html, /Na sua matriz:|Oferta:|Curso não informado|Matemática/);
});

test("readonly details retain course and unit as well as the imported section", () => {
  const html = render(SubjectEditor, { initial: { ...importedSubject, courseContext }, onClose() {}, onSaved() {} });
  assert.match(html, /Faculdade de Tecnologia · FT/);
  assert.match(html, /EE-01/);
  assert.doesNotMatch(html, /Página oficial|href=|<input/);
});
