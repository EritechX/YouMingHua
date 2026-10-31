import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("fork package keeps reviewed preset assets and fresh-install CSS together", () => {
  const builder = read("installer/build-release.ps1");
  const preset = path.join(root, "presets/preset-youminghua");
  for (const [name, key] of [["background.png", "Image"], ["theme.json", "Theme"], ["theme.css", "Css"]]) {
    const actual = createHash("sha256").update(fs.readFileSync(path.join(preset, name))).digest("hex");
    const pinned = builder.match(new RegExp(`\\$publicPreset${key}Sha256 = '([a-f0-9]{64})'`))?.[1];
    assert.equal(actual, pinned, `${name} differs from the reviewed package input`);
    assert.ok(builder.includes(name));
  }
  const theme = JSON.parse(fs.readFileSync(path.join(preset, "theme.json"), "utf8"));
  assert.equal(theme.id, "preset-youminghua");
  assert.equal(theme.name, "又茗花");
  assert.equal(theme.image, "background.png");
  assert.equal(theme.appearance, "auto");
  const seeding = read("scripts/theme-windows.ps1");
  assert.match(seeding, /Assert-DreamSkinSafeCssFile -Path \$assetCss/);
  assert.match(seeding, /Copy-Item -LiteralPath \$assetCss -Destination \$activeCss/);
  assert.match(seeding, /Copy-Item -LiteralPath \$assetCss -Destination \$presetCss/);
});

test("fork installer cannot claim the upstream URL scheme or update channel", () => {
  const definition = read("installer/codex-dream-skin.iss");
  assert.match(definition, /AppId=\{\{8DF39BBA-C58F-4CED-A720-92CE67851C62\}/);
  assert.match(definition, /DefaultDirName=\{localappdata\}\\Programs\\YouMingHua/);
  assert.doesNotMatch(definition, /^\[Registry\]|Software\\Classes\\dreamskin|AppUpdatesURL=/m);
  assert.match(read("scripts/common-windows.ps1"), /Local\\YouMingHua\.\$sid\.Operation/);
  const update = read("scripts/check-update.ps1");
  assert.match(update, /updateChannelConfigured = \$false/);
  assert.doesNotMatch(update, /Invoke-RestMethod|Invoke-WebRequest|api\.github\.com|Start-Process/);
});

test("fork upgrade revision is separate from engine payload version", () => {
  assert.equal(read("VERSION").trim(), "1.5.21");
  assert.equal(read("DISTRIBUTION_VERSION").trim(), "1.0.1");
  const builder = read("installer/build-release.ps1");
  assert.match(builder, /\/DAppVersion=\$distributionVersion/);
  const bootstrap = read("installer/setup-bootstrap.ps1");
  assert.match(bootstrap, /\$payloadDistribution -cne \$installedDistribution/);
  assert.match(bootstrap, /\(\[version\]\$installedDistribution\) -gt \(\[version\]\$payloadDistribution\)/);
  assert.match(bootstrap, /\$committedDistribution -cne \$payloadDistribution/);
});
