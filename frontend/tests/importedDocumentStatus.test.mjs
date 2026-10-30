import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";

const path = fileURLToPath(new URL("../src/lib/importedDocumentStatus.ts", import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helper = new Module(path);
helper.paths = Module._nodeModulePaths(dirname(path));
helper._compile(compiled, path);
const { importedEnrollmentTerms, importedHistoryCount } = helper.exports;

test("lists saved enrollment terms, latest first and unknown last", () => {
  const subjects = [
    { source: "ECAMPUS_ENROLLMENT", academicTerm: "2025/2" },
    { source: "ECAMPUS_ENROLLMENT", academicTerm: "2026/2" },
    { source: "ECAMPUS_ENROLLMENT", academicTerm: "2026/2" },
    { source: "ECAMPUS_ENROLLMENT", academicTerm: null },
    { source: "MANUAL", academicTerm: "2027/1" },
  ];
  assert.deepEqual(importedEnrollmentTerms(subjects), [
    { term: "2026/2", count: 2 },
    { term: "2025/2", count: 1 },
    { term: "Período não informado", count: 1 },
  ]);
});

test("counts distinct saved history approvals without current enrollments", () => {
  const subjects = [
    { source: "ECAMPUS_HISTORY", status: "COMPLETED", code: "man101" },
    { source: "ECAMPUS_HISTORY", status: "PLANNED", code: "man102" },
    { source: "ECAMPUS_ENROLLMENT", status: "COMPLETED", code: "mat101" },
  ];
  assert.equal(importedHistoryCount(subjects, ["MAT101", "mat101"]), 2);
});
