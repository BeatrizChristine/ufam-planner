import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";

// Compile the production helper using the project's existing TypeScript dependency.
const path = fileURLToPath(new URL("../src/components/study/studyPeriods.ts", import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helper = new Module(path);
helper.paths = Module._nodeModulePaths(dirname(path));
helper._compile(compiled, path);
const { studyPeriodView } = helper.exports;

const subject = (id, academicTerm, overrides = {}) => ({
  id, academicTerm, status: "IN_PROGRESS", source: "ECAMPUS_ENROLLMENT", ...overrides,
});
const subjects = [
  subject("older", "2026/1"), subject("latest", "2026/2"),
  subject("unassigned", null), subject("planned", "2026/2", { status: "PLANNED" }),
  subject("history", "2027/1", { status: "COMPLETED", source: "ECAMPUS_HISTORY" }),
  subject("completed", "2028/1", { status: "COMPLETED", source: "MANUAL" }),
];

test("schedule opens latest relevant semester and never includes completed history", () => {
  const view = studyPeriodView(subjects, null, "SCHEDULE");
  assert.deepEqual(view.terms, ["2026/2", "2026/1"]);
  assert.equal(view.effectiveTerm, "2026/2");
  assert.deepEqual(view.visible.map((s) => s.id), ["latest", "planned"]);
  assert.deepEqual(view.unassigned.map((s) => s.id), ["unassigned"]);
});
test("switching semester isolates its subjects", () => {
  assert.deepEqual(studyPeriodView(subjects, "2026/1", "SCHEDULE").visible.map((s) => s.id), ["older"]);
});
test("invalid or removed semester falls back instead of mixing all semesters", () => {
  for (const selection of ["ALL", "UNASSIGNED", "2025/1"]) {
    assert.equal(studyPeriodView(subjects, selection, "SCHEDULE").effectiveTerm, "2026/2");
  }
});
test("attendance includes only classes in progress in selected semester", () => {
  assert.deepEqual(studyPeriodView(subjects, null, "ATTENDANCE").visible.map((s) => s.id), ["latest"]);
});
test("empty or undated plan does not invent a semester or discard pending subjects", () => {
  assert.deepEqual(studyPeriodView([], null, "SCHEDULE"), { terms: [], effectiveTerm: null, visible: [], unassigned: [] });
  const pending = [subject("pending", null)];
  const view = studyPeriodView(pending, null, "SCHEDULE");
  assert.equal(view.effectiveTerm, null);
  assert.deepEqual(view.visible, []);
  assert.deepEqual(view.unassigned, pending);
});
