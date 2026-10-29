import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
const workflow = await fs.readFile(new URL("../../.github/workflows/build-youminghua.yml", import.meta.url), "utf8");

test("custom build is manual and cannot create releases or tags", () => {
  assert.match(workflow, /^  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow, /^  (?:push|pull_request|schedule|workflow_run):/m);
  assert.match(workflow, /^permissions:\n  contents: read\s*$/m);
  assert.doesNotMatch(workflow, /contents: write|gh release|git push|git tag|releases\/download/);
  assert.match(workflow, /persist-credentials: false/);
});

test("both platform artifacts are built behind regression gates", () => {
  assert.match(workflow, /runs-on: macos-latest/);
  assert.match(workflow, /runs-on: windows-latest/);
  for (const command of [
    "node tools/sync-runtime-assets.mjs --check",
    "node --test tools/*.test.mjs",
    "node macos/scripts/injector.mjs --check-payload",
    "node windows/scripts/injector.mjs --check-payload",
    "bash macos/tests/run-tests.sh",
    "swift test --package-path macos/menubar-app",
    "bash macos/scripts/build-dmg.sh --skip-tests",
    "windows/tests/run-tests.ps1",
    "windows/tests/installer-static.tests.ps1",
    "windows/installer/build-release.ps1",
  ]) assert.ok(workflow.includes(command), `Missing build gate: ${command}`);
  assert.match(workflow, /name: YouMingHua-macOS-test/);
  assert.match(workflow, /name: YouMingHua-Windows-test/);
  assert.equal((workflow.match(/if-no-files-found: error/g) ?? []).length, 2);
});

test("every third-party action is pinned to a complete commit", () => {
  const actions = [...workflow.matchAll(/uses:\s*([^\s]+)@([^\s]+)/g)];
  assert.ok(actions.length >= 6);
  for (const [, name, ref] of actions) assert.match(ref, /^[a-f0-9]{40}$/, `${name} must be commit-pinned`);
});
