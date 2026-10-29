import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { createHash } from "node:crypto";
const read = (relative) => fs.readFile(new URL("../" + relative, import.meta.url), "utf8");

test("macOS fork owns its bundle, engine, state and launch identities", async () => {
  const plist = await read("menubar-app/Resources/Info.plist.template");
  const common = await read("scripts/common-macos.sh");
  const native = await read("menubar-app/Sources/CodexDreamSkinMenuBar/AppDelegate.swift");
  assert.match(plist, /<string>local\.youminghua\.desktop<\/string>/);
  assert.match(plist, /<string>又茗花<\/string>/);
  assert.doesNotMatch(plist, /CFBundleURLTypes|<string>dreamskin<\/string>/);
  assert.match(common, /INSTALL_ROOT="\$HOME\/\.codex\/youminghua"/);
  assert.match(common, /Application Support\/YouMingHua/);
  assert.match(common, /CODEX_APP_JOB_LABEL="local\.youminghua\.app"/);
  assert.match(common, /INJECTOR_JOB_LABEL="local\.youminghua\.injector"/);
  assert.match(native, /\.codex\/youminghua/);
  assert.match(native, /Application Support\/YouMingHua/);
  assert.match(common, /com\.openai\.codex/);
  assert.match(common, /anchor apple generic and certificate leaf\[subject\.OU\]/);
  assert.match(common, /EXPECTED_CODEX_TEAM_ID="2DC432GLL2"/);
});

test("fresh macOS installations choose the reviewed three-file 又茗花 preset", async () => {
  const installer = await read("scripts/install-dream-skin-macos.sh");
  assert.match(installer, /--id preset-youminghua --no-apply/);
  const builder = await read("scripts/build-menubar-app.sh");
  assert.match(builder, /PUBLIC_PRESET="preset-youminghua"/);
  for (const [name, variable] of [["background.png", "PUBLIC_PRESET_SHA256"], ["theme.json", "PUBLIC_PRESET_THEME_SHA256"], ["theme.css", "PUBLIC_PRESET_CSS_SHA256"]]) {
    const bytes = await fs.readFile(new URL("../presets/preset-youminghua/" + name, import.meta.url));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.ok(builder.includes(`${variable}="${digest}"`), `${name} must match its reviewed packaging hash`);
  }
  assert.match(builder, /validate-safe-css-file\.mjs/);
});

test("unconfigured signing stays ad-hoc, Developer ID and notarization are opt-in", async () => {
  const app = await read("scripts/build-menubar-app.sh");
  const dmg = await read("scripts/build-dmg.sh");
  assert.match(app, /YOUMINGHUA_SIGN_IDENTITY/);
  assert.match(app, /Developer ID Application:/);
  assert.match(app, /--options runtime --timestamp/);
  assert.match(app, /--sign - --timestamp=none/);
  assert.match(dmg, /YOUMINGHUA_NOTARY_PROFILE/);
  assert.match(dmg, /notarytool submit/);
  assert.match(dmg, /stapler validate/);
  assert.doesNotMatch(app + dmg, /spctl\s+--master-disable|\bxattr\b/);
});
