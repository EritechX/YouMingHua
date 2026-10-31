import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkVersions } from "./check-versions.mjs";

async function fixture(t, overrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "youminghua-versions-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = {
    "macos/VERSION": "1.5.21\n",
    "windows/VERSION": "1.5.21\r\n",
    "macos/package.json": JSON.stringify({ version: "1.5.21", nested: { version: "0.0.1" } }),
    "macos/scripts/common-macos.sh": '#!/bin/bash\nSKIN_VERSION="1.5.21"\n',
    "macos/scripts/injector.mjs": 'const SKIN_VERSION = "1.5.21";\nexport { SKIN_VERSION };\n',
    "windows/scripts/injector.mjs": 'const SKIN_VERSION = "1.5.21";\n',
    "macos/DISTRIBUTION_VERSION": "1.0.1\n",
    "windows/DISTRIBUTION_VERSION": "1.0.1\n",
    ...overrides,
  };
  for (const [name, source] of Object.entries(files)) {
    if (source === null) continue;
    const file = path.join(root, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, source);
  }
  return root;
}

test("engine and distribution are independently consistent version streams", async t => {
  assert.deepEqual(await checkVersions(await fixture(t)), {
    engineVersion: "1.5.21", distributionVersion: "1.0.1",
  });
});

test("a Windows engine bump requires all six engine sources to move together", async t => {
  const root = await fixture(t, { "windows/scripts/injector.mjs": 'const SKIN_VERSION = "1.5.22";\n' });
  await assert.rejects(checkVersions(root), /Engine versions differ:.*windows\/scripts\/injector\.mjs=1\.5\.22/);
});

test("distribution revisions cannot drift between platforms", async t => {
  const root = await fixture(t, { "windows/DISTRIBUTION_VERSION": "1.0.2\n" });
  await assert.rejects(checkVersions(root), /Distribution versions differ:.*windows\/DISTRIBUTION_VERSION=1\.0\.2/);
});

test("missing files and missing declarations report the specific source", async t => {
  const missingFile = await fixture(t, { "macos/DISTRIBUTION_VERSION": null });
  await assert.rejects(checkVersions(missingFile), /macos\/DISTRIBUTION_VERSION: cannot read.*ENOENT/);
  const missingDeclaration = await fixture(t, { "macos/scripts/common-macos.sh": "# SKIN_VERSION removed\n" });
  await assert.rejects(checkVersions(missingDeclaration), /common-macos\.sh: expected exactly one.*found 0/);
});

test("invalid versions, malformed JSON and computed declarations fail closed", async t => {
  for (const value of ["1.0", "v1.0.1", "01.0.1", "1.0.1-beta", "1.0.1\n1.0.1"]) {
    const root = await fixture(t, { "macos/DISTRIBUTION_VERSION": value });
    await assert.rejects(checkVersions(root), /macos\/DISTRIBUTION_VERSION: expected a three-part/);
  }
  await assert.rejects(checkVersions(await fixture(t, {
    "macos/package.json": '{"version":',
  })), /package\.json: invalid JSON/);
  await assert.rejects(checkVersions(await fixture(t, {
    "macos/scripts/injector.mjs": 'const SKIN_VERSION = getVersion();\n',
  })), /injector\.mjs: SKIN_VERSION must be a single quoted version literal/);
});

test("duplicate declarations and duplicate package keys cannot mask a conflicting version", async t => {
  const javascript = await fixture(t, {
    "windows/scripts/injector.mjs": 'const SKIN_VERSION = "1.5.20";\nconst SKIN_VERSION = "1.5.21";\n',
  });
  await assert.rejects(checkVersions(javascript), /injector\.mjs: expected exactly one.*found 2/);
  const shell = await fixture(t, {
    "macos/scripts/common-macos.sh": 'SKIN_VERSION="1.5.20"\nSKIN_VERSION="1.5.21"\n',
  });
  await assert.rejects(checkVersions(shell), /common-macos\.sh: expected exactly one.*found 2/);
  const duplicateKey = await fixture(t, {
    "macos/package.json": '{"version":"1.5.20","vers\\u0069on":"1.5.21"}',
  });
  await assert.rejects(checkVersions(duplicateKey), /package\.json: expected exactly one root version property; found 2/);
});
