import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceURL = new URL("../scripts/check-update-macos.sh", import.meta.url);
const script = await fs.readFile(sourceURL, "utf8");
test("custom distribution does not access or advertise the upstream update service", () => {
  assert.doesNotMatch(script, /https:\/\/|\bcurl\b|Fei-Away/);
  const result = spawnSync("/bin/bash", [fileURLToPath(sourceURL), "--json"], {encoding:"utf8"});
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.currentVersion, "v1.0.1");
  assert.equal(value.latestVersion, null);
  assert.equal(value.updateChannelConfigured, false);
  assert.equal(value.updateAvailable, false);
  assert.equal(value.channel, "unconfigured");
  assert.equal(value.releaseUrl, null);
});
test("unknown update options fail instead of enabling an unreviewed source", () => {
  const result = spawnSync("/bin/bash", [fileURLToPath(sourceURL), "--repository", "other/repo"], {encoding:"utf8"});
  assert.equal(result.status, 2);
});
