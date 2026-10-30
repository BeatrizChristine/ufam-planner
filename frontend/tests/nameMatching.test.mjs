import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";

const path = fileURLToPath(new URL("../src/lib/nameMatching.ts", import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helper = new Module(path);
helper.paths = Module._nodeModulePaths(dirname(path));
helper._compile(compiled, path);
const { namesCompatible } = helper.exports;

test("an abbreviated account name matches a longer name in the history", () => {
  assert.equal(namesCompatible("Ana Maria", "ANA MARIA DE SOUZA LIMA"), true);
  assert.equal(namesCompatible("Ana Lima", "ANA MARIA DE SOUZA LIMA"), true);
});

test("case, accents, and punctuation do not create a false mismatch", () => {
  assert.equal(namesCompatible("João-Pedro Souza", "JOAO PEDRO DE SOUZA"), true);
});

test("a different person or one shared first name still gets a warning", () => {
  assert.equal(namesCompatible("Ana Maria", "ANA BEATRIZ SOUZA"), false);
  assert.equal(namesCompatible("Ana", "ANA MARIA DE SOUZA"), false);
  assert.equal(namesCompatible("Maria Ana", "ANA MARIA"), false);
});
