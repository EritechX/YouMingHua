import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { scopesFor, assertChecks } from "../.github/scripts/pr-checks.mjs";

test("documentation changes skip native suites but platform code selects its suite", () => {
  assert.deepEqual(scopesFor(["README.md", "docs/releases/v1.0.1.md", "macos/README.md", ".github/README.md", "tools/README.md"]), {macos: false, windows: false});
  assert.deepEqual(scopesFor(["macos/scripts/common-macos.sh"]), {macos: true, windows: false});
  assert.deepEqual(scopesFor(["windows/assets/dream-skin.css"]), {macos: false, windows: true});
  assert.deepEqual(scopesFor(["windows/VERSION", "macos/VERSION"]), {macos: true, windows: true});
});

test("shared, workflow and unknown inputs always select both platforms", () => {
  for (const path of ["runtime/dream-skin.css", "tools/check-versions.mjs", ".github/workflows/pr-checks.yml", ".github/scripts/pr-checks.mjs", ".gitattributes", "new-build-system/config.json"]) {
    assert.deepEqual(scopesFor([path]), {macos: true, windows: true}, path);
  }
});

const results = (macos = "true", windows = "true") => ({
  shared: {result: "success", outputs: {macos, windows}},
  macos: {result: macos === "true" ? "success" : "skipped"},
  windows: {result: windows === "true" ? "success" : "skipped"},
});

test("gate accepts full coverage and intentional documentation-only skips", () => {
  for (const scopes of [["true", "true"], ["true", "false"], ["false", "true"], ["false", "false"]]) {
    assert.doesNotThrow(() => assertChecks(results(...scopes)));
  }
});

test("gate rejects failed, cancelled, unexpectedly skipped and missing checks", () => {
  for (const job of ["shared", "macos", "windows"]) {
    for (const status of ["failure", "cancelled", "skipped", undefined]) {
      const needs = results();
      needs[job].result = status;
      assert.throws(() => assertChecks(needs), Error, `${job}: ${status}`);
    }
  }
  for (const value of [undefined, "", "typo"]) {
    const needs = results("false", "false");
    needs.shared.outputs.windows = value;
    assert.throws(() => assertChecks(needs));
  }
});

test("PR workflow remains read-only, always reports its gate, and never packages releases", () => {
  const yaml = readFileSync(new URL("../.github/workflows/pr-checks.yml", import.meta.url), "utf8");
  assert.match(yaml, /pull_request:\n    branches: \[main\]/);
  assert.match(yaml, /permissions:\n  contents: read/);
  assert.match(yaml, /name: PR checks\n    needs: \[shared, macos, windows\]\n    if: always\(\)/);
  assert.doesNotMatch(yaml, /pull_request_target|contents: write|secrets\.|paths-ignore:|\n    paths:|build-dmg\.sh|installer\/build-release\.ps1|gh release/);
  for (const [, ref] of yaml.matchAll(/uses:\s*\S+@([^\s]+)/g)) assert.match(ref, /^[a-f0-9]{40}$/);
  assert.equal((yaml.match(/uses: actions\/checkout@/g) ?? []).length, (yaml.match(/persist-credentials: false/g) ?? []).length);
});
